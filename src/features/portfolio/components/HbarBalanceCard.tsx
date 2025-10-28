/**
 * HBAR Balance Card Component
 *
 * Displays HBAR balance with current price and USD value.
 * Features a gradient background to highlight the native token.
 */

import Image from 'next/image'

interface HbarBalanceCardProps {
    balance: number
    priceUsd: number
    formatUsd: (value: number) => string
}

export function HbarBalanceCard({
    balance,
    priceUsd,
    formatUsd,
}: HbarBalanceCardProps) {
    const valueUsd = balance * priceUsd

    return (
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
                        {balance.toFixed(4)} HBAR
                    </div>
                </div>
            </div>
            <div className='text-right'>
                <div className='font-medium'>{formatUsd(valueUsd)}</div>
                {priceUsd > 0 && (
                    <div className='text-sm text-muted-foreground'>
                        @{formatUsd(priceUsd)}
                    </div>
                )}
            </div>
        </div>
    )
}
