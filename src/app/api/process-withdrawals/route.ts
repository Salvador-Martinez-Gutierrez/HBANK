import { NextRequest, NextResponse } from 'next/server'
import { WithdrawService } from '@/services/withdrawService'
import { TelegramService } from '@/services/telegramService'
import { ACCOUNTS } from '@/app/backend-constants'
import { createScopedLogger } from '@/lib/logger'
import { container } from '@/core/di/container'
import { TYPES } from '@/core/di/types'
import {
    HederaBalanceService,
    HederaMirrorNodeService,
    HederaWithdrawalService,
} from '@/infrastructure/hedera'

const logger = createScopedLogger('api:process-withdrawals')

interface WithdrawProcessingResult {
    success: boolean
    message: string
    processed: number
    completed: number
    failed: number
    errors: string[]
}

export async function POST(_req: NextRequest): Promise<NextResponse> {
    try {
        logger.info('Starting withdrawal processing worker')

        const withdrawService = new WithdrawService()

        // Get Hedera services from DI container
        const balanceService = container.get<HederaBalanceService>(TYPES.HederaBalanceService)
        const mirrorNodeService = container.get<HederaMirrorNodeService>(TYPES.HederaMirrorNodeService)
        const withdrawalService = container.get<HederaWithdrawalService>(TYPES.HederaWithdrawalService)

        // Get all pending withdrawals that are ready to be processed
        const pendingWithdrawals = await withdrawService.getPendingWithdrawals()

        logger.info('Found pending withdrawals', {
            count: pendingWithdrawals.length,
        })

        const results = {
            processed: pendingWithdrawals.length,
            completed: 0,
            failed: 0,
            errors: [] as string[],
        }

        // Process each withdrawal
        for (const withdrawal of pendingWithdrawals) {
            try {
                logger.info('Processing withdrawal', {
                    requestId: withdrawal.requestId,
                })

                // ⚠️ CRITICAL SECURITY CHECK ⚠️
                // Verify that the user actually sent their HUSD before sending any USDC

                logger.info('Verifying Schedule Transaction execution', {
                    scheduleId: withdrawal.scheduleId,
                    user: withdrawal.user,
                    amountHUSD: withdrawal.amountHUSD,
                })

                // Check if this is a new-style withdrawal (HUSD already transferred)
                const isNewStyleWithdrawal =
                    withdrawal.scheduleId === 'verified'

                if (isNewStyleWithdrawal) {
                    logger.info(
                        'New-style withdrawal: HUSD already transferred, skipping schedule verification'
                    )
                } else {
                    logger.info('Legacy withdrawal: Verifying scheduled transaction')
                }

                // Step 1: Verify the Schedule Transaction was executed (only for legacy withdrawals)
                let scheduleExecuted = true // Default to true for new-style withdrawals

                if (!isNewStyleWithdrawal) {
                    scheduleExecuted =
                        await mirrorNodeService.verifyScheduleTransactionExecuted(
                            withdrawal.scheduleId
                        )
                }

                if (!scheduleExecuted) {
                    logger.warn('Schedule Transaction not executed', {
                        scheduleId: withdrawal.scheduleId,
                        requestId: withdrawal.requestId,
                    })

                    await withdrawalService.publishWithdrawResult(
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

                logger.info('Schedule Transaction executed', {
                    scheduleId: withdrawal.scheduleId,
                })

                // Step 2: Verify HUSD was actually transferred to emissions wallet
                // (Both standard and instant withdrawals now go to emissions wallet)
                const emissionsWalletId = ACCOUNTS.emissions

                // For new-style withdrawals, we don't need to verify HUSD again
                // because it was already verified when the withdrawal was requested
                let husdTransferVerified = true

                if (!isNewStyleWithdrawal) {
                    // Only verify for legacy withdrawals
                    husdTransferVerified =
                        await mirrorNodeService.verifyHUSDTransfer(
                            withdrawal.user,
                            emissionsWalletId,
                            withdrawal.amountHUSD,
                            withdrawal.requestedAt
                        )
                } else {
                    logger.info(
                        'New-style withdrawal: HUSD already verified during request, skipping verification'
                    )
                }

                if (!husdTransferVerified) {
                    logger.error('HUSD transfer verification failed', {
                        expectedAmount: withdrawal.amountHUSD,
                        from: withdrawal.user,
                        to: emissionsWalletId,
                    })

                    await withdrawalService.publishWithdrawResult(
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

                logger.info('HUSD transfer verified', {
                    amount: withdrawal.amountHUSD,
                })

                // Step 3: All verifications passed - proceed with USDC transfer
                logger.info('All verifications passed, proceeding with USDC withdrawal')

                const usdcAmount = withdrawal.amountHUSD * withdrawal.rate
                const usdcTokenId = process.env.USDC_TOKEN_ID ?? ''

                // Check Standard Withdraw USDC balance (USDC payments come from standard withdraw wallet)
                const standardWithdrawWalletId = ACCOUNTS.standardWithdraw
                const standardWithdrawBalance =
                    await balanceService.checkBalance(
                        standardWithdrawWalletId,
                        usdcTokenId
                    )
                logger.info('Standard Withdraw USDC balance check', {
                    balance: standardWithdrawBalance,
                    required: usdcAmount,
                })

                if (standardWithdrawBalance >= usdcAmount) {
                    logger.info('Sufficient balance, transferring USDC', {
                        amount: usdcAmount,
                        recipient: withdrawal.user,
                    })

                    try {
                        const txId = await withdrawalService.transferUSDCToUser(
                            withdrawal.user,
                            usdcAmount
                        )

                        await withdrawalService.publishWithdrawResult(
                            withdrawal.requestId,
                            'completed',
                            txId
                        )

                        // Send Telegram notification for successful standard withdrawal
                        try {
                            const telegramService = new TelegramService()
                            // Calculate the balance after withdrawal (balance before - amount sent)
                            const walletBalanceAfter =
                                standardWithdrawBalance - usdcAmount

                            await telegramService.sendWithdrawNotification({
                                type: 'standard',
                                userAccountId: withdrawal.user,
                                amountHUSD: withdrawal.amountHUSD,
                                amountUSDC: usdcAmount,
                                rate: withdrawal.rate,
                                txId: txId,
                                timestamp: new Date().toISOString(),
                                walletBalanceAfter,
                            })
                        } catch (telegramError) {
                            logger.error(
                                'Telegram notification failed for standard withdrawal',
                                {
                                    error:
                                        telegramError instanceof Error
                                            ? telegramError.message
                                            : String(telegramError),
                                }
                            )
                            // Don't fail the entire withdrawal process due to notification error
                        }

                        results.completed++
                        logger.info('Withdrawal completed successfully', {
                            requestId: withdrawal.requestId,
                        })
                    } catch (transferError) {
                        logger.error('Failed to transfer USDC', {
                            requestId: withdrawal.requestId,
                            error:
                                transferError instanceof Error
                                    ? transferError.message
                                    : String(transferError),
                        })

                        logger.info('USDC transfer failed, attempting to rollback HUSD')

                        try {
                            // Rollback the HUSD to the user since the USDC transfer failed
                            const rollbackTxId =
                                await withdrawalService.rollbackHUSDToUser(
                                    withdrawal.user,
                                    withdrawal.amountHUSD
                                )

                            logger.info(
                                'HUSD rollback completed after USDC transfer failure',
                                { rollbackTxId }
                            )

                            await withdrawalService.publishWithdrawResult(
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
                            logger.error(
                                'Failed to rollback HUSD after USDC transfer failure',
                                {
                                    error:
                                        rollbackError instanceof Error
                                            ? rollbackError.message
                                            : String(rollbackError),
                                }
                            )

                            await withdrawalService.publishWithdrawResult(
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
                    logger.warn('Insufficient Standard Withdraw USDC balance', {
                        balance: standardWithdrawBalance,
                        required: usdcAmount,
                    })
                    logger.info('Attempting to rollback HUSD to user')

                    try {
                        // Rollback the HUSD to the user since we can't complete the withdrawal
                        const rollbackTxId =
                            await withdrawalService.rollbackHUSDToUser(
                                withdrawal.user,
                                withdrawal.amountHUSD
                            )

                        logger.info('HUSD rollback completed', { rollbackTxId })

                        await withdrawalService.publishWithdrawResult(
                            withdrawal.requestId,
                            'failed',
                            rollbackTxId,
                            'Insufficient Standard Withdraw USDC balance. HUSD tokens have been returned to your account.'
                        )

                        results.failed++
                        results.errors.push(
                            `Insufficient USDC balance, HUSD returned: ${withdrawal.requestId}`
                        )
                    } catch (rollbackError) {
                        logger.error('Failed to rollback HUSD', {
                            error:
                                rollbackError instanceof Error
                                    ? rollbackError.message
                                    : String(rollbackError),
                        })

                        await withdrawalService.publishWithdrawResult(
                            withdrawal.requestId,
                            'failed',
                            undefined,
                            `Insufficient Standard Withdraw USDC balance and failed to return HUSD: ${
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
                logger.error('Error processing withdrawal', {
                    requestId: withdrawal.requestId,
                    error: error instanceof Error ? error.message : String(error),
                })
                results.errors.push(
                    `Error processing withdrawal ${withdrawal.requestId}: ${error}`
                )
                results.failed++
            }
        }

        logger.info('Withdrawal processing worker completed', results)

        const message =
            results.processed === 0
                ? 'No pending withdrawals to process'
                : 'Withdrawal processing completed'

        return NextResponse.json({
            success: true,
            message,
            ...results,
        } as WithdrawProcessingResult)
    } catch (error) {
        logger.error('Error in withdrawal processing worker', {
            error: error instanceof Error ? error.message : String(error),
        })
        return NextResponse.json(
            {
                success: false,
                message: 'Internal server error',
                processed: 0,
                completed: 0,
                failed: 0,
                errors: [
                    error instanceof Error ? error.message : String(error),
                ],
            } as WithdrawProcessingResult,
            { status: 500 }
        )
    }
}
