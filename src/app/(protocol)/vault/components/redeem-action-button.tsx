import React, { useState } from 'react'
import { useWallet } from '@buidlerlabs/hashgraph-react-wallets'
import { useAccountId } from '@/app/(protocol)/vault/hooks/useAccountID'
import { ConnectWalletButton } from '@/components/connect-wallet-button'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle } from 'lucide-react'
import { useRealTimeRate } from '@/hooks/useRealTimeRate'
import { useWithdrawSubmit } from '@/hooks/useWithdrawSubmit'
import { useTokenBalances } from '../hooks/useTokenBalances'
import { ScheduleSignTransaction, ScheduleId, Signer } from '@hashgraph/sdk'
import { useToast } from '@/hooks/useToast'

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
}

export function RedeemActionButton({
    fromAmount,
    hUSDBalance,
    onBalanceRefresh,
    onInputClear,
    rateData,
}: RedeemActionButtonProps) {
    const { isConnected, signer } = useWallet()
    const accountId = useAccountId()
    const { rateData: realTimeRateData } = useRealTimeRate()
    const { submitWithdrawal } = useWithdrawSubmit({
        userAccountId: accountId,
    })
    const { refreshBalances } = useTokenBalances()
    const { success: toastSuccess } = useToast()

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [step, setStep] = useState('')

    // Use rateData from props or realTimeRateData as fallback
    const currentRateData = rateData || realTimeRateData

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
            // Step 1: Create Schedule Transaction for HUSD transfer
            setStep('Creating withdrawal request...')

            const result = await submitWithdrawal(
                amount,
                currentRateData.rate,
                currentRateData.sequenceNumber
            )

            if (!result.success) {
                setError(result.error || 'Failed to create withdrawal request')
                return
            }

            console.log('Schedule Transaction created:', result)

            // Step 2: User signs the Schedule Transaction
            await handleScheduleSignature(result.scheduleId || '')

            // Refresh balances after successful withdrawal
            if (onBalanceRefresh) {
                onBalanceRefresh()
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setIsSubmitting(false)
            setStep('')
        }
    }

    const handleScheduleSignature = async (scheduleTransactionId: string) => {
        try {
            setStep('Requesting signature from wallet...')

            // Validate signer before use
            if (!isValidSigner(signer)) {
                throw new Error('Invalid signer: wallet not properly connected')
            }

            console.log(
                'Requesting schedule signature for:',
                scheduleTransactionId
            )

            // Create ScheduleSignTransaction for user to sign
            const scheduleSignTx = new ScheduleSignTransaction().setScheduleId(
                ScheduleId.fromString(scheduleTransactionId)
            )

            // Freeze with signer
            const frozenScheduleTx = await scheduleSignTx.freezeWithSigner(
                signer
            )

            // User signs the schedule
            const signedScheduleTx = await frozenScheduleTx.signWithSigner(
                signer
            )

            // Execute the user's signature
            const userSignResponse = await signedScheduleTx.executeWithSigner(
                signer
            )
            console.log(
                'User signature executed:',
                userSignResponse.transactionId?.toString()
            )

            // Get receipt to confirm user signature
            const userSignReceipt = await userSignResponse.getReceiptWithSigner(
                signer
            )
            console.log(
                'User signature receipt:',
                userSignReceipt.status.toString()
            )

            if (userSignReceipt.status.toString() !== 'SUCCESS') {
                throw new Error(
                    `User signature failed: ${userSignReceipt.status}`
                )
            }

            setStep('hUSD transfer completed successfully!')

            toastSuccess(
                `Successfully submitted withdrawal for ${fromAmount} hUSD. Your USDC will be processed after the 48-hour lock period.`
            )

            // Clear the input field after successful withdrawal
            if (onInputClear) {
                onInputClear()
            }

            // Refresh balances after successful withdrawal - immediate refresh
            try {
                await refreshBalances()
                if (onBalanceRefresh) {
                    await onBalanceRefresh()
                }
                console.log(
                    '✅ Immediate balance refresh completed after redeem'
                )
            } catch (refreshError) {
                console.warn(
                    '⚠️ Failed immediate balance refresh after redeem:',
                    refreshError
                )
            }

            // Wait a bit for the mirror node to update (Hedera network delay)
            setTimeout(async () => {
                try {
                    await refreshBalances()
                    if (onBalanceRefresh) {
                        await onBalanceRefresh()
                    }
                    console.log(
                        '✅ Delayed balance refresh completed after redeem'
                    )
                } catch (refreshError) {
                    console.warn(
                        '⚠️ Failed delayed balance refresh after redeem:',
                        refreshError
                    )
                }
            }, 3000) // 3 seconds for mirror node sync

            // Additional refresh after 10 seconds for safety
            setTimeout(async () => {
                try {
                    await refreshBalances()
                    if (onBalanceRefresh) {
                        await onBalanceRefresh()
                    }
                    console.log(
                        '✅ Final balance refresh completed after redeem'
                    )
                } catch (refreshError) {
                    console.warn(
                        '⚠️ Failed final balance refresh after redeem:',
                        refreshError
                    )
                }
            }, 10000) // 10 second final refresh
        } catch (err) {
            console.error('Error signing Schedule Transaction:', err)
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to sign withdrawal transaction'
            )
        }
    }

    if (!isConnected || !accountId) {
        return <ConnectWalletButton variant='full-width' />
    }

    const canSubmit =
        fromAmount &&
        parseFloat(fromAmount) > 0 &&
        currentRateData?.rate &&
        currentRateData?.sequenceNumber &&
        !isSubmitting &&
        // Ensure sufficient balance
        (hUSDBalance ? parseFloat(fromAmount) <= hUSDBalance : false)

    return (
        <div className='space-y-4'>
            {/* Progress indicator */}
            {step && (
                <div className='bg-blue-50 p-3 rounded-lg'>
                    <div className='flex items-center space-x-2'>
                        <Loader2 className='h-4 w-4 animate-spin text-blue-500' />
                        <span className='text-sm text-blue-700'>{step}</span>
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

            {/* Lock period warning */}
            <div className='bg-yellow-50 border border-yellow-200 p-3 rounded-lg'>
                <div className='text-xs text-yellow-700'>
                    <strong>48-Hour Lock Period:</strong> Your hUSD will be
                    locked for 48 hours before USDC is released for security.
                </div>
            </div>

            <Button
                onClick={handleWithdraw}
                disabled={!canSubmit}
                className='w-full'
                size='lg'
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        {step || 'Processing...'}
                    </>
                ) : (
                    `Redeem ${fromAmount || '0'} hUSD`
                )}
            </Button>
        </div>
    )
}
