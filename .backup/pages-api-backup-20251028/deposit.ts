import { NextApiRequest, NextApiResponse } from 'next'
import {
    Client,
    TransferTransaction,
    AccountId,
    PrivateKey,
} from '@hashgraph/sdk'
import { HederaRateService } from '../../src/services/hederaRateService'

/**
 * POST /api/deposit
 *
 * Handles USDC deposits with rate validation and schedules hUSD minting
 *
 * @param req - Request object containing accountId, amountUsdc, rate, and sequenceNumber
 * @param res - Response object
 *
 * @example
 * POST /api/deposit
 * {
 *   "userAccountId": "0.0.12345",
 *   "amount": 100000000,
 *   "depositTxId": "0.0.1234@1234567890.123456789",
 *   "expectedRate": 1.005,
 *   "rateSequenceNumber": "123",
 *   "rateTimestamp": "1234567890.123456789"
 * }
 *
 * @returns
 * {
 *   "success": true,
 *   "hUSDTxId": "0.0.9999@1234567890.123456789",
 *   "hUSDReceived": 99502487,
 *   "actualRate": 1.005
 * }
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    console.log('=== DEPOSIT ENDPOINT CALLED ===')
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
            depositTxId, // ID of the already executed transaction
            expectedRate, // Rate expected by the frontend
            rateSequenceNumber, // Sequence number of the rate
            rateTimestamp, // Timestamp of the rate
        } = req.body

        // Field validation
        if (
            !userAccountId ||
            !amount ||
            !depositTxId ||
            !expectedRate ||
            !rateSequenceNumber
        ) {
            console.error('Missing fields:', {
                userAccountId: !!userAccountId,
                amount: !!amount,
                depositTxId: !!depositTxId,
                expectedRate: !!expectedRate,
                rateSequenceNumber: !!rateSequenceNumber,
            })
            return res.status(400).json({
                error: 'Missing required fields',
                details: {
                    userAccountId: !!userAccountId,
                    amount: !!amount,
                    depositTxId: !!depositTxId,
                    expectedRate: !!expectedRate,
                    rateSequenceNumber: !!rateSequenceNumber,
                },
            })
        }

        console.log('Processing deposit:', {
            user: userAccountId,
            amount: amount,
            depositTx: depositTxId,
            expectedRate,
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
            Math.abs(latestRate.rate - expectedRate) < 0.0001 // Allow small floating point differences

        if (!rateMatches) {
            console.log('Rate validation failed:', {
                expected: {
                    rate: expectedRate,
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
                    rate: expectedRate,
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

        if (!depositWalletId || !depositWalletKey) {
            console.error('Missing environment variables:', {
                DEPOSIT_WALLET_ID: !!depositWalletId,
                DEPOSIT_WALLET_KEY: !!depositWalletKey,
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

        client.setOperator(depositWalletAccountId, depositWalletPrivateKey)
        console.log(
            'Client configured for deposit wallet:',
            depositWalletAccountId.toString()
        )

        // Verify the deposit on Mirror Node
        const mirrorTxId = depositTxId
            .replace('@', '-')
            .replace(/(\d+)\.(\d+)$/, '$1-$2')
        const mirrorUrl = `https://testnet.mirrornode.hedera.com/api/v1/transactions/${mirrorTxId}`
        console.log('Verifying deposit on mirror node:', mirrorUrl)

        let mirrorVerified = false
        for (let i = 0; i < 3; i++) {
            try {
                const mirrorResponse = await fetch(mirrorUrl)
                const mirrorData = await mirrorResponse.json()
                console.log('Mirror node response:', mirrorData)

                if (
                    mirrorData.transactions &&
                    Array.isArray(mirrorData.transactions) &&
                    mirrorData.transactions.length > 0 &&
                    mirrorData.transactions[0]?.result === 'SUCCESS'
                ) {
                    mirrorVerified = true
                    break
                }
            } catch (error) {
                // Ignore error, retry
                console.warn('Mirror node retry failed:', error)
            }
            // Wait 2 seconds before retrying
            await new Promise((resolve) => setTimeout(resolve, 2000))
        }
        if (!mirrorVerified) {
            console.warn(
                'Mirror node verification could not confirm deposit. Continuing anyway.'
            )
        }

        const usdcDecimals = 6
        const husdDecimals = 3

        // amount received in minimum USDC units
        const amountInUSDC = Number(amount)

        // Convert to hUSD using the validated rate
        // amountInUSDC is in minimum units (1 USDC = 1,000,000 units)
        // Convert to actual USDC value first
        const actualUSDCAmount = amountInUSDC / Math.pow(10, usdcDecimals)

        // Apply the exchange rate
        const actualHUSDAmount = actualUSDCAmount / latestRate.rate

        // Convert to minimum hUSD units
        const amountToTransfer = Math.floor(
            actualHUSDAmount * Math.pow(10, husdDecimals)
        )

        console.log('Amount calculation:', {
            usdcMinimumUnits: amountInUSDC,
            actualUSDC: actualUSDCAmount,
            rate: latestRate.rate,
            actualHUSD: actualHUSDAmount,
            husdMinimumUnits: amountToTransfer,
        })

        // Create hUSD transfer (from emissions wallet to user)
        const emissionsWalletId = process.env.EMISSIONS_ID!
        const hUSDTransfer = new TransferTransaction()
            .addTokenTransfer(
                process.env.HUSD_TOKEN_ID!,
                AccountId.fromString(emissionsWalletId),
                -amountToTransfer
            )
            .addTokenTransfer(
                process.env.HUSD_TOKEN_ID!,
                AccountId.fromString(userAccountId),
                amountToTransfer
            )
            .setTransactionMemo(`hUSD for deposit ${depositTxId}`)

        // Freeze and sign with emissions wallet key
        const emissionsWalletKey = process.env.EMISSIONS_KEY!
        const emissionsPrivateKey = PrivateKey.fromString(emissionsWalletKey)
        const frozenTx = hUSDTransfer.freezeWith(client)
        const signedTx = await frozenTx.sign(emissionsPrivateKey)

        console.log('Executing hUSD transfer...')

        // Execute
        const response = await signedTx.execute(client)
        console.log(
            'Transaction submitted:',
            response.transactionId?.toString()
        )

        // Get receipt
        const receipt = await response.getReceipt(client)
        console.log('Receipt status:', receipt.status.toString())

        if (receipt.status.toString() !== 'SUCCESS') {
            throw new Error(`Transaction failed with status: ${receipt.status}`)
        }

        const result = {
            success: true,
            hUSDTxId: response.transactionId?.toString(),
            hUSDReceived: amountToTransfer,
            actualRate: latestRate.rate,
            rateSequenceNumber: latestRate.sequenceNumber,
            status: receipt.status.toString(),
        }

        console.log('=== DEPOSIT SUCCESSFUL ===', result)
        return res.status(200).json(result)
    } catch (error: unknown) {
        console.error('=== DEPOSIT ERROR ===')
        const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
        const errorStack = error instanceof Error ? error.stack : undefined
        console.error('Error message:', errorMessage)
        console.error('Error stack:', errorStack)

        return res.status(500).json({
            error: 'Deposit failed',
            message: errorMessage,
            details:
                process.env.NODE_ENV === 'development' ? errorStack : undefined,
        })
    }
}
