import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    AlertTriangle,
    RefreshCw,
    TrendingUp,
    TrendingDown,
} from 'lucide-react'

interface RateConflictModalProps {
    isOpen: boolean
    onAcceptNewRate: () => void
    onCancel: () => void
    currentRate: {
        rate: number
        sequenceNumber: string
        timestamp: string
    }
    submittedRate: {
        rate: number
        sequenceNumber: string
        timestamp: string
    }
    usdcAmount: number
}

export function RateConflictModal({
    isOpen,
    onAcceptNewRate,
    onCancel,
    currentRate,
    submittedRate,
    usdcAmount,
}: RateConflictModalProps) {
    if (!isOpen) return null

    const rateDifference = currentRate.rate - submittedRate.rate
    const rateDifferencePercent = (rateDifference / submittedRate.rate) * 100
    const isRateIncrease = rateDifference > 0

    const oldHusdAmount = usdcAmount / submittedRate.rate
    const newHusdAmount = usdcAmount / currentRate.rate
    const husdDifference = newHusdAmount - oldHusdAmount

    const formatTimestamp = (timestamp: string) => {
        try {
            const [seconds] = timestamp.split('.')
            const date = new Date(parseInt(seconds) * 1000)
            return date.toLocaleString()
        } catch {
            return timestamp
        }
    }

    return (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
            <Card className='w-full max-w-lg'>
                <CardHeader>
                    <CardTitle className='flex items-center gap-2 text-orange-600'>
                        <AlertTriangle className='w-5 h-5' />
                        Exchange Rate Updated
                    </CardTitle>
                </CardHeader>
                <CardContent className='space-y-6'>
                    {/* Rate Comparison */}
                    <div className='space-y-4'>
                        <div className='text-sm text-gray-600 dark:text-gray-400'>
                            The exchange rate has been updated while processing
                            your transaction.
                        </div>

                        <div className='grid grid-cols-2 gap-4'>
                            {/* Old Rate */}
                            <div className='p-3 border rounded-lg'>
                                <div className='text-xs text-gray-500 mb-1'>
                                    Previous Rate
                                </div>
                                <div className='font-mono text-lg'>
                                    {submittedRate.rate.toFixed(6)}
                                </div>
                                <div className='text-xs text-gray-500'>
                                    Seq: {submittedRate.sequenceNumber}
                                </div>
                            </div>

                            {/* New Rate */}
                            <div className='p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20'>
                                <div className='text-xs text-gray-500 mb-1'>
                                    Current Rate
                                </div>
                                <div className='font-mono text-lg'>
                                    {currentRate.rate.toFixed(6)}
                                </div>
                                <div className='text-xs text-gray-500'>
                                    Seq: {currentRate.sequenceNumber}
                                </div>
                            </div>
                        </div>

                        {/* Rate Change Indicator */}
                        <div className='flex items-center justify-center gap-2'>
                            {isRateIncrease ? (
                                <TrendingUp className='w-4 h-4 text-red-500' />
                            ) : (
                                <TrendingDown className='w-4 h-4 text-green-500' />
                            )}
                            <Badge
                                variant={
                                    isRateIncrease ? 'destructive' : 'default'
                                }
                                className='font-mono'
                            >
                                {isRateIncrease ? '+' : ''}
                                {rateDifferencePercent.toFixed(3)}%
                            </Badge>
                        </div>

                        {/* Amount Impact */}
                        <div className='p-3 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                            <div className='text-sm font-medium mb-2'>
                                Impact on Your Transaction:
                            </div>
                            <div className='space-y-2 text-sm'>
                                <div className='flex justify-between'>
                                    <span>USDC Amount:</span>
                                    <span className='font-mono'>
                                        {usdcAmount.toFixed(2)} USDC
                                    </span>
                                </div>
                                <div className='flex justify-between'>
                                    <span>Previous hUSD:</span>
                                    <span className='font-mono'>
                                        {oldHusdAmount.toFixed(6)} hUSD
                                    </span>
                                </div>
                                <div className='flex justify-between'>
                                    <span>New hUSD:</span>
                                    <span className='font-mono'>
                                        {newHusdAmount.toFixed(6)} hUSD
                                    </span>
                                </div>
                                <hr className='my-2' />
                                <div className='flex justify-between font-medium'>
                                    <span>Difference:</span>
                                    <span
                                        className={`font-mono ${
                                            husdDifference >= 0
                                                ? 'text-green-600'
                                                : 'text-red-600'
                                        }`}
                                    >
                                        {husdDifference >= 0 ? '+' : ''}
                                        {husdDifference.toFixed(6)} hUSD
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Timestamps */}
                        <div className='text-xs text-gray-500 space-y-1'>
                            <div>
                                Previous:{' '}
                                {formatTimestamp(submittedRate.timestamp)}
                            </div>
                            <div>
                                Current:{' '}
                                {formatTimestamp(currentRate.timestamp)}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className='flex flex-col gap-3'>
                        <Button
                            onClick={onAcceptNewRate}
                            className='w-full'
                            variant='default'
                        >
                            <RefreshCw className='w-4 h-4 mr-2' />
                            Continue with New Rate
                        </Button>

                        <Button
                            onClick={onCancel}
                            variant='outline'
                            className='w-full'
                        >
                            Cancel Transaction
                        </Button>
                    </div>

                    <div className='text-xs text-gray-500 text-center'>
                        Rates are updated in real-time from the Hedera Consensus
                        Service
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default RateConflictModal
