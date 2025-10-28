/**
 * Fungible Token Row Component
 *
 * Displays a single fungible token with icon, balance, and USD value.
 */

import type { TokenDisplay } from '@/features/portfolio/types/portfolio-display'

interface FungibleTokenRowProps {
    token: TokenDisplay
    formatBalance: (balance: string, decimals: number) => string
    formatUsd: (value: number) => string
}

export function FungibleTokenRow({
    token,
    formatBalance,
    formatUsd,
}: FungibleTokenRowProps) {
    const balance = formatBalance(token.balance, token.decimals)
    const priceUsd = parseFloat(token.price_usd ?? '0')
    const valueUsd = parseFloat(balance) * priceUsd

    return (
        <div className='flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors'>
            <div className='flex items-center gap-3'>
                {token.token_icon ? (
                    <img
                        src={token.token_icon}
                        alt={token.token_symbol ?? 'Token'}
                        className='w-8 h-8 rounded-full'
                        onError={(e) => {
                            e.currentTarget.style.display = 'none'
                        }}
                    />
                ) : (
                    <div className='w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold'>
                        {token.token_symbol?.[0] ?? '?'}
                    </div>
                )}
                <div>
                    <div className='font-medium'>
                        {token.token_name ??
                            token.token_symbol ??
                            token.token_address}
                    </div>
                    <div className='text-sm text-muted-foreground'>
                        {balance} {token.token_symbol ?? 'tokens'}
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
