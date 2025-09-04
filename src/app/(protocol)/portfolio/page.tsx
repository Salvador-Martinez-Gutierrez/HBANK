'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useWallet } from '@buidlerlabs/hashgraph-react-wallets'
import { ConnectWalletButton } from '@/components/connect-wallet-button'
import { useAccountId } from '@/app/(protocol)/vault/hooks/useAccountID'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchAccountBalances } from '@/services/token.services'

export default function PortfolioPage() {
    const { isConnected } = useWallet()
    const accountId = useAccountId()
    const [balances, setBalances] = useState({
        hbar: '0',
        usdc: '0',
        husd: '0',
        husdValueUsd: '0',
        rate: '1',
    })
    const [loading, setLoading] = useState(false)
    const [hbarPrice] = useState<number>(0)

    useEffect(() => {
        const run = async () => {
            if (!isConnected || !accountId) {
                setBalances({
                    hbar: '0',
                    usdc: '0',
                    husd: '0',
                    husdValueUsd: '0',
                    rate: '1',
                })
                return
            }
            setLoading(true)
            const result = await fetchAccountBalances(accountId)
            setBalances(result)
            setLoading(false)
        }
        run()
    }, [isConnected, accountId])

    const formatUsd = (value: number) => {
        return value.toLocaleString(undefined, {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 2,
        })
    }

    // Token card configuration to avoid duplication
    const tokenConfigs = [
        {
            key: 'hbar' as const,
            name: 'HBAR',
            icon: '/hbar.webp',
            grayscale: false,
            getValue: () =>
                formatUsd(
                    (parseFloat(balances.hbar || '0') || 0) * (hbarPrice || 0)
                ),
        },
        {
            key: 'usdc' as const,
            name: 'USDC',
            icon: '/usdc.svg',
            grayscale: false,
            getValue: () => formatUsd(parseFloat(balances.usdc || '0') || 0),
        },
        {
            key: 'husd' as const,
            name: 'hUSD',
            icon: '/usdc.svg',
            grayscale: true,
            getValue: () =>
                formatUsd(parseFloat(balances.husdValueUsd || '0') || 0),
        },
    ]

    if (!isConnected) {
        return (
            <div className='h-full flex items-center justify-center'>
                <div className='text-center space-y-6'>
                    <p className='text-xl md:text-4xl max-w-lg mx-auto font-semibold text-foreground'>
                        Earn a 13.33% APY on your USDC with Valora Protocol
                    </p>
                    <div className='flex justify-center'>
                        <ConnectWalletButton variant='full-width' />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className='h-full p-8'>
            <h1 className='text-3xl font-bold text-foreground'>Portfolio</h1>
            <p className='text-muted-foreground mt-2'>
                Track your Valora Protocol positions and balances.
            </p>

            {isConnected && balances.rate !== '1' && (
                <div className='mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
                    <p className='text-sm text-blue-700'>
                        <span className='font-semibold'>
                            Current Exchange Rate:
                        </span>{' '}
                        1 hUSD = ${parseFloat(balances.rate).toFixed(4)} USD
                    </p>
                </div>
            )}

            <div className='mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4'>
                {tokenConfigs.map((t) => (
                    <Card key={t.key}>
                        <CardHeader>
                            <CardTitle>
                                <div className='flex items-center gap-2'>
                                    <Image
                                        src={t.icon}
                                        alt={t.name}
                                        width={32}
                                        height={32}
                                        className={`rounded-full ${
                                            t.grayscale ? 'grayscale' : ''
                                        }`}
                                    />
                                    <span>{t.name}</span>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className='flex items-end justify-between'>
                                <div>
                                    <div className='text-sm text-muted-foreground'>
                                        Balance
                                    </div>
                                    <div className='text-2xl font-semibold'>
                                        {loading ? '—' : balances[t.key]}
                                    </div>
                                </div>
                                <div className='text-right'>
                                    <div className='text-sm text-muted-foreground'>
                                        Value
                                    </div>
                                    <div className='text-xl font-medium'>
                                        {loading ? '—' : t.getValue()}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
