'use client'

import { useState } from 'react'
import { useWallet } from '@buidlerlabs/hashgraph-react-wallets'
import { ConnectWalletButton } from '@/components/connect-wallet-button'
import { AddWalletDialog } from '@/components/add-wallet-dialog'
import { useAccountId } from '@/app/(protocol)/earn/hooks/useAccountID'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePortfolioAuth } from '@/hooks/usePortfolioAuth'
import { usePortfolioWallets } from '@/hooks/usePortfolioWallets'
import { generateAuthMessage } from '@/services/portfolioAuthClient'
import {
    Wallet as WalletIcon,
    RefreshCw,
    TrendingUp,
    Shield,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { WalletCard } from '@/components/wallet-card'
import { useWalletCollapse } from '@/hooks/useWalletCollapse'
import { useWalletOrder } from '@/hooks/useWalletOrder'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'

export default function PortfolioPage() {
    const { isConnected } = useWallet()
    const accountId = useAccountId()
    const {
        user,
        isAuthenticated,
        signIn,
        signOut,
        loading: authLoading,
    } = usePortfolioAuth(accountId)
    const {
        wallets: rawWallets,
        loading: walletsLoading,
        totalValue,
        canAddMoreWallets,
        walletsRemaining,
        syncTokens,
        addWallet,
        deleteWallet,
    } = usePortfolioWallets(user?.id || null)
    const [syncing, setSyncing] = useState(false)
    const [syncingWallets, setSyncingWallets] = useState<Set<string>>(new Set())

    // Wallet collapse state (localStorage, instant)
    const { isWalletCollapsed, toggleWalletCollapsed } = useWalletCollapse()

    // Wallet order state (localStorage, instant)
    const { sortWallets, saveWalletOrder } = useWalletOrder(user?.id || null)

    // Apply custom order to wallets
    const wallets = sortWallets(rawWallets)

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleAuthenticatePortfolio = async () => {
        if (!accountId) {
            toast.error('Please connect your wallet first')
            return
        }

        console.log('🚀 Starting authentication for:', accountId)

        try {
            // Generate message to sign
            const message = generateAuthMessage(accountId)
            const timestamp = Date.now()

            console.log('📝 Message generated:', message)

            // For now, we'll use a mock signature
            // In production, you need to implement actual wallet signing
            const signature = 'mock_signature_' + Date.now()

            console.log('✍️ Calling signIn...')
            // Authenticate with backend
            const result = await signIn(
                accountId,
                signature,
                message,
                timestamp
            )

            console.log('📥 signIn result:', result)

            if (result.success) {
                console.log('✅ Authentication successful!')
                toast.success('Portfolio authenticated successfully!')
            } else {
                console.error('❌ Authentication failed:', result.error)
                toast.error(result.error || 'Authentication failed')
            }
        } catch (error) {
            console.error('💥 Authentication error:', error)
            toast.error('Failed to authenticate portfolio')
        }
    }

    const handleSyncWallet = async (
        walletId: string,
        walletAddress: string
    ) => {
        // Add wallet to syncing set
        setSyncingWallets((prev) => new Set(prev).add(walletId))

        try {
            const result = await syncTokens(walletId, walletAddress)
            if (result.success) {
                toast.success('Tokens synced successfully')
            } else {
                toast.error(result.error || 'Failed to sync tokens')
            }
        } catch (error) {
            console.error('Sync error:', error)
            toast.error('Failed to sync tokens')
        } finally {
            // Remove wallet from syncing set
            setSyncingWallets((prev) => {
                const newSet = new Set(prev)
                newSet.delete(walletId)
                return newSet
            })
        }
    }

    const handleSyncAllWallets = async () => {
        setSyncing(true)
        try {
            // Sync all wallets in parallel
            const syncPromises = wallets.map((w) =>
                syncTokens(w.id, w.wallet_address)
            )
            const results = await Promise.all(syncPromises)

            const allSuccess = results.every((r) => r.success)
            if (allSuccess) {
                toast.success('All wallets synced successfully')
            } else {
                toast.error('Some wallets failed to sync')
            }
        } catch (error) {
            console.error('Sync all error:', error)
            toast.error('Failed to sync wallets')
        } finally {
            setSyncing(false)
        }
    }

    const handleDeleteWallet = async (walletId: string) => {
        if (
            confirm(
                'Are you sure you want to remove this wallet from your portfolio?'
            )
        ) {
            const result = await deleteWallet(walletId)
            if (result.success) {
                toast.success('Wallet removed')
            } else {
                toast.error(result.error || 'Failed to remove wallet')
            }
        }
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = wallets.findIndex((w) => w.id === active.id)
            const newIndex = wallets.findIndex((w) => w.id === over.id)

            const newWallets = arrayMove(wallets, oldIndex, newIndex)

            // Save new order to localStorage (instant, no API call)
            const newOrder = newWallets.map((wallet) => wallet.id)
            saveWalletOrder(newOrder)
        }
    }

    const formatUsd = (value: number) => {
        return value.toLocaleString(undefined, {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 2,
        })
    }

    const formatBalance = (balance: string, decimals: number) => {
        const value = parseFloat(balance) / Math.pow(10, decimals)
        return value.toFixed(4)
    }

    if (!isConnected) {
        return (
            <div className='h-full flex items-center justify-center'>
                <div className='text-center space-y-6'>
                    <p className='text-xl md:text-4xl max-w-xl mx-auto font-semibold text-foreground'>
                        Track your assets and DeFi positions across multiple
                        wallets
                    </p>
                    <div className='flex justify-center'>
                        <ConnectWalletButton variant='full-width' />
                    </div>
                </div>
            </div>
        )
    }

    // Show loading state while checking authentication
    if (authLoading) {
        return (
            <div className='h-full flex items-center justify-center'>
                <div className='text-center space-y-4'>
                    <RefreshCw className='w-12 h-12 mx-auto text-primary animate-spin' />
                    <p className='text-muted-foreground'>
                        Checking authentication...
                    </p>
                </div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return (
            <div className='h-full flex items-center justify-center'>
                <div className='text-center space-y-6 max-w-md'>
                    <Shield className='w-16 h-16 mx-auto text-primary' />
                    <div>
                        <h2 className='text-2xl font-bold text-foreground mb-2'>
                            Authenticate your Account
                        </h2>
                        <p className='text-muted-foreground'>
                            Sign a message with your wallet to securely access
                            your portfolio data. This won&apos;t cost any gas
                            fees.
                        </p>
                    </div>
                    <Button
                        onClick={handleAuthenticatePortfolio}
                        disabled={authLoading}
                        size='lg'
                        className='w-full'
                    >
                        {authLoading ? 'Authenticating...' : 'Authenticate'}
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className='p-4 md:p-8'>
            {/* Info Banner */}
            <div className='mb-8 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800'>
                📊 <strong>Mainnet Portfolio:</strong> Add multiple mainnet
                accounts to see the aggregated value of your assets and DeFi
                positions.
            </div>

            {/* Header */}
            <div className='flex items-center justify-between mb-6'>
                <div>
                    <h1 className='text-3xl font-bold text-foreground'>
                        Portfolio
                    </h1>
                    <p className='text-muted-foreground mt-1'>
                        {wallets.length}{' '}
                        {wallets.length === 1 ? 'wallet' : 'wallets'} tracked •
                        Mainnet
                    </p>
                </div>
                <div className='flex items-center gap-2'>
                    <AddWalletDialog
                        onAddWallet={addWallet}
                        canAddMore={canAddMoreWallets}
                        walletsRemaining={walletsRemaining}
                        onSyncWallet={handleSyncWallet}
                    />
                    <Button
                        type='button'
                        variant='outline'
                        onClick={handleSyncAllWallets}
                        disabled={syncing || walletsLoading}
                    >
                        <RefreshCw
                            className={`w-4 h-4 ${
                                syncing ? 'animate-spin' : ''
                            }`}
                        />
                        Sync All
                    </Button>
                </div>
            </div>

            {/* Total Value Card */}
            <Card className='mb-6 bg-card/80 backdrop-blur-sm border-border/50'>
                <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                        <TrendingUp className='w-5 h-5' />
                        Total Value
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className='text-4xl font-bold text-foreground'>
                        {walletsLoading ? '...' : formatUsd(totalValue)}
                    </div>
                </CardContent>
            </Card>

            {/* Wallets */}
            {walletsLoading ? (
                <div className='text-center py-12'>
                    <RefreshCw className='w-8 h-8 animate-spin mx-auto text-muted-foreground mb-4' />
                    <p className='text-muted-foreground'>
                        Loading your wallets...
                    </p>
                </div>
            ) : wallets.length === 0 ? (
                <Card className='bg-card/80 backdrop-blur-sm border-border/50'>
                    <CardContent className='py-12 text-center'>
                        <WalletIcon className='w-12 h-12 mx-auto text-muted-foreground mb-4' />
                        <h3 className='text-lg font-semibold mb-2'>
                            No Wallets Found
                        </h3>
                        <p className='text-muted-foreground mb-4'>
                            Your primary wallet has been registered. Sync your
                            tokens to start tracking.
                        </p>
                        <Button
                            type='button'
                            onClick={() => {
                                if (wallets[0]) {
                                    handleSyncWallet(
                                        wallets[0].id,
                                        wallets[0].wallet_address
                                    )
                                }
                            }}
                        >
                            Sync Tokens
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={wallets.map((w) => w.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className='space-y-6'>
                            {wallets.map((wallet) => (
                                <WalletCard
                                    key={wallet.id}
                                    wallet={wallet}
                                    syncing={syncingWallets.has(wallet.id)}
                                    isCollapsed={isWalletCollapsed(wallet.id)}
                                    onSync={handleSyncWallet}
                                    onDelete={handleDeleteWallet}
                                    onToggleCollapse={() =>
                                        toggleWalletCollapsed(wallet.id)
                                    }
                                    formatUsd={formatUsd}
                                    formatBalance={formatBalance}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    )
}
