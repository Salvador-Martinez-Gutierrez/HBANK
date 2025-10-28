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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Coins, Droplet, ImageIcon, Loader2 } from 'lucide-react'
import type { WalletDefiWithMetadata } from '@/types/portfolio'

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
                {defiCount === 0 ? (
                    <div className='text-center py-6 text-muted-foreground'>
                        <Droplet className='w-12 h-12 mx-auto mb-2 opacity-50' />
                        <p>No DeFi positions found</p>
                    </div>
                ) : (
                    <div className='space-y-6'>
                        {/* SaucerSwap V1 Pools Section */}
                        {(() => {
                            const pools = defiPositions.filter(
                                (p) => p.position_type === 'SAUCERSWAP_V1_POOL'
                            )
                            if (pools.length === 0) return null

                            return (
                                <div>
                                    <div className='flex items-center gap-3 mb-4'>
                                        <Image
                                            src='/saucer_swap.webp'
                                            alt='SaucerSwap'
                                            width={24}
                                            height={24}
                                            className='rounded'
                                        />
                                        <h3 className='font-bold text-lg text-blue-500'>
                                            SaucerSwap V1 Pools
                                        </h3>
                                        <Badge
                                            variant='secondary'
                                            className='ml-auto'
                                        >
                                            {pools.length}
                                        </Badge>
                                    </div>
                                    <div className='rounded-lg border border-blue-500/20 overflow-hidden'>
                                        <Table>
                                            <TableHeader>
                                                <TableRow className='bg-blue-500/5 hover:bg-blue-500/5'>
                                                    <TableHead className='text-blue-500'>
                                                        Pool
                                                    </TableHead>
                                                    <TableHead className='text-blue-500'>
                                                        Supplied
                                                    </TableHead>
                                                    <TableHead className='text-blue-500 text-right'>
                                                        Value
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {pools.map((position) => {
                                                    const valueUsd = parseFloat(
                                                        position.value_usd ||
                                                            '0'
                                                    )
                                                    const metadata =
                                                        position.defi_metadata as
                                                            | Record<
                                                                  string,
                                                                  unknown
                                                              >
                                                            | undefined
                                                    const poolName =
                                                        metadata?.poolName as
                                                            | string
                                                            | undefined
                                                    const token0Symbol =
                                                        metadata?.token0Symbol as
                                                            | string
                                                            | undefined
                                                    const token1Symbol =
                                                        metadata?.token1Symbol as
                                                            | string
                                                            | undefined
                                                    const token0Amount =
                                                        metadata?.token0Amount as
                                                            | string
                                                            | undefined
                                                    const token1Amount =
                                                        metadata?.token1Amount as
                                                            | string
                                                            | undefined

                                                    return (
                                                        <TableRow
                                                            key={position.id}
                                                            className='hover:bg-blue-500/5'
                                                        >
                                                            <TableCell className='font-medium'>
                                                                {poolName ||
                                                                    `${token0Symbol}/${token1Symbol}` ||
                                                                    'Unknown Pool'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {token0Amount &&
                                                                token1Amount ? (
                                                                    <div className='flex flex-col gap-1'>
                                                                        <span className='text-sm'>
                                                                            {parseFloat(
                                                                                token0Amount
                                                                            ).toFixed(
                                                                                4
                                                                            )}{' '}
                                                                            {
                                                                                token0Symbol
                                                                            }
                                                                        </span>
                                                                        <span className='text-sm'>
                                                                            {parseFloat(
                                                                                token1Amount
                                                                            ).toFixed(
                                                                                4
                                                                            )}{' '}
                                                                            {
                                                                                token1Symbol
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className='text-sm text-muted-foreground'>
                                                                        {
                                                                            token0Symbol
                                                                        }{' '}
                                                                        +{' '}
                                                                        {
                                                                            token1Symbol
                                                                        }
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className='text-right font-medium'>
                                                                {formatUsd(
                                                                    valueUsd
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )
                        })()}

                        {/* SaucerSwap V1 Farms Section */}
                        {(() => {
                            const farms = defiPositions.filter(
                                (p) => p.position_type === 'SAUCERSWAP_V1_FARM'
                            )
                            if (farms.length === 0) return null

                            return (
                                <div>
                                    <div className='flex items-center gap-3 mb-4'>
                                        <Image
                                            src='/saucer_swap.webp'
                                            alt='SaucerSwap'
                                            width={24}
                                            height={24}
                                            className='rounded'
                                        />
                                        <h3 className='font-bold text-lg text-green-500'>
                                            SaucerSwap V1 Farms
                                        </h3>
                                        <Badge
                                            variant='secondary'
                                            className='ml-auto'
                                        >
                                            {farms.length}
                                        </Badge>
                                    </div>
                                    <div className='rounded-lg border border-green-500/20 overflow-hidden'>
                                        <Table>
                                            <TableHeader>
                                                <TableRow className='bg-green-500/5 hover:bg-green-500/5'>
                                                    <TableHead className='text-green-500'>
                                                        Farm
                                                    </TableHead>
                                                    <TableHead className='text-green-500'>
                                                        Staked
                                                    </TableHead>
                                                    <TableHead className='text-green-500 text-right'>
                                                        Value
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {farms.map((position) => {
                                                    const valueUsd = parseFloat(
                                                        position.value_usd ||
                                                            '0'
                                                    )
                                                    const metadata =
                                                        position.defi_metadata as
                                                            | Record<
                                                                  string,
                                                                  unknown
                                                              >
                                                            | undefined
                                                    const farmName =
                                                        metadata?.farmName as
                                                            | string
                                                            | undefined
                                                    const token0Symbol =
                                                        metadata?.token0Symbol as
                                                            | string
                                                            | undefined
                                                    const token1Symbol =
                                                        metadata?.token1Symbol as
                                                            | string
                                                            | undefined
                                                    const token0Amount =
                                                        metadata?.token0Amount as
                                                            | string
                                                            | undefined
                                                    const token1Amount =
                                                        metadata?.token1Amount as
                                                            | string
                                                            | undefined

                                                    return (
                                                        <TableRow
                                                            key={position.id}
                                                            className='hover:bg-green-500/5'
                                                        >
                                                            <TableCell className='font-medium'>
                                                                {farmName ||
                                                                    `${token0Symbol}/${token1Symbol}` ||
                                                                    'Unknown Farm'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {token0Amount &&
                                                                token1Amount ? (
                                                                    <div className='flex flex-col gap-1'>
                                                                        <span className='text-sm'>
                                                                            {parseFloat(
                                                                                token0Amount
                                                                            ).toFixed(
                                                                                4
                                                                            )}{' '}
                                                                            {
                                                                                token0Symbol
                                                                            }
                                                                        </span>
                                                                        <span className='text-sm'>
                                                                            {parseFloat(
                                                                                token1Amount
                                                                            ).toFixed(
                                                                                4
                                                                            )}{' '}
                                                                            {
                                                                                token1Symbol
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className='text-sm text-muted-foreground'>
                                                                        {
                                                                            token0Symbol
                                                                        }{' '}
                                                                        +{' '}
                                                                        {
                                                                            token1Symbol
                                                                        }
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className='text-right font-medium'>
                                                                {formatUsd(
                                                                    valueUsd
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )
                        })()}

                        {/* Bonzo Finance Lending Section */}
                        {(() => {
                            const lending = defiPositions.filter(
                                (p) => p.position_type === 'BONZO_LENDING'
                            )
                            if (lending.length === 0) return null

                            return (
                                <div>
                                    <div className='flex items-center gap-3 mb-4'>
                                        <Image
                                            src='/bonzo.jpg'
                                            alt='Bonzo Finance'
                                            width={24}
                                            height={24}
                                            className='rounded'
                                        />
                                        <h3 className='font-bold text-lg text-purple-500'>
                                            Bonzo Finance (Lending)
                                        </h3>
                                        <Badge
                                            variant='secondary'
                                            className='ml-auto'
                                        >
                                            {lending.length}
                                        </Badge>
                                    </div>
                                    <div className='rounded-lg border border-purple-500/20 overflow-hidden'>
                                        <Table>
                                            <TableHeader>
                                                <TableRow className='bg-purple-500/5 hover:bg-purple-500/5'>
                                                    <TableHead className='text-purple-500'>
                                                        Asset
                                                    </TableHead>
                                                    <TableHead className='text-purple-500'>
                                                        Supplied
                                                    </TableHead>
                                                    <TableHead className='text-purple-500'>
                                                        APY
                                                    </TableHead>
                                                    <TableHead className='text-purple-500 text-right'>
                                                        Value
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {lending.map((position) => {
                                                    const valueUsd = parseFloat(
                                                        position.value_usd ||
                                                            '0'
                                                    )
                                                    const metadata =
                                                        position.defi_metadata as
                                                            | Record<
                                                                  string,
                                                                  unknown
                                                              >
                                                            | undefined
                                                    const asset =
                                                        metadata?.asset as
                                                            | string
                                                            | undefined
                                                    const apy =
                                                        metadata?.apy as
                                                            | number
                                                            | undefined

                                                    return (
                                                        <TableRow
                                                            key={position.id}
                                                            className='hover:bg-purple-500/5'
                                                        >
                                                            <TableCell className='font-medium'>
                                                                {asset ||
                                                                    position
                                                                        .tokens_registry
                                                                        ?.token_symbol ||
                                                                    'Unknown Asset'}
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className='text-sm'>
                                                                    {parseFloat(
                                                                        position.balance ||
                                                                            '0'
                                                                    ).toFixed(
                                                                        4
                                                                    )}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                {apy ? (
                                                                    <span className='text-sm text-green-600'>
                                                                        {(
                                                                            apy *
                                                                            100
                                                                        ).toFixed(
                                                                            2
                                                                        )}
                                                                        %
                                                                    </span>
                                                                ) : (
                                                                    <span className='text-sm text-muted-foreground'>
                                                                        -
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className='text-right font-medium'>
                                                                {formatUsd(
                                                                    valueUsd
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )
                        })()}
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
                            const nftMeta = (nft.metadata || {}) as Record<string, unknown>
                            const nftImage = nft.token_icon || (nftMeta.image ? String(nftMeta.image) : null) || null
                            const nftName =
                                nft.token_name ||
                                (nftMeta.name ? String(nftMeta.name) : null) ||
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
