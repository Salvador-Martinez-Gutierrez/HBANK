import { NextApiRequest, NextApiResponse } from 'next'
import { HederaService } from '../../../../src/services/hederaService'
import { WithdrawService } from '../../../../src/services/withdrawService'
import {
    NUMERIC,
    TOKENS,
    ACCOUNTS,
} from '../../../../src/app/backend-constants'
import {
    Client,
    AccountId,
    PrivateKey,
    TokenId,
    TransferTransaction,
    TopicMessageSubmitTransaction,
    TopicId,
} from '@hashgraph/sdk'

interface InstantWithdrawRequest {
    userAccountId: string
    amountHUSD: number
    rate: number
    rateSequenceNumber: string
    requestType: 'instant'
}

interface InstantWithdrawResponse {
    success: boolean
    txId?: string
    grossUSDC?: number
    fee?: number
    netUSDC?: number
    error?: string
    currentRate?: unknown // For rate conflict responses
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<InstantWithdrawResponse>
) {
    console.log('🚀 [INSTANT WITHDRAW] Starting handler...')
    console.log('📋 [INSTANT WITHDRAW] Method:', req.method)
    console.log('📋 [INSTANT WITHDRAW] Body keys:', Object.keys(req.body || {}))

    if (req.method !== 'POST') {
        console.log('❌ [INSTANT WITHDRAW] Method not allowed')
        return res.status(405).json({
            success: false,
            error: 'Method not allowed',
        })
    }

    try {
        console.log('🔍 [INSTANT WITHDRAW] Parsing request body...')

        const {
            userAccountId,
            amountHUSD,
            rate,
            rateSequenceNumber,
            requestType,
        }: InstantWithdrawRequest = req.body

        console.log('⚡ [INSTANT WITHDRAW] Data parsed successfully:', {
            userAccountId,
            amountHUSD,
            rate,
            rateSequenceNumber,
            requestType,
        })

        // Basic validation first
        if (requestType !== 'instant') {
            console.log(
                '❌ [INSTANT WITHDRAW] Invalid request type:',
                requestType
            )
            return res.status(400).json({
                success: false,
                error: 'Invalid request type. Expected "instant"',
            })
        }

        // Validate required fields
        if (!userAccountId || !amountHUSD || !rate || !rateSequenceNumber) {
            console.log('❌ [INSTANT WITHDRAW] Missing fields:', {
                userAccountId: !!userAccountId,
                amountHUSD: !!amountHUSD,
                rate: !!rate,
                rateSequenceNumber: !!rateSequenceNumber,
            })
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
            })
        }

        // Validate userAccountId format
        if (!userAccountId.match(/^\d+\.\d+\.\d+$/)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid userAccountId format. Expected format: x.x.x',
            })
        }

        if (amountHUSD <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be greater than 0',
            })
        }

        console.log('🔍 [INSTANT WITHDRAW] Creating services...')
        const withdrawService = new WithdrawService()
        const hederaService = new HederaService()
        console.log('✅ [INSTANT WITHDRAW] Services created successfully')

        // Validate environment variables
        const instantWithdrawWalletId = process.env.INSTANT_WITHDRAW_WALLET_ID
        const instantWithdrawWalletKey = process.env.INSTANT_WITHDRAW_WALLET_KEY
        const usdcTokenId = TOKENS.usdc
        const emissionsWalletId = ACCOUNTS.emissions

        if (
            !instantWithdrawWalletId ||
            !instantWithdrawWalletKey ||
            !usdcTokenId ||
            !emissionsWalletId
        ) {
            console.log(
                '❌ [INSTANT WITHDRAW] Missing environment variables:',
                {
                    instantWithdrawWalletId: !!instantWithdrawWalletId,
                    instantWithdrawWalletKey: !!instantWithdrawWalletKey,
                    usdcTokenId: !!usdcTokenId,
                    emissionsWalletId: !!emissionsWalletId,
                }
            )
            return res.status(500).json({
                success: false,
                error: 'Missing required environment variables',
            })
        }

        console.log('📋 [INSTANT WITHDRAW] Environment variables loaded:', {
            instantWithdrawWalletId,
            usdcTokenId,
            emissionsWalletId,
        })

        // Step 1: Validate rate against latest published rate in HCS
        console.log('🔍 [INSTANT WITHDRAW] Validating rate against HCS...')
        const isRateValid = await withdrawService.validateRate(
            rate,
            rateSequenceNumber
        )

        if (!isRateValid) {
            console.log('❌ [INSTANT WITHDRAW] Rate validation failed')
            const latestRate = await withdrawService.rateService.getLatestRate()
            return res.status(409).json({
                success: false,
                error: 'Rate has changed',
                currentRate: latestRate,
            })
        }

        console.log('✅ [INSTANT WITHDRAW] Rate validation passed')

        // Step 2: Calculate amounts using backend constants
        const grossUSDC = amountHUSD * rate
        const fee = grossUSDC * NUMERIC.INSTANT_WITHDRAW_FEE
        const netUSDC = grossUSDC - fee

        console.log('💰 [INSTANT WITHDRAW] Calculated amounts:', {
            grossUSDC,
            fee: `${fee} (${NUMERIC.INSTANT_WITHDRAW_FEE * 100}%)`,
            netUSDC,
        })

        // Step 3: Check if instant withdraw wallet has enough USDC
        const instantWithdrawWalletBalance = await hederaService.checkBalance(
            instantWithdrawWalletId,
            usdcTokenId
        )

        console.log('🏦 [INSTANT WITHDRAW] Wallet balance check:', {
            walletId: instantWithdrawWalletId,
            balance: instantWithdrawWalletBalance,
            required: netUSDC,
            hasSufficient: instantWithdrawWalletBalance >= netUSDC,
        })

        if (instantWithdrawWalletBalance < netUSDC) {
            return res.status(400).json({
                success: false,
                error: `Insufficient balance in instant withdraw wallet. Available: ${instantWithdrawWalletBalance} USDC, Required: ${netUSDC} USDC`,
            })
        }

        // Step 4: Verify HUSD transfer from user to emissions wallet
        console.log(
            '🔍 [INSTANT WITHDRAW] Verifying HUSD transfer to emissions wallet...'
        )

        // Check for transfers in the last 5 minutes
        const since = new Date(Date.now() - 5 * 60 * 1000).toISOString()

        const husdTransferVerified = await hederaService.verifyHUSDTransfer(
            userAccountId,
            emissionsWalletId,
            amountHUSD,
            since
        )

        console.log(
            '🔍 [INSTANT WITHDRAW] HUSD transfer verification result:',
            {
                from: userAccountId,
                to: emissionsWalletId,
                token: TOKENS.husd,
                amount: amountHUSD * NUMERIC.HUSD_MULTIPLIER,
                verified: husdTransferVerified,
            }
        )

        if (!husdTransferVerified) {
            return res.status(400).json({
                success: false,
                error: `HUSD transfer not found. Expected transfer of ${amountHUSD} HUSD from ${userAccountId} to emissions wallet ${emissionsWalletId}`,
            })
        }

        console.log('✅ [INSTANT WITHDRAW] HUSD transfer verified')

        // Step 5: Create and submit USDC transfer transaction
        console.log(
            '📝 [INSTANT WITHDRAW] Creating USDC transfer transaction...'
        )

        const client = Client.forTestnet().setOperator(
            AccountId.fromString(instantWithdrawWalletId),
            PrivateKey.fromString(instantWithdrawWalletKey)
        )

        const transferTx = new TransferTransaction()
            .addTokenTransfer(
                TokenId.fromString(usdcTokenId),
                AccountId.fromString(instantWithdrawWalletId),
                -(netUSDC * NUMERIC.USDC_MULTIPLIER)
            )
            .addTokenTransfer(
                TokenId.fromString(usdcTokenId),
                AccountId.fromString(userAccountId),
                netUSDC * NUMERIC.USDC_MULTIPLIER
            )
            .setTransactionMemo(
                `Instant withdraw: ${amountHUSD} HUSD -> ${netUSDC} USDC`
            )
            .freezeWith(client)

        const transferTxResponse = await transferTx.execute(client)
        const transferReceipt = await transferTxResponse.getReceipt(client)
        const transferTxId = transferTxResponse.transactionId.toString()

        console.log('✅ [INSTANT WITHDRAW] USDC transfer completed:', {
            txId: transferTxId,
            status: transferReceipt.status.toString(),
            from: instantWithdrawWalletId,
            to: userAccountId,
            amount: netUSDC,
            fee: fee,
        })

        // Step 6: Submit withdrawal record to HCS topic
        console.log(
            '📝 [INSTANT WITHDRAW] Submitting withdrawal record to HCS...'
        )

        const withdrawRecord = {
            type: 'instant_withdraw',
            userAccountId,
            amountHUSD,
            amountUSDC: netUSDC,
            fee,
            rate,
            rateSequenceNumber,
            transferTxId,
            timestamp: new Date().toISOString(),
        }

        const topicTx = new TopicMessageSubmitTransaction({
            topicId: TopicId.fromString(
                process.env.WITHDRAW_TOPIC_ID || '0.0.6908395'
            ),
            message: JSON.stringify(withdrawRecord),
        }).freezeWith(client)

        const topicTxResponse = await topicTx.execute(client)
        const topicReceipt = await topicTxResponse.getReceipt(client)
        const topicTxId = topicTxResponse.transactionId.toString()

        console.log('✅ [INSTANT WITHDRAW] HCS record submitted:', {
            txId: topicTxId,
            status: topicReceipt.status.toString(),
        })

        // Success response
        console.log('🎉 [INSTANT WITHDRAW] Process completed successfully')

        return res.status(200).json({
            success: true,
            txId: transferTxId,
            grossUSDC,
            fee,
            netUSDC,
        })
    } catch (error) {
        console.error('❌ [INSTANT WITHDRAW] Unexpected error:', error)

        const errorMessage =
            error instanceof Error ? error.message : 'Unknown error occurred'

        return res.status(500).json({
            success: false,
            error: `Internal server error: ${errorMessage}`,
        })
    }
}
