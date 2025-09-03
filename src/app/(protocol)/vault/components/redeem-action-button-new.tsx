import React, { useState } from 'react'
import { useWallet } from '@buidlerlabs/hashgraph-react-wallets'
import { useAccountId } from '@/app/(protocol)/vault/hooks/useAccountID'
import { ConnectWalletButton } from '@/components/connect-wallet-button'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle, Zap } from 'lucide-react'
import { useRealTimeRate } from '@/hooks/useRealTimeRate'
import { useWithdrawSubmit } from '@/hooks/useWithdrawSubmit'
import { useInstantWithdraw } from '@/hooks/useInstantWithdraw'
import { useTokenBalances } from '../hooks/useTokenBalances'
import {
    ScheduleSignTransaction,
    ScheduleId,
    Signer,
    TransferTransaction,
    TokenId,
    AccountId,
} from '@hashgraph/sdk'
import { useToast } from '@/hooks/useToast'
import { INSTANT_WITHDRAW_FEE } from '@/app/constants'

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
        refreshMaxAmount,
    } = useInstantWithdraw()

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [step, setStep] = useState('')

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
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setIsSubmitting(false)
            setStep('')
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

        setStep('Processing instant withdrawal...')

        // Step 1: First transfer HUSD to treasury
        setStep('Transferring hUSD to treasury...')

        if (!isValidSigner(signer)) {
            throw new Error('Invalid signer: wallet not properly connected')
        }

        // Create HUSD transfer transaction
        const husdTokenId = '0.0.6624255' // TODO: Get from constants
        const treasuryId = '0.0.6510977' // TODO: Get from constants

        const transferTx = new TransferTransaction()
            .addTokenTransfer(
                TokenId.fromString(husdTokenId),
                AccountId.fromString(accountId),
                -Math.floor(amount * 100_000_000) // Convert to hUSD minimum units (8 decimals)
            )
            .addTokenTransfer(
                TokenId.fromString(husdTokenId),
                AccountId.fromString(treasuryId),
                Math.floor(amount * 100_000_000) // Convert to hUSD minimum units (8 decimals)
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

        console.log(
            '✅ HUSD transfer completed:',
            txResponse.transactionId?.toString()
        )

        // Step 2: Call backend to process instant withdrawal
        setStep('Processing instant withdrawal...')

        const result = await submitInstantWithdraw(
            accountId,
            amount,
            currentRateData.rate,
            currentRateData.sequenceNumber
        )

        if (!result.success) {
            throw new Error(result.error || 'Instant withdrawal failed')
        }

        setStep('Instant withdrawal completed successfully!')

        toastSuccess(
            `✅ Instant withdrawal completed! Received ${result.netUSDC?.toFixed(
                6
            )} USDC (fee: ${result.fee?.toFixed(6)} USDC)`
        )

        // Clear the input field and refresh balances
        if (onInputClear) {
            onInputClear()
        }

        try {
            await Promise.all([
                refreshBalances(),
                onBalanceRefresh?.(),
                refreshMaxAmount(),
            ])
            console.log('✅ Balances refreshed after instant withdrawal')
        } catch (refreshError) {
            console.warn('⚠️ Failed to refresh balances:', refreshError)
        }
    }

    const handleStandardWithdraw = async (amount: number) => {
        // Step 1: Create Schedule Transaction for HUSD transfer
        setStep('Creating withdrawal request...')

        const result = await submitWithdrawal(
            amount,
            currentRateData!.rate,
            currentRateData!.sequenceNumber
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

            // Refresh balances after successful withdrawal
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
        } catch (err) {
            console.error('Error signing Schedule Transaction:', err)
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to sign withdrawal transaction'
            )
        }
    }

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
                            <span>Monto solicitado (hUSD):</span>
                            <span className='font-mono'>
                                {amountValue.toFixed(6)} hUSD
                            </span>
                        </div>
                        <div className='flex justify-between'>
                            <span>Monto bruto en USDC:</span>
                            <span className='font-mono'>
                                {instantAmounts.grossUSDC.toFixed(6)} USDC
                            </span>
                        </div>
                        <div className='flex justify-between'>
                            <span>
                                Comisión aplicada (
                                {(INSTANT_WITHDRAW_FEE * 100).toFixed(1)}%):
                            </span>
                            <span className='font-mono text-red-600'>
                                -{instantAmounts.fee.toFixed(6)} USDC
                            </span>
                        </div>
                        <div className='flex justify-between font-semibold border-t pt-1'>
                            <span>Monto neto recibido:</span>
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

            {/* Progress indicator */}
            {step && (
                <div className='bg-blue-50 p-3 rounded-lg'>
                    <div className='flex items-center space-x-2'>
                        <Loader2 className='h-4 w-4 animate-spin text-blue-500' />
                        <span className='text-sm text-blue-700'>{step}</span>
                    </div>
                </div>
            )}

            {/* Lock period warning for standard withdrawals */}
            {redeemType === 'standard' && (
                <div className='bg-yellow-50 border border-yellow-200 p-3 rounded-lg'>
                    <div className='text-xs text-yellow-700'>
                        <strong>48-Hour Lock Period:</strong> Your hUSD will be
                        locked for 48 hours before USDC is released for
                        security.
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
                        {step || 'Processing...'}
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
        </div>
    )
}
