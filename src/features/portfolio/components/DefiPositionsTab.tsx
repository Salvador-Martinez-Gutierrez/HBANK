/**
 * DeFi Positions Tab Component
 *
 * Displays all DeFi positions (LP pools, farms, lending) across protocols.
 * Currently supports:
 * - SaucerSwap V1 pools and farms
 * - Bonzo Finance lending positions
 */

import Image from 'next/image'
import { Droplet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import type { WalletDefiWithMetadata } from '@/types/portfolio'

interface DefiPositionsTabProps {
    defiPositions: WalletDefiWithMetadata[]
    formatUsd: (value: number) => string
}

export function DefiPositionsTab({
    defiPositions,
    formatUsd,
}: DefiPositionsTabProps) {
    const defiCount = defiPositions?.length || 0

    if (defiCount === 0) {
        return (
            <div className='text-center py-6 text-muted-foreground'>
                <Droplet className='w-12 h-12 mx-auto mb-2 opacity-50' />
                <p>No DeFi positions found</p>
            </div>
        )
    }

    // Group positions by type
    const pools = defiPositions.filter(
        (p) => p.position_type === 'SAUCERSWAP_V1_POOL'
    )
    const farms = defiPositions.filter(
        (p) => p.position_type === 'SAUCERSWAP_V1_FARM'
    )
    const bonzoLending = defiPositions.filter(
        (p) => p.position_type === 'BONZO_LENDING'
    )

    return (
        <div className='space-y-6'>
            {/* SaucerSwap V1 Pools */}
            {pools.length > 0 && (
                <DefiProtocolSection
                    title='SaucerSwap V1 Pools'
                    logo='/saucer_swap.webp'
                    positions={pools}
                    formatUsd={formatUsd}
                />
            )}

            {/* SaucerSwap V1 Farms */}
            {farms.length > 0 && (
                <DefiProtocolSection
                    title='SaucerSwap V1 Farms'
                    logo='/saucer_swap.webp'
                    positions={farms}
                    formatUsd={formatUsd}
                />
            )}

            {/* Bonzo Finance Lending */}
            {bonzoLending.length > 0 && (
                <BonzoLendingSection
                    positions={bonzoLending}
                    formatUsd={formatUsd}
                />
            )}
        </div>
    )
}

interface DefiProtocolSectionProps {
    title: string
    logo: string
    positions: WalletDefiWithMetadata[]
    formatUsd: (value: number) => string
}

// Removed color classes - using standard styles to match main branch

function BonzoLendingSection({
    positions,
    formatUsd,
}: {
    positions: WalletDefiWithMetadata[]
    formatUsd: (value: number) => string
}) {
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
                <h3 className='font-bold text-lg'>Bonzo Finance</h3>
                <Badge variant='secondary' className='ml-auto'>
                    {positions.length}
                </Badge>
            </div>
            <div className='rounded-lg border border-border overflow-hidden'>
                <Table>
                    <TableHeader>
                        <TableRow className='bg-muted/50'>
                            <TableHead>Asset</TableHead>
                            <TableHead>Supplied</TableHead>
                            <TableHead>APY</TableHead>
                            <TableHead className='text-right'>Value</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {positions.map((position) => {
                            const valueUsd = parseFloat(
                                position.value_usd ?? '0'
                            )
                            const metadata = position.defi_metadata as
                                | Record<string, unknown>
                                | undefined
                            const asset = metadata?.asset as string | undefined
                            const apy = metadata?.apy as number | undefined

                            return (
                                <TableRow key={position.id}>
                                    <TableCell className='font-medium'>
                                        {asset ??
                                            position.tokens_registry
                                                ?.token_symbol ??
                                            'Unknown Asset'}
                                    </TableCell>
                                    <TableCell>
                                        <span className='text-sm'>
                                            {parseFloat(
                                                position.balance ?? '0'
                                            ).toFixed(4)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {apy ? (
                                            <span className='text-sm'>
                                                {apy.toFixed(2)}%
                                            </span>
                                        ) : (
                                            <span className='text-sm text-muted-foreground'>
                                                -
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className='text-right font-medium'>
                                        {formatUsd(valueUsd)}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

function PoolPositionRow({
    position,
    formatUsd,
}: {
    position: WalletDefiWithMetadata
    formatUsd: (value: number) => string
}) {
    const valueUsd = parseFloat(position.value_usd ?? '0')
    const metadata = position.defi_metadata as
        | Record<string, unknown>
        | undefined
    const poolName = metadata?.poolName as string | undefined
    const token0Symbol = metadata?.token0Symbol as string | undefined
    const token1Symbol = metadata?.token1Symbol as string | undefined
    const token0Amount = metadata?.token0Amount as string | undefined
    const token1Amount = metadata?.token1Amount as string | undefined

    return (
        <TableRow key={position.id}>
            <TableCell className='font-medium'>
                {poolName ?? `${token0Symbol ?? '?'}/${token1Symbol ?? '?'}`}
            </TableCell>
            <TableCell>
                {token0Amount && token1Amount ? (
                    <div className='text-sm'>
                        <div>
                            {parseFloat(token0Amount).toFixed(2)} {token0Symbol}
                        </div>
                        <div className='text-muted-foreground'>
                            {parseFloat(token1Amount).toFixed(2)} {token1Symbol}
                        </div>
                    </div>
                ) : (
                    <span className='text-muted-foreground'>-</span>
                )}
            </TableCell>
            <TableCell className='text-right font-medium'>
                {formatUsd(valueUsd)}
            </TableCell>
        </TableRow>
    )
}

function DefiProtocolSection({
    title,
    logo,
    positions,
    formatUsd,
}: DefiProtocolSectionProps) {
    return (
        <div>
            <div className='flex items-center gap-3 mb-4'>
                <Image
                    src={logo}
                    alt={title}
                    width={24}
                    height={24}
                    className='rounded'
                />
                <h3 className='font-bold text-lg'>{title}</h3>
                <Badge variant='secondary' className='ml-auto'>
                    {positions.length}
                </Badge>
            </div>
            <div className='rounded-lg border border-border overflow-hidden'>
                <Table>
                    <TableHeader>
                        <TableRow className='bg-muted/50'>
                            <TableHead>Pool</TableHead>
                            <TableHead>Supplied</TableHead>
                            <TableHead className='text-right'>Value</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {positions.map((position) => (
                            <PoolPositionRow
                                key={position.id}
                                position={position}
                                formatUsd={formatUsd}
                            />
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
