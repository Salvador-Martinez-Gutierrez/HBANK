'use client'

import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Loader2,
    CheckCircle,
    XCircle,
    Clock,
    Zap,
    ArrowRightLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type ProcessType = 'mint' | 'redeem-instant' | 'redeem-standard'

export interface ProcessStep {
    id: string
    label: string
    description?: string
    status: 'pending' | 'active' | 'completed' | 'error'
}

export interface ProcessModalProps {
    isOpen: boolean
    processType: ProcessType
    currentStep: string
    steps: ProcessStep[]
    onClose?: () => void
    amount?: string
    fromToken?: string
    toToken?: string
    error?: string | null
}

export function ProcessModal({
    isOpen,
    processType,
    currentStep,
    steps,
    onClose,
    amount,
    fromToken,
    toToken,
    error,
}: ProcessModalProps) {
    console.log('🔄 ProcessModal render:', {
        isOpen,
        processType,
        currentStep,
        stepsCount: steps.length,
        amount,
        fromToken,
        toToken,
    })

    const getProcessIcon = (type: ProcessType) => {
        switch (type) {
            case 'mint':
                return <Zap className='h-8 w-8 text-emerald-400' />
            case 'redeem-instant':
                return <ArrowRightLeft className='h-8 w-8 text-blue-500' />
            case 'redeem-standard':
                return <Clock className='h-8 w-8 text-orange-500' />
        }
    }

    const getProcessTitle = (type: ProcessType) => {
        switch (type) {
            case 'mint':
                return 'Minting hUSD'
            case 'redeem-instant':
                return 'Instant Redeem'
            case 'redeem-standard':
                return 'Standard Redeem'
        }
    }

    const getProcessDescription = (
        type: ProcessType,
        amount?: string,
        fromToken?: string,
        toToken?: string
    ) => {
        const amountText =
            amount && fromToken && toToken
                ? `${amount} ${fromToken} → ${toToken}`
                : ''

        switch (type) {
            case 'mint':
                return `Converting ${amountText}`
            case 'redeem-instant':
                return `Instantly redeeming ${amountText}`
            case 'redeem-standard':
                return `Standard redemption of ${amountText}`
        }
    }

    const getStepIcon = (status: ProcessStep['status']) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className='h-5 w-5 text-emerald-400' />
            case 'active':
                return (
                    <Loader2 className='h-5 w-5 text-blue-500 animate-spin' />
                )
            case 'error':
                return <XCircle className='h-5 w-5 text-red-500' />
            default:
                return (
                    <div className='h-5 w-5 rounded-full border-2 border-gray-300' />
                )
        }
    }

    const getStepColor = (status: ProcessStep['status']) => {
        switch (status) {
            case 'completed':
                return 'text-emerald-400 bg-emerald-900/20 border border-emerald-700/40'
            case 'active':
                return 'text-blue-400 bg-blue-900/30 border border-blue-700/50'
            case 'error':
                return 'text-red-400 bg-red-900/30 border border-red-700/50'
            default:
                return 'text-gray-400 bg-gray-800/30 border border-gray-600/50'
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className='sm:max-w-md bg-gray-900/95 border border-gray-700 backdrop-blur-sm'>
                <DialogHeader>
                    <div className='flex items-center justify-center mb-4'>
                        {getProcessIcon(processType)}
                    </div>
                    <DialogTitle className='text-center text-white'>
                        {getProcessTitle(processType)}
                    </DialogTitle>
                    <DialogDescription className='text-center text-gray-300'>
                        {getProcessDescription(
                            processType,
                            amount,
                            fromToken,
                            toToken
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className='space-y-4'>
                    {steps.map((step, index) => {
                        const stepColor = getStepColor(step.status)

                        return (
                            <div
                                key={step.id}
                                className={cn(
                                    'flex items-start gap-3 p-3 rounded-lg transition-colors',
                                    stepColor
                                )}
                            >
                                <div className='flex-shrink-0 mt-0.5'>
                                    {getStepIcon(step.status)}
                                </div>
                                <div className='flex-1 min-w-0'>
                                    <div className='flex items-center gap-2'>
                                        <span className='text-xs font-medium text-gray-500'>
                                            STEP {index + 1}
                                        </span>
                                        {step.status === 'active' && (
                                            <div className='flex space-x-1'>
                                                <div className='w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]'></div>
                                                <div className='w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]'></div>
                                                <div className='w-2 h-2 bg-blue-400 rounded-full animate-bounce'></div>
                                            </div>
                                        )}
                                    </div>
                                    <p className='font-medium text-sm'>
                                        {step.label}
                                    </p>
                                    {step.description && (
                                        <p className='text-sm text-gray-400 mt-1'>
                                            {step.description}
                                        </p>
                                    )}
                                    {step.status === 'error' && error && (
                                        <p className='text-sm text-red-400 mt-2 font-medium break-words whitespace-pre-line'>
                                            {error}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Footer info */}
                <div className='mt-6 pt-4 border-t border-gray-700'>
                    <div className='flex items-center justify-between text-sm text-gray-400'>
                        <span>Process Status</span>
                        <span>
                            {
                                steps.filter((s) => s.status === 'completed')
                                    .length
                            }{' '}
                            of {steps.length} completed
                        </span>
                    </div>

                    {/* Progress bar */}
                    <div className='mt-2 w-full bg-gray-700 rounded-full h-2'>
                        <div
                            className='bg-blue-500 h-2 rounded-full transition-all duration-500'
                            style={{
                                width: `${
                                    (steps.filter(
                                        (s) => s.status === 'completed'
                                    ).length /
                                        steps.length) *
                                    100
                                }%`,
                            }}
                        ></div>
                    </div>
                </div>

                {/* Error state */}
                {error && (
                    <div className='mt-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg'>
                        <div className='flex items-center gap-2'>
                            <XCircle className='h-4 w-4 text-red-400' />
                            <span className='text-sm font-medium text-red-400'>
                                Process Failed
                            </span>
                        </div>
                        <p className='text-sm text-red-300 mt-1 break-words whitespace-pre-line'>
                            {error}
                        </p>
                    </div>
                )}

                {/* Success state info */}
                {steps.every((s) => s.status === 'completed') && (
                    <div className='mt-4 p-3 bg-emerald-900/20 border border-emerald-700/40 rounded-lg'>
                        <div className='flex items-center gap-2'>
                            <CheckCircle className='h-4 w-4 text-emerald-400' />
                            <span className='text-sm font-medium text-emerald-400'>
                                Process Completed Successfully
                            </span>
                        </div>
                        <p className='text-sm text-emerald-300 mt-1'>
                            This modal will close automatically in a moment.
                        </p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
