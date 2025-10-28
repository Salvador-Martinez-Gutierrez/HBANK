import { supabase } from '@/lib/supabase'

/**
 * Token price mapping for Hedera tokens
 * Maps Hedera token IDs to CoinGecko IDs
 */
const TOKEN_PRICE_MAP: Record<string, string> = {
    '0.0.456858': 'hedera-hashgraph', // HBAR (example)
    '0.0.429274': 'usd-coin', // USDC on Hedera testnet
    // Add more token mappings here
}

/**
 * Fetch token prices from CoinGecko
 */
export async function fetchTokenPrices(
    tokenIds: string[]
): Promise<Record<string, number>> {
    try {
        // Map Hedera token IDs to CoinGecko IDs
        const coingeckoIds = tokenIds
            .map((id) => TOKEN_PRICE_MAP[id])
            .filter(Boolean)
            .join(',')

        if (!coingeckoIds) {
            console.log('No CoinGecko IDs found for tokens')
            return {}
        }

        const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoIds}&vs_currencies=usd`,
            {
                headers: {
                    Accept: 'application/json',
                },
            }
        )

        if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.statusText}`)
        }

        const data = await response.json()

        // Map back to Hedera token IDs
        const prices: Record<string, number> = {}
        for (const [hederaId, coingeckoId] of Object.entries(TOKEN_PRICE_MAP)) {
            if (data[coingeckoId]) {
                prices[hederaId] = data[coingeckoId].usd
            }
        }

        return prices
    } catch (error) {
        console.error('Error fetching token prices:', error)
        return {}
    }
}

/**
 * Update all token prices in the database
 */
export async function updateAllTokenPrices() {
    try {
        // Get all unique token addresses from the database
        const { data: tokens, error } = await supabase
            .from('tokens')
            .select('token_address')
            .order('token_address') as { data: Array<{ token_address: string | null }> | null, error: unknown }

        if (error) {
            console.error('Error fetching tokens:', error)
            return { success: false, error: 'Failed to fetch tokens' }
        }

        if (!tokens || tokens.length === 0) {
            return { success: true, message: 'No tokens to update' }
        }

        // Get unique token addresses
        const uniqueTokens = [...new Set(tokens.map((t) => t.token_address).filter((addr): addr is string => addr !== null && addr !== undefined))]

        // Fetch prices
        const prices = await fetchTokenPrices(uniqueTokens)

        // Update prices in database
        let updatedCount = 0
        for (const [tokenAddress, price] of Object.entries(prices)) {
            const { error: updateError } = await supabase
                .from('tokens')
                // @ts-ignore - Supabase type issue with dynamic table name
                .update({
                    price_usd: price.toString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('token_address', tokenAddress)

            if (!updateError) {
                updatedCount++
            } else {
                console.error(
                    `Error updating price for ${tokenAddress}:`,
                    updateError
                )
            }
        }

        console.log(`✅ Updated prices for ${updatedCount} tokens`)
        return {
            success: true,
            message: `Updated ${updatedCount} token prices`,
        }
    } catch (error) {
        console.error('Error updating token prices:', error)
        return { success: false, error: 'Failed to update prices' }
    }
}

/**
 * Update price for a specific token
 */
export async function updateTokenPrice(tokenAddress: string) {
    try {
        const prices = await fetchTokenPrices([tokenAddress])
        const price = prices[tokenAddress]

        if (price === undefined) {
            return { success: false, error: 'Price not found' }
        }

        const { error } = await supabase
            .from('tokens')
            // @ts-ignore - Supabase type issue with dynamic table name
            .update({
                price_usd: price.toString(),
                updated_at: new Date().toISOString(),
            })
            .eq('token_address', tokenAddress)

        if (error) {
            console.error('Error updating token price:', error)
            return { success: false, error: 'Failed to update price' }
        }

        return { success: true, price }
    } catch (error) {
        console.error('Error in updateTokenPrice:', error)
        return { success: false, error: 'Update failed' }
    }
}

/**
 * Fallback price fetching using Hedera Mirror Node (for tokens not on CoinGecko)
 */
export async function fetchHederaTokenPrice(
    tokenId: string
): Promise<number | null> {
    try {
        // This is a placeholder - you'll need to implement actual price fetching
        // from DEX pools or other sources on Hedera
        console.log(`Fetching Hedera price for ${tokenId}`)

        // For now, return null
        return null
    } catch (error) {
        console.error('Error fetching Hedera token price:', error)
        return null
    }
}
