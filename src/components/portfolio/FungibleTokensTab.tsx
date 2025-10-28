/**
 * Fungible Tokens Tab Component
 *
 * Displays HBAR balance and all fungible tokens for a wallet.
 */

import { Coins } from 'lucide-react'
import { HbarBalanceCard } from './HbarBalanceCard'
import { FungibleTokenRow } from './FungibleTokenRow'

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

interface FungibleTokensTabProps {
    hbarBalance: number
    hbarPriceUsd: number
    fungibleTokens: TokenDisplay[]
    formatUsd: (value: number) => string
    formatBalance: (balance: string, decimals: number) => string
}

export function FungibleTokensTab({
    hbarBalance,
    hbarPriceUsd,
    fungibleTokens,
    formatUsd,
    formatBalance,
}: FungibleTokensTabProps) {
    const hasHbar = hbarBalance > 0
    const fungibleCount = fungibleTokens?.length || 0

    if (!hasHbar && fungibleCount === 0) {
        return (
            <div className='text-center py-6 text-muted-foreground'>
                <Coins className='w-12 h-12 mx-auto mb-2 opacity-50' />
                <p>No fungible tokens found</p>
            </div>
        )
    }

    return (
        <div className='space-y-2'>
            {/* HBAR Balance - Always show first if > 0 */}
            {hasHbar && (
                <HbarBalanceCard
                    balance={hbarBalance}
                    priceUsd={hbarPriceUsd}
                    formatUsd={formatUsd}
                />
            )}

            {/* Fungible Tokens */}
            {fungibleTokens.map((token) => (
                <FungibleTokenRow
                    key={token.id}
                    token={token}
                    formatBalance={formatBalance}
                    formatUsd={formatUsd}
                />
            ))}
        </div>
    )
}
