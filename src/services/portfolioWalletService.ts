import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { WalletWithTokens } from '@/types/portfolio'
import {
    getTokenInfo,
    getTokenPrice,
    createTokenLookupMap,
} from './saucerSwapService'
import { MAX_WALLETS_PER_USER } from '@/constants/portfolio'

// Portfolio uses MAINNET mirror node (separate from vault/testnet)
const PORTFOLIO_MIRROR_NODE = 'https://mainnet-public.mirrornode.hedera.com'

/**
 * Get all wallets for a user
 */
export async function getUserWallets(
    userId: string
): Promise<WalletWithTokens[]> {
    try {
        const { data: wallets, error } = await supabase
            .from('wallets')
            .select(
                `
                *,
                tokens (*),
                nfts (*)
            `
            )
            .eq('user_id', userId)
            .order('is_primary', { ascending: false })

        if (error) {
            console.error('Error fetching wallets:', error)
            return []
        }

        return wallets as WalletWithTokens[]
    } catch (error) {
        console.error('Error in getUserWallets:', error)
        return []
    }
}

/**
 * Add a new wallet for a user
 * Uses supabaseAdmin to bypass RLS when called from API routes
 * Maximum 5 wallets per user
 */
export async function addWallet(
    userId: string,
    walletAddress: string,
    label?: string
) {
    try {
        // Check current wallet count
        const { data: existingWallets, error: countError } = await supabaseAdmin
            .from('wallets')
            .select('id', { count: 'exact', head: false })
            .eq('user_id', userId)

        if (countError) {
            console.error('Error counting wallets:', countError)
            return { success: false, error: 'Failed to verify wallet limit' }
        }

        // Enforce wallet maximum
        if (existingWallets && existingWallets.length >= MAX_WALLETS_PER_USER) {
            return {
                success: false,
                error: `Maximum ${MAX_WALLETS_PER_USER} wallets allowed per user`,
            }
        }

        // Check if wallet already exists for this user
        const { data: duplicateCheck } = await supabaseAdmin
            .from('wallets')
            .select('id')
            .eq('user_id', userId)
            .eq('wallet_address', walletAddress)
            .maybeSingle()

        if (duplicateCheck) {
            return {
                success: false,
                error: 'This wallet is already added to your portfolio',
            }
        }

        // Use admin client to bypass RLS policies in server-side operations
        const { data, error } = await supabaseAdmin
            .from('wallets')
            .insert({
                user_id: userId,
                wallet_address: walletAddress,
                label: label || 'Sub Wallet',
                is_primary: false,
            } as any)
            .select()
            .single()

        if (error) {
            console.error('Error adding wallet:', error)
            return { success: false, error: 'Failed to add wallet' }
        }

        return { success: true, wallet: data }
    } catch (error) {
        console.error('Error in addWallet:', error)
        return { success: false, error: 'Database error' }
    }
}

/**
 * Update wallet label
 * Uses supabaseAdmin to bypass RLS when called from API routes
 */
export async function updateWalletLabel(walletId: string, label: string) {
    try {
        const { error } = await supabaseAdmin
            .from('wallets')
            .update({ label })
            .eq('id', walletId)

        if (error) {
            console.error('Error updating wallet:', error)
            return { success: false, error: 'Failed to update wallet' }
        }

        return { success: true }
    } catch (error) {
        console.error('Error in updateWalletLabel:', error)
        return { success: false, error: 'Database error' }
    }
}

/**
 * Delete a wallet (only if not primary)
 * Uses supabaseAdmin to bypass RLS when called from API routes
 */
export async function deleteWallet(walletId: string) {
    try {
        // Check if wallet is primary
        const { data: wallet } = await supabaseAdmin
            .from('wallets')
            .select('is_primary')
            .eq('id', walletId)
            .single()

        if (wallet?.is_primary) {
            return { success: false, error: 'Cannot delete primary wallet' }
        }

        const { error } = await supabaseAdmin
            .from('wallets')
            .delete()
            .eq('id', walletId)

        if (error) {
            console.error('Error deleting wallet:', error)
            return { success: false, error: 'Failed to delete wallet' }
        }

        return { success: true }
    } catch (error) {
        console.error('Error in deleteWallet:', error)
        return { success: false, error: 'Database error' }
    }
}

/**
 * Sync tokens for a wallet from Hedera
 * Uses supabaseAdmin to bypass RLS when called from API routes
 * Also fetches token metadata and prices from SaucerSwap
 * Now uses normalized schema (tokens_registry + wallet_tokens)
 */
export async function syncWalletTokens(
    walletId: string,
    walletAddress: string
) {
    try {
        // Fetch tokens from Hedera Mirror Node (MAINNET for portfolio)
        const response = await fetch(
            `${PORTFOLIO_MIRROR_NODE}/api/v1/accounts/${walletAddress}/tokens`
        )

        if (!response.ok) {
            throw new Error('Failed to fetch tokens from Hedera')
        }

        const data = await response.json()
        const tokens = data.tokens || []

        console.log(
            `📊 Syncing ${tokens.length} tokens for wallet ${walletAddress}`
        )

        // Create a lookup map for SaucerSwap tokens (ONE API call, cached for 5 minutes)
        const tokenLookupMap = await createTokenLookupMap()
        console.log(
            `🔍 Loaded ${tokenLookupMap.size} tokens from SaucerSwap (cached)`
        )

        // Process each token
        for (const token of tokens) {
            const tokenAddress = token.token_id

            // Get token info from SaucerSwap cache
            const saucerToken = tokenLookupMap.get(tokenAddress)
            const tokenName = saucerToken?.name || tokenAddress
            const tokenSymbol = saucerToken?.symbol || tokenAddress
            const tokenIcon = saucerToken?.icon || null
            const decimals = token.decimals || 0
            const priceUsd = saucerToken?.priceUsd?.toString() || '0'

            if (saucerToken) {
                console.log(`💰 ${tokenSymbol}: $${priceUsd} (${tokenName})`)
            } else {
                console.log(
                    `ℹ️ Token ${tokenAddress} not found in SaucerSwap (no price available)`
                )
            }

            // Step 1: Upsert token in registry (shared across all wallets)
            const { data: registryToken, error: registryError } =
                await supabaseAdmin
                    .from('tokens_registry')
                    .upsert(
                        {
                            token_address: tokenAddress,
                            token_name: tokenName,
                            token_symbol: tokenSymbol,
                            token_icon: tokenIcon,
                            decimals: decimals,
                            price_usd: priceUsd,
                            last_price_update: new Date().toISOString(),
                        },
                        {
                            onConflict: 'token_address',
                        }
                    )
                    .select('id')
                    .single()

            if (registryError) {
                console.error(
                    'Error upserting token registry:',
                    tokenAddress,
                    registryError
                )
                continue
            }

            // Step 2: Upsert wallet-token relationship with balance
            const { error: walletTokenError } = await supabaseAdmin
                .from('wallet_tokens')
                .upsert(
                    {
                        wallet_id: walletId,
                        token_id: registryToken.id,
                        balance: token.balance.toString(),
                        last_synced_at: new Date().toISOString(),
                    },
                    {
                        onConflict: 'wallet_id,token_id',
                    }
                )

            if (walletTokenError) {
                console.error(
                    'Error syncing wallet token:',
                    tokenAddress,
                    walletTokenError
                )
            } else {
                console.log(`✅ Synced token: ${tokenSymbol} (${tokenAddress})`)
            }
        }

        return { success: true }
    } catch (error) {
        console.error('Error in syncWalletTokens:', error)
        return { success: false, error: 'Sync failed' }
    }
}

/**
 * Get token metadata from Hedera
 */
export async function getTokenMetadata(tokenId: string) {
    try {
        const response = await fetch(
            `${PORTFOLIO_MIRROR_NODE}/api/v1/tokens/${tokenId}`
        )

        if (!response.ok) {
            throw new Error('Failed to fetch token metadata')
        }

        const data = await response.json()

        return {
            success: true,
            metadata: {
                name: data.name,
                symbol: data.symbol,
                decimals: data.decimals,
                totalSupply: data.total_supply,
            },
        }
    } catch (error) {
        console.error('Error fetching token metadata:', error)
        return { success: false, error: 'Failed to fetch metadata' }
    }
}

/**
 * Update token metadata in database
 * Uses supabaseAdmin to bypass RLS when called from API routes
 */
export async function updateTokenMetadata(
    walletId: string,
    tokenAddress: string
) {
    try {
        const metadataResult = await getTokenMetadata(tokenAddress)

        if (!metadataResult.success || !metadataResult.metadata) {
            return { success: false, error: 'Failed to get metadata' }
        }

        const { error } = await supabaseAdmin
            .from('tokens')
            .update({
                token_name: metadataResult.metadata.name,
                token_symbol: metadataResult.metadata.symbol,
                decimals: metadataResult.metadata.decimals,
            })
            .eq('wallet_id', walletId)
            .eq('token_address', tokenAddress)

        if (error) {
            console.error('Error updating token metadata:', error)
            return { success: false, error: 'Failed to update metadata' }
        }

        return { success: true }
    } catch (error) {
        console.error('Error in updateTokenMetadata:', error)
        return { success: false, error: 'Database error' }
    }
}

/**
 * Calculate total portfolio value in USD
 */
export async function calculatePortfolioValue(userId: string): Promise<number> {
    try {
        const wallets = await getUserWallets(userId)
        let totalValue = 0

        for (const wallet of wallets) {
            for (const token of wallet.tokens) {
                const balance = parseFloat(token.balance || '0')
                const price = parseFloat(token.price_usd || '0')
                const decimals = token.decimals || 0
                const normalizedBalance = balance / Math.pow(10, decimals)
                totalValue += normalizedBalance * price
            }
        }

        return totalValue
    } catch (error) {
        console.error('Error calculating portfolio value:', error)
        return 0
    }
}
