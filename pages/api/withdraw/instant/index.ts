import { NextApiRequest, NextApiResponse } from 'next'
import { HederaService } from '@/services/hederaService'
import { WithdrawService } from '@/services/withdrawService'
import { INSTANT_WITHDRAW_FEE } from '@/app/server-constants'
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
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed',
        })
    }

    try {
        const {
            userAccountId,
            amountHUSD,
            rate,
            rateSequenceNumber,
            requestType,
        }: InstantWithdrawRequest = req.body

        console.log('⚡ Processing instant withdrawal:', {
            userAccountId,
            amountHUSD,
            rate,
            rateSequenceNumber,
            requestType,
        })

        // Validate request type
        if (requestType !== 'instant') {
            return res.status(400).json({
                success: false,
                error: 'Invalid request type. Expected "instant"',
            })
        }

        // Validate required fields
        if (!userAccountId || !amountHUSD || !rate || !rateSequenceNumber) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
            })
        }

        if (amountHUSD <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be greater than 0',
            })
        }

        const withdrawService = new WithdrawService()
        const hederaService = new HederaService()

        // Step 1: Validate rate against latest published rate in HCS
        console.log('🔍 Validating rate against HCS...')
        const isRateValid = await withdrawService.validateRate(
            rate,
            rateSequenceNumber
        )

        if (!isRateValid) {
            console.log('❌ Rate validation failed')
            const latestRate = await withdrawService.rateService.getLatestRate()
            return res.status(409).json({
                success: false,
                error: 'Rate has changed',
                currentRate: latestRate, // adding currentRate for consistency with existing withdraw endpoint
            })
        }

        console.log('✅ Rate validation successful')

        // Step 2: Calculate amounts
        const grossUSDC = amountHUSD * rate
        const fee = grossUSDC * INSTANT_WITHDRAW_FEE
        const netUSDC = grossUSDC - fee

        console.log('💰 Amount calculations:', {
            amountHUSD,
            rate,
            grossUSDC,
            fee: `${fee} (${INSTANT_WITHDRAW_FEE * 100}%)`,
            netUSDC,
        })

        // Step 3: Check treasury USDC balance
        const treasuryId = process.env.TREASURY_ID!
        const usdcTokenId = process.env.USDC_TOKEN_ID!
        const treasuryUSDCBalance = await hederaService.checkBalance(
            treasuryId,
            usdcTokenId
        )

        console.log(
            `🏦 Treasury USDC balance: ${treasuryUSDCBalance}, Required: ${netUSDC}`
        )

        if (treasuryUSDCBalance < netUSDC) {
            console.log('❌ Insufficient treasury USDC balance')
            return res.status(400).json({
                success: false,
                error: 'Insufficient treasury USDC balance for instant withdrawal',
            })
        }

        // Step 4: Verify that user sent HUSD to treasury
        console.log('🔍 Verifying HUSD transfer from user to treasury...')

        // For instant withdrawals, we need to verify the HUSD was transferred very recently
        // We'll check for transfers in the last 5 minutes
        const fiveMinutesAgo = new Date(
            Date.now() - 5 * 60 * 1000
        ).toISOString()

        // IMPORTANT: For instant withdrawals, the user sends the full hUSD amount they want to withdraw
        // The user sends exactly amountHUSD, and receives netUSDC after fees
        const actualHUSDToVerify = amountHUSD

        console.log('💡 HUSD amount verification:', {
            requestedAmountHUSD: amountHUSD,
            grossUSDC: grossUSDC,
            fee: fee,
            netUSDC: netUSDC,
            actualHUSDToVerify: actualHUSDToVerify,
            note: 'User sends the full hUSD amount, receives netUSDC after fee'
        })

        const husdTransferVerified = await hederaService.verifyHUSDTransfer(
            userAccountId,
            treasuryId,
            actualHUSDToVerify,
            fiveMinutesAgo
        )

        if (!husdTransferVerified) {
            console.log('❌ HUSD transfer verification failed')
            console.log(`📋 Expected ${actualHUSDToVerify.toFixed(8)} hUSD from ${userAccountId} to ${treasuryId}`)
            console.log(`💡 Note: User should send full hUSD amount (${actualHUSDToVerify.toFixed(8)} hUSD) to get ${netUSDC.toFixed(8)} USDC after fees`)
            return res.status(400).json({
                success: false,
                error: `HUSD transfer not verified. Please ensure you have sent ${actualHUSDToVerify.toFixed(8)} hUSD to the treasury.`,
            })
        }

        console.log('✅ HUSD transfer verified')

        // Step 5: Execute atomic USDC transfer to user
        console.log('🚀 Executing instant USDC transfer...')

        const instantWithdrawWalletId = process.env.INSTANT_WITHDRAW_WALLET_ID!
        const instantWithdrawWalletKey = process.env.INSTANT_WITHDRAW_WALLET_KEY!

        // Setup Hedera client
        const client = Client.forTestnet()
        client.setOperator(
            AccountId.fromString(instantWithdrawWalletId),
            PrivateKey.fromString(instantWithdrawWalletKey)
        )

        // Create atomic transfer transaction
        const transferTx = new TransferTransaction()
            .addTokenTransfer(
                TokenId.fromString(usdcTokenId),
                AccountId.fromString(instantWithdrawWalletId),
                -Math.floor(netUSDC * 1_000_000) // Convert to USDC minimum units (6 decimals)
            )
            .addTokenTransfer(
                TokenId.fromString(usdcTokenId),
                AccountId.fromString(userAccountId),
                Math.floor(netUSDC * 1_000_000) // Convert to USDC minimum units (6 decimals)
            )
            .setTransactionMemo(
                `Instant withdrawal: ${amountHUSD} hUSD -> ${netUSDC} USDC`
            )

        // Execute transaction
        const txResponse = await transferTx.execute(client)
        const receipt = await txResponse.getReceipt(client)

        if (receipt.status.toString() !== 'SUCCESS') {
            throw new Error(`Transaction failed with status: ${receipt.status}`)
        }

        const txId = txResponse.transactionId?.toString()
        console.log('✅ Instant USDC transfer completed:', txId)

        // Step 6: Publish instant withdrawal result to HCS
        console.log('📝 Publishing instant withdrawal result to HCS...')

        try {
            const requestId = `instant_withdraw_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`

            const instantWithdrawMessage = {
                type: 'instant_withdraw_result',
                requestId,
                user: userAccountId,
                amountHUSD,
                grossUSDC,
                fee,
                netUSDC,
                rate,
                rateSequenceNumber,
                txId,
                status: 'completed',
                processedAt: new Date().toISOString(),
            }

            // Publish to HCS topic using the same pattern as publishWithdrawResult
            const withdrawTopicId = process.env.WITHDRAW_TOPIC_ID!

            const response = await new TopicMessageSubmitTransaction()
                .setTopicId(TopicId.fromString(withdrawTopicId))
                .setMessage(JSON.stringify(instantWithdrawMessage))
                .execute(client)

            const hcsReceipt = await response.getReceipt(client)

            if (hcsReceipt.status.toString() !== 'SUCCESS') {
                console.warn(
                    '⚠️ Failed to publish to HCS:',
                    hcsReceipt.status.toString()
                )
            } else {
                console.log('✅ Instant withdrawal result published to HCS')
            }
        } catch (publishError) {
            console.warn(
                '⚠️ Failed to publish to HCS (transaction still succeeded):',
                publishError
            )
            // Don't fail the request if HCS publishing fails - the transaction already succeeded
        }

        console.log('🎉 Instant withdrawal completed successfully!')

        return res.status(200).json({
            success: true,
            txId,
            grossUSDC,
            fee,
            netUSDC,
        })
    } catch (error) {
        console.error('❌ Instant withdrawal error:', error)
        return res.status(500).json({
            success: false,
            error: 'Instant withdrawal failed',
            // details: error instanceof Error ? error.message : 'Unknown error',
        })
    }
}
