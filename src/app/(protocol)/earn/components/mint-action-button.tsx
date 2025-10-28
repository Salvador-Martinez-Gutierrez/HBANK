'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ConnectWalletButton } from '@/components/connect-wallet-button'
import { RateConflictModal } from '@/components/rate-conflict-modal'
import {
    useWallet,
    useAccountId,
    useAssociateTokens,
    useWatchTransactionReceipt,
} from '@buidlerlabs/hashgraph-react-wallets'
import { checkTokenAssociation } from '@/services/token.services'
import { TOKEN_IDS } from '@/app/constants'
import { Wallet } from 'lucide-react'
import { ScheduleSignTransaction, ScheduleId } from '@hashgraph/sdk'
import { useToast } from '@/hooks/useToast'
import { useTokenBalances } from '../hooks/useTokenBalances'
import { RateData } from '@/hooks/useRealTimeRate'
import { ProcessModal } from '@/components/process-modal'
import { useProcessModal, MINT_STEPS } from '@/hooks/useProcessModal'

interface MintActionButtonProps {
    fromAmount: string
    toAmount: string
    usdcBalance: string
    onBalanceRefresh?: () => Promise<void>
    onInputClear?: () => void
    rateData: RateData | null
}

export function MintActionButton({
    fromAmount,
    toAmount,
    usdcBalance,
    onBalanceRefresh,
    onInputClear,
    rateData,
}: MintActionButtonProps) {
    const { isConnected, isLoading: walletLoading, signer } = useWallet()
    const { data: accountId } = useAccountId()
    const { associateTokens } = useAssociateTokens()
    const { watch } = useWatchTransactionReceipt()
    const toast = useToast()
    const { refreshBalances } = useTokenBalances()

    // Process modal hook
    const processModal = useProcessModal({
        onComplete: async () => {
            if (onInputClear) onInputClear()
            await refreshBalances()
            if (onBalanceRefresh) await onBalanceRefresh()
        },
        onError: (error) => toast.error(`Mint failed: ${error}`),
    })

    const [isCheckingAssociation, setIsCheckingAssociation] = useState(false)
    const [hasTokenAssociation, setHasTokenAssociation] = useState<
        boolean | null
    >(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [showRateConflict, setShowRateConflict] = useState(false)
    const [rateConflictData, setRateConflictData] = useState<{
        currentRate: { rate: number; sequenceNumber: string; timestamp: string }
        submittedRate: {
            rate: number
            sequenceNumber: string
            timestamp: string
        }
        usdcAmount: number
    } | null>(null)

    const checkAssociation = useCallback(async () => {
        if (!accountId) return

        setIsCheckingAssociation(true)
        try {
            const hasAssociation = await checkTokenAssociation(accountId)
            console.log('hasAssociation', hasAssociation)
            setHasTokenAssociation(hasAssociation)
        } catch (error) {
            console.error('Failed to check token association:', error)
            setHasTokenAssociation(false)
        } finally {
            setIsCheckingAssociation(false)
        }
    }, [accountId])

    // Check token association when wallet connects
    useEffect(() => {
        if (isConnected && accountId && hasTokenAssociation === null) {
            checkAssociation()
        } else if (!isConnected) {
            // Reset state when wallet disconnects
            setHasTokenAssociation(null)
        }
    }, [isConnected, accountId, hasTokenAssociation, checkAssociation])

    const handleAssociateToken = async () => {
        setIsProcessing(true)
        try {
            console.log(
                '🔗 Starting token association for hUSD:',
                TOKEN_IDS.HUSD
            )
            toast.loading('🔗 Associating hUSD token to your account...', {
                id: 'associate-token',
            })

            // Execute the TokenAssociateTransaction using the hashgraph-react-wallets hook
            const transactionResult = await associateTokens([TOKEN_IDS.HUSD])

            if (!transactionResult) {
                toast.dismiss('associate-token')
                throw new Error(
                    'Failed to get transaction ID from token association'
                )
            }

            // Handle both string and string[] return types
            const transactionId = Array.isArray(transactionResult)
                ? transactionResult[0]
                : transactionResult

            console.log('📤 Token association transaction sent:', transactionId)
            console.log('⏳ Watching transaction receipt...')

            // Watch the transaction receipt for completion
            await watch(transactionId, {
                onSuccess: (transaction) => {
                    console.log('✅ Token association successful:', transaction)
                    console.log('🔄 Updating association state to true')

                    toast.dismiss('associate-token')
                    toast.success('✅ hUSD token successfully associated!', {
                        duration: 3000,
                    })

                    // Update state to show mint button
                    setHasTokenAssociation(true)
                    setIsProcessing(false)

                    return transaction
                },
                onError: (transaction, error) => {
                    console.error('❌ Token association failed:', error)
                    console.log('📊 Transaction details:', transaction)

                    toast.dismiss('associate-token')
                    toast.error(
                        '❌ Token association failed. Please try again.',
                        {
                            duration: 4000,
                        }
                    )

                    // Keep the associate button visible
                    setIsProcessing(false)

                    return transaction
                },
            })
        } catch (error) {
            console.error('❌ Token association failed:', error)
            toast.dismiss('associate-token')
            toast.error('❌ Token association failed. Please try again.', {
                duration: 4000,
            })
            setIsProcessing(false)
        }
    }

    const handleMint = async () => {
        console.log('🚀 handleMint called with:', {
            fromAmount,
            toAmount,
            rateData,
        })

        // Initial validations before starting the process modal
        if (!rateData) {
            toast.error(
                'Exchange rate not available. Please wait for rate to load.'
            )
            return
        }

        const amountNum = parseFloat(fromAmount)
        if (isNaN(amountNum) || amountNum <= 0) {
            toast.error('Invalid amount')
            return
        }

        const usdcBalanceNum = parseFloat(usdcBalance) || 0
        if (amountNum > usdcBalanceNum) {
            toast.error('Insufficient USDC balance')
            return
        }

        if (!signer) {
            toast.error('No signer available')
            return
        }

        console.log('✅ All validations passed, starting process modal...')

        // START THE PROCESS MODAL
        processModal.startProcess('mint', MINT_STEPS, {
            amount: `${amountNum}`,
            fromToken: 'USDC',
            toToken: 'hUSD',
        })

        console.log('📱 ProcessModal state after start:', {
            isOpen: processModal.isOpen,
            processType: processModal.processType,
            currentStep: processModal.currentStep,
        })

        setIsProcessing(true)
        try {
            console.log('Starting atomic mint for:', amountNum, 'USDC')
            console.log('Using rate data:', rateData)

            // Step 1: Initialize atomic deposit (already active from startProcess)
            const initResponse = await fetch('/api/deposit/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAccountId: accountId,
                    amount: amountNum,
                    expectedRate: rateData.rate,
                    rateSequenceNumber: rateData.sequenceNumber,
                    rateTimestamp: rateData.timestamp,
                }),
            })

            console.log('Init response status:', initResponse.status)

            if (!initResponse.ok) {
                const errorData = await initResponse.json()
                console.error('Init error:', errorData)

                // Handle rate conflict specifically
                if (initResponse.status === 409 && errorData.currentRate) {
                    console.log('Rate conflict detected, showing modal')
                    processModal.closeModal()
                    setRateConflictData({
                        currentRate: errorData.currentRate,
                        submittedRate: errorData.submittedRate,
                        usdcAmount: amountNum,
                    })
                    setShowRateConflict(true)
                    setIsProcessing(false)
                    return
                }

                throw new Error(
                    errorData.message ||
                        errorData.error ||
                        'Error initializing atomic mint'
                )
            }

            const initResult = await initResponse.json()
            console.log('Init success:', initResult)

            const { scheduleId, amountHUSDC } = initResult

            // Step 2: User signs the schedule
            processModal.nextStep()
            console.log('Requesting schedule signature for:', scheduleId)

            // Create ScheduleSignTransaction for user to sign
            const scheduleSignTx = new ScheduleSignTransaction()
                .setScheduleId(ScheduleId.fromString(scheduleId))
                .setTransactionMemo(
                    `Hbank: Sign to mint ${amountHUSDC.toFixed(2)} hUSD`
                )

            // Freeze with signer
            const frozenScheduleTx = await scheduleSignTx.freezeWithSigner(
                signer as any // eslint-disable-line @typescript-eslint/no-explicit-any
            )

            let signedScheduleTx
            let userSignResponse

            try {
                // User signs the schedule
                console.log('Requesting user signature...')
                signedScheduleTx = await frozenScheduleTx.signWithSigner(
                    signer as any // eslint-disable-line @typescript-eslint/no-explicit-any
                )
                console.log('✅ User signature completed successfully')

                // Execute the user's signature
                console.log('Executing signed transaction...')
                userSignResponse = await signedScheduleTx.executeWithSigner(
                    signer as any // eslint-disable-line @typescript-eslint/no-explicit-any
                )
                console.log(
                    'User signature executed:',
                    userSignResponse.transactionId?.toString()
                )
            } catch (signingError: unknown) {
                console.error('Signing error:', signingError)

                // Check for user rejection with multiple approaches
                let errorMessage = ''
                let errorType = ''

                if (signingError instanceof Error) {
                    errorMessage = signingError.message || ''
                    errorType = signingError.name || ''
                } else if (typeof signingError === 'string') {
                    errorMessage = signingError
                } else if (signingError && typeof signingError === 'object') {
                    // Check common error properties
                    const errorObj = signingError as Record<string, unknown>
                    errorMessage =
                        (errorObj.message as string) ||
                        (errorObj.error as string) ||
                        (errorObj.reason as string) ||
                        ''
                    errorType =
                        (errorObj.name as string) ||
                        (errorObj.type as string) ||
                        ''
                }

                const fullErrorText =
                    `${errorType} ${errorMessage}`.toLowerCase()
                console.log('Full error text for analysis:', fullErrorText)

                // Enhanced detection for user rejection
                if (
                    fullErrorText.includes('user reject') ||
                    fullErrorText.includes('rejected') ||
                    fullErrorText.includes('cancel') ||
                    fullErrorText.includes('cancelled') ||
                    fullErrorText.includes('declined') ||
                    fullErrorText.includes('denied') ||
                    fullErrorText.includes('abort') ||
                    fullErrorText.includes('user denied') ||
                    fullErrorText.includes('user cancelled') ||
                    fullErrorText.includes('transaction rejected') ||
                    fullErrorText.includes('signature rejected') ||
                    fullErrorText.includes('user refused') ||
                    errorType.toLowerCase().includes('userabort') ||
                    errorType.toLowerCase().includes('usercancel') ||
                    // Common wallet rejection patterns
                    fullErrorText === '' || // Empty error often means user rejection
                    fullErrorText.includes('4001') || // MetaMask-style rejection code
                    fullErrorText.includes('user_rejected')
                ) {
                    processModal.closeModal()
                    setIsProcessing(false)
                    return
                }

                // For other signing errors, provide more detail
                let detailedError = 'Unknown signing error'
                if (errorMessage) {
                    detailedError = errorMessage
                } else if (errorType) {
                    detailedError = `Signing failed: ${errorType}`
                }

                throw new Error(`Wallet signing failed: ${detailedError}`)
            }

            // Get receipt to confirm user signature
            const userSignReceipt = await userSignResponse.getReceiptWithSigner(
                signer as any // eslint-disable-line @typescript-eslint/no-explicit-any
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

            // Step 3: Complete atomic transaction
            processModal.nextStep()
            console.log('Notifying backend of user signature...')

            const completeResponse = await fetch('/api/deposit/user-signed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scheduleId,
                    clientRequestId: userSignResponse.transactionId?.toString(),
                }),
            })

            console.log('Complete response status:', completeResponse.status)

            if (!completeResponse.ok) {
                const errorData = await completeResponse.json()
                console.error('Complete error:', errorData)
                throw new Error(
                    errorData.message ||
                        errorData.error ||
                        'Error completing atomic mint'
                )
            }

            const completeResult = await completeResponse.json()
            console.log('Complete success:', completeResult)

            // Step 4: Finalize
            processModal.nextStep()

            // Complete the process - the onComplete callback will handle cleanup
            processModal.completeProcess()
        } catch (error: unknown) {
            console.error('❌ Atomic mint failed:', error)

            let errorMessage = 'Unknown error occurred'

            if (error instanceof Error) {
                const message = error.message.toLowerCase()

                // Handle specific error types
                if (
                    message.includes('user reject') ||
                    message.includes('rejected') ||
                    message.includes('cancel') ||
                    message.includes('declined') ||
                    message.includes('denied') ||
                    message.includes('abort')
                ) {
                    // User cancelled
                    processModal.closeModal()
                    return
                } else if (message.includes('insufficient')) {
                    errorMessage =
                        'Insufficient balance to complete transaction'
                } else if (
                    message.includes('network') ||
                    message.includes('connection')
                ) {
                    errorMessage = 'Network connection error. Please try again'
                } else if (message.includes('timeout')) {
                    errorMessage = 'Transaction timeout. Please try again'
                } else if (message.includes('invalid amount')) {
                    errorMessage = 'Invalid amount entered'
                } else if (message.includes('schedule')) {
                    errorMessage =
                        'Schedule transaction error. Please try again'
                } else {
                    errorMessage = error.message
                }
            }

            processModal.setStepError(processModal.currentStep, errorMessage)
        } finally {
            setIsProcessing(false)
        }
    }

    const handleAcceptNewRate = () => {
        setShowRateConflict(false)
        setRateConflictData(null)
        // Retry mint operation with new rate from hook
        handleMint()
    }

    const handleCancelRateConflict = () => {
        setShowRateConflict(false)
        setRateConflictData(null)
        setIsProcessing(false)
    }

    // Show connect wallet button if not connected
    if (!isConnected) {
        return <ConnectWalletButton variant='full-width' />
    }

    // Show loading state while checking association
    if (walletLoading || isCheckingAssociation) {
        return (
            <Button className='w-full h-14 bg-blue-500 text-white' disabled>
                <span className='flex items-center gap-x-2 px-4'>
                    <Wallet size={24} className='animate-pulse' />
                    Checking wallet...
                </span>
            </Button>
        )
    }

    // Show associate token button if token is not associated
    if (hasTokenAssociation === false) {
        return (
            <Button
                className='w-full h-14 bg-blue-500 hover:bg-blue-600 text-white'
                onClick={handleAssociateToken}
                disabled={isProcessing}
            >
                <span className='flex items-center gap-x-2 px-4'>
                    {isProcessing
                        ? 'Associating Token...'
                        : 'Associate hUSD Token Id'}
                </span>
            </Button>
        )
    }

    // Show mint button if everything is ready
    const fromAmountNum = parseFloat(fromAmount) || 0
    const usdcBalanceNum = parseFloat(usdcBalance) || 0
    const hasInsufficientBalance = fromAmountNum > usdcBalanceNum
    const isDisabled =
        !fromAmount ||
        !toAmount ||
        fromAmountNum <= 0 ||
        isProcessing ||
        hasInsufficientBalance

    return (
        <>
            <Button
                className='w-full h-14 bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-400'
                onClick={handleMint}
                disabled={isDisabled}
            >
                <span className='flex items-center gap-x-2 px-4'>
                    {isProcessing
                        ? 'Processing Atomic Mint...'
                        : hasInsufficientBalance
                        ? 'Insufficient Balance'
                        : `Mint`}
                </span>
            </Button>

            {/* Rate Conflict Modal */}
            {rateConflictData && (
                <RateConflictModal
                    isOpen={showRateConflict}
                    onAcceptNewRate={handleAcceptNewRate}
                    onCancel={handleCancelRateConflict}
                    currentRate={rateConflictData.currentRate}
                    submittedRate={rateConflictData.submittedRate}
                    usdcAmount={rateConflictData.usdcAmount}
                />
            )}

            {/* Process Modal */}
            <ProcessModal
                isOpen={processModal.isOpen}
                processType={processModal.processType}
                currentStep={processModal.currentStep}
                steps={processModal.steps}
                onClose={processModal.closeModal}
                amount={processModal.amount}
                fromToken={processModal.fromToken}
                toToken={processModal.toToken}
                error={processModal.error}
            />
        </>
    )
}
