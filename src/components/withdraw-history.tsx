import React from 'react'
import { WithdrawStatus, WithdrawState } from '@/types/withdrawal'
import { Badge } from '@/components/ui/badge'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Clock,
    CheckCircle,
    XCircle,
    ExternalLink,
    RefreshCw,
} from 'lucide-react'

interface WithdrawHistoryProps {
    withdrawals: WithdrawStatus[]
    isLoading: boolean
    error: string | null
    onRefresh: () => void
}

export function WithdrawHistory({
    withdrawals,
    isLoading,
    error,
    onRefresh,
}: WithdrawHistoryProps) {
    const getStatusIcon = (status: string) => {
        switch (status) {
            case WithdrawState.PENDING:
                return <Clock className='h-4 w-4 text-yellow-500' />
            case WithdrawState.COMPLETED:
                return <CheckCircle className='h-4 w-4 text-green-500' />
            case WithdrawState.FAILED:
                return <XCircle className='h-4 w-4 text-red-500' />
            default:
                return <Clock className='h-4 w-4 text-gray-500' />
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case WithdrawState.PENDING:
                return (
                    <Badge
                        variant='secondary'
                        className='bg-yellow-100 text-yellow-800'
                    >
                        Pending
                    </Badge>
                )
            case WithdrawState.COMPLETED:
                return (
                    <Badge
                        variant='secondary'
                        className='bg-green-100 text-green-800'
                    >
                        Completed
                    </Badge>
                )
            case WithdrawState.FAILED:
                return (
                    <Badge
                        variant='secondary'
                        className='bg-red-100 text-red-800'
                    >
                        Failed
                    </Badge>
                )
            default:
                return <Badge variant='outline'>Unknown</Badge>
        }
    }

    const getTimeRemaining = (unlockAt: string) => {
        const unlockTime = new Date(unlockAt)
        const now = new Date()
        const diffMs = unlockTime.getTime() - now.getTime()

        if (diffMs <= 0) {
            return 'Ready for processing'
        }

        const hours = Math.floor(diffMs / (1000 * 60 * 60))
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

        if (hours > 0) {
            return `${hours}h ${minutes}m remaining`
        } else {
            return `${minutes}m remaining`
        }
    }

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString()
    }

    const openTxInExplorer = (txId: string) => {
        // Open Hedera testnet explorer
        window.open(`https://hashscan.io/testnet/transaction/${txId}`, '_blank')
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className='flex items-center justify-between'>
                        <span>Withdrawal History</span>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={onRefresh}
                            disabled={isLoading}
                        >
                            <RefreshCw
                                className={`h-4 w-4 ${
                                    isLoading ? 'animate-spin' : ''
                                }`}
                            />
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className='text-center text-red-600 py-4'>
                        <XCircle className='h-8 w-8 mx-auto mb-2' />
                        <p>Error loading withdrawals: {error}</p>
                        <Button
                            variant='outline'
                            onClick={onRefresh}
                            className='mt-2'
                        >
                            Try Again
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className='flex items-center justify-between'>
                    <span>Withdrawal History</span>
                    <Button
                        variant='outline'
                        size='sm'
                        onClick={onRefresh}
                        disabled={isLoading}
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${
                                isLoading ? 'animate-spin' : ''
                            }`}
                        />
                    </Button>
                </CardTitle>
                <CardDescription>
                    Track your withdrawal requests and their status
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading && withdrawals.length === 0 ? (
                    <div className='text-center py-8'>
                        <RefreshCw className='h-8 w-8 animate-spin mx-auto mb-2 text-gray-400' />
                        <p className='text-gray-500'>Loading withdrawals...</p>
                    </div>
                ) : withdrawals.length === 0 ? (
                    <div className='text-center py-8'>
                        <Clock className='h-8 w-8 mx-auto mb-2 text-gray-400' />
                        <p className='text-gray-500'>No withdrawals found</p>
                        <p className='text-sm text-gray-400'>
                            Your withdrawal history will appear here
                        </p>
                    </div>
                ) : (
                    <div className='space-y-4'>
                        {withdrawals.map((withdrawal) => (
                            <div
                                key={withdrawal.requestId}
                                className='border rounded-lg p-4 space-y-3'
                            >
                                {/* Header */}
                                <div className='flex items-center justify-between'>
                                    <div className='flex items-center space-x-2'>
                                        {getStatusIcon(withdrawal.status)}
                                        <span className='font-medium'>
                                            {withdrawal.amountHUSD.toFixed(6)}{' '}
                                            hUSD
                                        </span>
                                        <span className='text-gray-500'>→</span>
                                        <span className='font-medium'>
                                            {(
                                                withdrawal.amountHUSD *
                                                withdrawal.rate
                                            ).toFixed(6)}{' '}
                                            USDC
                                        </span>
                                    </div>
                                    {getStatusBadge(withdrawal.status)}
                                </div>

                                {/* Details */}
                                <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-sm'>
                                    <div>
                                        <span className='text-gray-500'>
                                            Request ID:
                                        </span>
                                        <p className='font-mono text-xs break-all'>
                                            {withdrawal.requestId}
                                        </p>
                                    </div>
                                    <div>
                                        <span className='text-gray-500'>
                                            Rate:
                                        </span>
                                        <p className='font-mono'>
                                            1 hUSD ={' '}
                                            {withdrawal.rate.toFixed(6)} USDC
                                        </p>
                                    </div>
                                    <div>
                                        <span className='text-gray-500'>
                                            Requested:
                                        </span>
                                        <p>
                                            {formatDateTime(
                                                withdrawal.requestedAt
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <span className='text-gray-500'>
                                            Unlock:
                                        </span>
                                        <p>
                                            {formatDateTime(
                                                withdrawal.unlockAt
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Status specific info */}
                                {withdrawal.status ===
                                    WithdrawState.PENDING && (
                                    <div className='bg-yellow-50 border border-yellow-200 rounded p-3'>
                                        <div className='flex items-center space-x-2'>
                                            <Clock className='h-4 w-4 text-yellow-600' />
                                            <span className='text-sm font-medium text-yellow-800'>
                                                {getTimeRemaining(
                                                    withdrawal.unlockAt
                                                )}
                                            </span>
                                        </div>
                                        <p className='text-xs text-yellow-700 mt-1'>
                                            Your withdrawal will be processed
                                            automatically once the lock period
                                            expires.
                                        </p>
                                    </div>
                                )}

                                {withdrawal.status ===
                                    WithdrawState.COMPLETED &&
                                    withdrawal.txId && (
                                        <div className='bg-green-50 border border-green-200 rounded p-3'>
                                            <div className='flex items-center justify-between'>
                                                <div>
                                                    <p className='text-sm font-medium text-green-800'>
                                                        Withdrawal completed
                                                        successfully!
                                                    </p>
                                                    <p className='text-xs text-green-700'>
                                                        Processed:{' '}
                                                        {withdrawal.processedAt &&
                                                            formatDateTime(
                                                                withdrawal.processedAt
                                                            )}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant='outline'
                                                    size='sm'
                                                    onClick={() =>
                                                        openTxInExplorer(
                                                            withdrawal.txId!
                                                        )
                                                    }
                                                >
                                                    <ExternalLink className='h-4 w-4 mr-1' />
                                                    View Tx
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                {withdrawal.status === WithdrawState.FAILED && (
                                    <div className='bg-red-50 border border-red-200 rounded p-3'>
                                        <div className='flex items-center justify-between'>
                                            <div>
                                                <p className='text-sm font-medium text-red-800'>
                                                    Withdrawal failed
                                                </p>
                                                <p className='text-xs text-red-700'>
                                                    {withdrawal.failureReason ||
                                                        'Unknown reason'}
                                                </p>
                                                {withdrawal.processedAt && (
                                                    <p className='text-xs text-red-600 mt-1'>
                                                        Failed:{' '}
                                                        {formatDateTime(
                                                            withdrawal.processedAt
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                            {withdrawal.txId && (
                                                <Button
                                                    variant='outline'
                                                    size='sm'
                                                    onClick={() =>
                                                        openTxInExplorer(
                                                            withdrawal.txId!
                                                        )
                                                    }
                                                >
                                                    <ExternalLink className='h-4 w-4 mr-1' />
                                                    View Tx
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
