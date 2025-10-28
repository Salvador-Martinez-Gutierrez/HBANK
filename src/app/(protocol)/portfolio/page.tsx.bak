'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@buidlerlabs/hashgraph-react-wallets'
import { ConnectWalletButton } from '@/components/connect-wallet-button'
import { AddWalletDialog } from '@/components/add-wallet-dialog'
import { DeleteWalletDialog } from '@/components/delete-wallet-dialog'
import { useAccountId } from '@/app/(protocol)/earn/hooks/useAccountID'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePortfolioAuth } from '@/hooks/usePortfolioAuth'
import { usePortfolioWallets } from '@/hooks/usePortfolioWallets'
import { useSignMessage } from '@/hooks/useSignMessage'
import {
    Wallet as WalletIcon,
    RefreshCw,
    TrendingUp,
    Shield,
    LayoutGrid,
    Layers,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { WalletCard } from '@/components/wallet-card'
import { AggregatedPortfolioView } from '@/components/aggregated-portfolio-view'
import { useWalletCollapse } from '@/hooks/useWalletCollapse'
import { useWalletOrder } from '@/hooks/useWalletOrder'
import { useSyncCooldown } from '@/hooks/useSyncCooldown'
import { RealtimePriceIndicator } from '@/components/realtime-price-indicator'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function PortfolioPage() {
    const { isConnected } = useWallet()
    const accountId = useAccountId()
    const { signMessage, isReady: isSignReady } = useSignMessage()
    const {
        user,
        isAuthenticated,
        signIn,
        loading: authLoading,
    } = usePortfolioAuth(accountId)
    const {
        wallets: rawWallets,
        loading: walletsLoading,
        totalValue,
        canAddMoreWallets,
        walletsRemaining,
        syncTokens,
        syncAllWallets,
        addWallet,
        deleteWallet,
        lastPriceUpdate,
    } = usePortfolioWallets(user?.id || null)
    const [syncing, setSyncing] = useState(false)
    const [syncingWallets, setSyncingWallets] = useState<Set<string>>(new Set())
    const [isAuthenticating, setIsAuthenticating] = useState(false)
    const [walletToDelete, setWalletToDelete] = useState<{
        id: string
        label?: string
        address: string
    } | null>(null)
    const [viewMode, setViewMode] = useState<'individual' | 'aggregated'>(
        'individual'
    )
    const [, setTick] = useState(0) // Force re-render for cooldown updates

    // Wallet collapse state (localStorage, instant)
    const { isWalletCollapsed, toggleWalletCollapsed } = useWalletCollapse()

    // Wallet order state (localStorage, instant)
    const { sortWallets, saveWalletOrder } = useWalletOrder(user?.id || null)

    // Sync cooldown state (localStorage, 1 hour cooldown)
    const {
        isSyncAllOnCooldown,
        isWalletOnCooldown,
        getSyncAllRemainingTime,
        getWalletRemainingTime,
        recordSyncAll,
        recordWalletSync,
        formatRemainingTime,
    } = useSyncCooldown()

    // Update UI every second when there are active cooldowns
    useEffect(() => {
        const interval = setInterval(() => {
            setTick((prev) => prev + 1)
        }, 1000)

        return () => clearInterval(interval)
    }, [])

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

        if (!isSignReady) {
            toast.error('Wallet is not ready to sign messages. Please wait...')
            return
        }

        console.log('🚀 Starting authentication for:', accountId)
        setIsAuthenticating(true)

        try {
            // Step 1: Get nonce from backend
            toast.loading('Requesting authentication challenge...', {
                id: 'auth-flow',
            })

            const nonceResponse = await fetch(
                `/api/auth/nonce?accountId=${encodeURIComponent(accountId)}`
            )

            if (!nonceResponse.ok) {
                throw new Error('Failed to get authentication challenge')
            }

            const { nonce, message } = await nonceResponse.json()
            console.log('📝 Nonce received, message:', message)

            // Step 2: Request signature from wallet
            toast.loading('Please sign the message in your wallet...', {
                id: 'auth-flow',
            })

            const { signature } = await signMessage(message)
            console.log('✍️ Signature received')

            // Step 3: Verify signature with backend and get JWT
            toast.loading('Verifying signature...', {
                id: 'auth-flow',
            })

            const result = await signIn(accountId, signature, nonce)

            toast.dismiss('auth-flow')

            if (result.success) {
                console.log('✅ Authentication successful!')
                toast.success('Portfolio authenticated successfully!')
            } else {
                console.error('❌ Authentication failed:', result.error)
                toast.error(result.error || 'Authentication failed')
            }
        } catch (error) {
            toast.dismiss('auth-flow')
            console.error('💥 Authentication error:', error)
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Failed to authenticate portfolio'
            toast.error(errorMessage)
        } finally {
            setIsAuthenticating(false)
        }
    }

    const handleSyncWallet = async (
        walletId: string,
        walletAddress: string
    ) => {
        // Check cooldown
        if (isWalletOnCooldown(walletId)) {
            const remainingTime = getWalletRemainingTime(walletId)
            toast.error(
                `Please wait ${formatRemainingTime(
                    remainingTime
                )} before syncing this wallet again`
            )
            return
        }

        // Add wallet to syncing set
        setSyncingWallets((prev) => new Set(prev).add(walletId))

        try {
            const result = await syncTokens(walletId, walletAddress)
            if (result.success) {
                toast.success('Tokens synced successfully')
                // Record sync time
                recordWalletSync(walletId)
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
        // Check cooldown
        if (isSyncAllOnCooldown()) {
            const remainingTime = getSyncAllRemainingTime()
            toast.error(
                `Please wait ${formatRemainingTime(
                    remainingTime
                )} before syncing all wallets again`
            )
            return
        }

        setSyncing(true)

        try {
            // 🚀 Use optimized batch sync that makes only ONE SaucerSwap API call
            console.log('🚀 Starting optimized batch sync for all wallets...')
            const result = await syncAllWallets()

            if (result.success) {
                toast.success(
                    result.message || 'All wallets synced successfully'
                )
                // Record sync all time and set cooldown for all individual wallets
                const walletIds = wallets.map((wallet) => wallet.id)
                recordSyncAll(walletIds)
            } else {
                toast.error(result.error || 'Failed to sync wallets')
            }
        } catch (error) {
            console.error('Sync all error:', error)
            toast.error('Failed to sync wallets')
        } finally {
            setSyncing(false)
        }
    }

    const handleDeleteWallet = async (walletId: string) => {
        // Find wallet info
        const wallet = wallets.find((w) => w.id === walletId)
        if (!wallet) return

        // Open confirmation modal
        setWalletToDelete({
            id: walletId,
            label: wallet.label || undefined,
            address: wallet.wallet_address,
        })
    }

    const confirmDeleteWallet = async () => {
        if (!walletToDelete) return

        const result = await deleteWallet(walletToDelete.id)
        if (result.success) {
            toast.success('Wallet removed')
        } else {
            toast.error(result.error || 'Failed to remove wallet')
        }

        setWalletToDelete(null)
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
                        disabled={
                            authLoading || isAuthenticating || !isSignReady
                        }
                        size='lg'
                        className='w-full'
                    >
                        {!isSignReady
                            ? 'Wallet not ready...'
                            : isAuthenticating
                            ? 'Signing message...'
                            : authLoading
                            ? 'Authenticating...'
                            : 'Authenticate'}
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
                    <div className='flex items-center gap-3'>
                        <h1 className='text-3xl font-bold text-foreground'>
                            Portfolio
                        </h1>
                        <RealtimePriceIndicator
                            enabled={wallets.length > 0}
                            lastUpdate={lastPriceUpdate}
                        />
                    </div>
                    <p className='text-muted-foreground mt-1'>
                        {wallets.length}{' '}
                        {wallets.length === 1 ? 'wallet' : 'wallets'} tracked •
                        Mainnet • Prices update in real-time
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
                        disabled={
                            syncing || walletsLoading || isSyncAllOnCooldown()
                        }
                        title={
                            isSyncAllOnCooldown()
                                ? `Cooldown: ${formatRemainingTime(
                                      getSyncAllRemainingTime()
                                  )}`
                                : 'Sync all wallets'
                        }
                    >
                        <RefreshCw
                            className={`w-4 h-4 ${
                                syncing ? 'animate-spin' : ''
                            }`}
                        />
                        {isSyncAllOnCooldown()
                            ? `Sync All (${formatRemainingTime(
                                  getSyncAllRemainingTime()
                              )})`
                            : 'Sync All'}
                    </Button>
                </div>
            </div>

            {/* View Mode Toggle */}
            {wallets.length > 0 && (
                <div className='mb-4'>
                    <Tabs
                        value={viewMode}
                        onValueChange={(v) =>
                            setViewMode(v as 'individual' | 'aggregated')
                        }
                    >
                        <TabsList className='grid w-full max-w-md grid-cols-2'>
                            <TabsTrigger
                                value='aggregated'
                                className='flex items-center gap-2'
                            >
                                <LayoutGrid className='w-4 h-4' />
                                Aggregated View
                            </TabsTrigger>
                            <TabsTrigger
                                value='individual'
                                className='flex items-center gap-2'
                            >
                                <Layers className='w-4 h-4' />
                                By Wallet
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            )}

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

            {/* Content */}
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
                            Add a wallet to start tracking your portfolio.
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
            ) : viewMode === 'aggregated' ? (
                <AggregatedPortfolioView
                    wallets={wallets}
                    loading={walletsLoading}
                    formatUsd={formatUsd}
                    formatBalance={formatBalance}
                />
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
                                    isOnCooldown={isWalletOnCooldown(wallet.id)}
                                    cooldownRemainingTime={formatRemainingTime(
                                        getWalletRemainingTime(wallet.id)
                                    )}
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

            {/* Delete Wallet Confirmation Dialog */}
            <DeleteWalletDialog
                open={walletToDelete !== null}
                onOpenChange={(open) => !open && setWalletToDelete(null)}
                onConfirm={confirmDeleteWallet}
                walletLabel={walletToDelete?.label}
                walletAddress={walletToDelete?.address}
            />
        </div>
    )
}
