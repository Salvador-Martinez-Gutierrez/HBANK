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

interface WalletCardProps {
    wallet: any // TODO: Update with proper type once Supabase types are regenerated
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

        // Add fungible tokens value
        for (const walletToken of wallet.wallet_tokens || []) {
            const balance = parseFloat(walletToken.balance || '0')
            const price = parseFloat(
                walletToken.tokens_registry?.price_usd || '0'
            )
            const decimals = walletToken.tokens_registry?.decimals || 0
            const normalizedBalance = balance / Math.pow(10, decimals)
            total += normalizedBalance * price
        }

        // Add LP tokens value
        for (const lpToken of wallet.liquidity_pool_tokens || []) {
            const balance = parseFloat(lpToken.balance || '0')
            const price = parseFloat(lpToken.tokens_registry?.price_usd || '0')
            const decimals = lpToken.tokens_registry?.decimals || 0
            const normalizedBalance = balance / Math.pow(10, decimals)
            total += normalizedBalance * price
        }

        return total
    }

    const totalValue = calculateTotalValue()
    const fungibleCount = wallet.wallet_tokens?.length || 0
    const lpCount = wallet.liquidity_pool_tokens?.length || 0
    const nftCount = wallet.nfts?.length || 0
    const totalAssets = fungibleCount + lpCount + nftCount

    // Prepare data for AssetSections component
    const fungibleTokens = useMemo(() => {
        return (wallet.wallet_tokens || []).map((wt: any) => ({
            id: wt.id,
            balance: wt.balance,
            token_name: wt.tokens_registry?.token_name,
            token_symbol: wt.tokens_registry?.token_symbol,
            token_address: wt.tokens_registry?.token_address,
            token_icon: wt.tokens_registry?.token_icon,
            decimals: wt.tokens_registry?.decimals || 0,
            price_usd: wt.tokens_registry?.price_usd || '0',
        }))
    }, [wallet.wallet_tokens])

    const lpTokens = useMemo(() => {
        return (wallet.liquidity_pool_tokens || []).map((lp: any) => ({
            id: lp.id,
            balance: lp.balance,
            token_name: lp.tokens_registry?.token_name,
            token_symbol: lp.tokens_registry?.token_symbol,
            token_address: lp.tokens_registry?.token_address,
            token_icon: lp.tokens_registry?.token_icon,
            decimals: lp.tokens_registry?.decimals || 0,
            price_usd: lp.tokens_registry?.price_usd || '0',
        }))
    }, [wallet.liquidity_pool_tokens])

    const nfts = useMemo(() => {
        return (wallet.nfts || []).map((nft: any) => ({
            id: nft.id,
            token_id: nft.token_id,
            serial_number: nft.serial_number,
            metadata: nft.metadata,
            token_name: nft.tokens_registry?.token_name,
            token_icon: nft.tokens_registry?.token_icon,
        }))
    }, [wallet.nfts])

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
                                {wallet.is_primary && (
                                    <span className='ml-2 text-xs font-normal bg-primary/10 text-primary px-2 py-0.5 rounded'>
                                        Primary
                                    </span>
                                )}
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
                                    · {fungibleCount + lpCount} tokens ·{' '}
                                    {nftCount} NFTs
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

                        {/* Delete button (only for non-primary wallets) */}
                        {!wallet.is_primary && (
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
                        )}
                    </div>
                </div>
            </CardHeader>

            {/* Show content only when not collapsed */}
            {!isCollapsed && (
                <CardContent className='overflow-visible'>
                    <AssetSections
                        fungibleTokens={fungibleTokens}
                        lpTokens={lpTokens}
                        nfts={nfts}
                        formatUsd={formatUsd}
                        formatBalance={formatBalance}
                    />
                </CardContent>
            )}
        </Card>
    )
}
