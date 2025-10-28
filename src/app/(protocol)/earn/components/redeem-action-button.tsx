import React, { useState } from 'react'
import { useWallet } from '@buidlerlabs/hashgraph-react-wallets'
import { useAccountId } from '@/app/(protocol)/earn/hooks/useAccountID'
import { ConnectWalletButton } from '@/components/connect-wallet-button'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle, Zap } from 'lucide-react'
import { useRealTimeRate } from '@/hooks/useRealTimeRate'
import { useWithdrawSubmit } from '@/hooks/useWithdrawSubmit'
import {
    useInstantWithdraw,
    refreshInstantWithdrawMax,
} from '@/hooks/useInstantWithdraw'
import { useTokenBalances } from '../hooks/useTokenBalances'
import { Signer, TransferTransaction, TokenId, AccountId } from '@hashgraph/sdk'
import { useToast } from '@/hooks/useToast'
import { INSTANT_WITHDRAW_FEE } from '@/app/constants'
import { ProcessModal } from '@/components/process-modal'
import {
    useProcessModal,
    REDEEM_INSTANT_STEPS,
    REDEEM_STANDARD_STEPS,
} from '@/hooks/useProcessModal'

function isValidSigner(signer: unknown): signer is Signer {
    return (
        signer !== null &&
        signer !== undefined &&
        typeof signer === 'object' &&
        'sign' in signer
    )
}

interface RedeemActionButtonProps {
    fromAmount?: string
    hUSDBalance?: number
    onBalanceRefresh?: () => void
    onInputClear?: () => void
    rateData?: {
        rate: number
        sequenceNumber: string
    }
    redeemType?: 'instant' | 'standard'
}

export function RedeemActionButton({
    fromAmount,
    hUSDBalance,
    onBalanceRefresh,
    onInputClear,
    rateData,
    redeemType = 'standard',
}: RedeemActionButtonProps) {
    const { isConnected, signer } = useWallet()
    const accountId = useAccountId()
    const { rateData: realTimeRateData } = useRealTimeRate()
    const { submitWithdrawal } = useWithdrawSubmit({
        userAccountId: accountId,
    })
    const { refreshBalances } = useTokenBalances()
    const { success: toastSuccess } = useToast()
    const {
        maxInstantWithdrawable,
        submitInstantWithdraw,
        calculateInstantWithdrawAmounts,
    } = useInstantWithdraw()

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Process modal hooks
    const instantProcessModal = useProcessModal({
        onComplete: async () => {
            if (onInputClear) onInputClear()
            await refreshBalances()
            if (onBalanceRefresh) await onBalanceRefresh()
            // Force refresh of instant withdraw max amount across all components
            refreshInstantWithdrawMax()
        },
        onError: (error) => toastSuccess(`Instant redeem failed: ${error}`),
    })

    const standardProcessModal = useProcessModal({
        onComplete: async () => {
            if (onInputClear) {
                onInputClear()
            }
            await refreshBalances()
            if (onBalanceRefresh) {
                await onBalanceRefresh()
            }
        },
        onError: (error) => toastSuccess(`Standard redeem failed: ${error}`),
    })

    // Use rateData from props or realTimeRateData as fallback
    const currentRateData = rateData || realTimeRateData

    // Calculate instant withdrawal amounts if applicable
    const amountValue = parseFloat(fromAmount || '0')
    const instantAmounts =
        currentRateData?.rate && amountValue > 0
            ? calculateInstantWithdrawAmounts(amountValue, currentRateData.rate)
            : null

    const handleWithdraw = async () => {
        if (!accountId) {
            setError('Please connect your wallet first')
            return
        }

        if (!currentRateData?.rate || !currentRateData?.sequenceNumber) {
            setError('Unable to get current rate. Please try again.')
            return
        }

        if (!fromAmount || fromAmount === '0') {
            setError('Please enter an amount to redeem')
            return
        }

        const amount = parseFloat(fromAmount)
        if (isNaN(amount) || amount <= 0) {
            setError('Please enter a valid amount')
            return
        }

        // Validate sufficient balance
        if (hUSDBalance && amount > hUSDBalance) {
            setError('Insufficient hUSD balance')
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            if (redeemType === 'instant') {
                await handleInstantWithdraw(amount)
            } else {
                await handleStandardWithdraw(amount)
            }
        } catch (err) {
            // For instant withdraw, we handle the error here
            // For standard withdraw, the error is already handled internally
            if (redeemType === 'instant') {
                const errorMessage =
                    err instanceof Error ? err.message : 'Unknown error'
                setError(errorMessage)
                instantProcessModal.setStepError(
                    instantProcessModal.currentStep,
                    errorMessage
                )
            }
            // For standard withdraw, we don't do anything additional here
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleInstantWithdraw = async (amount: number) => {
        if (!accountId || !currentRateData) return

        // Validate instant withdrawal limits
        if (instantAmounts && instantAmounts.netUSDC > maxInstantWithdrawable) {
            setError(
                `Instant withdrawal amount exceeds maximum of ${maxInstantWithdrawable.toFixed(
                    6
                )} USDC`
            )
            return
        }

        // START THE PROCESS MODAL FOR INSTANT REDEEM
        instantProcessModal.startProcess(
            'redeem-instant',
            REDEEM_INSTANT_STEPS,
            {
                amount: `${amount}`,
                fromToken: 'hUSD',
                toToken: 'USDC',
            }
        )

        // Step 1: User signs hUSD transfer
        instantProcessModal.updateStep('user-sign', 'active')

        if (!isValidSigner(signer)) {
            throw new Error('Invalid signer: wallet not properly connected')
        }

        // Create HUSD transfer transaction
        const husdTokenId = '0.0.6889338' // HUSD Token ID
        const emissionsId = '0.0.6887460' // Emissions Wallet ID (hardcoded for frontend)

        // DEBUG: Log the amount being processed
        console.log('🔍 [FRONTEND] Creating HUSD transfer:', {
            amount: amount,
            amountType: typeof amount,
            convertedUnits: Math.floor(amount * 1_000),
            expectedFor1HUSD: 1000,
        })

        const transferTx = new TransferTransaction()
            .addTokenTransfer(
                TokenId.fromString(husdTokenId),
                AccountId.fromString(accountId),
                -Math.floor(amount * 1_000) // Convert to hUSD minimum units (3 decimals)
            )
            .addTokenTransfer(
                TokenId.fromString(husdTokenId),
                AccountId.fromString(emissionsId), // Send to emissions wallet for instant withdrawals
                Math.floor(amount * 1_000) // Convert to hUSD minimum units (3 decimals)
            )
            .setTransactionMemo(`Instant withdrawal: ${amount} hUSD`)

        // Execute transaction
        const frozenTx = await transferTx.freezeWithSigner(signer)
        const signedTx = await frozenTx.signWithSigner(signer)
        const txResponse = await signedTx.executeWithSigner(signer)
        const receipt = await txResponse.getReceiptWithSigner(signer)

        if (receipt.status.toString() !== 'SUCCESS') {
            throw new Error(`HUSD transfer failed: ${receipt.status}`)
        }

        // Step 2: Process instant withdrawal
        instantProcessModal.nextStep()

        const result = await submitInstantWithdraw(
            accountId,
            amount,
            currentRateData.rate,
            currentRateData.sequenceNumber
        )

        if (!result.success) {
            throw new Error(result.error || 'Instant withdrawal failed')
        }

        // Step 3: Finalize
        instantProcessModal.nextStep()

        // Complete the process
        instantProcessModal.completeProcess()
    }

    const handleStandardWithdraw = async (amount: number) => {
        // START THE PROCESS MODAL FOR STANDARD REDEEM
        standardProcessModal.startProcess(
            'redeem-standard',
            REDEEM_STANDARD_STEPS,
            {
                amount: `${amount}`,
                fromToken: 'hUSD',
                toToken: 'USDC',
            }
        )

        try {
            // Step 1: Create withdrawal request (initialize) - already active from startProcess
            console.log('🔄 [STANDARD WITHDRAW] Step 1: Initialize active')

            if (!isValidSigner(signer)) {
                throw new Error('Invalid signer: wallet not properly connected')
            }

            // Create HUSD transfer transaction (same as instant withdraw)
            const husdTokenId = '0.0.6889338' // HUSD Token ID
            const emissionsId = '0.0.6887460' // Emissions Wallet ID (hardcoded for frontend)

            // DEBUG: Log the amount being processed
            console.log('🔍 [STANDARD WITHDRAW] Creating HUSD transfer:', {
                amount: amount,
                amountType: typeof amount,
                convertedUnits: Math.floor(amount * 1_000),
                expectedFor1HUSD: 1000,
            })

            const transferTx = new TransferTransaction()
                .addTokenTransfer(
                    TokenId.fromString(husdTokenId),
                    AccountId.fromString(accountId),
                    -Math.floor(amount * 1_000) // Convert to hUSD minimum units (3 decimals)
                )
                .addTokenTransfer(
                    TokenId.fromString(husdTokenId),
                    AccountId.fromString(emissionsId), // Send to emissions wallet
                    Math.floor(amount * 1_000) // Convert to hUSD minimum units (3 decimals)
                )
                .setTransactionMemo(`Standard withdrawal: ${amount} hUSD`)

            // Step 2: User must sign the transfer (user-sign)
            console.log('🔄 [STANDARD WITHDRAW] Moving to Step 2: User sign')
            standardProcessModal.nextStep()

            // Execute transaction (this is the moment when the user signs)
            const frozenTx = await transferTx.freezeWithSigner(signer)
            const signedTx = await frozenTx.signWithSigner(signer)
            const txResponse = await signedTx.executeWithSigner(signer)
            const receipt = await txResponse.getReceiptWithSigner(signer)

            if (receipt.status.toString() !== 'SUCCESS') {
                throw new Error(`HUSD transfer failed: ${receipt.status}`)
            }

            console.log('✅ [STANDARD WITHDRAW] HUSD transfer completed')

            // Step 3: Register withdrawal request (finalize)
            console.log('🔄 [STANDARD WITHDRAW] Moving to Step 3: Finalize')
            standardProcessModal.nextStep()

            const result = await submitWithdrawal(
                amount,
                currentRateData!.rate,
                currentRateData!.sequenceNumber
            )

            if (!result.success) {
                throw new Error(
                    result.error || 'Failed to create withdrawal request'
                )
            }

            console.log('✅ [STANDARD WITHDRAW] Withdrawal request submitted')

            // Complete the process
            standardProcessModal.completeProcess()
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Unknown error occurred'
            console.error('❌ [STANDARD WITHDRAW] Error:', errorMessage)
            standardProcessModal.setStepError(
                standardProcessModal.currentStep,
                errorMessage
            )
            // Don't throw the error to avoid double handling
        }
    }

    // const handleScheduleSignature = async (scheduleTransactionId: string) => {
    //     try {
    //         // Validate signer before use
    //         if (!isValidSigner(signer)) {
    //             throw new Error('Invalid signer: wallet not properly connected')
    //         }

    //         // Create ScheduleSignTransaction for user to sign
    //         const scheduleSignTx = new ScheduleSignTransaction().setScheduleId(
    //             ScheduleId.fromString(scheduleTransactionId)
    //         )

    //         // Freeze with signer
    //         const frozenScheduleTx = await scheduleSignTx.freezeWithSigner(
    //             signer
    //         )

    //         // User signs the schedule
    //         const signedScheduleTx = await frozenScheduleTx.signWithSigner(
    //             signer
    //         )

    //         // Execute the user's signature
    //         const userSignResponse = await signedScheduleTx.executeWithSigner(
    //             signer
    //         )
    //         // Get receipt to confirm user signature
    //         const userSignReceipt = await userSignResponse.getReceiptWithSigner(
    //             signer
    //         )

    //         if (userSignReceipt.status.toString() !== 'SUCCESS') {
    //             throw new Error(
    //                 `User signature failed: ${userSignReceipt.status}`
    //             )
    //         }

    //         // Step 3: Finalize process
    //         standardProcessModal.nextStep()

    //         // Complete the process - the onComplete callback will handle cleanup
    //         standardProcessModal.completeProcess()
    //     } catch (err) {
    //         console.error('Error signing Schedule Transaction:', err)
    //         const errorMessage =
    //             err instanceof Error
    //                 ? err.message
    //                 : 'Failed to sign withdrawal transaction'
    //         standardProcessModal.setStepError(
    //             standardProcessModal.currentStep,
    //             errorMessage
    //         )
    //     }
    // }

    // Determine if we can submit
    const inputAmount = parseFloat(fromAmount || '0')
    const canSubmit = Boolean(
        isConnected &&
            accountId &&
            currentRateData &&
            inputAmount > 0 &&
            hUSDBalance &&
            inputAmount <= hUSDBalance &&
            !isSubmitting
    )

    // For instant withdrawals, also check max limit
    const canSubmitInstant =
        canSubmit &&
        (redeemType !== 'instant' ||
            (instantAmounts &&
                instantAmounts.netUSDC <= maxInstantWithdrawable))

    if (!isConnected) {
        return <ConnectWalletButton variant='full-width' />
    }

    return (
        <div className='space-y-4'>
            {/* Show instant withdrawal breakdown */}
            {redeemType === 'instant' && instantAmounts && (
                <div className='bg-blue-50 border border-blue-200 p-3 rounded-lg'>
                    <div className='flex items-center space-x-2 mb-2'>
                        <Zap className='h-4 w-4 text-blue-600' />
                        <span className='text-sm font-medium text-blue-800'>
                            Instant Withdrawal Breakdown
                        </span>
                    </div>
                    <div className='text-xs space-y-1 text-blue-700'>
                        <div className='flex justify-between'>
                            <span>hUSD Redeemed:</span>
                            <span className='font-mono'>
                                {amountValue.toFixed(6)} hUSD
                            </span>
                        </div>
                        <div className='flex justify-between'>
                            <span>Gross USDC:</span>
                            <span className='font-mono'>
                                {instantAmounts.grossUSDC.toFixed(6)} USDC
                            </span>
                        </div>
                        <div className='flex justify-between'>
                            <span>
                                Applied Fee (
                                {(INSTANT_WITHDRAW_FEE * 100).toFixed(1)}%):
                            </span>
                            <span className='font-mono text-red-600'>
                                -{instantAmounts.fee.toFixed(6)} USDC
                            </span>
                        </div>
                        <div className='flex justify-between font-semibold border-t pt-1'>
                            <span>Net USDC received:</span>
                            <span className='font-mono text-green-600'>
                                {instantAmounts.netUSDC.toFixed(6)} USDC
                            </span>
                        </div>
                    </div>
                    {instantAmounts.netUSDC > maxInstantWithdrawable && (
                        <div className='mt-2 text-xs text-red-600'>
                            ⚠️ Amount exceeds maximum instant withdrawal limit
                            of {maxInstantWithdrawable.toFixed(6)} USDC
                        </div>
                    )}
                </div>
            )}

            {/* Lock period warning for standard withdrawals */}
            {redeemType === 'standard' && (
                <div className='bg-yellow-50 border border-yellow-200 p-3 rounded-lg'>
                    <div className='text-xs text-yellow-700'>
                        <strong>48-Hour Period:</strong> Your USDC will take up
                        to 48 hours to arrive to your wallet.
                    </div>
                </div>
            )}

            {/* Error display */}
            {error && (
                <div className='bg-red-50 border border-red-200 p-3 rounded-lg'>
                    <div className='flex items-start space-x-2'>
                        <AlertTriangle className='h-5 w-5 text-red-600 mt-0.5 flex-shrink-0' />
                        <p className='text-sm text-red-700'>{error}</p>
                    </div>
                </div>
            )}

            <Button
                onClick={handleWithdraw}
                disabled={!canSubmitInstant}
                className='w-full'
                size='lg'
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Processing...
                    </>
                ) : (
                    <>
                        {redeemType === 'instant' ? (
                            <>
                                <Zap className='mr-2 h-4 w-4' />
                                Instant Withdraw
                            </>
                        ) : (
                            `Submit Withdrawal`
                        )}
                    </>
                )}
            </Button>

            {/* Process Modals */}
            <ProcessModal
                isOpen={instantProcessModal.isOpen}
                processType={instantProcessModal.processType}
                currentStep={instantProcessModal.currentStep}
                steps={instantProcessModal.steps}
                onClose={instantProcessModal.closeModal}
                amount={instantProcessModal.amount}
                fromToken={instantProcessModal.fromToken}
                toToken={instantProcessModal.toToken}
                error={instantProcessModal.error}
            />

            <ProcessModal
                isOpen={standardProcessModal.isOpen}
                processType={standardProcessModal.processType}
                currentStep={standardProcessModal.currentStep}
                steps={standardProcessModal.steps}
                onClose={standardProcessModal.closeModal}
                amount={standardProcessModal.amount}
                fromToken={standardProcessModal.fromToken}
                toToken={standardProcessModal.toToken}
                error={standardProcessModal.error}
            />
        </div>
    )
}
