import { supabaseAdmin } from '@/lib/supabase-admin'
import { createTokenLookupMap, getHbarPrice } from './saucerSwapService'
import {
    getLpTokenData,
    fetchFarmTotals,
    fetchPoolId,
    getLpTokenDataByPoolId,
    getBonzoLendingData,
    isLpToken,
} from './defiService'
import { MAX_WALLETS_PER_USER } from '@/constants/portfolio'
import { createScopedLogger } from '@/lib/logger'

const logger = createScopedLogger('service:portfolioWalletService')


/**
 * Supabase operation types
 */
type InsertFunction<T> = (
    values: T
) => {
    select: () => {
        single: () => Promise<{
            data: T | null
            error: { message: string } | null
        }>
    }
}

type UpsertFunction<T> = (
    values: T,
    options?: { onConflict?: string; ignoreDuplicates?: boolean }
) => {
    select: () => {
        single: () => Promise<{
            data: T | null
            error: { message: string } | null
        }>
        maybeSingle: () => Promise<{
            data: T | null
            error: { message: string } | null
        }>
    }
}

type UpdateFunction<T> = (
    values: Partial<T>
) => {
    eq: (column: string, value: string | number) => Promise<{
        error: { message: string } | null
    }>
}

/**
 * Database table types
 */
interface WalletRow {
    id?: string
    user_id: string
    wallet_address: string
    label?: string
    hbar_balance?: number
    hbar_price_usd?: string
    created_at?: string
    updated_at?: string
}

interface TokenRegistryRow {
    id?: string
    token_address: string
    token_name: string
    token_symbol: string
    token_icon?: string | null
    token_type: string
    decimals: number
    price_usd?: string
    last_price_update?: string
}

interface TokenMetadata {
    tokenAddress?: string
    decimals?: number
    [key: string]: unknown
}

interface NftMetadata {
    name?: string | unknown
    description?: string | unknown
    creator?: string | unknown
    image?: string | unknown
    properties?: Record<string, unknown>
    [key: string]: unknown
}

interface _WalletNftRow {
    wallet_id: string
    token_id: string
    token_registry_id: string
    serial_number: number
    metadata: NftMetadata
    last_synced_at: string
}

interface _LpTokenRow {
    wallet_id: string
    token_id: string
    balance: string
    pool_metadata: TokenMetadata
    last_synced_at: string
}

interface _WalletTokenRow {
    wallet_id: string
    token_id: string
    balance: string
    last_synced_at: string
}

interface DefiMetadata {
    [key: string]: unknown
}

interface _WalletDefiRow {
    wallet_id: string
    token_id: string
    position_type: string
    balance: string
    value_usd: string
    defi_metadata: DefiMetadata
    last_synced_at: string
}

/**
 * Get Validation Cloud Mirror Node URL
 * Uses environment variables for API key and base URL
 */
function getValidationCloudUrl(): string {
    const apiKey = process.env.VALIDATION_CLOUD_API_KEY
    const baseUrl =
        process.env.VALIDATION_CLOUD_BASE_URL ??
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
export async function getUserWallets(
    userId: string
): Promise<Record<string, unknown>[]> {
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
                wallet_nfts (
                    *,
                    tokens_registry (*)
                ),
                wallet_defi (
                    *,
                    tokens_registry (*)
                )
            `
            )
            .eq('user_id', userId)
            .order('created_at', { ascending: true })

        if (error) {
            logger.error('Error fetching wallets:', error)
            return []
        }

        return wallets || []
    } catch (error) {
        logger.error('Error in getUserWallets:', error)
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
            logger.error('Error counting wallets:', countError)
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
        const { data, error } = await (
            supabaseAdmin.from('wallets').insert as InsertFunction<WalletRow>
        )({
            user_id: userId,
            wallet_address: walletAddress,
            label: label ?? 'Sub Wallet',
        })
            .select()
            .single()

        if (error) {
            logger.error('Error adding wallet:', error)
            return { success: false, error: 'Failed to add wallet' }
        }

        return { success: true, wallet: data }
    } catch (error) {
        logger.error('Error in addWallet:', error)
        return { success: false, error: 'Database error' }
    }
}

/**
 * Update wallet label
 * Uses supabaseAdmin to bypass RLS when called from API routes
 */
export async function updateWalletLabel(walletId: string, label: string) {
    try {
        const { error } = await (supabaseAdmin.from('wallets').update as UpdateFunction<WalletRow>)({
            label,
        }).eq('id', walletId)

        if (error) {
            logger.error('Error updating wallet:', error)
            return { success: false, error: 'Failed to update wallet' }
        }

        return { success: true }
    } catch (error) {
        logger.error('Error in updateWalletLabel:', error)
        return { success: false, error: 'Database error' }
    }
}

/**
 * Delete a wallet
 * Uses supabaseAdmin to bypass RLS when called from API routes
 */
export async function deleteWallet(walletId: string) {
    try {
        const { error } = await supabaseAdmin
            .from('wallets')
            .delete()
            .eq('id', walletId)

        if (error) {
            logger.error('Error deleting wallet:', error)
            return { success: false, error: 'Failed to delete wallet' }
        }

        return { success: true }
    } catch (error) {
        logger.error('Error in deleteWallet:', error)
        return { success: false, error: 'Database error' }
    }
}

/**
 * Check if a token is a liquidity pool token
 * LP tokens on SaucerSwap/Hedera have names starting with "ssLP"
 */
function isLiquidityPoolToken(
    tokenType: string,
    tokenName: string,
    tokenSymbol?: string
): boolean {
    // Must be fungible token
    if (tokenType !== 'FUNGIBLE_COMMON') {
        return false
    }

    // Check if name starts with ssLP
    return (
        tokenName.startsWith('ssLP') ||
        (tokenSymbol?.startsWith('ssLP') ?? false)
    )
}

/**
 * Fetch token metadata from Hedera Validation Cloud
 */
async function fetchTokenMetadata(tokenId: string, baseUrl: string) {
    try {
        const url = `${baseUrl}/tokens/${tokenId}`
        const response = await fetch(url)

        if (!response.ok) {
            logger.warn(`⚠️ Failed to fetch metadata for token ${tokenId}`)
            return null
        }

        const data = await response.json()
        return {
            name: data.name ?? tokenId,
            symbol: data.symbol ?? tokenId,
            decimals: parseInt(data.decimals ?? '0'),
            type: data.type ?? 'FUNGIBLE_COMMON', // FUNGIBLE_COMMON or NON_FUNGIBLE_UNIQUE
            metadata: data.metadata, // Base64 encoded metadata (for NFTs)
        }
    } catch (error) {
        logger.error(`Error fetching metadata for token ${tokenId}:`, error)
        return null
    }
}

/**
 * Fetch NFT metadata from the /accounts/{id}/nfts endpoint
 * This endpoint provides proper NFT metadata including serial numbers and correct IPFS links
 * Returns a Map with token_id as key and NFT data as value
 */
async function fetchNFTsMetadata(
    walletAddress: string,
    baseUrl: string
): Promise<Map<string, Record<string, unknown>>> {
    const nftMap = new Map<string, Record<string, unknown>>()

    try {
        const url = `${baseUrl}/accounts/${walletAddress}/nfts`
        logger.info(`📡 Fetching NFT metadata: ${url}`)

        const response = await fetch(url)
        if (!response.ok) {
            logger.error(`❌ Failed to fetch NFTs: ${response.status}`)
            return nftMap
        }

        const data = await response.json()
        const nfts = data.nfts ?? []
        logger.info(`📦 Found ${nfts.length} NFTs in response`)

        for (const nft of nfts) {
            const tokenId = nft.token_id
            const metadata = nft.metadata // This should be the correct Base64 metadata

            if (metadata) {
                // Decode and fetch the actual metadata
                const decodedMetadata = await getNFTMetadata(metadata)

                nftMap.set(tokenId, {
                    ...nft,
                    decodedMetadata,
                })

                logger.info(`✅ NFT ${tokenId} metadata processed`)
            }
        }
    } catch (error) {
        logger.error('Error fetching NFTs metadata:', error)
    }

    return nftMap
}

/**
 * Sync all assets for a wallet from Hedera Validation Cloud
 * Uses the new unified endpoint: /accounts/{accountId}?transactions=false
 * This endpoint returns HBAR balance and all tokens (fungible, NFTs, LPs) in one call
 * Uses supabaseAdmin to bypass RLS when called from API routes
 */
export async function syncWalletTokens(
    walletId: string,
    walletAddress: string
) {
    try {
        const validationCloudBaseUrl = getValidationCloudUrl()

        // ========================================
        // 1. FETCH ACCOUNT DATA (HBAR + ALL TOKENS)
        // ========================================
        const accountUrl = `${validationCloudBaseUrl}/accounts/${walletAddress}?transactions=false`
        logger.info(`📡 Fetching account data: ${accountUrl}`)

        const accountResponse = await fetch(accountUrl)
        if (!accountResponse.ok) {
            const errorText = await accountResponse.text()
            logger.error(
                `❌ Hedera API Error (${accountResponse.status}):`,
                errorText
            )
            throw new Error(
                `Failed to fetch account data from Hedera: ${accountResponse.status} - ${errorText}`
            )
        }

        const accountData = await accountResponse.json()

        // Extract HBAR balance (divide by 10^8 to get actual value)
        const hbarBalance = accountData.balance?.balance ?? 0
        const hbarBalanceActual = hbarBalance / Math.pow(10, 8)
        logger.info(`💰 HBAR Balance: ${hbarBalanceActual} HBAR`)

        // Extract all tokens
        const allTokens = accountData.balance?.tokens ?? []
        logger.info(
            `� Found ${allTokens.length} total token balances for wallet ${walletAddress}`
        )

        // Filter out tokens with balance = 0
        const activeTokens = allTokens.filter(
            (token: Record<string, unknown>) => {
                const balance = parseInt((token.balance as string) || '0')
                return balance > 0
            }
        )
        logger.info(
            `📊 ${activeTokens.length} tokens with balance > 0 after filtering`
        )

        // ========================================
        // 2. GET TOKEN METADATA FROM SAUCERSWAP (for prices)
        // ========================================
        const tokenLookupMap = await createTokenLookupMap()
        logger.info(
            `🔍 Loaded ${tokenLookupMap.size} tokens from SaucerSwap (cached)`
        )

        // ========================================
        // 3. DETECT NFTs AND FETCH PROPER METADATA
        // ========================================
        // First pass: identify which tokens are NFTs
        const nftTokenIds: string[] = []

        interface TokenMetadataResponse {
            name: string
            symbol: string
            decimals: number
            type: string
            metadata?: string
        }

        const tokenMetadataMap = new Map<string, TokenMetadataResponse>()

        for (const token of activeTokens) {
            const tokenAddress = token.token_id

            // Fetch metadata from Hedera to determine type
            const metadata = await fetchTokenMetadata(
                tokenAddress,
                validationCloudBaseUrl
            )

            if (!metadata) {
                logger.warn(
                    `⚠️ Skipping token ${tokenAddress} - could not fetch metadata`
                )
                continue
            }

            tokenMetadataMap.set(tokenAddress, metadata)

            // Collect NFT token IDs for batch processing
            if (metadata.type === 'NON_FUNGIBLE_UNIQUE') {
                nftTokenIds.push(tokenAddress)
            }
        }

        // If there are NFTs, fetch proper metadata from /nfts endpoint
        let nftMetadataMap = new Map<string, Record<string, unknown>>()
        if (nftTokenIds.length > 0) {
            logger.info(
                `🎨 Found ${nftTokenIds.length} NFTs, fetching proper metadata...`
            )
            nftMetadataMap = await fetchNFTsMetadata(
                walletAddress,
                validationCloudBaseUrl
            )
            logger.info(`✅ Fetched metadata for ${nftMetadataMap.size} NFTs`)
        }

        // ========================================
        // 4. PROCESS EACH TOKEN WITH CORRECT METADATA
        // ========================================
        let fungibleCount = 0
        let lpCount = 0
        let nftCount = 0

        for (const token of activeTokens) {
            const tokenAddress = token.token_id
            const metadata = tokenMetadataMap.get(tokenAddress)

            if (!metadata) {
                continue
            }

            const tokenType = metadata.type
            const tokenName = metadata.name
            const tokenSymbol = metadata.symbol
            const decimals = metadata.decimals

            // Skip HBAR token if it appears in the tokens list (HBAR is handled separately)
            // HBAR native token should never appear here, but check just in case
            // Also skip any token that claims to be HBAR/Hedera to avoid duplicates
            if (
                tokenAddress === 'HBAR' ||
                tokenAddress === '0.0.0' ||
                tokenSymbol === 'HBAR' ||
                tokenName === 'Hedera'
            ) {
                logger.info(
                    `⏭️ Skipping ${tokenName} (${tokenSymbol}) - HBAR is handled separately`
                )
                continue
            }

            logger.info(
                `📋 Token ${tokenAddress}: type="${tokenType}", name="${tokenName}", symbol="${tokenSymbol}"`
            )

            // Get price from SaucerSwap
            const saucerToken = tokenLookupMap.get(tokenAddress)
            const tokenIcon = saucerToken?.icon ?? null
            const priceUsd = saucerToken?.priceUsd?.toString() ?? '0'

            // ========================================
            // CATEGORIZE TOKEN TYPE
            // ========================================

            if (tokenType === 'NON_FUNGIBLE_UNIQUE') {
                // This is an NFT - use proper metadata from /nfts endpoint
                logger.info(`🎨 NFT detected: ${tokenName} (${tokenAddress})`)

                // Get the proper NFT metadata from the /nfts endpoint
                const nftData = nftMetadataMap.get(tokenAddress)
                let nftMetadata = {}
                let nftImageUrl = tokenIcon // Default to SaucerSwap icon if available
                let serialNumber = 1 // Default serial number

                if (nftData?.decodedMetadata) {
                    logger.info(
                        `✅ Using proper NFT metadata from /nfts endpoint`
                    )
                    const decodedMeta = nftData.decodedMetadata

                    nftMetadata = {
                        name: decodedMeta.name,
                        description: decodedMeta.description,
                        creator: decodedMeta.creator,
                        properties: decodedMeta.properties,
                        image: decodedMeta.image,
                    }

                    // Use the actual NFT image if available
                    if (decodedMeta.image) {
                        nftImageUrl = decodedMeta.image
                        logger.info(`🖼️ NFT Image found: ${decodedMeta.image}`)
                    } else {
                        logger.warn(`⚠️ No image found in NFT metadata`)
                    }

                    // Get serial number if available
                    if (nftData.serial_number) {
                        serialNumber = nftData.serial_number
                    }
                } else {
                    logger.warn(
                        `⚠️ No metadata found in /nfts endpoint for ${tokenAddress}`
                    )
                }

                // Upsert NFT token in registry
                // Force update to ensure we always have the latest image
                const { data: registryToken, error: registryError } = await (
                    supabaseAdmin.from('tokens_registry').upsert as UpsertFunction<TokenRegistryRow>
                )(
                    {
                        token_address: tokenAddress,
                        token_name: tokenName,
                        token_symbol: tokenSymbol,
                        token_icon: nftImageUrl, // Use actual NFT image
                        token_type: 'NON_FUNGIBLE',
                        decimals: 0,
                    },
                    {
                        onConflict: 'token_address',
                        ignoreDuplicates: false, // Always update existing records
                    }
                )
                    .select('id')
                    .single()

                if (registryError) {
                    logger.error(
                        'Error upserting NFT registry:',
                        tokenAddress,
                        registryError
                    )
                    continue
                }

                // Insert into wallet_nfts table
                // Using the serial number from the /nfts endpoint
                const { error: nftError } = await supabaseAdmin
                    .from('wallet_nfts')
                    .upsert(
                        {
                            wallet_id: walletId,
                            token_id: tokenAddress,
                            token_registry_id: registryToken.id,
                            serial_number: serialNumber, // Actual serial number from API
                            metadata: nftMetadata,
                            last_synced_at: new Date().toISOString(),
                        },
                        {
                            onConflict: 'wallet_id,token_id,serial_number',
                            ignoreDuplicates: false, // Always update existing records with latest metadata
                        }
                    )

                if (nftError) {
                    logger.error('Error syncing NFT:', tokenAddress, nftError)
                } else {
                    nftCount++
                    logger.info(`✅ Synced NFT: ${tokenName}`)
                }
            } else if (tokenType === 'FUNGIBLE_COMMON') {
                // This is a fungible token - check if it's an LP token
                const isLP = isLiquidityPoolToken(
                    tokenType,
                    tokenName,
                    tokenSymbol
                )
                const finalTokenType = isLP ? 'LP_TOKEN' : 'FUNGIBLE'

                logger.info(
                    `💰 ${finalTokenType}: ${tokenSymbol} - ${tokenName} (${tokenAddress})`
                )

                // Upsert token in registry
                const { data: registryToken, error: registryError } = await (
                    supabaseAdmin.from('tokens_registry').upsert as UpsertFunction<TokenRegistryRow>
                )(
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
                        ignoreDuplicates: false, // Always update existing records
                    }
                )
                    .select('id')
                    .single()

                if (registryError) {
                    logger.error(
                        'Error upserting token registry:',
                        tokenAddress,
                        registryError
                    )
                    continue
                }

                // Insert into appropriate table
                if (isLP) {
                    // Insert into liquidity_pool_tokens
                    const { error: lpTokenError } = await supabaseAdmin
                        .from('liquidity_pool_tokens')
                        .upsert(
                            {
                                wallet_id: walletId,
                                token_id: registryToken.id as string,
                                balance: token.balance.toString(),
                                pool_metadata: {
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
                        logger.error(
                            'Error syncing LP token:',
                            tokenAddress,
                            lpTokenError
                        )
                    } else {
                        lpCount++
                        logger.info(`✅ Synced LP token: ${tokenSymbol}`)
                    }
                } else {
                    // Insert into wallet_tokens
                    const { error: walletTokenError } = await supabaseAdmin
                        .from('wallet_tokens')
                        .upsert(
                            {
                                wallet_id: walletId,
                                token_id: registryToken.id as string,
                                balance: token.balance.toString(),
                                last_synced_at: new Date().toISOString(),
                            },
                            {
                                onConflict: 'wallet_id,token_id',
                            }
                        )

                    if (walletTokenError) {
                        logger.error(
                            'Error syncing fungible token:',
                            tokenAddress,
                            walletTokenError
                        )
                    } else {
                        fungibleCount++
                        logger.info(`✅ Synced fungible token: ${tokenSymbol}`)
                    }
                }
            } else {
                // Unknown token type
                logger.warn(
                    `⚠️ Unknown token type "${tokenType}" for ${tokenAddress}. Skipping.`
                )
            }
        }

        // ========================================
        // 5. SYNC DEFI POSITIONS
        // ========================================
        logger.info(`\n💰 Starting DeFi positions sync...`)
        let defiCount = 0

        // 5a. SaucerSwap V1 Pools (from LP tokens already processed)
        logger.info(`\n🔵 Syncing SaucerSwap V1 Pools...`)
        const lpTokens = activeTokens.filter((token: Record<string, unknown>) => {
            const metadata = tokenMetadataMap.get(token.token_id as string)
            return metadata && isLpToken(metadata.name)
        })

        for (const lpToken of lpTokens) {
            const tokenAddress = lpToken.token_id
            const balance = lpToken.balance
            const metadata = tokenMetadataMap.get(tokenAddress)

            if (!metadata) continue

            try {
                // Get LP pool data from SaucerSwap
                const lpData = await getLpTokenData(tokenAddress)

                if (lpData) {
                    const poolValue =
                        Number(balance) *
                        Number(lpData.lpToken.priceUsd) *
                        Math.pow(10, -lpData.lpToken.decimals)

                    // Get or create token registry entry for this LP token
                    const { data: registryToken, error: registryError } =
                        await (
                            supabaseAdmin.from('tokens_registry').upsert as UpsertFunction<TokenRegistryRow>
                        )(
                            {
                                token_address: tokenAddress,
                                token_name: lpData.lpToken.name,
                                token_symbol: lpData.lpToken.symbol,
                                token_type: 'LP_TOKEN',
                                decimals: lpData.lpToken.decimals,
                                price_usd: lpData.lpToken.priceUsd,
                                last_price_update: new Date().toISOString(),
                            },
                            {
                                onConflict: 'token_address',
                                ignoreDuplicates: false,
                            }
                        )
                            .select('id')
                            .single()

                    if (registryError) {
                        logger.error(
                            `Error creating registry for LP token ${tokenAddress}:`,
                            registryError
                        )
                        continue
                    }

                    // Calculate user's share of the pool
                    const userLpBalance = parseFloat(balance.toString())
                    const totalLpSupply = parseFloat(lpData.lpTokenReserve)
                    const userShareRatio = userLpBalance / totalLpSupply

                    // Calculate amounts of each token the user has supplied
                    const tokenAReserve = parseFloat(lpData.tokenReserveA)
                    const tokenBReserve = parseFloat(lpData.tokenReserveB)
                    const userTokenAAmount = tokenAReserve * userShareRatio
                    const userTokenBAmount = tokenBReserve * userShareRatio

                    // Normalize amounts by decimals for display
                    const tokenADecimals = lpData.tokenA.decimals
                    const tokenBDecimals = lpData.tokenB.decimals
                    const userTokenADisplay =
                        userTokenAAmount / Math.pow(10, tokenADecimals)
                    const userTokenBDisplay =
                        userTokenBAmount / Math.pow(10, tokenBDecimals)

                    // Save DeFi position
                    const { error: defiError } = await supabaseAdmin
                        .from('wallet_defi')
                        .upsert(
                            {
                                wallet_id: walletId,
                                token_id: registryToken.id as string,
                                position_type: 'SAUCERSWAP_V1_POOL',
                                balance: balance.toString(),
                                value_usd: poolValue.toString(),
                                defi_metadata: {
                                    poolId: lpData.id,
                                    poolName: `${lpData.tokenA.symbol}/${lpData.tokenB.symbol}`,
                                    lpTokenAddress: tokenAddress,
                                    token0Symbol: lpData.tokenA.symbol,
                                    token1Symbol: lpData.tokenB.symbol,
                                    token0Amount: userTokenADisplay.toString(),
                                    token1Amount: userTokenBDisplay.toString(),
                                    tokenA: {
                                        id: lpData.tokenA.id,
                                        symbol: lpData.tokenA.symbol,
                                        priceUsd: lpData.tokenA.priceUsd,
                                        decimals: tokenADecimals,
                                        userAmount: userTokenADisplay.toString(),
                                    },
                                    tokenB: {
                                        id: lpData.tokenB.id,
                                        symbol: lpData.tokenB.symbol,
                                        priceUsd: lpData.tokenB.priceUsd,
                                        decimals: tokenBDecimals,
                                        userAmount: userTokenBDisplay.toString(),
                                    },
                                },
                                last_synced_at: new Date().toISOString(),
                            },
                            {
                                onConflict: 'wallet_id,position_type,token_id',
                            }
                        )

                    if (defiError) {
                        logger.error(
                            `Error syncing LP pool ${tokenAddress}:`,
                            defiError
                        )
                    } else {
                        defiCount++
                        logger.info(
                            `✅ Synced SaucerSwap V1 Pool: ${
                                lpData.lpToken.symbol
                            } ($${poolValue.toFixed(2)})`
                        )
                    }
                }
            } catch (error) {
                logger.error(
                    `Error processing LP token ${tokenAddress}:`,
                    error
                )
            }
        }

        // 5b. SaucerSwap V1 Farms
        logger.info(`\n🌾 Syncing SaucerSwap V1 Farms...`)
        try {
            const farms = await fetchFarmTotals(walletAddress)

            for (const farm of farms) {
                try {
                    const poolId = await fetchPoolId(farm.id)
                    if (!poolId) continue

                    const lpData = await getLpTokenDataByPoolId(poolId)
                    if (!lpData) continue

                    const farmValue =
                        Number(farm.total) *
                        Number(lpData.lpToken.priceUsd) *
                        1e-8

                    // Get or create token registry entry
                    const { data: registryToken, error: registryError } =
                        await (
                            supabaseAdmin.from('tokens_registry').upsert as UpsertFunction<TokenRegistryRow>
                        )(
                            {
                                token_address: lpData.lpToken.id,
                                token_name: lpData.lpToken.name,
                                token_symbol: lpData.lpToken.symbol,
                                token_type: 'LP_TOKEN',
                                decimals: lpData.lpToken.decimals,
                                price_usd: lpData.lpToken.priceUsd,
                                last_price_update: new Date().toISOString(),
                            },
                            {
                                onConflict: 'token_address',
                                ignoreDuplicates: false,
                            }
                        )
                            .select('id')
                            .single()

                    if (registryError) {
                        logger.error(
                            `Error creating registry for farm LP token:`,
                            registryError
                        )
                        continue
                    }

                    // Calculate user's share of the pool for farms
                    const userLpBalance = parseFloat(farm.total)
                    const totalLpSupply = parseFloat(lpData.lpTokenReserve)
                    const userShareRatio = userLpBalance / totalLpSupply

                    // Calculate amounts of each token the user has staked
                    const tokenAReserve = parseFloat(lpData.tokenReserveA)
                    const tokenBReserve = parseFloat(lpData.tokenReserveB)
                    const userTokenAAmount = tokenAReserve * userShareRatio
                    const userTokenBAmount = tokenBReserve * userShareRatio

                    // Normalize amounts by decimals for display
                    const tokenADecimals = lpData.tokenA.decimals
                    const tokenBDecimals = lpData.tokenB.decimals
                    const userTokenADisplay =
                        userTokenAAmount / Math.pow(10, tokenADecimals)
                    const userTokenBDisplay =
                        userTokenBAmount / Math.pow(10, tokenBDecimals)

                    // Save farm position
                    const { error: farmError } = await supabaseAdmin
                        .from('wallet_defi')
                        .upsert(
                            {
                                wallet_id: walletId,
                                token_id: registryToken.id as string,
                                position_type: 'SAUCERSWAP_V1_FARM',
                                balance: farm.total,
                                value_usd: farmValue.toString(),
                                defi_metadata: {
                                    farmId: farm.id,
                                    farmName: `${lpData.tokenA.symbol}/${lpData.tokenB.symbol}`,
                                    poolId: poolId,
                                    lpTokenAddress: lpData.lpToken.id,
                                    stakedAmount: farm.total,
                                    token0Symbol: lpData.tokenA.symbol,
                                    token1Symbol: lpData.tokenB.symbol,
                                    token0Amount: userTokenADisplay.toString(),
                                    token1Amount: userTokenBDisplay.toString(),
                                    tokenA: {
                                        id: lpData.tokenA.id,
                                        symbol: lpData.tokenA.symbol,
                                        priceUsd: lpData.tokenA.priceUsd,
                                        decimals: tokenADecimals,
                                        userAmount: userTokenADisplay.toString(),
                                    },
                                    tokenB: {
                                        id: lpData.tokenB.id,
                                        symbol: lpData.tokenB.symbol,
                                        priceUsd: lpData.tokenB.priceUsd,
                                        decimals: tokenBDecimals,
                                        userAmount: userTokenBDisplay.toString(),
                                    },
                                },
                                last_synced_at: new Date().toISOString(),
                            },
                            {
                                onConflict: 'wallet_id,position_type,token_id',
                            }
                        )

                    if (farmError) {
                        logger.error(
                            `Error syncing farm ${farm.id}:`,
                            farmError
                        )
                    } else {
                        defiCount++
                        logger.info(
                            `✅ Synced SaucerSwap V1 Farm: ${
                                lpData.lpToken.symbol
                            } ($${farmValue.toFixed(2)})`
                        )
                    }
                } catch (error) {
                    logger.error(`Error processing farm ${farm.id}:`, error)
                }
            }
        } catch (error) {
            logger.error('Error fetching farms:', error)
        }

        // 5c. Bonzo Finance Lending
        logger.info(`\n🏦 Syncing Bonzo Finance Lending...`)
        try {
            const bonzoData = await getBonzoLendingData(walletAddress)

            if (bonzoData && bonzoData.positions.length > 0) {
                for (const position of bonzoData.positions) {
                    try {
                        // Get or create token registry entry
                        const { data: registryToken, error: registryError } =
                            await (
                                supabaseAdmin.from('tokens_registry')
                                    .upsert as UpsertFunction<TokenRegistryRow>
                            )(
                                {
                                    token_address: position.tokenId,
                                    token_name: position.asset,
                                    token_symbol: position.asset,
                                    token_type: 'FUNGIBLE',
                                    decimals: 0,
                                    last_price_update: new Date().toISOString(),
                                },
                                {
                                    onConflict: 'token_address',
                                    ignoreDuplicates: false,
                                }
                            )
                                .select('id')
                                .single()

                        if (registryError) {
                            logger.error(
                                `Error creating registry for Bonzo token:`,
                                registryError
                            )
                            continue
                        }

                        // Save lending position
                        const { error: bonzoError } = await supabaseAdmin
                            .from('wallet_defi')
                            .upsert(
                                {
                                    wallet_id: walletId,
                                    token_id: registryToken.id as string,
                                    position_type: 'BONZO_LENDING',
                                    balance: position.tokenAmount,
                                    value_usd: position.valueUsd
                                        .replace('$', '')
                                        .replace(',', ''),
                                    defi_metadata: {
                                        asset: position.asset,
                                        apy: position.apy,
                                        tokenId: position.tokenId,
                                        tokenAmount: position.tokenAmount,
                                    },
                                    last_synced_at: new Date().toISOString(),
                                },
                                {
                                    onConflict: 'wallet_id,position_type,token_id',
                                }
                            )

                        if (bonzoError) {
                            logger.error(
                                `Error syncing Bonzo position ${position.asset}:`,
                                bonzoError
                            )
                        } else {
                            defiCount++
                            logger.info(
                                `✅ Synced Bonzo Lending: ${
                                    position.asset
                                } (${position.apy.toFixed(2)}% APY)`
                            )
                        }
                    } catch (error) {
                        logger.error(
                            `Error processing Bonzo position ${position.asset}:`,
                            error
                        )
                    }
                }
            }
        } catch (error) {
            logger.error('Error fetching Bonzo data:', error)
        }

        logger.info(`✅ DeFi sync completed: ${defiCount} positions synced\n`)

        // ========================================
        // 4. SAVE HBAR BALANCE TO tokens_registry and wallet_tokens
        // ========================================
        logger.info(
            `💎 Updating HBAR Balance: ${hbarBalanceActual} HBAR (raw: ${hbarBalance} tinybars)`
        )

        // Get HBAR price from SaucerSwap
        const hbarPriceResult = await getHbarPrice()
        const hbarPriceUsd = hbarPriceResult.priceUsd ?? 0
        logger.info(`💰 HBAR Price: $${hbarPriceUsd}`)

        // Get or create HBAR token registry entry
        const { data: hbarRegistry, error: hbarRegistryError } = await (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            supabaseAdmin.from('tokens_registry').upsert as any
        )(
            {
                token_address: 'HBAR',
                token_name: 'Hedera',
                token_symbol: 'HBAR',
                token_icon: '/hbar.webp',
                decimals: 8,
                token_type: 'FUNGIBLE',
                price_usd: hbarPriceUsd.toString(),
                last_price_update: new Date().toISOString(),
            },
            {
                onConflict: 'token_address',
                ignoreDuplicates: false,
            }
        )
            .select('id')
            .single()

        if (hbarRegistryError) {
            logger.error('Error upserting HBAR registry:', hbarRegistryError)
        } else {
            // Save HBAR balance in wallet_tokens (store raw balance in tinybars, not normalized)
            const { error: hbarWalletTokenError } = await (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                supabaseAdmin.from('wallet_tokens').upsert as any
            )(
                {
                    wallet_id: walletId,
                    token_id: hbarRegistry.id,
                    balance: hbarBalance.toString(), // Store tinybars, not HBAR
                    last_synced_at: new Date().toISOString(),
                },
                {
                    onConflict: 'wallet_id,token_id',
                    ignoreDuplicates: false,
                }
            )

            if (hbarWalletTokenError) {
                logger.error(
                    'Error updating HBAR in wallet_tokens:',
                    hbarWalletTokenError
                )
            } else {
                const hbarValueUsd = hbarBalanceActual * hbarPriceUsd
                logger.info(
                    `✅ HBAR balance saved: ${hbarBalanceActual} HBAR (${hbarBalance} tinybars) (~$${hbarValueUsd.toFixed(
                        2
                    )})`
                )
            }
        }

        logger.info(`
✅ Sync completed for wallet ${walletAddress}:
   💎 ${hbarBalanceActual} HBAR (~$${(hbarBalanceActual * hbarPriceUsd).toFixed(
            2
        )})
   📦 ${fungibleCount} fungible tokens
   💧 ${lpCount} LP tokens  
   🎨 ${nftCount} NFTs
   💰 ${defiCount} DeFi positions
        `)

        return {
            success: true,
            stats: {
                hbarBalance: hbarBalanceActual,
                hbarPriceUsd,
                fungibleTokens: fungibleCount,
                lpTokens: lpCount,
                nfts: nftCount,
                defiPositions: defiCount,
            },
        }
    } catch (error) {
        logger.error('Error in syncWalletTokens:', error)
        return { success: false, error: 'Sync failed' }
    }
}

/**
 * Decode NFT metadata from base64 and fetch the actual metadata JSON
 * NFT metadata is typically stored as base64 encoded IPFS URI
 */
async function getNFTMetadata(metadataBase64: string): Promise<{
    image?: string
    name?: string
    description?: string
    creator?: string
    properties?: Record<string, unknown>
}> {
    try {
        // Decode base64 metadata
        const metadataUri = Buffer.from(metadataBase64, 'base64').toString(
            'utf-8'
        )
        logger.info(`📦 NFT Metadata URI: ${metadataUri}`)

        // Check if metadata is a direct IPFS image link
        // Some NFTs store the image directly in metadata, others store a JSON with metadata
        let metadataUrl = metadataUri
        if (metadataUri.startsWith('ipfs://')) {
            const ipfsHash = metadataUri.replace('ipfs://', '')
            metadataUrl = `https://ipfs.io/ipfs/${ipfsHash}`
        }

        // Fetch the metadata
        const response = await fetch(metadataUrl)
        if (!response.ok) {
            logger.error(
                `Failed to fetch NFT metadata from ${metadataUrl}: ${response.status}`
            )
            return {}
        }

        const contentType = response.headers.get('content-type')
        logger.info(`📄 Content-Type: ${contentType}`)

        // If it's an image, the metadata field points directly to the image
        if (contentType?.startsWith('image/')) {
            logger.info(`🖼️ Direct image link detected: ${metadataUrl}`)
            return {
                image: metadataUrl,
            }
        }

        // Otherwise, it's a JSON with metadata
        const metadata = await response.json()
        logger.info(`✅ NFT Metadata JSON:`, JSON.stringify(metadata, null, 2))

        // Convert IPFS image URI to HTTP gateway URL if needed
        let imageUrl = metadata.image
        if (imageUrl?.startsWith('ipfs://')) {
            const ipfsHash = imageUrl.replace('ipfs://', '')
            imageUrl = `https://ipfs.io/ipfs/${ipfsHash}`
            logger.info(`🖼️ Converted IPFS image to HTTP: ${imageUrl}`)
        }

        if (!imageUrl) {
            logger.warn(`⚠️ No 'image' field found in NFT metadata`)
        }

        return {
            image: imageUrl,
            name: metadata.name,
            description: metadata.description,
            creator: metadata.creator,
            properties: metadata.properties ?? metadata.attributes,
        }
    } catch (error) {
        logger.error('Error fetching NFT metadata:', error)
        return {}
    }
}

/**
 * Get token metadata from Hedera using Validation Cloud
 * Uses the /tokens/{tokenId} endpoint to get name, symbol, decimals, and type
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
                type: data.type, // FUNGIBLE_COMMON or NON_FUNGIBLE_UNIQUE
                totalSupply: data.total_supply,
            },
        }
    } catch (error) {
        logger.error('Error fetching token metadata:', error)
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

        interface TokenRow {
            token_name?: string
            token_symbol?: string
            decimals?: number
        }

        const { error } = await (supabaseAdmin.from('tokens').update as UpdateFunction<TokenRow>)({
            token_name: metadataResult.metadata.name,
            token_symbol: metadataResult.metadata.symbol,
            decimals: metadataResult.metadata.decimals,
        })
            .eq('wallet_id', walletId)
            .eq('token_address', tokenAddress)

        if (error) {
            logger.error('Error updating token metadata:', error)
            return { success: false, error: 'Failed to update metadata' }
        }

        return { success: true }
    } catch (error) {
        logger.error('Error in updateTokenMetadata:', error)
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
            const tokens = Array.isArray(wallet.tokens) ? wallet.tokens : []
            for (const token of tokens) {
                const balance = parseFloat(token.balance ?? '0')
                const price = parseFloat(token.price_usd ?? '0')
                const decimals = token.decimals ?? 0
                const normalizedBalance = balance / Math.pow(10, decimals)
                totalValue += normalizedBalance * price
            }
        }

        return totalValue
    } catch (error) {
        logger.error('Error calculating portfolio value:', error)
        return 0
    }
}
