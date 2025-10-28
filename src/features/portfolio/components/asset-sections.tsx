/**
 * Asset Sections Component (Refactored)
 *
 * Main component that displays different types of assets in tabs.
 * Refactored from 687 lines to ~120 lines by extracting sub-components.
 */

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Coins, Droplet, ImageIcon, Loader2 } from 'lucide-react'
import type { WalletDefiWithMetadata } from '@/types/portfolio'
import type { TokenDisplay, NFTDisplay } from '@/features/portfolio/types/portfolio-display'
import { FungibleTokensTab } from '@/features/portfolio/components/FungibleTokensTab'
import { DefiPositionsTab } from '@/features/portfolio/components/DefiPositionsTab'
import { NftGalleryTab } from '@/features/portfolio/components/NftGalleryTab'

interface AssetSectionsProps {
    hbarBalance: number
    hbarPriceUsd: number
    fungibleTokens: TokenDisplay[]
    defiPositions: WalletDefiWithMetadata[]
    nfts: NFTDisplay[]
    formatUsd: (value: number) => string
    formatBalance: (balance: string, decimals: number) => string
    syncing?: boolean
}

export function AssetSections({
    hbarBalance,
    hbarPriceUsd,
    fungibleTokens,
    defiPositions,
    nfts,
    formatUsd,
    formatBalance,
    syncing = false,
}: AssetSectionsProps) {
    const [activeTab, setActiveTab] = useState('tokens')

    const fungibleCount = fungibleTokens?.length || 0
    const defiCount = defiPositions?.length || 0
    const nftCount = nfts?.length || 0
    const hasHbar = hbarBalance > 0
    const totalAssets = fungibleCount + defiCount + nftCount + (hasHbar ? 1 : 0)

    if (totalAssets === 0) {
        return (
            <div className='text-center py-6 text-muted-foreground'>
                {syncing ? (
                    <div className='flex flex-col items-center gap-2'>
                        <Loader2 className='w-6 h-6 animate-spin' />
                        <p>Syncing assets, please wait...</p>
                    </div>
                ) : (
                    <p>No assets found. Click sync to load your assets.</p>
                )}
            </div>
        )
    }

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
            <TabsList className='grid w-full grid-cols-3'>
                <TabsTrigger value='tokens' className='flex items-center gap-2'>
                    <Coins className='w-4 h-4' />
                    Tokens
                    {(fungibleCount > 0 || hasHbar) && (
                        <Badge variant='secondary' className='ml-1'>
                            {fungibleCount + (hasHbar ? 1 : 0)}
                        </Badge>
                    )}
                </TabsTrigger>
                <TabsTrigger value='lp' className='flex items-center gap-2'>
                    <Droplet className='w-4 h-4' />
                    DeFi
                    {defiCount > 0 && (
                        <Badge variant='secondary' className='ml-1'>
                            {defiCount}
                        </Badge>
                    )}
                </TabsTrigger>
                <TabsTrigger value='nfts' className='flex items-center gap-2'>
                    <ImageIcon className='w-4 h-4' />
                    NFTs
                    {nftCount > 0 && (
                        <Badge variant='secondary' className='ml-1'>
                            {nftCount}
                        </Badge>
                    )}
                </TabsTrigger>
            </TabsList>

            <TabsContent value='tokens' className='mt-4'>
                <FungibleTokensTab
                    hbarBalance={hbarBalance}
                    hbarPriceUsd={hbarPriceUsd}
                    fungibleTokens={fungibleTokens}
                    formatUsd={formatUsd}
                    formatBalance={formatBalance}
                />
            </TabsContent>

            <TabsContent value='lp' className='mt-4'>
                <DefiPositionsTab
                    defiPositions={defiPositions}
                    formatUsd={formatUsd}
                />
            </TabsContent>

            <TabsContent value='nfts' className='mt-4'>
                <NftGalleryTab nfts={nfts} />
            </TabsContent>
        </Tabs>
    )
}
