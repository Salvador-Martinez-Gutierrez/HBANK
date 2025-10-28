import React from 'react'
import {
    RefreshCw,
    ArrowDown,
    ArrowUp,
    Zap,
    Clock,
    CheckCircle,
    XCircle,
    ExternalLink,
    ArrowRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useHistory } from '@/hooks/useHistory'
import { cn } from '@/lib/utils'
import Image from 'next/image'

// Component for USDC icon
const USDCIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
    <Image
        alt='USDC'
        width={size}
        height={size}
        className='rounded-full inline-block mx-1'
        src='/usdc.svg'
    />
)

// Component for hUSD icon (grayscale version of USDC)
const HUSDIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
    <Image
        alt='hUSD'
        width={size}
        height={size}
        className='rounded-full grayscale inline-block mx-1'
        src='/usdc.svg'
    />
)

interface HistoryTransaction {
    timestamp: string
    type: 'deposit' | 'withdraw' | 'instant_withdraw'
    amountHUSD: number
    grossUSDC?: number
    fee?: number
    netUSDC?: number
    rate: number
    status: 'pending' | 'completed' | 'failed'
    txId: string
    failureReason?: string
}

interface HistoryCardsProps {
    userAccountId?: string
}

const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
    }).format(amount)
}

const formatTimestamp = (timestamp: string): { date: string; time: string } => {
    const date = new Date(timestamp)
    return {
        date: date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }),
        time: date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        }),
    }
}

const getTransactionIcon = (type: string) => {
    switch (type) {
        case 'deposit':
            return <ArrowDown className='h-5 w-5' />
        case 'withdraw':
            return <ArrowUp className='h-5 w-5' />
        case 'instant_withdraw':
            return <Zap className='h-5 w-5' />
        default:
            return <ArrowUp className='h-5 w-5' />
    }
}

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'completed':
            return <CheckCircle className='h-4 w-4 text-green-500' />
        case 'pending':
            return <Clock className='h-4 w-4 text-yellow-500' />
        case 'failed':
            return <XCircle className='h-4 w-4 text-red-500' />
        default:
            return <Clock className='h-4 w-4 text-gray-500' />
    }
}

const getTransactionColors = (type: string) => {
    switch (type) {
        case 'deposit':
            return {
                gradient:
                    'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
                border: 'border-green-200 dark:border-green-700',
                iconBg: 'bg-green-100 dark:bg-green-800',
                iconColor: 'text-green-600 dark:text-green-400',
                badge: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200',
            }
        case 'withdraw':
            return {
                gradient:
                    'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20',
                border: 'border-blue-200 dark:border-blue-700',
                iconBg: 'bg-blue-100 dark:bg-blue-800',
                iconColor: 'text-blue-600 dark:text-blue-400',
                badge: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200',
            }
        case 'instant_withdraw':
            return {
                gradient:
                    'from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20',
                border: 'border-purple-200 dark:border-purple-700',
                iconBg: 'bg-purple-100 dark:bg-purple-800',
                iconColor: 'text-purple-600 dark:text-purple-400',
                badge: 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200',
            }
        default:
            return {
                gradient:
                    'from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20',
                border: 'border-gray-200 dark:border-gray-700',
                iconBg: 'bg-gray-100 dark:bg-gray-800',
                iconColor: 'text-gray-600 dark:text-gray-400',
                badge: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
            }
    }
}

const TransactionCard: React.FC<{ transaction: HistoryTransaction }> = ({
    transaction,
}) => {
    const colors = getTransactionColors(transaction.type)
    const { date, time } = formatTimestamp(transaction.timestamp)

    // Only show link for completed transactions with valid txId (not requestId)
    const hasValidTxLink =
        transaction.status === 'completed' &&
        transaction.txId &&
        !transaction.txId.startsWith('withdraw_') &&
        !transaction.txId.startsWith('instant_withdraw_')

    const openInHashscan = () => {
        if (hasValidTxLink) {
            window.open(
                `https://hashscan.io/testnet/transaction/${transaction.txId}`,
                '_blank'
            )
        }
    }

    return (
        <Card
            className={cn(
                'rounded-2xl border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]',
                colors.border
            )}
        >
            <CardContent
                className={cn('p-6 bg-gradient-to-br', colors.gradient)}
            >
                <div className='flex items-start justify-between mb-4'>
                    <div className='flex items-center space-x-3'>
                        <div className={cn('p-2 rounded-full', colors.iconBg)}>
                            <div className={colors.iconColor}>
                                {getTransactionIcon(transaction.type)}
                            </div>
                        </div>
                        <div>
                            <div className='flex items-center space-x-2'>
                                <Badge className={colors.badge}>
                                    {transaction.type === 'instant_withdraw'
                                        ? 'Instant Withdraw'
                                        : transaction.type
                                              .charAt(0)
                                              .toUpperCase() +
                                          transaction.type.slice(1)}
                                </Badge>
                                {getStatusIcon(transaction.status)}
                            </div>
                            <div className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                                {date} at {time}
                            </div>
                        </div>
                    </div>
                    {hasValidTxLink && (
                        <Button
                            variant='ghost'
                            size='sm'
                            onClick={openInHashscan}
                            className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        >
                            <ExternalLink className='h-4 w-4' />
                        </Button>
                    )}
                </div>

                <div className='space-y-4'>
                    {/* Transaction Flow Steps */}
                    {transaction.type === 'deposit' && (
                        <div className='bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700'>
                            <div className='flex items-center justify-between'>
                                {/* Step 1: USDC Sent */}
                                <div className='flex flex-col items-center text-center'>
                                    <div className='mb-2'>
                                        <USDCIcon size={40} />
                                    </div>
                                    <div className='text-xs text-gray-600 dark:text-gray-400 mb-1'>
                                        Sent USDC
                                    </div>
                                    <div className='text-lg font-bold text-gray-900 dark:text-gray-100'>
                                        {formatAmount(
                                            transaction.grossUSDC ||
                                                transaction.netUSDC ||
                                                0
                                        )}
                                    </div>
                                </div>

                                {/* Arrow */}
                                <div className='flex flex-col items-center mx-4'>
                                    <ArrowRight className='h-5 w-5 text-gray-400 mb-1' />
                                    <div className='text-xs text-gray-500 dark:text-gray-400 text-center'>
                                        Rate: {formatAmount(transaction.rate)}
                                    </div>
                                </div>

                                {/* Step 2: hUSD Received */}
                                <div className='flex flex-col items-center text-center'>
                                    <div className='mb-2'>
                                        <HUSDIcon size={40} />
                                    </div>
                                    <div className='text-xs text-gray-600 dark:text-gray-400 mb-1'>
                                        Received hUSD
                                    </div>
                                    <div className='text-lg font-bold text-gray-900 dark:text-gray-100'>
                                        {formatAmount(transaction.amountHUSD)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Withdrawal Flow Steps */}
                    {(transaction.type === 'withdraw' ||
                        transaction.type === 'instant_withdraw') && (
                        <div className='bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700'>
                            <div className='flex items-center justify-between'>
                                {/* Step 1: hUSD Sent */}
                                <div className='flex flex-col items-center text-center'>
                                    <div className='mb-2'>
                                        <HUSDIcon size={40} />
                                    </div>
                                    <div className='text-xs text-gray-600 dark:text-gray-400 mb-1'>
                                        Sent hUSD
                                    </div>
                                    <div className='text-lg font-bold text-gray-900 dark:text-gray-100'>
                                        {formatAmount(transaction.amountHUSD)}
                                    </div>
                                </div>

                                {/* Arrow with Rate */}
                                <div className='flex flex-col items-center mx-4'>
                                    <ArrowRight className='h-5 w-5 text-gray-400 mb-1' />
                                    <div className='text-xs text-gray-500 dark:text-gray-400 text-center'>
                                        Rate: {formatAmount(transaction.rate)}
                                    </div>
                                    {transaction.type ===
                                        'instant_withdraw' && (
                                        <div className='text-xs text-purple-600 dark:text-purple-400 font-medium'>
                                            -1% fee
                                        </div>
                                    )}
                                </div>

                                {/* Step 2: USDC Received */}
                                <div className='flex flex-col items-center text-center'>
                                    <div className='mb-2'>
                                        <USDCIcon size={40} />
                                    </div>
                                    <div className='text-xs text-gray-600 dark:text-gray-400 mb-1'>
                                        {transaction.status === 'completed'
                                            ? 'Received USDC'
                                            : 'Expected USDC'}
                                    </div>
                                    <div className='text-lg font-bold text-gray-900 dark:text-gray-100'>
                                        {transaction.status === 'completed' &&
                                        transaction.netUSDC
                                            ? formatAmount(transaction.netUSDC)
                                            : formatAmount(
                                                  transaction.amountHUSD *
                                                      transaction.rate *
                                                      (transaction.type ===
                                                      'instant_withdraw'
                                                          ? 0.99
                                                          : 1)
                                              )}
                                    </div>
                                </div>
                            </div>

                            {/* Fee breakdown for instant withdrawals */}
                            {transaction.type === 'instant_withdraw' &&
                                transaction.status === 'completed' &&
                                transaction.grossUSDC && (
                                    <div className='mt-3 pt-3 border-t border-gray-200 dark:border-gray-700'>
                                        <div className='flex justify-between text-sm'>
                                            <span className='text-gray-600 dark:text-gray-400'>
                                                Gross USDC:
                                            </span>
                                            <span className='font-medium'>
                                                {formatAmount(
                                                    transaction.grossUSDC
                                                )}
                                            </span>
                                        </div>
                                        <div className='flex justify-between text-sm text-red-600 dark:text-red-400'>
                                            <span>Fee (1%):</span>
                                            <span>
                                                -
                                                {formatAmount(
                                                    transaction.fee || 0
                                                )}
                                            </span>
                                        </div>
                                        <div className='flex justify-between text-sm font-semibold pt-1 border-t border-gray-200 dark:border-gray-700'>
                                            <span>Net USDC:</span>
                                            <span className='text-green-600 dark:text-green-400'>
                                                {formatAmount(
                                                    transaction.netUSDC || 0
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                )}
                        </div>
                    )}

                    {/* Failure Reason */}
                    {transaction.status === 'failed' &&
                        transaction.failureReason && (
                            <Alert className='mt-3 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'>
                                <AlertDescription className='text-sm text-red-700 dark:text-red-300'>
                                    {transaction.failureReason}
                                </AlertDescription>
                            </Alert>
                        )}
                </div>
            </CardContent>
        </Card>
    )
}

const LoadingSkeleton: React.FC = () => (
    <Card className='rounded-2xl'>
        <CardContent className='p-6'>
            <div className='flex items-start justify-between mb-4'>
                <div className='flex items-center space-x-3'>
                    <Skeleton className='h-10 w-10 rounded-full' />
                    <div className='space-y-2'>
                        <Skeleton className='h-6 w-24' />
                        <Skeleton className='h-4 w-32' />
                    </div>
                </div>
            </div>
            <div className='space-y-3'>
                <div className='grid grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                        <Skeleton className='h-4 w-20' />
                        <Skeleton className='h-6 w-24' />
                    </div>
                    <div className='space-y-2'>
                        <Skeleton className='h-4 w-16' />
                        <Skeleton className='h-6 w-20' />
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
)

export const HistoryCards: React.FC<HistoryCardsProps> = ({
    userAccountId,
}) => {
    const {
        history,
        isLoading,
        error,
        hasMore,
        refresh,
        loadMore,
        isRefreshDisabled,
        refreshTimeRemaining,
    } = useHistory({
        userAccountId,
        enabled: !!userAccountId,
        limit: 10,
    })

    if (!userAccountId) {
        return (
            <div className='flex items-center justify-center py-8'>
                Please connect your wallet to view transaction history.
            </div>
        )
    }

    return (
        <div className='space-y-6'>
            {/* Header with Refresh Button */}
            <div className='flex items-center justify-between'>
                <div>
                    <h3 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                        Transaction History
                    </h3>
                    <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                        View your deposits, withdrawals, and instant withdrawals
                    </p>
                </div>
                <Button
                    onClick={refresh}
                    disabled={isRefreshDisabled || isLoading}
                    variant='outline'
                    size='sm'
                    className='flex items-center space-x-2'
                >
                    <RefreshCw
                        className={cn('h-4 w-4', isLoading && 'animate-spin')}
                    />
                    <span>
                        {isRefreshDisabled
                            ? `Refresh (${refreshTimeRemaining}s)`
                            : 'Refresh'}
                    </span>
                </Button>
            </div>

            {/* Error State */}
            {error && (
                <Alert className='border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'>
                    <XCircle className='h-4 w-4 text-red-600 dark:text-red-400' />
                    <AlertDescription className='text-red-800 dark:text-red-300'>
                        {error}
                    </AlertDescription>
                </Alert>
            )}

            {/* Transaction Cards */}
            <div className='space-y-4'>
                {history.map((transaction, index) => (
                    <TransactionCard
                        key={`${transaction.txId}-${index}`}
                        transaction={transaction}
                    />
                ))}

                {/* Loading Skeletons */}
                {isLoading && history.length === 0 && (
                    <>
                        {Array.from({ length: 3 }).map((_, index) => (
                            <LoadingSkeleton key={index} />
                        ))}
                    </>
                )}
            </div>

            {/* Load More Button */}
            {hasMore && (
                <div className='flex justify-center pt-4'>
                    <Button
                        onClick={loadMore}
                        disabled={isLoading}
                        variant='outline'
                        className='flex items-center space-x-2'
                    >
                        {isLoading ? (
                            <RefreshCw className='h-4 w-4 animate-spin' />
                        ) : (
                            <ArrowDown className='h-4 w-4' />
                        )}
                        <span>{isLoading ? 'Loading...' : 'Load More'}</span>
                    </Button>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && history.length === 0 && !error && (
                <div className='flex items-center justify-center py-12'>
                    <div className='text-center'>
                        <Clock className='h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4' />
                        <h4 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-2'>
                            No Transaction History
                        </h4>
                        <p className='text-gray-600 dark:text-gray-400'>
                            Your transaction history will appear here once you
                            start using the protocol.
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
