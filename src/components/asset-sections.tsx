/**
 * Asset Sections Component
 * Displays different types of assets in separate sections:
 * - Fungible Tokens
 * - Liquidity Pool Tokens
 * - NFTs
 */

import { useState } from 'react'
import Image from 'next/image'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Coins, Droplet, ImageIcon, Loader2 } from 'lucide-react'

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

interface AssetSectionsProps {
    hbarBalance: number
    hbarPriceUsd: number
    fungibleTokens: TokenDisplay[]
    lpTokens: TokenDisplay[]
    nfts: NFTDisplay[]
    formatUsd: (value: number) => string
    formatBalance: (balance: string, decimals: number) => string
    syncing?: boolean
}

export function AssetSections({
    hbarBalance,
    hbarPriceUsd,
    fungibleTokens,
    lpTokens,
    nfts,
    formatUsd,
    formatBalance,
    syncing = false,
}: AssetSectionsProps) {
    const [activeTab, setActiveTab] = useState('tokens')

    const fungibleCount = fungibleTokens?.length || 0
    const lpCount = lpTokens?.length || 0
    const nftCount = nfts?.length || 0
    const hasHbar = hbarBalance > 0
    const totalAssets = fungibleCount + lpCount + nftCount + (hasHbar ? 1 : 0)

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
                    LP Tokens
                    {lpCount > 0 && (
                        <Badge variant='secondary' className='ml-1'>
                            {lpCount}
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
                {!hasHbar && fungibleCount === 0 ? (
                    <div className='text-center py-6 text-muted-foreground'>
                        <Coins className='w-12 h-12 mx-auto mb-2 opacity-50' />
                        <p>No fungible tokens found</p>
                    </div>
                ) : (
                    <div className='space-y-2'>
                        {/* HBAR Balance - Always show first if > 0 */}
                        {hasHbar && (
                            <div className='flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 hover:from-purple-500/15 hover:to-blue-500/15 transition-colors'>
                                <div className='flex items-center gap-3'>
                                    <div className='w-8 h-8 rounded-full flex items-center justify-center'>
                                        <Image
                                            src='/hedera-hbar-logo.svg'
                                            alt='HBAR'
                                            width={32}
                                            height={32}
                                            className='rounded-full'
                                        />
                                    </div>
                                    <div>
                                        <div className='font-medium'>HBAR</div>
                                        <div className='text-sm text-muted-foreground'>
                                            {hbarBalance.toFixed(4)} HBAR
                                        </div>
                                    </div>
                                </div>
                                <div className='text-right'>
                                    <div className='font-medium'>
                                        {formatUsd(hbarBalance * hbarPriceUsd)}
                                    </div>
                                    {hbarPriceUsd > 0 && (
                                        <div className='text-sm text-muted-foreground'>
                                            @{formatUsd(hbarPriceUsd)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Fungible Tokens */}
                        {fungibleTokens.map((token) => {
                            const balance = formatBalance(
                                token.balance,
                                token.decimals
                            )
                            const priceUsd = parseFloat(token.price_usd || '0')
                            const valueUsd = parseFloat(balance) * priceUsd

                            return (
                                <div
                                    key={token.id}
                                    className='flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors'
                                >
                                    <div className='flex items-center gap-3'>
                                        {token.token_icon ? (
                                            <img
                                                src={token.token_icon}
                                                alt={
                                                    token.token_symbol ||
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
                                                {token.token_symbol?.[0] || '?'}
                                            </div>
                                        )}
                                        <div>
                                            <div className='font-medium'>
                                                {token.token_name ||
                                                    token.token_symbol ||
                                                    token.token_address}
                                            </div>
                                            <div className='text-sm text-muted-foreground'>
                                                {balance}{' '}
                                                {token.token_symbol || 'tokens'}
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
            </TabsContent>

            <TabsContent value='lp' className='mt-4'>
                {lpCount === 0 ? (
                    <div className='text-center py-6 text-muted-foreground'>
                        <Droplet className='w-12 h-12 mx-auto mb-2 opacity-50' />
                        <p>No liquidity pool tokens found</p>
                    </div>
                ) : (
                    <div className='space-y-2'>
                        {lpTokens.map((token) => {
                            const balance = formatBalance(
                                token.balance,
                                token.decimals
                            )
                            const priceUsd = parseFloat(token.price_usd || '0')
                            const valueUsd = parseFloat(balance) * priceUsd

                            return (
                                <div
                                    key={token.id}
                                    className='flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 hover:bg-blue-500/10 transition-colors'
                                >
                                    <div className='flex items-center gap-3'>
                                        <div className='w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center'>
                                            <Droplet className='w-4 h-4 text-blue-500' />
                                        </div>
                                        <div>
                                            <div className='font-medium'>
                                                {token.token_name ||
                                                    token.token_symbol ||
                                                    token.token_address}
                                            </div>
                                            <div className='text-sm text-muted-foreground'>
                                                {balance}{' '}
                                                {token.token_symbol ||
                                                    'LP tokens'}
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
            </TabsContent>

            <TabsContent value='nfts' className='mt-4'>
                {nftCount === 0 ? (
                    <div className='text-center py-6 text-muted-foreground'>
                        <ImageIcon className='w-12 h-12 mx-auto mb-2 opacity-50' />
                        <p>No NFTs found</p>
                    </div>
                ) : (
                    <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
                        {nfts.map((nft) => {
                            // Get image from metadata or token_icon
                            const nftImage =
                                nft.metadata?.image || nft.token_icon
                            const nftName =
                                nft.metadata?.name ||
                                nft.token_name ||
                                `NFT #${nft.serial_number}`

                            return (
                                <div
                                    key={nft.id}
                                    className='group relative rounded-lg overflow-hidden bg-muted/50 hover:bg-muted transition-all border border-border/50 hover:border-border'
                                >
                                    {nftImage ? (
                                        <div className='aspect-square relative'>
                                            <img
                                                src={nftImage}
                                                alt={nftName}
                                                className='w-full h-full object-cover'
                                                onError={(e) => {
                                                    e.currentTarget.src = ''
                                                    e.currentTarget.className =
                                                        'w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20'
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div className='aspect-square bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center'>
                                            <ImageIcon className='w-12 h-12 text-muted-foreground/50' />
                                        </div>
                                    )}
                                    <div className='p-3'>
                                        <div className='font-medium text-sm truncate'>
                                            {nftName}
                                        </div>
                                        <div className='text-xs text-muted-foreground'>
                                            #{nft.serial_number}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </TabsContent>
        </Tabs>
    )
}
