import { NextApiRequest, NextApiResponse } from 'next'
import { HederaService } from '@/services/hederaService'
import { WithdrawService } from '@/services/withdrawService'

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

        // Step 2: Execute HUSD transfer from user to treasury
        let transferTxId: string
        try {
            transferTxId = await hederaService.transferHUSDToTreasury(
                userAccountId,
                amountHUSD
            )
        } catch (transferError) {
            console.error('Failed to transfer HUSD to treasury:', transferError)
            return res.status(500).json({
                error: 'Failed to transfer HUSD to treasury',
            })
        }

        // Step 3: Publish withdrawal request to HCS
        let withdrawRequestTxId
        let requestId
        try {
            // Generate unique request ID
            requestId = `withdraw_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`

            withdrawRequestTxId = await hederaService.publishWithdrawRequest(
                requestId,
                userAccountId,
                amountHUSD,
                rate,
                rateSequenceNumber,
                transferTxId // This is the Schedule ID that user needs to sign
            )
        } catch (publishError) {
            console.error('Failed to publish withdrawal request:', publishError)

            // Try to rollback the transfer
            try {
                await hederaService.rollbackHUSDToUser(
                    userAccountId,
                    amountHUSD
                )
                console.log('Successfully rolled back HUSD transfer')
            } catch (rollbackError) {
                console.error(
                    'Failed to rollback HUSD transfer:',
                    rollbackError
                )
            }

            return res.status(500).json({
                error: 'Failed to publish withdrawal request',
            })
        }

        // Calculate unlock time (48 hours from now)
        const unlockAt = new Date(
            Date.now() + 48 * 60 * 60 * 1000
        ).toISOString()

        console.log('✅ Withdrawal request processed successfully:', {
            requestId,
            transferTxId,
            unlockAt,
        })

        return res.status(200).json({
            success: true,
            requestId,
            withdrawRequestTxId,
            transferTxId,
            unlockAt,
            message:
                'Withdrawal request submitted. Funds will be processed after 48h lock period.',
        })
    } catch (error) {
        console.error('❌ Error processing withdrawal request:', error)
        return res.status(500).json({
            error: 'Internal server error',
        })
    }
}
