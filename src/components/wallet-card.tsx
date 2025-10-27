'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Wallet as WalletIcon,
    RefreshCw,
    Trash2,
    ChevronDown,
    ChevronUp,
    GripVertical,
} from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AssetSections } from './asset-sections'
import type { WalletWithAssets } from '@/types/portfolio'

interface WalletCardProps {
    wallet: WalletWithAssets
    syncing: boolean
    isCollapsed: boolean
    onSync: (walletId: string, walletAddress: string) => void
    onDelete: (walletId: string) => void
    onToggleCollapse: () => void
    formatUsd: (value: number) => string
    formatBalance: (balance: string, decimals: number) => string
}

export function WalletCard({
    wallet,
    syncing,
    isCollapsed,
    onSync,
    onDelete,
    onToggleCollapse,
    formatUsd,
    formatBalance,
}: WalletCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: wallet.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    // Calculate total wallet value (across all asset types)
    const calculateTotalValue = () => {
        let total = 0

        // Add HBAR value
        const hbarBalance = parseFloat(wallet.hbar_balance || '0')
        const hbarPrice = parseFloat(wallet.hbar_price_usd || '0')
        total += hbarBalance * hbarPrice

        // Add fungible tokens value
        for (const walletToken of wallet.wallet_tokens || []) {
            const balance = parseFloat(walletToken.balance || '0')
            const priceUsd = walletToken.tokens_registry?.price_usd
            const price = parseFloat(
                typeof priceUsd === 'number'
                    ? priceUsd.toString()
                    : priceUsd || '0'
            )
            const decimals = walletToken.tokens_registry?.decimals || 0
            const normalizedBalance = balance / Math.pow(10, decimals)
            total += normalizedBalance * price
        }

        // Add DeFi positions value
        for (const defiPosition of wallet.wallet_defi || []) {
            const valueUsd = parseFloat(defiPosition.value_usd || '0')
            total += valueUsd
        }

        return total
    }

    const totalValue = calculateTotalValue()
    const hbarBalance = parseFloat(wallet.hbar_balance || '0')
    const hbarPriceUsd = parseFloat(wallet.hbar_price_usd || '0')
    const fungibleCount = wallet.wallet_tokens?.length || 0
    const defiCount = wallet.wallet_defi?.length || 0
    const nftCount = wallet.wallet_nfts?.length || 0

    // Count HBAR as a token if it has balance
    const hbarTokenCount = hbarBalance > 0 ? 1 : 0
    const totalTokenCount = fungibleCount + hbarTokenCount

    // Prepare data for AssetSections component
    const fungibleTokens = useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tokens = (wallet.wallet_tokens || []).map((wt: any) => {
            const balance = wt.balance
            const decimals = wt.tokens_registry?.decimals || 0
            const price_usd = wt.tokens_registry?.price_usd || '0'

            // Calculate value in USD for sorting
            const normalizedBalance =
                parseFloat(balance) / Math.pow(10, decimals)
            const valueUsd = normalizedBalance * parseFloat(price_usd)

            return {
                id: wt.id,
                balance: balance,
                token_name: wt.tokens_registry?.token_name,
                token_symbol: wt.tokens_registry?.token_symbol,
                token_address: wt.tokens_registry?.token_address,
                token_icon: wt.tokens_registry?.token_icon,
                decimals: decimals,
                price_usd: price_usd,
                valueUsd: valueUsd,
            }
        })

        // Sort by USD value (descending)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return tokens.sort((a: any, b: any) => b.valueUsd - a.valueUsd)
    }, [wallet.wallet_tokens])

    const defiPositions = useMemo(() => {
        return wallet.wallet_defi || []
    }, [wallet.wallet_defi])

    const nfts = useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (wallet.wallet_nfts || []).map((nft: any) => ({
            id: nft.id,
            token_id: nft.token_id,
            serial_number: nft.serial_number,
            metadata: nft.metadata,
            token_name: nft.tokens_registry?.token_name,
            token_icon: nft.tokens_registry?.token_icon,
        }))
    }, [wallet.wallet_nfts])

    return (
        <Card
            ref={setNodeRef}
            style={style}
            className={`overflow-visible ${
                isDragging ? 'z-50' : ''
            } bg-card/80 backdrop-blur-sm border-border/50`}
        >
            <CardHeader>
                <div className='flex items-center justify-between gap-4'>
                    {/* Left section: Drag handle + Wallet info + Balance badge */}
                    <div className='flex items-center gap-4 flex-1 min-w-0'>
                        {/* Drag handle */}
                        <Button
                            variant='ghost'
                            size='sm'
                            className='cursor-grab active:cursor-grabbing touch-none p-1'
                            {...attributes}
                            {...listeners}
                        >
                            <GripVertical className='w-4 h-4 text-muted-foreground' />
                        </Button>

                        <WalletIcon className='w-5 h-5' />
                        <div className='min-w-0'>
                            <CardTitle className='text-lg'>
                                {wallet.label || 'Unnamed Wallet'}
                            </CardTitle>
                            <p className='text-sm text-muted-foreground font-mono truncate'>
                                {wallet.wallet_address}
                            </p>
                        </div>

                        {/* Balance badge (only when collapsed) - right after wallet info */}
                        {isCollapsed && (
                            <div className='flex items-center gap-2 px-3 py-1 rounded-md bg-blue-500/10 border border-blue-500/20'>
                                <span className='text-base font-semibold text-foreground'>
                                    {formatUsd(totalValue)}
                                </span>
                                <span className='text-xs text-muted-foreground'>
                                    · {totalTokenCount} tokens · {defiCount}{' '}
                                    DeFi · {nftCount} NFTs
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Right section: Action buttons */}
                    <div className='flex items-center gap-1'>
                        {/* Collapse/Expand button */}
                        <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={onToggleCollapse}
                            title={
                                isCollapsed
                                    ? 'Expand wallet'
                                    : 'Collapse wallet'
                            }
                        >
                            {isCollapsed ? (
                                <ChevronDown className='w-4 h-4' />
                            ) : (
                                <ChevronUp className='w-4 h-4' />
                            )}
                        </Button>

                        {/* Sync button */}
                        <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() =>
                                onSync(wallet.id, wallet.wallet_address)
                            }
                            disabled={syncing}
                            title='Sync tokens'
                        >
                            <RefreshCw
                                className={`w-4 h-4 ${
                                    syncing ? 'animate-spin' : ''
                                }`}
                            />
                        </Button>

                        {/* Delete button */}
                        <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => onDelete(wallet.id)}
                            title='Remove wallet'
                            className='text-destructive hover:text-destructive'
                        >
                            <Trash2 className='w-4 h-4' />
                        </Button>
                    </div>
                </div>
            </CardHeader>

            {/* Show content only when not collapsed */}
            {!isCollapsed && (
                <CardContent className='overflow-visible'>
                    <AssetSections
                        hbarBalance={hbarBalance}
                        hbarPriceUsd={hbarPriceUsd}
                        fungibleTokens={fungibleTokens}
                        defiPositions={defiPositions}
                        nfts={nfts}
                        formatUsd={formatUsd}
                        formatBalance={formatBalance}
                        syncing={syncing}
                    />
                </CardContent>
            )}
        </Card>
    )
}
