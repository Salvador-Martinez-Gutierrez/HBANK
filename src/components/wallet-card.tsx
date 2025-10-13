'use client'

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
import type { WalletWithTokens } from '@/types/portfolio'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface WalletCardProps {
    wallet: WalletWithTokens
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

    // Calculate total wallet value
    const calculateTotalValue = () => {
        let total = 0
        for (const walletToken of wallet.wallet_tokens || []) {
            const balance = parseFloat(walletToken.balance || '0')
            const price = parseFloat(
                walletToken.tokens_registry?.price_usd || '0'
            )
            const decimals = walletToken.tokens_registry?.decimals || 0
            const normalizedBalance = balance / Math.pow(10, decimals)
            total += normalizedBalance * price
        }
        return total
    }

    const totalValue = calculateTotalValue()
    const tokenCount = wallet.wallet_tokens?.length || 0

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
                                    · {tokenCount}{' '}
                                    {tokenCount === 1 ? 'token' : 'tokens'}
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
                    {!wallet.wallet_tokens ||
                    wallet.wallet_tokens.length === 0 ? (
                        <div className='text-center py-6 text-muted-foreground'>
                            <p>No tokens found. Click sync to load tokens.</p>
                        </div>
                    ) : (
                        <div className='space-y-2 overflow-visible'>
                            {wallet.wallet_tokens.map((walletToken) => {
                                const token = walletToken.tokens_registry
                                const balance = formatBalance(
                                    walletToken.balance,
                                    token?.decimals || 0
                                )
                                const priceUsd = parseFloat(
                                    token?.price_usd || '0'
                                )
                                const valueUsd = parseFloat(balance) * priceUsd

                                return (
                                    <div
                                        key={walletToken.id}
                                        className='flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors'
                                    >
                                        <div className='flex items-center gap-3'>
                                            {token?.token_icon ? (
                                                <img
                                                    src={token.token_icon}
                                                    alt={
                                                        token?.token_symbol ||
                                                        'Token'
                                                    }
                                                    className='w-8 h-8 rounded-full'
                                                    onError={(e) => {
                                                        e.currentTarget.style.display =
                                                            'none'
                                                    }}
                                                />
                                            ) : (
                                                <div className='w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold'>
                                                    {token?.token_symbol?.[0] ||
                                                        '?'}
                                                </div>
                                            )}
                                            <div>
                                                <div className='font-medium'>
                                                    {token?.token_name ||
                                                        token?.token_symbol ||
                                                        token?.token_address}
                                                </div>
                                                <div className='text-sm text-muted-foreground'>
                                                    {balance}{' '}
                                                    {token?.token_symbol ||
                                                        'tokens'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className='text-right'>
                                            <div className='font-medium'>
                                                {formatUsd(valueUsd)}
                                            </div>
                                            {priceUsd > 0 && (
                                                <div className='text-sm text-muted-foreground'>
                                                    @{formatUsd(priceUsd)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    )
}
