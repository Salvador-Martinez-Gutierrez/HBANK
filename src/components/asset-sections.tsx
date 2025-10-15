/**
 * Asset Sections Component
 * Displays different types of assets in separate sections:
 * - Fungible Tokens
 * - Liquidity Pool Tokens
 * - NFTs
 */

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Coins, Droplet, ImageIcon } from 'lucide-react'

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
    metadata: any
    token_name?: string
    token_icon?: string | null
}

interface AssetSectionsProps {
    fungibleTokens: TokenDisplay[]
    lpTokens: TokenDisplay[]
    nfts: NFTDisplay[]
    formatUsd: (value: number) => string
    formatBalance: (balance: string, decimals: number) => string
}

export function AssetSections({
    fungibleTokens,
    lpTokens,
    nfts,
    formatUsd,
    formatBalance,
}: AssetSectionsProps) {
    const [activeTab, setActiveTab] = useState('tokens')

    const fungibleCount = fungibleTokens?.length || 0
    const lpCount = lpTokens?.length || 0
    const nftCount = nfts?.length || 0
    const totalAssets = fungibleCount + lpCount + nftCount

    if (totalAssets === 0) {
        return (
            <div className='text-center py-6 text-muted-foreground'>
                <p>No assets found. Click sync to load your assets.</p>
            </div>
        )
    }

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
            <TabsList className='grid w-full grid-cols-3'>
                <TabsTrigger value='tokens' className='flex items-center gap-2'>
                    <Coins className='w-4 h-4' />
                    Tokens
                    {fungibleCount > 0 && (
                        <Badge variant='secondary' className='ml-1'>
                            {fungibleCount}
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
                {fungibleCount === 0 ? (
                    <div className='text-center py-6 text-muted-foreground'>
                        <Coins className='w-12 h-12 mx-auto mb-2 opacity-50' />
                        <p>No fungible tokens found</p>
                    </div>
                ) : (
                    <div className='space-y-2'>
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
                        {nfts.map((nft) => (
                            <div
                                key={nft.id}
                                className='group relative rounded-lg overflow-hidden bg-muted/50 hover:bg-muted transition-all border border-border/50 hover:border-border'
                            >
                                {nft.token_icon || nft.metadata?.image ? (
                                    <div className='aspect-square relative'>
                                        <img
                                            src={
                                                nft.token_icon ||
                                                nft.metadata?.image
                                            }
                                            alt={
                                                nft.token_name ||
                                                `NFT #${nft.serial_number}`
                                            }
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
                                        {nft.metadata?.name ||
                                            nft.token_name ||
                                            'Unnamed NFT'}
                                    </div>
                                    <div className='text-xs text-muted-foreground'>
                                        #{nft.serial_number}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </TabsContent>
        </Tabs>
    )
}
