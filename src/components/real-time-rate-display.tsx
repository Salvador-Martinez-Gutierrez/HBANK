import React from 'react'
import { useRealTimeRate } from '@/hooks/useRealTimeRate'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    AlertCircle,
    CheckCircle,
    Loader2,
    RefreshCw,
    Wifi,
    WifiOff,
} from 'lucide-react'

interface RealTimeRateDisplayProps {
    className?: string
    showDetails?: boolean
}

export function RealTimeRateDisplay({
    className = '',
    showDetails = false,
}: RealTimeRateDisplayProps) {
    const { rateData, isLoading, error, refetch, isConnected } =
        useRealTimeRate()

    const formatRate = (rate: number) => {
        return rate.toFixed(6)
    }

    const formatTimestamp = (timestamp: string) => {
        try {
            // Hedera timestamps are in format: seconds.nanoseconds
            const [seconds] = timestamp.split('.')
            const date = new Date(parseInt(seconds) * 1000)
            return date.toLocaleString()
        } catch {
            return timestamp
        }
    }

    const getStatusColor = () => {
        if (error) return 'destructive'
        if (isLoading) return 'secondary'
        if (isConnected) return 'default'
        return 'secondary'
    }

    const getStatusIcon = () => {
        if (error) return <AlertCircle className='w-4 h-4' />
        if (isLoading) return <Loader2 className='w-4 h-4 animate-spin' />
        if (isConnected) return <CheckCircle className='w-4 h-4' />
        return <WifiOff className='w-4 h-4' />
    }

    return (
        <Card className={className}>
            <CardHeader className='pb-3'>
                <CardTitle className='flex items-center justify-between text-lg'>
                    <span>USDC → hUSD Rate</span>
                    <div className='flex items-center gap-2'>
                        <Badge
                            variant={getStatusColor()}
                            className='flex items-center gap-1'
                        >
                            {getStatusIcon()}
                            {isConnected ? (
                                <Wifi className='w-3 h-3' />
                            ) : (
                                <WifiOff className='w-3 h-3' />
                            )}
                            {error
                                ? 'Error'
                                : isLoading
                                ? 'Loading'
                                : isConnected
                                ? 'Live'
                                : 'Disconnected'}
                        </Badge>
                        <button
                            onClick={refetch}
                            disabled={isLoading}
                            className='p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
                            title='Refresh rate'
                        >
                            <RefreshCw
                                className={`w-4 h-4 ${
                                    isLoading ? 'animate-spin' : ''
                                }`}
                            />
                        </button>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {error ? (
                    <div className='text-red-600 dark:text-red-400 space-y-2'>
                        <p className='font-medium'>Connection Error</p>
                        <p className='text-sm opacity-80'>{error}</p>
                        <button
                            onClick={refetch}
                            className='text-sm underline hover:no-underline'
                        >
                            Try again
                        </button>
                    </div>
                ) : rateData ? (
                    <div className='space-y-3'>
                        <div className='text-center'>
                            <div className='text-3xl font-bold text-green-600 dark:text-green-400'>
                                {formatRate(rateData.rate)}
                            </div>
                            <div className='text-sm text-gray-600 dark:text-gray-400'>
                                1 USDC = {formatRate(1 / rateData.rate)} hUSD
                            </div>
                        </div>

                        {showDetails && (
                            <div className='border-t pt-3 space-y-2 text-sm'>
                                <div className='flex justify-between'>
                                    <span className='text-gray-600 dark:text-gray-400'>
                                        Sequence:
                                    </span>
                                    <span className='font-mono'>
                                        {rateData.sequenceNumber}
                                    </span>
                                </div>
                                <div className='flex justify-between'>
                                    <span className='text-gray-600 dark:text-gray-400'>
                                        Updated:
                                    </span>
                                    <span className='font-mono text-xs'>
                                        {formatTimestamp(rateData.timestamp)}
                                    </span>
                                </div>
                                <div className='flex justify-between'>
                                    <span className='text-gray-600 dark:text-gray-400'>
                                        Local Time:
                                    </span>
                                    <span className='text-xs'>
                                        {rateData.lastUpdated.toLocaleTimeString()}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className='text-center text-gray-500 dark:text-gray-400'>
                        <Loader2 className='w-8 h-8 animate-spin mx-auto mb-2' />
                        <p>Fetching latest rate...</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default RealTimeRateDisplay
