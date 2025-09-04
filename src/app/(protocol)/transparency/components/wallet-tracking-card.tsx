'use client'

import { useEffect, useState } from 'react'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Wallet,
    AlertTriangle,
    CheckCircle,
    XCircle,
    RefreshCw,
    ExternalLink,
    Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WalletInfo {
    id: string
    name: string
    description: string
    balances: {
        hbar: number
        usdc: number
        husd: number
    }
    health: 'healthy' | 'warning' | 'critical'
}

interface WalletBalancesResponse {
    wallets: WalletInfo[]
    lastUpdated: string
}

export default function WalletTrackingCard() {
    const [wallets, setWallets] = useState<WalletInfo[]>([])
    const [lastUpdated, setLastUpdated] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [refreshing, setRefreshing] = useState(false)

    const fetchWalletBalances = async () => {
        try {
            setRefreshing(true)
            const response = await fetch('/api/wallet-balances')

            if (!response.ok) {
                throw new Error('Failed to fetch wallet balances')
            }

            const data: WalletBalancesResponse = await response.json()
            setWallets(data.wallets)
            setLastUpdated(data.lastUpdated)
            setError(null)
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Unknown error occurred'
            )
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        fetchWalletBalances()
    }, [])

    const getHealthIcon = (health: string) => {
        switch (health) {
            case 'healthy':
                return <CheckCircle className='h-4 w-4 text-green-500' />
            case 'warning':
                return <AlertTriangle className='h-4 w-4 text-yellow-500' />
            case 'critical':
                return <XCircle className='h-4 w-4 text-red-500' />
            default:
                return <AlertTriangle className='h-4 w-4 text-gray-500' />
        }
    }

    const getHealthBadgeVariant = (health: string) => {
        switch (health) {
            case 'healthy':
                return 'default'
            case 'warning':
                return 'secondary'
            case 'critical':
                return 'destructive'
            default:
                return 'outline'
        }
    }

    const formatBalance = (balance: number, decimals: number = 2) => {
        return balance.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        })
    }

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        })
    }

    const getHealthMessage = (wallet: WalletInfo): string => {
        const { name, balances, health } = wallet

        if (health === 'healthy') {
            return 'All balances are within healthy thresholds'
        }

        const issues: string[] = []

        // Check HBAR balance
        if (balances.hbar < 1) {
            issues.push(
                'Critical: HBAR balance too low for transactions (< 1 HBAR)'
            )
        } else if (balances.hbar < 5) {
            issues.push('Warning: HBAR balance is low (< 5 HBAR recommended)')
        }

        // Specific checks for different wallet types
        switch (name) {
            case 'Instant Withdrawal':
            case 'Standard Withdrawal':
                if (balances.usdc < 100) {
                    issues.push(
                        'Warning: USDC balance is low for withdrawal operations (< 100 USDC)'
                    )
                }
                break

            case 'Treasury':
            case 'Emissions':
                if (balances.husd < 100) {
                    issues.push('Warning: hUSD balance is low (< 100 hUSD)')
                }
                break
        }

        return issues.length > 0
            ? issues.join('. ')
            : 'Wallet status needs attention'
    }

    const getExplorerUrl = (accountId: string): string => {
        return `https://hashscan.io/testnet/account/${accountId}`
    }

    if (loading) {
        return (
            <Card className='w-full'>
                <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                        <Wallet className='h-5 w-5' />
                        Protocol Wallets
                    </CardTitle>
                    <CardDescription>
                        Real-time monitoring of all protocol wallets and their
                        health status
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
                        {[...Array(6)].map((_, i) => (
                            <Card key={i} className='animate-pulse'>
                                <CardHeader className='pb-3'>
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center gap-2'>
                                            <Skeleton className='h-8 w-8 rounded-full' />
                                            <Skeleton className='h-4 w-20' />
                                        </div>
                                        <Skeleton className='h-6 w-16 rounded-full' />
                                    </div>
                                </CardHeader>
                                <CardContent className='pt-0'>
                                    <Skeleton className='h-3 w-full mb-3' />
                                    <div className='space-y-2 mb-4'>
                                        <div className='flex justify-between'>
                                            <Skeleton className='h-3 w-10' />
                                            <Skeleton className='h-3 w-16' />
                                        </div>
                                        <div className='flex justify-between'>
                                            <Skeleton className='h-3 w-10' />
                                            <Skeleton className='h-3 w-16' />
                                        </div>
                                        <div className='flex justify-between'>
                                            <Skeleton className='h-3 w-10' />
                                            <Skeleton className='h-3 w-16' />
                                        </div>
                                    </div>
                                    <div className='flex justify-between items-center pt-2 border-t'>
                                        <Skeleton className='h-3 w-20' />
                                        <Skeleton className='h-6 w-16' />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card className='w-full'>
                <CardHeader>
                    <CardTitle className='flex items-center gap-2 text-red-600'>
                        <XCircle className='h-5 w-5' />
                        Error Loading Wallet Data
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className='text-red-600 mb-4'>{error}</p>
                    <Button onClick={fetchWalletBalances} variant='outline'>
                        Try Again
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className='w-full'>
            <CardHeader>
                <div className='flex items-center justify-between'>
                    <div>
                        <CardTitle className='flex items-center gap-2'>
                            <Wallet className='h-5 w-5' />
                            Protocol Wallets
                        </CardTitle>
                        <CardDescription>
                            Real-time monitoring of all protocol wallets and
                            their health status
                        </CardDescription>
                    </div>
                    <Button
                        onClick={fetchWalletBalances}
                        variant='outline'
                        size='sm'
                        disabled={refreshing}
                    >
                        <RefreshCw
                            className={`h-4 w-4 mr-2 ${
                                refreshing ? 'animate-spin' : ''
                            }`}
                        />
                        Refresh
                    </Button>
                </div>
                {lastUpdated && (
                    <p className='text-xs text-muted-foreground'>
                        Last updated: {formatTimestamp(lastUpdated)}
                    </p>
                )}
            </CardHeader>
            <CardContent>
                <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
                    {wallets.map((wallet) => (
                        <Card
                            key={wallet.id}
                            className='hover:shadow-md transition-all duration-200 hover:border-primary/20'
                        >
                            <CardHeader className='pb-3'>
                                <div className='flex items-center justify-between'>
                                    <div className='flex items-center gap-2'>
                                        <div className='flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full'>
                                            <Wallet className='h-4 w-4 text-primary' />
                                        </div>
                                        <div>
                                            <CardTitle className='text-sm'>
                                                {wallet.name}
                                            </CardTitle>
                                        </div>
                                    </div>

                                    {/* Health Badge with Popover */}
                                    {wallet.health !== 'healthy' ? (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant='ghost'
                                                    size='sm'
                                                    className='h-auto p-1'
                                                >
                                                    <Badge
                                                        variant={getHealthBadgeVariant(
                                                            wallet.health
                                                        )}
                                                        className='cursor-pointer'
                                                    >
                                                        <div className='flex items-center gap-1'>
                                                            {getHealthIcon(
                                                                wallet.health
                                                            )}
                                                            {wallet.health}
                                                            <Info className='h-3 w-3 ml-1' />
                                                        </div>
                                                    </Badge>
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className='w-80'>
                                                <div className='space-y-2'>
                                                    <h4 className='font-medium'>
                                                        Wallet Health Issues
                                                    </h4>
                                                    <p className='text-sm text-muted-foreground'>
                                                        {getHealthMessage(
                                                            wallet
                                                        )}
                                                    </p>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    ) : (
                                        <Badge
                                            variant={getHealthBadgeVariant(
                                                wallet.health
                                            )}
                                        >
                                            <div className='flex items-center gap-1'>
                                                {getHealthIcon(wallet.health)}
                                                {wallet.health}
                                            </div>
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className='pt-0'>
                                <p className='text-xs text-muted-foreground mb-3'>
                                    {wallet.description}
                                </p>

                                {/* Balances */}
                                <div className='space-y-2 mb-4'>
                                    <div className='flex justify-between items-center text-xs'>
                                        <span className='text-muted-foreground'>
                                            HBAR:
                                        </span>
                                        <span className='font-medium'>
                                            {formatBalance(
                                                wallet.balances.hbar,
                                                6
                                            )}
                                        </span>
                                    </div>
                                    <div className='flex justify-between items-center text-xs'>
                                        <span className='text-muted-foreground'>
                                            USDC:
                                        </span>
                                        <span className='font-medium'>
                                            {formatBalance(
                                                wallet.balances.usdc,
                                                6
                                            )}
                                        </span>
                                    </div>
                                    <div className='flex justify-between items-center text-xs'>
                                        <span className='text-muted-foreground'>
                                            hUSD:
                                        </span>
                                        <span className='font-medium'>
                                            {formatBalance(
                                                wallet.balances.husd,
                                                8
                                            )}
                                        </span>
                                    </div>
                                </div>

                                {/* Wallet ID and Explorer Link */}
                                <div className='flex items-center justify-between pt-2 border-t'>
                                    <span className='text-xs text-muted-foreground font-mono'>
                                        {wallet.id}
                                    </span>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='h-6 px-2 text-xs'
                                        onClick={() =>
                                            window.open(
                                                getExplorerUrl(wallet.id),
                                                '_blank'
                                            )
                                        }
                                    >
                                        <ExternalLink className='h-3 w-3 mr-1' />
                                        Explorer
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
