'use client'

import { useState, useCallback } from 'react'
import { ProcessType, ProcessStep } from '@/components/process-modal'

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
            setProcessType(type)
            setSteps(initialSteps)
            setCurrentStep(initialSteps[0]?.id || '')
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
                const targetIndex = prev.findIndex((step) => step.id === stepId)

                return prev.map((step, index) => {
                    if (step.id === stepId) {
                        // Update the target step
                        return { ...step, status }
                    } else if (status === 'active' && index < targetIndex) {
                        // Mark all previous steps as completed when setting a step as active
                        return { ...step, status: 'completed' }
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
        setSteps((prev) => {
            const currentIndex = prev.findIndex(
                (step) => step.id === currentStep
            )
            const updatedSteps = prev.map((step, index) => {
                if (index === currentIndex) {
                    return { ...step, status: 'completed' as const }
                }
                return step
            })

            // Move to next step
            const nextIndex = currentIndex + 1
            if (nextIndex < prev.length) {
                setCurrentStep(prev[nextIndex].id)
                updatedSteps[nextIndex] = {
                    ...updatedSteps[nextIndex],
                    status: 'active',
                }
            }

            return updatedSteps
        })
    }, [currentStep])

    const setStepError = useCallback(
        (stepId: string, errorMessage: string) => {
            setSteps((prev) =>
                prev.map((step) =>
                    step.id === stepId ? { ...step, status: 'error' } : step
                )
            )
            setError(errorMessage)
            onError?.(errorMessage)
        },
        [onError]
    )

    const completeProcess = useCallback(() => {
        // Mark current step as completed
        setSteps((prev) =>
            prev.map((step) =>
                step.id === currentStep
                    ? { ...step, status: 'completed' }
                    : step
            )
        )

        // Close modal after a delay
        setTimeout(async () => {
            console.log(
                'ProcessModal completing process with callback:',
                !!onComplete
            )
            setIsOpen(false)
            if (onComplete) {
                console.log('Executing onComplete callback')
                try {
                    await onComplete()
                } catch (error) {
                    console.error('Error in onComplete callback:', error)
                }
            }
        }, 2000)
    }, [currentStep, onComplete])

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
        description: 'Creating atomic deposit schedule...',
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
        label: 'Completing Atomic Transaction',
        description: 'Treasury signing and executing the transaction...',
        status: 'pending',
    },
    {
        id: 'finalize',
        label: 'Finalizing',
        description: 'Updating balances and confirming transaction...',
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
        description: 'USDC transferred to your wallet...',
        status: 'pending',
    },
]

export const REDEEM_STANDARD_STEPS: ProcessStep[] = [
    {
        id: 'initialize',
        label: 'Creating Withdrawal Request',
        description: 'Setting up scheduled hUSD transfer...',
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
        description: 'Your hUSD is now locked for 48 hours',
        status: 'pending',
    },
]
