'use client'

import { useState, useCallback } from 'react'
import { ProcessType, ProcessStep } from '@/components/process-modal'
import { formatProcessError } from '@/lib/process-error'
import { logger } from '@/lib/logger'


export interface UseProcessModalProps {
    onComplete?: () => void | Promise<void>
    onError?: (error: string) => void
}

export function useProcessModal({
    onComplete,
    onError,
}: UseProcessModalProps = {}) {
    const [isOpen, setIsOpen] = useState(false)
    const [processType, setProcessType] = useState<ProcessType>('mint')
    const [currentStep, setCurrentStep] = useState('')
    const [steps, setSteps] = useState<ProcessStep[]>([])
    const [amount, setAmount] = useState<string>()
    const [fromToken, setFromToken] = useState<string>()
    const [toToken, setToToken] = useState<string>()
    const [error, setError] = useState<string | null>(null)

    const startProcess = useCallback(
        (
            type: ProcessType,
            initialSteps: ProcessStep[],
            options?: {
                amount?: string
                fromToken?: string
                toToken?: string
            }
        ) => {
            logger.info(
                '🚀 Starting process:',
                type,
                'with steps:',
                initialSteps.length
            )
            setProcessType(type)
            // Mark the first step as active when starting the process
            const stepsWithFirstActive = initialSteps.map((step, index) =>
                index === 0 ? { ...step, status: 'active' as const } : step
            )
            logger.info('📝 Steps with first active:', stepsWithFirstActive)
            setSteps(stepsWithFirstActive)
            setCurrentStep(initialSteps[0]?.id || '')
            logger.info('✅ Current step set to:', initialSteps[0]?.id)
            setAmount(options?.amount)
            setFromToken(options?.fromToken)
            setToToken(options?.toToken)
            setError(null)
            setIsOpen(true)
        },
        []
    )

    const updateStep = useCallback(
        (stepId: string, status: ProcessStep['status']) => {
            setSteps((prev) => {
                return prev.map((step) => {
                    if (step.id === stepId) {
                        // Update the target step
                        return { ...step, status }
                    }
                    return step
                })
            })

            if (status === 'active') {
                setCurrentStep(stepId)
            }
        },
        []
    )

    const nextStep = useCallback(() => {
        logger.info('⏭️ nextStep called, currentStep:', currentStep)
        setSteps((prev) => {
            logger.info(
                '📊 Current steps before nextStep:',
                prev.map((s) => ({ id: s.id, status: s.status }))
            )

            // Find the currently active step instead of relying on currentStep state
            const currentIndex = prev.findIndex(
                (step) => step.status === 'active'
            )

            // If no active step found, find by currentStep as fallback
            const fallbackIndex =
                currentIndex === -1
                    ? prev.findIndex((step) => step.id === currentStep)
                    : currentIndex

            const indexToUse =
                currentIndex !== -1 ? currentIndex : fallbackIndex

            logger.info(
                '🔍 Active step index:',
                currentIndex,
                'fallback index:',
                fallbackIndex,
                'using:',
                indexToUse
            )

            if (indexToUse === -1) {
                logger.warn('⚠️ No active step found to advance from')
                return prev
            }

            const updatedSteps = prev.map((step, index) => {
                if (index === indexToUse) {
                    return { ...step, status: 'completed' as const }
                }
                return step
            })

            // Move to next step
            const nextIndex = indexToUse + 1
            if (nextIndex < prev.length) {
                updatedSteps[nextIndex] = {
                    ...updatedSteps[nextIndex],
                    status: 'active',
                }
                logger.info(
                    '✅ Moving to next step:',
                    prev[nextIndex].id,
                    'at index:',
                    nextIndex
                )
                // Update currentStep state after updating steps
                setTimeout(() => setCurrentStep(prev[nextIndex].id), 0)
            } else {
                logger.info('🏁 No more steps to advance to')
            }

            logger.info(
                '📊 Updated steps after nextStep:',
                updatedSteps.map((s) => ({ id: s.id, status: s.status }))
            )
            return updatedSteps
        })
    }, [currentStep])

    const setStepError = useCallback(
        (stepId: string, errorMessage: string) => {
            const formattedError = formatProcessError(errorMessage)
            setSteps((prev) =>
                prev.map((step) =>
                    step.id === stepId ? { ...step, status: 'error' } : step
                )
            )
            setError(formattedError)
            onError?.(formattedError)
        },
        [onError]
    )

    const completeProcess = useCallback(() => {
        // Close modal after a delay and execute callback
        setTimeout(() => {
            void (async () => {
                logger.info(
                    'ProcessModal completing process with callback:',
                    !!onComplete
                )
                setIsOpen(false)
                if (onComplete) {
                    logger.info('Executing onComplete callback')
                    try {
                        await onComplete()
                    } catch (error) {
                        logger.error('Error in onComplete callback:', error)
                    }
                }
            })()
        }, 2000)
    }, [onComplete])

    const closeModal = useCallback(() => {
        setIsOpen(false)
        setCurrentStep('')
        setSteps([])
        setError(null)
        setAmount(undefined)
        setFromToken(undefined)
        setToToken(undefined)
    }, [])

    return {
        // State
        isOpen,
        processType,
        currentStep,
        steps,
        amount,
        fromToken,
        toToken,
        error,

        // Actions
        startProcess,
        updateStep,
        nextStep,
        setStepError,
        completeProcess,
        closeModal,
    }
}

// Predefined step configurations for common processes
export const MINT_STEPS: ProcessStep[] = [
    {
        id: 'initialize',
        label: 'Initializing Transaction',
        description: 'Creating deposit scheduled transaction...',
        status: 'pending',
    },
    {
        id: 'user-sign',
        label: 'Awaiting Your Signature',
        description: 'Please approve the transaction in your wallet',
        status: 'pending',
    },
    {
        id: 'complete',
        label: 'Completing Scheduled Transaction',
        description: 'Treasury signing and executing the transaction...',
        status: 'pending',
    },
    {
        id: 'finalize',
        label: 'Finalizing',
        description: 'Confirming transaction...',
        status: 'pending',
    },
]

export const REDEEM_INSTANT_STEPS: ProcessStep[] = [
    {
        id: 'user-sign',
        label: 'Sign Transfer',
        description: 'Sign to transfer hUSD to treasury...',
        status: 'pending',
    },
    {
        id: 'process',
        label: 'Processing Withdrawal',
        description: 'Converting hUSD to USDC with fee calculation...',
        status: 'pending',
    },
    {
        id: 'finalize',
        label: 'Transfer Complete',
        description: 'USDC transferred to your wallet.',
        status: 'pending',
    },
]

export const REDEEM_STANDARD_STEPS: ProcessStep[] = [
    {
        id: 'initialize',
        label: 'Creating Withdrawal Request',
        description: 'Setting hUSD withdrawal request...',
        status: 'pending',
    },
    {
        id: 'user-sign',
        label: 'Awaiting Your Signature',
        description: 'Please approve the withdrawal request in your wallet',
        status: 'pending',
    },
    {
        id: 'finalize',
        label: 'Request Submitted',
        description: 'Your withdrawal request has been created.',
        status: 'pending',
    },
]
