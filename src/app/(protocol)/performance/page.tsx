'use client'

import { useState } from 'react'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts'
import { useRateHistory } from '@/hooks/useRateHistory'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Activity,
    ArrowUp,
    ArrowDown,
    ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { RATES_TOPIC_ID } from '@/app/backend-constants'
import { useTheme } from '@/components/theme-provider'

// interface TooltipProps {
//     active?: boolean
//     payload?: Array<{
//         payload: {
//             rate: number
//             displayDate: string
//         }
//     }>
//     label?: string | number
// }

export default function PerformancePage() {
    const [timeRange, setTimeRange] = useState<'1h' | '4h' | '1d' | '7d'>('1d')
    const [limit, setLimit] = useState(100)
    const { theme } = useTheme()

    // Determine tick color based on theme
    const tickColor = theme === 'dark' ? '#ffffff' : '#000000'

    const {
        data,
        loading,
        error,
        refetch,
        lastUpdated,
        currentRate,
        priceChange,
        priceChangePercent,
    } = useRateHistory(limit, true)

    const formatPrice = (price: number) => {
        return price.toFixed(6)
    }

    const formatTime = (timestamp: string) => {
        try {
            // Handle Hedera timestamp format (seconds.nanoseconds)
            let dateObj
            if (timestamp.includes('.')) {
                // Hedera format: "1640995200.123456789"
                const [seconds] = timestamp.split('.')
                dateObj = new Date(parseInt(seconds) * 1000)
            } else {
                // Standard ISO string or milliseconds
                dateObj = new Date(timestamp)
            }

            if (isNaN(dateObj.getTime())) {
                return 'Invalid time'
            }

            return dateObj.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            })
        } catch {
            return 'Invalid time'
        }
    }

    const formatDate = (timestamp: string) => {
        try {
            let dateObj
            if (timestamp.includes('.')) {
                // Hedera format: "1640995200.123456789"
                const [seconds] = timestamp.split('.')
                dateObj = new Date(parseInt(seconds) * 1000)
            } else {
                // Standard ISO string or milliseconds
                dateObj = new Date(timestamp)
            }

            if (isNaN(dateObj.getTime())) {
                return 'Invalid date'
            }

            return dateObj.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            })
        } catch {
            return 'Invalid date'
        }
    }

    // Prepare chart data with time formatting
    const chartData = data.map((point, index) => ({
        ...point,
        index: index,
        displayTime: formatTime(point.timestamp),
        displayDate: formatDate(point.timestamp),
    }))

    // Calculate 24h stats
    const highPrice = data.length > 0 ? Math.max(...data.map((d) => d.rate)) : 0
    const lowPrice = data.length > 0 ? Math.min(...data.map((d) => d.rate)) : 0
    const firstPrice = data.length > 0 ? data[0].rate : currentRate
    const totalChange = currentRate - firstPrice
    const totalChangePercent =
        firstPrice !== 0 ? (totalChange / firstPrice) * 100 : 0

    const isPositive = priceChange >= 0
    const isTotalPositive = totalChange >= 0

    // const CustomTooltip = ({ active, payload }: TooltipProps) => {
    //     if (active && payload && payload.length) {
    //         const data = payload[0].payload
    //         return (
    //             <div className='bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3 text-sm'>
    //                 <p className='font-semibold text-foreground'>
    //                     {formatPrice(data.rate)}
    //                 </p>
    //                 <p className='text-muted-foreground text-xs'>
    //                     {data.displayDate}
    //                 </p>
    //             </div>
    //         )
    //     }
    //     return null
    // }

    return (
        <div className='h-full bg-background'>
            {/* Header with price info */}
            <div className='border-b border-border bg-card'>
                <div className='p-6'>
                    <div className='flex items-center justify-between mb-6'>
                        <div>
                            <h1 className='text-2xl font-bold text-foreground flex items-center gap-2'>
                                hUSD Rate Performance
                                <Badge variant='secondary' className='text-xs'>
                                    LIVE
                                </Badge>
                            </h1>
                            <p className='text-sm text-muted-foreground mt-1'>
                                Real Time On-Chain Enforced Exchange Rate
                            </p>
                        </div>
                        <Button
                            onClick={refetch}
                            disabled={loading}
                            variant='outline'
                            size='sm'
                            className='gap-2'
                        >
                            <RefreshCw
                                className={cn(
                                    'h-4 w-4',
                                    loading && 'animate-spin'
                                )}
                            />
                            Refresh
                        </Button>
                    </div>

                    {/* Price Header - Stock Style */}
                    <div className='flex items-baseline gap-4 mb-4'>
                        <div className='flex items-baseline gap-2'>
                            <span className='text-3xl font-bold text-foreground'>
                                {loading
                                    ? '...'
                                    : `$${formatPrice(currentRate)}`}
                            </span>
                            <span className='text-sm text-muted-foreground'>
                                1 hUSD
                            </span>
                        </div>

                        <div
                            className={cn(
                                'lg:hidden flex items-center gap-1 px-2 py-1 rounded text-sm font-medium',
                                isPositive
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            )}
                        >
                            {isPositive ? (
                                <ArrowUp className='h-3 w-3' />
                            ) : (
                                <ArrowDown className='h-3 w-3' />
                            )}
                            <span>
                                {isPositive ? '+' : ''}
                                {formatPrice(priceChange)}
                            </span>
                            <span>
                                ({isPositive ? '+' : ''}
                                {priceChangePercent.toFixed(2)}%)
                            </span>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className='hidden xl:grid grid-cols-4 gap-4 text-sm'>
                        <div className='text-right'>
                            <span className='text-muted-foreground block'>
                                24h Change
                            </span>
                            <span
                                className={cn(
                                    'font-medium',
                                    isTotalPositive
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-red-600 dark:text-red-400'
                                )}
                            >
                                {isTotalPositive ? '+' : ''}
                                {formatPrice(totalChange)} (
                                {isTotalPositive ? '+' : ''}
                                {totalChangePercent.toFixed(2)}%)
                            </span>
                        </div>
                        <div className='text-right'>
                            <span className='text-muted-foreground block'>
                                24h High
                            </span>
                            <span className='font-medium text-foreground'>
                                {formatPrice(highPrice)}
                            </span>
                        </div>
                        <div className='text-right'>
                            <span className='text-muted-foreground block'>
                                24h Low
                            </span>
                            <span className='font-medium text-foreground'>
                                {formatPrice(lowPrice)}
                            </span>
                        </div>
                        <div className='text-right'>
                            <span className='text-muted-foreground block'>
                                Data Points
                            </span>
                            <span className='font-medium text-foreground'>
                                {data.length}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart Section */}
            <div>
                <Card className='border-0 shadow-none bg-background'>
                    <CardContent className='p-0'>
                        {/* Time Range Selector */}
                        <div className='flex justify-between items-center mb-4'>
                            <div className='flex gap-1'>
                                {(['1h', '4h', '1d', '7d'] as const).map(
                                    (range) => (
                                        <Button
                                            key={range}
                                            variant={
                                                timeRange === range
                                                    ? 'default'
                                                    : 'ghost'
                                            }
                                            size='sm'
                                            onClick={() => {
                                                setTimeRange(range)
                                                // Adjust limit based on time range
                                                const newLimit =
                                                    range === '1h'
                                                        ? 50
                                                        : range === '4h'
                                                        ? 100
                                                        : range === '1d'
                                                        ? 200
                                                        : 500
                                                setLimit(newLimit)
                                            }}
                                            className='text-xs px-3 py-1'
                                        >
                                            {range.toUpperCase()}
                                        </Button>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Price Chart */}
                        {loading ? (
                            <div className='h-64 flex items-center justify-center bg-muted/10 rounded-lg'>
                                <div className='flex items-center gap-2 text-muted-foreground'>
                                    <RefreshCw className='h-5 w-5 animate-spin' />
                                    Loading price data...
                                </div>
                            </div>
                        ) : error ? (
                            <div className='h-64 flex items-center justify-center bg-muted/10 rounded-lg'>
                                <div className='text-center'>
                                    <p className='text-destructive font-medium'>
                                        Failed to load price data
                                    </p>
                                    <p className='text-sm text-muted-foreground mt-1'>
                                        {error}
                                    </p>
                                    <Button
                                        onClick={refetch}
                                        className='mt-4'
                                        size='sm'
                                    >
                                        Try Again
                                    </Button>
                                </div>
                            </div>
                        ) : data.length === 0 ? (
                            <div className='h-64 flex items-center justify-center bg-muted/10 rounded-lg'>
                                <div className='text-center'>
                                    <p className='text-muted-foreground'>
                                        No price data available
                                    </p>
                                    <Button
                                        onClick={refetch}
                                        className='mt-4'
                                        size='sm'
                                    >
                                        Refresh Data
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className='h-64 w-full bg-muted/5 rounded-lg p-3'>
                                <ResponsiveContainer width='100%' height='100%'>
                                    <LineChart
                                        data={chartData}
                                        margin={{
                                            top: 10,
                                            right: 15,
                                            left: 15,
                                            bottom: 10,
                                        }}
                                    >
                                        <XAxis
                                            dataKey='index'
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{
                                                fontSize: 11,
                                                fill: 'hsl(var(--foreground))',
                                            }}
                                            height={0}
                                        />
                                        <YAxis
                                            domain={[
                                                'dataMin - 0.000001',
                                                'dataMax + 0.000001',
                                            ]}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{
                                                fontSize: 11,
                                                fill: '#ffffff',
                                            }}
                                            tickFormatter={formatPrice}
                                            width={65}
                                            tickCount={4}
                                        />

                                        {/* Reference line for opening price */}
                                        <ReferenceLine
                                            y={firstPrice}
                                            stroke='#ffffff'
                                            strokeDasharray='2 2'
                                            strokeOpacity={0.4}
                                        />

                                        <Line
                                            type='linear'
                                            dataKey='rate'
                                            stroke='#3b82f6'
                                            strokeWidth={3}
                                            dot={false}
                                            activeDot={{
                                                r: 4,
                                                stroke: '#3b82f6',
                                                strokeWidth: 2,
                                                fill: '#ffffff',
                                                style: {
                                                    filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.2))',
                                                },
                                            }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Transactions Table */}
                {data.length > 0 && (
                    <Card className='mt-6'>
                        <CardContent className='px-4'>
                            <div className='flex items-center justify-between mb-4'>
                                <h3 className='font-semibold text-lg flex items-center gap-2'>
                                    <Activity className='h-5 w-5' />
                                    Recent hUSD Rate Updates
                                </h3>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    className='gap-2'
                                    onClick={() =>
                                        window.open(
                                            `https://hashscan.io/testnet/topic/${RATES_TOPIC_ID}/messages`,
                                            '_blank'
                                        )
                                    }
                                >
                                    <ExternalLink className='h-4 w-4' />
                                    View on Hashscan
                                </Button>
                            </div>
                            <div className='space-y-2 max-h-60 overflow-y-auto'>
                                {data
                                    .slice(-10)
                                    .reverse()
                                    .map((point, index) => {
                                        const actualIndex =
                                            data.length - 1 - index // Get the actual index in the original array
                                        const prevPoint =
                                            actualIndex > 0
                                                ? data[actualIndex - 1]
                                                : null
                                        const change = prevPoint
                                            ? point.rate - prevPoint.rate
                                            : 0
                                        const changePercent =
                                            prevPoint && prevPoint.rate !== 0
                                                ? (change / prevPoint.rate) *
                                                  100
                                                : 0
                                        const isPositiveChange = change >= 0

                                        return (
                                            <div
                                                key={point.sequenceNumber}
                                                className='flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors'
                                            >
                                                <div className='flex items-center gap-3'>
                                                    <div
                                                        className={cn(
                                                            'w-2 h-2 rounded-full',
                                                            isPositiveChange
                                                                ? 'bg-emerald-500'
                                                                : 'bg-red-500'
                                                        )}
                                                    />
                                                    <div>
                                                        <div className='font-mono text-sm font-medium'>
                                                            {formatPrice(
                                                                point.rate
                                                            )}
                                                        </div>
                                                        <div className='text-xs text-muted-foreground'>
                                                            {formatDate(
                                                                point.timestamp
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className='text-right'>
                                                    {prevPoint && (
                                                        <div
                                                            className={cn(
                                                                'text-sm font-medium flex items-center gap-1',
                                                                isPositiveChange
                                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                                    : 'text-red-600 dark:text-red-400'
                                                            )}
                                                        >
                                                            {isPositiveChange ? (
                                                                <TrendingUp className='h-3 w-3' />
                                                            ) : (
                                                                <TrendingDown className='h-3 w-3' />
                                                            )}
                                                            {isPositiveChange
                                                                ? '+'
                                                                : ''}
                                                            {formatPrice(
                                                                change
                                                            )}
                                                        </div>
                                                    )}
                                                    {prevPoint && (
                                                        <div
                                                            className={cn(
                                                                'text-xs',
                                                                isPositiveChange
                                                                    ? 'text-emerald-600/70 dark:text-emerald-400/70'
                                                                    : 'text-red-600/70 dark:text-red-400/70'
                                                            )}
                                                        >
                                                            {isPositiveChange
                                                                ? '+'
                                                                : ''}
                                                            {changePercent.toFixed(
                                                                2
                                                            )}
                                                            %
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
