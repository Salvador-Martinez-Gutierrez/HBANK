import type { NextApiRequest, NextApiResponse } from 'next'
import { WithdrawService } from '@/services/withdrawService'
import { HederaService } from '@/services/hederaService'

interface WithdrawProcessingResult {
    success: boolean
    message: string
    processed: number
    completed: number
    failed: number
    errors: string[]
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<WithdrawProcessingResult>
) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            message: 'Method not allowed',
            processed: 0,
            completed: 0,
            failed: 0,
            errors: ['Method not allowed'],
        })
    }

    try {
        console.log('🔄 Starting withdrawal processing worker...')

        const withdrawService = new WithdrawService()
        const hederaService = new HederaService()

        // Get all pending withdrawals that are ready to be processed
        const pendingWithdrawals = await withdrawService.getPendingWithdrawals()

        console.log(
            `Found ${pendingWithdrawals.length} pending withdrawals to process`
        )

        const results = {
            processed: pendingWithdrawals.length,
            completed: 0,
            failed: 0,
            errors: [] as string[],
        }

        // Process each withdrawal
        for (const withdrawal of pendingWithdrawals) {
            try {
                console.log(`Processing withdrawal ${withdrawal.requestId}...`)

                // ⚠️ CRITICAL SECURITY CHECK ⚠️
                // Verify that the user actually sent their HUSD before sending any USDC

                console.log(`🔍 Verifying Schedule Transaction execution...`)
                console.log(`   Schedule ID: ${withdrawal.scheduleId}`)
                console.log(`   User: ${withdrawal.user}`)
                console.log(`   Amount: ${withdrawal.amountHUSD} HUSD`)

                // Step 1: Verify the Schedule Transaction was executed
                const scheduleExecuted =
                    await hederaService.verifyScheduleTransactionExecuted(
                        withdrawal.scheduleId
                    )

                if (!scheduleExecuted) {
                    console.log(
                        `❌ Schedule Transaction ${withdrawal.scheduleId} not executed`
                    )
                    console.log(
                        `📋 User must sign the Schedule Transaction to complete HUSD transfer`
                    )

                    await hederaService.publishWithdrawResult(
                        withdrawal.requestId,
                        'failed',
                        undefined,
                        'Schedule Transaction not executed. User must sign the transaction to send HUSD.'
                    )

                    results.failed++
                    results.errors.push(
                        `Schedule not executed: ${withdrawal.requestId}`
                    )
                    continue
                }

                console.log(
                    `✅ Schedule Transaction ${withdrawal.scheduleId} was executed`
                )

                // Step 2: Verify HUSD was actually transferred to treasury
                const treasuryId = process.env.TREASURY_ID!
                const husdTransferVerified =
                    await hederaService.verifyHUSDTransfer(
                        withdrawal.user,
                        treasuryId,
                        withdrawal.amountHUSD,
                        withdrawal.requestedAt
                    )

                if (!husdTransferVerified) {
                    console.log(`❌ HUSD transfer verification failed`)
                    console.log(
                        `📋 Expected ${withdrawal.amountHUSD} HUSD from ${withdrawal.user} to ${treasuryId}`
                    )

                    await hederaService.publishWithdrawResult(
                        withdrawal.requestId,
                        'failed',
                        undefined,
                        'HUSD transfer verification failed. Transfer not found in treasury.'
                    )

                    results.failed++
                    results.errors.push(
                        `HUSD transfer not verified: ${withdrawal.requestId}`
                    )
                    continue
                }

                console.log(
                    `✅ HUSD transfer verified: ${withdrawal.amountHUSD} HUSD received`
                )

                // Step 3: All verifications passed - proceed with USDC transfer
                console.log(
                    `🚀 All verifications passed, proceeding with USDC withdrawal...`
                )

                const usdcAmount = withdrawal.amountHUSD * withdrawal.rate
                const usdcTokenId = process.env.USDC_TOKEN_ID!

                // Check treasury USDC balance
                const treasuryBalance = await hederaService.checkBalance(
                    treasuryId,
                    usdcTokenId
                )
                console.log(
                    `Treasury USDC balance: ${treasuryBalance}, Required: ${usdcAmount}`
                )

                if (treasuryBalance >= usdcAmount) {
                    console.log(
                        `✅ Sufficient balance, transferring ${usdcAmount} USDC to ${withdrawal.user}`
                    )

                    try {
                        const txId = await hederaService.transferUSDCToUser(
                            withdrawal.user,
                            usdcAmount
                        )

                        await hederaService.publishWithdrawResult(
                            withdrawal.requestId,
                            'completed',
                            txId
                        )

                        results.completed++
                        console.log(
                            `✅ Withdrawal ${withdrawal.requestId} completed successfully`
                        )
                    } catch (transferError) {
                        console.error(
                            `Failed to transfer USDC for ${withdrawal.requestId}:`,
                            transferError
                        )

                        console.log(
                            `🔄 USDC transfer failed, attempting to rollback HUSD...`
                        )

                        try {
                            // Rollback the HUSD to the user since the USDC transfer failed
                            const rollbackTxId =
                                await hederaService.rollbackHUSDToUser(
                                    withdrawal.user,
                                    withdrawal.amountHUSD
                                )

                            console.log(
                                `✅ HUSD rollback completed after USDC transfer failure: ${rollbackTxId}`
                            )

                            await hederaService.publishWithdrawResult(
                                withdrawal.requestId,
                                'failed',
                                rollbackTxId,
                                `USDC transfer failed: ${
                                    transferError instanceof Error
                                        ? transferError.message
                                        : transferError
                                }. HUSD tokens have been returned to your account.`
                            )

                            results.failed++
                            results.errors.push(
                                `USDC transfer failed, HUSD returned: ${withdrawal.requestId}`
                            )
                        } catch (rollbackError) {
                            console.error(
                                `❌ Failed to rollback HUSD after USDC transfer failure:`,
                                rollbackError
                            )

                            await hederaService.publishWithdrawResult(
                                withdrawal.requestId,
                                'failed',
                                undefined,
                                `USDC transfer failed and failed to return HUSD: ${
                                    transferError instanceof Error
                                        ? transferError.message
                                        : transferError
                                }. Rollback error: ${
                                    rollbackError instanceof Error
                                        ? rollbackError.message
                                        : rollbackError
                                }`
                            )

                            results.failed++
                            results.errors.push(
                                `Critical error - USDC failed and HUSD not returned: ${withdrawal.requestId}`
                            )
                        }
                    }
                } else {
                    console.log(`❌ Insufficient treasury USDC balance`)
                    console.log(`🔄 Attempting to rollback HUSD to user...`)

                    try {
                        // Rollback the HUSD to the user since we can't complete the withdrawal
                        const rollbackTxId =
                            await hederaService.rollbackHUSDToUser(
                                withdrawal.user,
                                withdrawal.amountHUSD
                            )

                        console.log(
                            `✅ HUSD rollback completed: ${rollbackTxId}`
                        )

                        await hederaService.publishWithdrawResult(
                            withdrawal.requestId,
                            'failed',
                            rollbackTxId,
                            'Insufficient treasury USDC balance. HUSD tokens have been returned to your account.'
                        )

                        results.failed++
                        results.errors.push(
                            `Insufficient USDC balance, HUSD returned: ${withdrawal.requestId}`
                        )
                    } catch (rollbackError) {
                        console.error(
                            `❌ Failed to rollback HUSD:`,
                            rollbackError
                        )

                        await hederaService.publishWithdrawResult(
                            withdrawal.requestId,
                            'failed',
                            undefined,
                            `Insufficient treasury USDC balance and failed to return HUSD: ${
                                rollbackError instanceof Error
                                    ? rollbackError.message
                                    : rollbackError
                            }`
                        )

                        results.failed++
                        results.errors.push(
                            `Critical error - HUSD not returned: ${withdrawal.requestId}`
                        )
                    }
                }
            } catch (error) {
                console.error(
                    `Error processing withdrawal ${withdrawal.requestId}:`,
                    error
                )
                results.errors.push(
                    `Error processing withdrawal ${withdrawal.requestId}: ${error}`
                )
                results.failed++
            }
        }

        console.log('✅ Withdrawal processing worker completed:', results)

        const message =
            results.processed === 0
                ? 'No pending withdrawals to process'
                : 'Withdrawal processing completed'

        return res.status(200).json({
            success: true,
            message,
            ...results,
        })
    } catch (error) {
        console.error('❌ Error in withdrawal processing worker:', error)
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            processed: 0,
            completed: 0,
            failed: 0,
            errors: [error instanceof Error ? error.message : String(error)],
        })
    }
}
