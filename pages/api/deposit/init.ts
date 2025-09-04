import { NextApiRequest, NextApiResponse } from 'next'
import {
    Client,
    TransferTransaction,
    ScheduleCreateTransaction,
    AccountId,
    PrivateKey,
    TokenId,
    AccountBalanceQuery,
    Timestamp,
} from '@hashgraph/sdk'
import { HederaRateService } from '../../../src/services/hederaRateService'

/**
 * POST /api/deposit/init
 *
 * Initializes atomic deposit by creating a ScheduleCreateTransaction
 * Validates balances on-chain and rate data, then returns scheduleId for user signing
 *
 * @param req - Request object containing userAccountId, amount, and rate validation data
 * @param res - Response object
 *
 * @example
 * POST /api/deposit/init
 * {
 *   "userAccountId": "0.0.12345",
 *   "amount": 100.50,
 *   "expectedRate": 1.005,
 *   "rateSequenceNumber": "123",
 *   "rateTimestamp": "1234567890.123456789"
 * }
 *
 * @returns
 * {
 *   "success": true,
 *   "scheduleId": "0.0.99999",
 *   "amountHUSDC": 99.502487,
 *   "rate": 1.005
 * }
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    console.log('=== DEPOSIT INIT ENDPOINT CALLED ===')
    console.log('Method:', req.method)
    console.log('Body:', req.body)

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const {
            userAccountId,
            amount,
            expectedRate,
            rateSequenceNumber,
            rateTimestamp,
        } = req.body

        // Field validation
        if (!userAccountId || !amount || !expectedRate || !rateSequenceNumber) {
            console.error('Missing fields:', {
                userAccountId: !!userAccountId,
                amount: !!amount,
                expectedRate: !!expectedRate,
                rateSequenceNumber: !!rateSequenceNumber,
            })
            return res.status(400).json({
                error: 'Missing required fields',
                details: {
                    userAccountId: !!userAccountId,
                    amount: !!amount,
                    expectedRate: !!expectedRate,
                    rateSequenceNumber: !!rateSequenceNumber,
                },
            })
        }

        // Validate userAccountId format
        if (typeof userAccountId !== 'string' || !userAccountId.trim()) {
            return res.status(400).json({
                error: 'Invalid user account ID',
                message: 'User account ID must be a non-empty string',
            })
        }

        // Amount validation
        const amountNum = Number(amount)
        if (isNaN(amountNum) || amountNum <= 0) {
            return res.status(400).json({
                error: 'Invalid amount',
                message: 'Amount must be a positive number',
            })
        }

        // Rate validation
        const expectedRateNum = Number(expectedRate)
        if (isNaN(expectedRateNum) || expectedRateNum <= 0) {
            return res.status(400).json({
                error: 'Invalid rate',
                message: 'Expected rate must be a positive number',
            })
        }

        console.log('Processing deposit initialization:', {
            user: userAccountId,
            amount: amountNum,
            expectedRate: expectedRateNum,
            rateSequenceNumber,
            rateTimestamp,
        })

        // STEP 1: Validate the rate against Hedera topic
        console.log('Validating rate against Hedera topic...')
        const rateService = new HederaRateService()
        const latestRate = await rateService.getLatestRate()

        if (!latestRate) {
            return res.status(400).json({
                error: 'No rate available from Hedera topic',
                message: 'Unable to fetch current rate from consensus service',
            })
        }

        // Check if the rate data matches what the frontend sent
        const rateMatches =
            latestRate.sequenceNumber === rateSequenceNumber &&
            Math.abs(latestRate.rate - expectedRateNum) < 0.0001 // Allow small floating point differences

        if (!rateMatches) {
            console.log('Rate validation failed:', {
                expected: {
                    rate: expectedRateNum,
                    sequenceNumber: rateSequenceNumber,
                },
                actual: {
                    rate: latestRate.rate,
                    sequenceNumber: latestRate.sequenceNumber,
                },
            })

            return res.status(409).json({
                error: 'Rate has changed',
                message:
                    'The exchange rate has been updated. Please review the new rate and try again.',
                currentRate: {
                    rate: latestRate.rate,
                    sequenceNumber: latestRate.sequenceNumber,
                    timestamp: latestRate.timestamp,
                },
                submittedRate: {
                    rate: expectedRateNum,
                    sequenceNumber: rateSequenceNumber,
                    timestamp: rateTimestamp,
                },
            })
        }

        console.log('✅ Rate validation successful:', {
            rate: latestRate.rate,
            sequenceNumber: latestRate.sequenceNumber,
        })

        // Validate environment variables
        const depositWalletId = process.env.DEPOSIT_WALLET_ID
        const depositWalletKey = process.env.DEPOSIT_WALLET_KEY
        const usdcTokenIdStr = process.env.USDC_TOKEN_ID
        const husdTokenIdStr = process.env.HUSD_TOKEN_ID

        if (
            !depositWalletId ||
            !depositWalletKey ||
            !usdcTokenIdStr ||
            !husdTokenIdStr
        ) {
            console.error('Missing environment variables:', {
                DEPOSIT_WALLET_ID: !!depositWalletId,
                DEPOSIT_WALLET_KEY: !!depositWalletKey,
                USDC_TOKEN_ID: !!usdcTokenIdStr,
                HUSD_TOKEN_ID: !!husdTokenIdStr,
            })
            return res.status(500).json({
                error: 'Server configuration error',
                message: 'Missing required environment variables',
            })
        }

        // Configure Hedera client
        const client = Client.forTestnet()
        const depositWalletAccountId = AccountId.fromString(depositWalletId)
        const depositWalletPrivateKey = PrivateKey.fromString(depositWalletKey)
        const usdcTokenId = TokenId.fromString(usdcTokenIdStr)
        const husdTokenId = TokenId.fromString(husdTokenIdStr)

        client.setOperator(depositWalletAccountId, depositWalletPrivateKey)
        console.log(
            'Client configured for deposit wallet:',
            depositWalletAccountId.toString()
        )

        // Calculate hUSD amount using the validated rate
        // amountNum is in USDC, latestRate.rate is USDC/hUSD
        const amountHUSDC = amountNum / latestRate.rate

        console.log('Rate calculation:', {
            usdcAmount: amountNum,
            rate: latestRate.rate,
            husdAmount: amountHUSDC,
            sequenceNumber: latestRate.sequenceNumber,
        })

        // On-chain balance validation
        console.log('Validating on-chain balances...')

        // Check user USDC balance
        const userBalanceQuery = new AccountBalanceQuery().setAccountId(
            AccountId.fromString(userAccountId)
        )
        const userBalance = await userBalanceQuery.execute(client)
        const userUsdcBalance = userBalance.tokens?.get(usdcTokenId)
        const userUsdcBalanceNum = userUsdcBalance
            ? Number(userUsdcBalance.toString()) / 1_000_000
            : 0

        console.log('User USDC balance:', userUsdcBalanceNum)

        if (userUsdcBalanceNum < amountNum) {
            return res.status(400).json({
                error: 'Insufficient USDC balance',
                required: amountNum,
                available: userUsdcBalanceNum,
            })
        }

        // Check emissions wallet HUSDC balance
        const emissionsWalletId = process.env.EMISSIONS_ID!
        const emissionsBalanceQuery = new AccountBalanceQuery().setAccountId(
            AccountId.fromString(emissionsWalletId)
        )
        const emissionsBalance = await emissionsBalanceQuery.execute(client)
        const emissionsHusdcBalance = emissionsBalance.tokens?.get(husdTokenId)
        const emissionsHusdcBalanceNum = emissionsHusdcBalance
            ? Number(emissionsHusdcBalance.toString()) / 100_000_000
            : 0 // HUSDC has 8 decimals

        console.log('Emissions wallet HUSDC balance:', emissionsHusdcBalanceNum)

        if (emissionsHusdcBalanceNum < amountHUSDC) {
            return res.status(400).json({
                error: 'Insufficient emissions wallet HUSDC balance',
                required: amountHUSDC,
                available: emissionsHusdcBalanceNum,
            })
        }

        // Create the atomic transfer transaction
        console.log('Creating atomic transfer transaction...')

        // Create highly unique but concise memo to avoid MEMO_TOO_LONG and IDENTICAL_SCHEDULE_ALREADY_CREATED
        const timestamp = Date.now()
        const randomSuffix = Math.floor(Math.random() * 100000)
        const userSuffix = userAccountId.slice(-6) // Last 6 chars of account ID
        const uniqueMemo = `D-${timestamp}-${randomSuffix}-${userSuffix}: ${amountHUSDC.toFixed(2)} hUSD`
        
        console.log('Generated unique memo:', uniqueMemo)

        const usdcDecimals = 6
        const husdcDecimals = 8

        const usdcAmountTinybar = Math.floor(
            amountNum * Math.pow(10, usdcDecimals)
        )
        const husdcAmountTinybar = Math.floor(
            amountHUSDC * Math.pow(10, husdcDecimals)
        )

        const transferTransaction = new TransferTransaction()
            // USDC: user → deposit wallet
            .addTokenTransfer(
                usdcTokenId,
                AccountId.fromString(userAccountId),
                -usdcAmountTinybar
            )
            .addTokenTransfer(usdcTokenId, depositWalletAccountId, usdcAmountTinybar)
            // HUSDC: emissions → user
            .addTokenTransfer(
                husdTokenId,
                AccountId.fromString(emissionsWalletId),
                -husdcAmountTinybar
            )
            .addTokenTransfer(
                husdTokenId,
                AccountId.fromString(userAccountId),
                husdcAmountTinybar
            )

        // Create the scheduled transaction
        console.log('Creating ScheduleCreateTransaction...')

        const scheduleCreateTx = new ScheduleCreateTransaction()
            .setScheduledTransaction(transferTransaction)
            .setScheduleMemo(uniqueMemo)
            .setAdminKey(depositWalletPrivateKey.publicKey)
            .setPayerAccountId(depositWalletAccountId) // Deposit wallet pays for execution
            .setExpirationTime(
                Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000))
            ) // 1 hour from now

        // Execute the schedule creation (backend pays for this)
        const scheduleResponse = await scheduleCreateTx.execute(client)
        const scheduleReceipt = await scheduleResponse.getReceipt(client)
        const scheduleId = scheduleReceipt.scheduleId

        if (!scheduleId) {
            throw new Error('Failed to create scheduled transaction')
        }

        console.log('✅ Schedule created successfully')
        console.log(`   Schedule ID: ${scheduleId.toString()}`)
        console.log(
            `   Transaction ID: ${scheduleResponse.transactionId.toString()}`
        )

        const result = {
            success: true,
            scheduleId: scheduleId.toString(),
            amountHUSDC,
            rate: latestRate.rate,
            rateSequenceNumber: latestRate.sequenceNumber,
            usdcAmount: amountNum,
            timestamp: new Date().toISOString(),
            txId: scheduleResponse.transactionId.toString(),
        }

        console.log('=== DEPOSIT INIT SUCCESSFUL ===', result)
        return res.status(200).json(result)
    } catch (error: unknown) {
        console.error('=== DEPOSIT INIT ERROR ===')
        const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
        const errorStack = error instanceof Error ? error.stack : undefined
        console.error('Error message:', errorMessage)
        console.error('Error stack:', errorStack)

        return res.status(500).json({
            error: 'Deposit initialization failed',
            message: errorMessage,
            details:
                process.env.NODE_ENV === 'development' ? errorStack : undefined,
        })
    }
}
