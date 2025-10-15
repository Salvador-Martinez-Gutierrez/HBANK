import { supabaseAdmin } from '@/lib/supabase-admin'
import type { WalletWithTokens } from '@/types/portfolio'
import { createTokenLookupMap } from './saucerSwapService'
import { MAX_WALLETS_PER_USER } from '@/constants/portfolio'

/**
 * Get Validation Cloud Mirror Node URL
 * Uses environment variables for API key and base URL
 */
function getValidationCloudUrl(): string {
    const apiKey = process.env.VALIDATION_CLOUD_API_KEY
    const baseUrl =
        process.env.VALIDATION_CLOUD_BASE_URL ||
        'https://mainnet.hedera.validationcloud.io/v1'

    if (!apiKey) {
        throw new Error('VALIDATION_CLOUD_API_KEY is not configured')
    }

    return `${baseUrl}/${apiKey}/api/v1`
}

/**
 * Get all wallets for a user with all asset types
 * Uses supabaseAdmin to bypass RLS when called from API routes
 * Fetches: fungible tokens, LP tokens, and NFTs
 */
export async function getUserWallets(userId: string): Promise<any[]> {
    try {
        // Use admin client to bypass RLS policies
        // This is safe because we're validating JWT before calling this function
        const { data: wallets, error } = await supabaseAdmin
            .from('wallets')
            .select(
                `
                *,
                wallet_tokens (
                    *,
                    tokens_registry (*)
                ),
                liquidity_pool_tokens (
                    *,
                    tokens_registry (*)
                ),
                nfts (
                    *,
                    tokens_registry (*)
                )
            `
            )
            .eq('user_id', userId)
            .order('is_primary', { ascending: false })
            .order('created_at', { ascending: true })

        if (error) {
            console.error('Error fetching wallets:', error)
            return []
        }

        return wallets || []
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
 * Check if a token is a liquidity pool token
 * LP tokens on SaucerSwap/Hedera typically have specific naming patterns
 */
function isLiquidityPoolToken(tokenSymbol: string, tokenName: string): boolean {
    const lpPatterns = [
        /LP$/i, // Ends with LP
        /^LP-/i, // Starts with LP-
        /SAUCER.*LP/i, // SaucerSwap LP tokens
        /^HBAR-/i, // HBAR paired tokens
        /.*-HBAR$/i, // Tokens paired with HBAR
        /.*\/.*/, // Contains slash (e.g., HBAR/USDC)
    ]

    const textToCheck = `${tokenSymbol} ${tokenName}`
    return lpPatterns.some((pattern) => pattern.test(textToCheck))
}

/**
 * Sync all assets for a wallet from Hedera Validation Cloud
 * Fetches and categorizes:
 * - Fungible Tokens
 * - NFTs
 * - Liquidity Pool Tokens
 * Uses supabaseAdmin to bypass RLS when called from API routes
 * Uses normalized schema with separate tables for each asset type
 */
export async function syncWalletTokens(
    walletId: string,
    walletAddress: string
) {
    try {
        const validationCloudBaseUrl = getValidationCloudUrl()

        // ========================================
        // 1. FETCH FUNGIBLE & LP TOKENS
        // ========================================
        const tokensUrl = `${validationCloudBaseUrl}/accounts/${walletAddress}/tokens`
        console.log(`📡 Fetching tokens from Validation Cloud: ${tokensUrl}`)

        const tokensResponse = await fetch(tokensUrl)
        if (!tokensResponse.ok) {
            throw new Error('Failed to fetch tokens from Hedera')
        }

        const tokensData = await tokensResponse.json()
        const tokens = tokensData.tokens || []

        console.log(
            `📊 Found ${tokens.length} total tokens for wallet ${walletAddress}`
        )

        // ========================================
        // 2. FETCH NFTs
        // ========================================
        const nftsUrl = `${validationCloudBaseUrl}/accounts/${walletAddress}/nfts`
        console.log(`📡 Fetching NFTs from Validation Cloud: ${nftsUrl}`)

        let nfts: any[] = []
        try {
            const nftsResponse = await fetch(nftsUrl)
            if (nftsResponse.ok) {
                const nftsData = await nftsResponse.json()
                nfts = nftsData.nfts || []
                console.log(
                    `🎨 Found ${nfts.length} NFTs for wallet ${walletAddress}`
                )
            }
        } catch (nftError) {
            console.warn('⚠️ Could not fetch NFTs:', nftError)
        }

        // ========================================
        // 3. GET TOKEN METADATA FROM SAUCERSWAP
        // ========================================
        const tokenLookupMap = await createTokenLookupMap()
        console.log(
            `🔍 Loaded ${tokenLookupMap.size} tokens from SaucerSwap (cached)`
        )

        // ========================================
        // 4. PROCESS FUNGIBLE & LP TOKENS
        // ========================================
        let fungibleCount = 0
        let lpCount = 0

        for (const token of tokens) {
            const tokenAddress = token.token_id
            const tokenType = token.type || 'FUNGIBLE_COMMON'

            // Skip NFTs (they are processed separately)
            if (tokenType === 'NON_FUNGIBLE_UNIQUE') {
                continue
            }

            // Get token info from SaucerSwap cache
            const saucerToken = tokenLookupMap.get(tokenAddress)
            const tokenName = saucerToken?.name || tokenAddress
            const tokenSymbol = saucerToken?.symbol || tokenAddress
            const tokenIcon = saucerToken?.icon || null
            const decimals = token.decimals || 0
            const priceUsd = saucerToken?.priceUsd?.toString() || '0'

            // Determine if this is an LP token
            const isLPToken = isLiquidityPoolToken(tokenSymbol, tokenName)
            const finalTokenType = isLPToken ? 'LP_TOKEN' : 'FUNGIBLE'

            if (saucerToken) {
                console.log(
                    `💰 ${tokenSymbol}: $${priceUsd} (${tokenName}) [${finalTokenType}]`
                )
            } else {
                console.log(
                    `ℹ️ Token ${tokenAddress} not found in SaucerSwap [${finalTokenType}]`
                )
            }

            // Step 1: Upsert token in registry
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
                            token_type: finalTokenType,
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

            // Step 2: Upsert to appropriate table
            if (isLPToken) {
                // Insert into liquidity_pool_tokens
                const { error: lpTokenError } = await supabaseAdmin
                    .from('liquidity_pool_tokens')
                    .upsert(
                        {
                            wallet_id: walletId,
                            token_id: registryToken.id,
                            balance: token.balance.toString(),
                            pool_metadata: {
                                // You can enrich this with more data if available
                                tokenAddress,
                                decimals,
                            },
                            last_synced_at: new Date().toISOString(),
                        },
                        {
                            onConflict: 'wallet_id,token_id',
                        }
                    )

                if (lpTokenError) {
                    console.error(
                        'Error syncing LP token:',
                        tokenAddress,
                        lpTokenError
                    )
                } else {
                    lpCount++
                    console.log(`✅ Synced LP token: ${tokenSymbol}`)
                }
            } else {
                // Insert into wallet_tokens
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
                        'Error syncing fungible token:',
                        tokenAddress,
                        walletTokenError
                    )
                } else {
                    fungibleCount++
                    console.log(`✅ Synced fungible token: ${tokenSymbol}`)
                }
            }
        }

        // ========================================
        // 5. PROCESS NFTs
        // ========================================
        let nftCount = 0

        for (const nft of nfts) {
            const tokenAddress = nft.token_id
            const serialNumber = nft.serial_number

            // Upsert NFT token in registry
            const { data: registryToken, error: registryError } =
                await supabaseAdmin
                    .from('tokens_registry')
                    .upsert(
                        {
                            token_address: tokenAddress,
                            token_name: nft.metadata?.name || tokenAddress,
                            token_symbol: nft.metadata?.symbol || tokenAddress,
                            token_icon: nft.metadata?.image || null,
                            token_type: 'NON_FUNGIBLE',
                            decimals: 0,
                        },
                        {
                            onConflict: 'token_address',
                        }
                    )
                    .select('id')
                    .single()

            if (registryError) {
                console.error(
                    'Error upserting NFT registry:',
                    tokenAddress,
                    registryError
                )
                continue
            }

            // Insert into nfts table
            const { error: nftError } = await supabaseAdmin.from('nfts').upsert(
                {
                    wallet_id: walletId,
                    token_id: tokenAddress,
                    token_registry_id: registryToken.id,
                    serial_number: serialNumber,
                    metadata: nft.metadata || {},
                    last_synced_at: new Date().toISOString(),
                },
                {
                    onConflict: 'wallet_id,token_id,serial_number',
                }
            )

            if (nftError) {
                console.error(
                    'Error syncing NFT:',
                    `${tokenAddress}#${serialNumber}`,
                    nftError
                )
            } else {
                nftCount++
            }
        }

        console.log(`
✅ Sync completed for wallet ${walletAddress}:
   📦 ${fungibleCount} fungible tokens
   💧 ${lpCount} LP tokens  
   🎨 ${nftCount} NFTs
        `)

        return {
            success: true,
            stats: {
                fungibleTokens: fungibleCount,
                lpTokens: lpCount,
                nfts: nftCount,
            },
        }
    } catch (error) {
        console.error('Error in syncWalletTokens:', error)
        return { success: false, error: 'Sync failed' }
    }
}

/**
 * Get token metadata from Hedera using Validation Cloud
 */
export async function getTokenMetadata(tokenId: string) {
    try {
        const validationCloudBaseUrl = getValidationCloudUrl()
        const url = `${validationCloudBaseUrl}/tokens/${tokenId}`

        const response = await fetch(url)

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
