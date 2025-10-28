import { NextRequest, NextResponse } from 'next/server'
import { WithdrawService } from '@/services/withdrawService'
import { HederaService } from '@/services/hederaService'
import { TelegramService } from '@/services/telegramService'
import { ACCOUNTS } from '@/app/backend-constants'

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

                // Check if this is a new-style withdrawal (HUSD already transferred)
                const isNewStyleWithdrawal =
                    withdrawal.scheduleId === 'verified'

                if (isNewStyleWithdrawal) {
                    console.log(
                        '🔍 New-style withdrawal: HUSD already transferred, skipping schedule verification'
                    )
                } else {
                    console.log(
                        '🔍 Legacy withdrawal: Verifying scheduled transaction...'
                    )
                }

                // Step 1: Verify the Schedule Transaction was executed (only for legacy withdrawals)
                let scheduleExecuted = true // Default to true for new-style withdrawals

                if (!isNewStyleWithdrawal) {
                    scheduleExecuted =
                        await hederaService.verifyScheduleTransactionExecuted(
                            withdrawal.scheduleId
                        )
                }

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

                // Step 2: Verify HUSD was actually transferred to emissions wallet
                // (Both standard and instant withdrawals now go to emissions wallet)
                const emissionsWalletId = ACCOUNTS.emissions

                // For new-style withdrawals, we don't need to verify HUSD again
                // because it was already verified when the withdrawal was requested
                let husdTransferVerified = true

                if (!isNewStyleWithdrawal) {
                    // Only verify for legacy withdrawals
                    husdTransferVerified =
                        await hederaService.verifyHUSDTransfer(
                            withdrawal.user,
                            emissionsWalletId,
                            withdrawal.amountHUSD,
                            withdrawal.requestedAt
                        )
                } else {
                    console.log(
                        '✅ New-style withdrawal: HUSD already verified during request, skipping verification'
                    )
                }

                if (!husdTransferVerified) {
                    console.log(`❌ HUSD transfer verification failed`)
                    console.log(
                        `📋 Expected ${withdrawal.amountHUSD} HUSD from ${withdrawal.user} to ${emissionsWalletId}`
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

                // Check Standard Withdraw USDC balance (USDC payments come from standard withdraw wallet)
                const standardWithdrawWalletId = ACCOUNTS.standardWithdraw
                const standardWithdrawBalance =
                    await hederaService.checkBalance(
                        standardWithdrawWalletId,
                        usdcTokenId
                    )
                console.log(
                    `Standard Withdraw USDC balance: ${standardWithdrawBalance}, Required: ${usdcAmount}`
                )

                if (standardWithdrawBalance >= usdcAmount) {
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
                            console.error(
                                '❌ Telegram notification failed for standard withdrawal:',
                                telegramError
                            )
                            // Don't fail the entire withdrawal process due to notification error
                        }

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
                    console.log(
                        `❌ Insufficient Standard Withdraw USDC balance`
                    )
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
                            'Insufficient Standard Withdraw USDC balance. HUSD tokens have been returned to your account.'
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

        return NextResponse.json({
            success: true,
            message,
            ...results,
        } as WithdrawProcessingResult)
    } catch (error) {
        console.error('❌ Error in withdrawal processing worker:', error)
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
