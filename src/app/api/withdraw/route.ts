/**
 * Standard withdrawal endpoint
 *
 * POST /api/withdraw
 *
 * Processes standard withdrawals with 48h lock period
 *
 * @deprecated Contains business logic that should be in services
 * TODO: Move to WithdrawService in Phase 2.4
 */

import { NextRequest, NextResponse } from 'next/server'
import { HederaService } from '@/services/hederaService'
import { WithdrawService } from '@/services/withdrawService'
import { ACCOUNTS } from '@/app/backend-constants'

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const body = await req.json()
        const { userAccountId, amountHUSD, rate, rateSequenceNumber } = body

        // Validate required fields
        if (!userAccountId || !amountHUSD || !rate || !rateSequenceNumber) {
            return NextResponse.json(
                {
                    error: 'Missing required fields: userAccountId, amountHUSD, rate, rateSequenceNumber',
                },
                { status: 400 }
            )
        }

        // Validate amount
        if (amountHUSD <= 0) {
            return NextResponse.json(
                {
                    error: 'Amount must be positive',
                },
                { status: 400 }
            )
        }

        // Validate rate
        if (rate <= 0) {
            return NextResponse.json(
                {
                    error: 'Rate must be positive',
                },
                { status: 400 }
            )
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
            return NextResponse.json(
                {
                    error: 'Rate has changed',
                    currentRate: latestRate,
                },
                { status: 409 }
            )
        }

        // Step 2: Verify HUSD transfer from user to emissions wallet
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
            return NextResponse.json(
                {
                    error: `HUSD transfer not found. Expected transfer of ${amountHUSD} HUSD from ${userAccountId} to emissions wallet ${emissionsWalletId}`,
                },
                { status: 400 }
            )
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

            // Create withdrawal record for HCS
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

            return NextResponse.json(
                {
                    error: 'Failed to publish withdrawal request. HUSD transfer was successful but record not saved.',
                },
                { status: 500 }
            )
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

        return NextResponse.json({
            success: true,
            requestId,
            withdrawRequestTxId,
            unlockAt,
            message:
                'Withdrawal request submitted. HUSD received and funds will be processed after 48h lock period.',
        })
    } catch (error) {
        console.error('❌ Error processing withdrawal request:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
            },
            { status: 500 }
        )
    }
}
