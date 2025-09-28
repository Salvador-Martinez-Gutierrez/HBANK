import { NextApiRequest, NextApiResponse } from 'next'
import { HederaService } from '@/services/hederaService'
import { WithdrawService } from '@/services/withdrawService'
import { TelegramService } from '@/services/telegramService'
import { ACCOUNTS } from '@/app/backend-constants'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { userAccountId, amountHUSD, rate, rateSequenceNumber } = req.body

        // Validate required fields
        if (!userAccountId || !amountHUSD || !rate || !rateSequenceNumber) {
            return res.status(400).json({
                error: 'Missing required fields: userAccountId, amountHUSD, rate, rateSequenceNumber',
            })
        }

        // Validate amount
        if (amountHUSD <= 0) {
            return res.status(400).json({
                error: 'Amount must be positive',
            })
        }

        // Validate rate
        if (rate <= 0) {
            return res.status(400).json({
                error: 'Rate must be positive',
            })
        }

        console.log('Processing withdrawal request:', {
            userAccountId,
            amountHUSD,
            rate,
            rateSequenceNumber,
        })

        const withdrawService = new WithdrawService()
        const hederaService = new HederaService()

        // Step 1: Validate rate against latest published rate
        const isRateValid = await withdrawService.validateRate(
            rate,
            rateSequenceNumber
        )

        if (!isRateValid) {
            // Get the latest rate to return to the frontend
            const latestRate = await withdrawService.rateService.getLatestRate()
            return res.status(409).json({
                error: 'Rate has changed',
                currentRate: latestRate,
            })
        }

        // Step 2: Verify HUSD transfer from user to emissions wallet
        // (User should have already executed this transfer in frontend, like instant withdraw)
        console.log('🔍 Verifying HUSD transfer to emissions wallet...')

        const emissionsWalletId = ACCOUNTS.emissions
        console.log('📋 Using emissions wallet:', emissionsWalletId)

        // Check for transfers in the last 10 minutes
        const since = new Date(Date.now() - 10 * 60 * 1000).toISOString()

        console.log('🔍 [STANDARD WITHDRAW] HUSD transfer search parameters:', {
            from: userAccountId,
            to: emissionsWalletId,
            expectedAmount: amountHUSD,
            since: since,
        })

        const husdTransferVerified = await hederaService.verifyHUSDTransfer(
            userAccountId,
            emissionsWalletId,
            amountHUSD,
            since
        )

        console.log(
            '🔍 [STANDARD WITHDRAW] HUSD transfer verification result:',
            {
                from: userAccountId,
                to: emissionsWalletId,
                expectedAmount: amountHUSD,
                verified: husdTransferVerified,
            }
        )

        if (!husdTransferVerified) {
            return res.status(400).json({
                error: `HUSD transfer not found. Expected transfer of ${amountHUSD} HUSD from ${userAccountId} to emissions wallet ${emissionsWalletId}`,
            })
        }

        console.log('✅ HUSD transfer verified for standard withdrawal')

        // Step 3: Publish withdrawal request to HCS as "pending"
        let withdrawRequestTxId
        let requestId
        try {
            // Generate unique request ID
            requestId = `withdraw_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`

            // Create withdrawal record for HCS (no transferTxId since it's already verified)
            withdrawRequestTxId = await hederaService.publishWithdrawRequest(
                requestId,
                userAccountId,
                amountHUSD,
                rate,
                rateSequenceNumber,
                'verified' // Indicates HUSD already transferred and verified
            )
        } catch (publishError) {
            console.error('Failed to publish withdrawal request:', publishError)

            // Note: HUSD transfer already completed and verified, cannot rollback
            // Manual intervention may be required if HCS publishing fails

            return res.status(500).json({
                error: 'Failed to publish withdrawal request. HUSD transfer was successful but record not saved.',
            })
        }

        // Calculate unlock time (48 hours from now)
        const unlockAt = new Date(
            Date.now() + 48 * 60 * 60 * 1000
        ).toISOString()

        console.log('✅ Withdrawal request processed successfully:', {
            requestId,
            withdrawRequestTxId,
            unlockAt,
        })

        return res.status(200).json({
            success: true,
            requestId,
            withdrawRequestTxId,
            unlockAt,
            message:
                'Withdrawal request submitted. HUSD received and funds will be processed after 48h lock period.',
        })
    } catch (error) {
        console.error('❌ Error processing withdrawal request:', error)
        return res.status(500).json({
            error: 'Internal server error',
        })
    }
}
