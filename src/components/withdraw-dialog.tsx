import React, { useState } from 'react'
import { ScheduleSignTransaction, ScheduleId, Signer } from '@hashgraph/sdk'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRealTimeRate } from '@/hooks/useRealTimeRate'
import { useWithdrawals } from '@/hooks/useWithdrawals'
import { Loader2, AlertTriangle, Clock } from 'lucide-react'
import { logger } from '@/lib/logger'


function isValidSigner(signer: unknown): signer is Signer {
    return (
        signer !== null &&
        signer !== undefined &&
        typeof signer === 'object' &&
        'sign' in signer
    )
}

interface WithdrawDialogProps {
    isOpen: boolean
    onClose: () => void
    userAccountId?: string
    signer?: unknown
}

export function WithdrawDialog({
    isOpen,
    onClose,
    userAccountId,
    signer,
}: WithdrawDialogProps) {
    const [amountHUSD, setAmountHUSD] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [step, setStep] = useState('')
    const [scheduleId, setScheduleId] = useState<string | null>(null)
    const [withdrawalStage, setWithdrawalStage] = useState<
        'form' | 'schedule_created' | 'signing' | 'completed'
    >('form')

    const {
        rateData,
        isLoading: isRateLoading,
        error: rateError,
    } = useRealTimeRate()
    const { submitWithdrawal } = useWithdrawals({
        userAccountId,
        enabled: isOpen && !!userAccountId,
    })

    const rate = rateData?.rate
    const sequenceNumber = rateData?.sequenceNumber

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!userAccountId) {
            setError('Please connect your wallet first')
            return
        }

        if (!rate || !sequenceNumber) {
            setError('Unable to get current rate. Please try again.')
            return
        }

        const amount = parseFloat(amountHUSD)
        if (isNaN(amount) || amount <= 0) {
            setError('Please enter a valid amount')
            return
        }

        setIsSubmitting(true)
        setError(null)
        setSuccess(null)

        try {
            // Step 1: Create Schedule Transaction for HUSD transfer
            setStep('Creating withdrawal request...')
            setWithdrawalStage('schedule_created')

            const result = await submitWithdrawal(amount, rate, sequenceNumber)

            if (!result.success) {
                setError(result.error ?? 'Failed to create withdrawal request')
                return
            }

            logger.info('Schedule Transaction created:', result)
            setScheduleId(result.scheduleId ?? '')

            // Step 2: User signs the Schedule Transaction
            await handleScheduleSignature(result.scheduleId ?? '')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleScheduleSignature = async (scheduleTransactionId: string) => {
        try {
            setStep('Requesting signature from wallet...')
            setWithdrawalStage('signing')

            // Validate signer before use
            if (!isValidSigner(signer)) {
                throw new Error('Invalid signer: wallet not properly connected')
            }

            logger.info(
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
            logger.info(
                'User signature executed:',
                userSignResponse.transactionId?.toString()
            )

            // Get receipt to confirm user signature
            const userSignReceipt = await userSignResponse.getReceiptWithSigner(
                signer
            )
            logger.info(
                'User signature receipt:',
                userSignReceipt.status.toString()
            )

            if (userSignReceipt.status.toString() !== 'SUCCESS') {
                throw new Error(
                    `User signature failed: ${userSignReceipt.status}`
                )
            }

            setStep('HUSD transfer completed successfully!')
            setWithdrawalStage('completed')
            setSuccess(
                `✅ Withdrawal request signed successfully!\n\nSchedule ID: ${scheduleTransactionId}\n\nYour HUSD tokens have been transferred to the treasury. The equivalent USDC will be processed and sent to you after the 48-hour lock period.\n\nYou can track the status in your withdrawal history.`
            )

            // Close dialog after 5 seconds
            setTimeout(() => {
                onClose()
                handleClose()
            }, 5000)
        } catch (err) {
            logger.error('Error signing Schedule Transaction:', err)
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to sign withdrawal transaction'
            )
        }
    }

    const handleClose = () => {
        if (!isSubmitting) {
            setAmountHUSD('')
            setError(null)
            setSuccess(null)
            setStep('')
            setScheduleId(null)
            setWithdrawalStage('form')
            onClose()
        }
    }

    const calculateUSDC = () => {
        const amount = parseFloat(amountHUSD)
        if (isNaN(amount) || !rate) return 0
        return amount * rate
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className='sm:max-w-[425px]'>
                <DialogHeader>
                    <DialogTitle>Withdraw USDC</DialogTitle>
                    <DialogDescription>
                        Convert your hUSD back to USDC. Withdrawals have a
                        48-hour lock period for security.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={(e) => void handleSubmit(e)} className='space-y-4'>
                    {/* Progress indicator */}
                    {step && (
                        <div className='bg-blue-50 p-3 rounded-lg'>
                            <div className='flex items-center space-x-2'>
                                <Loader2 className='h-4 w-4 animate-spin text-blue-500' />
                                <span className='text-sm text-blue-700'>
                                    {step}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Schedule ID display */}
                    {scheduleId && withdrawalStage !== 'form' && (
                        <div className='bg-gray-50 p-3 rounded-lg'>
                            <div className='text-sm'>
                                <span className='font-medium'>
                                    Schedule Transaction ID:
                                </span>
                                <div className='font-mono text-xs mt-1 break-all'>
                                    {scheduleId}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className='space-y-2'>
                        <Label htmlFor='amount'>Amount (hUSD)</Label>
                        <Input
                            id='amount'
                            type='number'
                            step='0.01'
                            min='0'
                            placeholder='Enter hUSD amount'
                            value={amountHUSD}
                            onChange={(e) => setAmountHUSD(e.target.value)}
                            disabled={
                                isSubmitting ||
                                isRateLoading ||
                                withdrawalStage !== 'form'
                            }
                        />
                    </div>

                    {/* Rate display */}
                    <div className='bg-gray-50 p-3 rounded-lg'>
                        <div className='flex justify-between text-sm'>
                            <span>Current Rate:</span>
                            <span className='font-mono'>
                                {isRateLoading ? (
                                    <Loader2 className='h-4 w-4 animate-spin inline' />
                                ) : rateError ? (
                                    <span className='text-red-500'>Error</span>
                                ) : (
                                    `1 hUSD = ${rate?.toFixed(6)} USDC`
                                )}
                            </span>
                        </div>

                        {amountHUSD && rate && (
                            <div className='flex justify-between text-sm mt-1 pt-1 border-t'>
                                <span>You will receive:</span>
                                <span className='font-mono font-semibold'>
                                    ~{calculateUSDC().toFixed(6)} USDC
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Lock period warning */}
                    <div className='bg-yellow-50 border border-yellow-200 p-3 rounded-lg'>
                        <div className='flex items-start space-x-2'>
                            <Clock className='h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0' />
                            <div>
                                <p className='text-sm font-semibold text-yellow-800'>
                                    48-Hour Lock Period
                                </p>
                                <p className='text-xs text-yellow-700'>
                                    Your hUSD will be locked for 48 hours before
                                    USDC is released. This is a security
                                    measure.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Error display */}
                    {error && (
                        <div className='bg-red-50 border border-red-200 p-3 rounded-lg'>
                            <div className='flex items-start space-x-2'>
                                <AlertTriangle className='h-5 w-5 text-red-600 mt-0.5 flex-shrink-0' />
                                <p className='text-sm text-red-700'>{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Success display */}
                    {success && (
                        <div className='bg-green-50 border border-green-200 p-3 rounded-lg'>
                            <p className='text-sm text-green-700'>{success}</p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type='button'
                            variant='outline'
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            {withdrawalStage === 'completed'
                                ? 'Close'
                                : 'Cancel'}
                        </Button>
                        {withdrawalStage === 'form' && (
                            <Button
                                type='submit'
                                disabled={
                                    isSubmitting ||
                                    isRateLoading ||
                                    !amountHUSD ||
                                    !userAccountId ||
                                    !!rateError
                                }
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                        {step || 'Processing...'}
                                    </>
                                ) : (
                                    'Submit Withdrawal'
                                )}
                            </Button>
                        )}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
