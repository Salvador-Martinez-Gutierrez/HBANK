/**
 * Aggregated Portfolio View Component
 * Shows a combined view of all tokens across all wallets
 */

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AssetSections } from '@/features/portfolio/components/asset-sections'
import type {
    WalletWithAssets,
    WalletDefiWithMetadata,
} from '@/types/portfolio'
import { Coins, Loader2 } from 'lucide-react'
import { logger } from '@/lib/logger'


interface TokenDisplay {
    id: string
    balance: string
    token_name?: string
    token_symbol?: string
    token_address: string
    token_icon?: string | null
    decimals: number
    price_usd: string
}

interface NFTDisplay {
    id: string
    token_id: string
    serial_number: number
    metadata: Record<string, unknown>
    token_name?: string
    token_icon?: string | null
}

interface AggregatedAssets {
    totalHbar: number
    hbarPriceUsd: number
    fungibleTokens: TokenDisplay[]
    defiPositions: WalletDefiWithMetadata[]
    nfts: NFTDisplay[]
    totalValue: number
}

interface AggregatedPortfolioViewProps {
    wallets: WalletWithAssets[]
    loading: boolean
    formatUsd: (value: number) => string
    formatBalance: (balance: string, decimals: number) => string
}

export function AggregatedPortfolioView({
    wallets,
    loading,
    formatUsd,
    formatBalance,
}: AggregatedPortfolioViewProps) {
    // Aggregate all assets from all wallets
    const aggregatedAssets = useMemo<AggregatedAssets>(() => {
        let totalHbar = 0
        let hbarPriceUsd = 0
        const fungibleMap = new Map<string, TokenDisplay>()
        const defiList: WalletDefiWithMetadata[] = []
        const nftList: NFTDisplay[] = []
        let totalValue = 0

        for (const wallet of wallets) {
            // Aggregate fungible tokens (including HBAR)
            for (const walletToken of wallet.wallet_tokens ?? []) {
                const tokenAddress =
                    walletToken.tokens_registry?.token_address ?? ''
                const balance = parseFloat(walletToken.balance ?? '0')
                const priceUsd = walletToken.tokens_registry?.price_usd
                const price = parseFloat(
                    typeof priceUsd === 'number'
                        ? priceUsd.toString()
                        : priceUsd ?? '0'
                )
                const decimals = walletToken.tokens_registry?.decimals ?? 0

                // Check if this is HBAR
                if (tokenAddress === 'HBAR') {
                    const normalizedBalance = balance / Math.pow(10, decimals)
                    totalHbar += normalizedBalance
                    hbarPriceUsd = price
                    totalValue += normalizedBalance * price
                    continue // Skip adding HBAR to fungibleMap, handle separately
                }

                if (fungibleMap.has(tokenAddress)) {
                    // Aggregate balance
                    const existing = fungibleMap.get(tokenAddress)
                    if (existing) {
                        const newBalance = (
                            parseFloat(existing.balance) + balance
                        ).toString()
                        fungibleMap.set(tokenAddress, {
                            ...existing,
                            balance: newBalance,
                        })
                    }
                } else {
                    // Add new token
                    fungibleMap.set(tokenAddress, {
                        id: walletToken.id,
                        balance: balance.toString(),
                        token_name:
                            walletToken.tokens_registry?.token_name ??
                            undefined,
                        token_symbol:
                            walletToken.tokens_registry?.token_symbol ??
                            undefined,
                        token_address: tokenAddress,
                        token_icon:
                            walletToken.tokens_registry?.token_icon ??
                            undefined,
                        decimals: decimals,
                        price_usd: price.toString(),
                    })
                }

                const normalizedBalance = balance / Math.pow(10, decimals)
                totalValue += normalizedBalance * price
            }

            // Collect all DeFi positions
            for (const defiPosition of wallet.wallet_defi ?? []) {
                const valueUsd = parseFloat(defiPosition.value_usd ?? '0')
                totalValue += valueUsd
                defiList.push(defiPosition)
            }

            // Collect all NFTs (no aggregation for NFTs as they are unique)
            for (const nft of wallet.wallet_nfts ?? []) {
                nftList.push({
                    id:
                        nft.id ??
                        `${wallet.id}-${nft.token_id ?? ''}-${nft.serial_number ?? 0}`,
                    token_id: nft.token_id ?? '',
                    serial_number: nft.serial_number ?? 0,
                    metadata: nft.metadata ?? {},
                    token_name:
                        nft.tokens_registry?.token_name ?? undefined,
                    token_icon:
                        nft.tokens_registry?.token_icon ?? undefined,
                })
            }
        }

        logger.info('🔍 Aggregated Assets Debug:', {
            totalHbar,
            fungibleCount: fungibleMap.size,
            defiCount: defiList.length,
            nftCount: nftList.length,
            totalValue,
        })

        // Convert maps to arrays and sort by USD value
        const fungibleTokens = Array.from(fungibleMap.values()).map((token) => {
            const normalizedBalance =
                parseFloat(token.balance) / Math.pow(10, token.decimals)
            const valueUsd = normalizedBalance * parseFloat(token.price_usd)
            return { ...token, valueUsd }
        })
        fungibleTokens.sort((a, b) => b.valueUsd - a.valueUsd)

        return {
            totalHbar,
            hbarPriceUsd,
            fungibleTokens,
            defiPositions: defiList,
            nfts: nftList,
            totalValue,
        }
    }, [wallets])

    if (loading) {
        return (
            <div className='text-center py-12'>
                <Loader2 className='w-8 h-8 animate-spin mx-auto text-muted-foreground mb-4' />
                <p className='text-muted-foreground'>
                    Loading aggregated view...
                </p>
            </div>
        )
    }

    if (wallets.length === 0) {
        return (
            <Card className='bg-card/80 backdrop-blur-sm border-border/50'>
                <CardContent className='py-12 text-center'>
                    <Coins className='w-12 h-12 mx-auto text-muted-foreground mb-4' />
                    <h3 className='text-lg font-semibold mb-2'>
                        No Assets Found
                    </h3>
                    <p className='text-muted-foreground'>
                        Add and sync wallets to see your aggregated assets.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className='bg-card/80 backdrop-blur-sm border-border/50'>
            <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                    <Coins className='w-5 h-5' />
                    Aggregated Assets
                </CardTitle>
                <p className='text-sm text-muted-foreground'>
                    Combined view of all assets across {wallets.length}{' '}
                    {wallets.length === 1 ? 'wallet' : 'wallets'}
                </p>
            </CardHeader>
            <CardContent>
                <AssetSections
                    hbarBalance={aggregatedAssets.totalHbar}
                    hbarPriceUsd={aggregatedAssets.hbarPriceUsd}
                    fungibleTokens={aggregatedAssets.fungibleTokens}
                    defiPositions={aggregatedAssets.defiPositions}
                    nfts={aggregatedAssets.nfts}
                    formatUsd={formatUsd}
                    formatBalance={formatBalance}
                />
            </CardContent>
        </Card>
    )
}
