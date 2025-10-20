/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createTokenLookupMap, getHbarPrice } from './saucerSwapService'
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
                )
            `
            )
            .eq('user_id', userId)
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
        const { data, error } = await (
            supabaseAdmin.from('wallets').insert as any
        )({
            user_id: userId,
            wallet_address: walletAddress,
            label: label || 'Sub Wallet',
        })
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
        const { error } = await (supabaseAdmin.from('wallets').update as any)({
            label,
        }).eq('id', walletId)

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
            console.warn(`⚠️ Failed to fetch metadata for token ${tokenId}`)
            return null
        }

        const data = await response.json()
        return {
            name: data.name || tokenId,
            symbol: data.symbol || tokenId,
            decimals: parseInt(data.decimals || '0'),
            type: data.type || 'FUNGIBLE_COMMON', // FUNGIBLE_COMMON or NON_FUNGIBLE_UNIQUE
            metadata: data.metadata, // Base64 encoded metadata (for NFTs)
        }
    } catch (error) {
        console.error(`Error fetching metadata for token ${tokenId}:`, error)
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
        console.log(`📡 Fetching NFT metadata: ${url}`)

        const response = await fetch(url)
        if (!response.ok) {
            console.error(`❌ Failed to fetch NFTs: ${response.status}`)
            return nftMap
        }

        const data = await response.json()
        const nfts = data.nfts || []
        console.log(`📦 Found ${nfts.length} NFTs in response`)

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

                console.log(`✅ NFT ${tokenId} metadata processed`)
            }
        }
    } catch (error) {
        console.error('Error fetching NFTs metadata:', error)
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
        console.log(`📡 Fetching account data: ${accountUrl}`)

        const accountResponse = await fetch(accountUrl)
        if (!accountResponse.ok) {
            const errorText = await accountResponse.text()
            console.error(
                `❌ Hedera API Error (${accountResponse.status}):`,
                errorText
            )
            throw new Error(
                `Failed to fetch account data from Hedera: ${accountResponse.status} - ${errorText}`
            )
        }

        const accountData = await accountResponse.json()

        // Extract HBAR balance (divide by 10^8 to get actual value)
        const hbarBalance = accountData.balance?.balance || 0
        const hbarBalanceActual = hbarBalance / Math.pow(10, 8)
        console.log(`💰 HBAR Balance: ${hbarBalanceActual} HBAR`)

        // Extract all tokens
        const allTokens = accountData.balance?.tokens || []
        console.log(
            `� Found ${allTokens.length} total token balances for wallet ${walletAddress}`
        )

        // Filter out tokens with balance = 0
        const activeTokens = allTokens.filter(
            (token: Record<string, unknown>) => {
                const balance = parseInt((token.balance as string) || '0')
                return balance > 0
            }
        )
        console.log(
            `📊 ${activeTokens.length} tokens with balance > 0 after filtering`
        )

        // ========================================
        // 2. GET TOKEN METADATA FROM SAUCERSWAP (for prices)
        // ========================================
        const tokenLookupMap = await createTokenLookupMap()
        console.log(
            `🔍 Loaded ${tokenLookupMap.size} tokens from SaucerSwap (cached)`
        )

        // ========================================
        // 3. DETECT NFTs AND FETCH PROPER METADATA
        // ========================================
        // First pass: identify which tokens are NFTs
        const nftTokenIds: string[] = []
        const tokenMetadataMap = new Map<string, any>()

        for (const token of activeTokens) {
            const tokenAddress = token.token_id

            // Fetch metadata from Hedera to determine type
            const metadata = await fetchTokenMetadata(
                tokenAddress,
                validationCloudBaseUrl
            )

            if (!metadata) {
                console.warn(
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
        let nftMetadataMap = new Map<string, any>()
        if (nftTokenIds.length > 0) {
            console.log(
                `🎨 Found ${nftTokenIds.length} NFTs, fetching proper metadata...`
            )
            nftMetadataMap = await fetchNFTsMetadata(
                walletAddress,
                validationCloudBaseUrl
            )
            console.log(`✅ Fetched metadata for ${nftMetadataMap.size} NFTs`)
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

            console.log(
                `📋 Token ${tokenAddress}: type="${tokenType}", name="${tokenName}", symbol="${tokenSymbol}"`
            )

            // Get price from SaucerSwap
            const saucerToken = tokenLookupMap.get(tokenAddress)
            const tokenIcon = saucerToken?.icon || null
            const priceUsd = saucerToken?.priceUsd?.toString() || '0'

            // ========================================
            // CATEGORIZE TOKEN TYPE
            // ========================================

            if (tokenType === 'NON_FUNGIBLE_UNIQUE') {
                // This is an NFT - use proper metadata from /nfts endpoint
                console.log(`🎨 NFT detected: ${tokenName} (${tokenAddress})`)

                // Get the proper NFT metadata from the /nfts endpoint
                const nftData = nftMetadataMap.get(tokenAddress)
                let nftMetadata = {}
                let nftImageUrl = tokenIcon // Default to SaucerSwap icon if available
                let serialNumber = 1 // Default serial number

                if (nftData && nftData.decodedMetadata) {
                    console.log(
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
                        console.log(`🖼️ NFT Image found: ${decodedMeta.image}`)
                    } else {
                        console.warn(`⚠️ No image found in NFT metadata`)
                    }

                    // Get serial number if available
                    if (nftData.serial_number) {
                        serialNumber = nftData.serial_number
                    }
                } else {
                    console.warn(
                        `⚠️ No metadata found in /nfts endpoint for ${tokenAddress}`
                    )
                }

                // Upsert NFT token in registry
                // Force update to ensure we always have the latest image
                const { data: registryToken, error: registryError } = await (
                    supabaseAdmin.from('tokens_registry').upsert as any
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
                    console.error(
                        'Error upserting NFT registry:',
                        tokenAddress,
                        registryError
                    )
                    continue
                }

                // Insert into wallet_nfts table
                // Using the serial number from the /nfts endpoint
                const { error: nftError } = await (
                    supabaseAdmin.from('wallet_nfts').upsert as any
                )(
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
                    console.error('Error syncing NFT:', tokenAddress, nftError)
                } else {
                    nftCount++
                    console.log(`✅ Synced NFT: ${tokenName}`)
                }
            } else if (tokenType === 'FUNGIBLE_COMMON') {
                // This is a fungible token - check if it's an LP token
                const isLP = isLiquidityPoolToken(
                    tokenType,
                    tokenName,
                    tokenSymbol
                )
                const finalTokenType = isLP ? 'LP_TOKEN' : 'FUNGIBLE'

                console.log(
                    `💰 ${finalTokenType}: ${tokenSymbol} - ${tokenName} (${tokenAddress})`
                )

                // Upsert token in registry
                const { data: registryToken, error: registryError } = await (
                    supabaseAdmin.from('tokens_registry').upsert as any
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
                    console.error(
                        'Error upserting token registry:',
                        tokenAddress,
                        registryError
                    )
                    continue
                }

                // Insert into appropriate table
                if (isLP) {
                    // Insert into liquidity_pool_tokens
                    const { error: lpTokenError } = await (
                        supabaseAdmin.from('liquidity_pool_tokens')
                            .upsert as any
                    )(
                        {
                            wallet_id: walletId,
                            token_id: registryToken.id,
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
                    const { error: walletTokenError } = await (
                        supabaseAdmin.from('wallet_tokens').upsert as any
                    )(
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
            } else {
                // Unknown token type
                console.warn(
                    `⚠️ Unknown token type "${tokenType}" for ${tokenAddress}. Skipping.`
                )
            }
        }

        // ========================================
        // 4. SAVE HBAR BALANCE TO WALLET
        // ========================================
        console.log(`💎 Updating HBAR Balance: ${hbarBalanceActual}`)

        // Get HBAR price from SaucerSwap
        const hbarPriceResult = await getHbarPrice()
        const hbarPriceUsd = hbarPriceResult.priceUsd || 0
        console.log(`💰 HBAR Price: $${hbarPriceUsd}`)

        const { error: hbarUpdateError } = await (
            supabaseAdmin.from('wallets').update as any
        )({
            hbar_balance: hbarBalanceActual,
            hbar_price_usd: hbarPriceUsd.toString(),
        }).eq('id', walletId)

        if (hbarUpdateError) {
            console.error('Error updating HBAR balance:', hbarUpdateError)
        } else {
            const hbarValueUsd = hbarBalanceActual * hbarPriceUsd
            console.log(
                `✅ HBAR balance saved: ${hbarBalanceActual} HBAR (~$${hbarValueUsd.toFixed(
                    2
                )})`
            )
        }

        console.log(`
✅ Sync completed for wallet ${walletAddress}:
   💎 ${hbarBalanceActual} HBAR (~$${(hbarBalanceActual * hbarPriceUsd).toFixed(
            2
        )})
   📦 ${fungibleCount} fungible tokens
   💧 ${lpCount} LP tokens  
   🎨 ${nftCount} NFTs
        `)

        return {
            success: true,
            stats: {
                hbarBalance: hbarBalanceActual,
                hbarPriceUsd,
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
 * Decode NFT metadata from base64 and fetch the actual metadata JSON
 * NFT metadata is typically stored as base64 encoded IPFS URI
 */
async function getNFTMetadata(metadataBase64: string): Promise<{
    image?: string
    name?: string
    description?: string
    creator?: string
    properties?: Record<string, any>
}> {
    try {
        // Decode base64 metadata
        const metadataUri = Buffer.from(metadataBase64, 'base64').toString(
            'utf-8'
        )
        console.log(`📦 NFT Metadata URI: ${metadataUri}`)

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
            console.error(
                `Failed to fetch NFT metadata from ${metadataUrl}: ${response.status}`
            )
            return {}
        }

        const contentType = response.headers.get('content-type')
        console.log(`📄 Content-Type: ${contentType}`)

        // If it's an image, the metadata field points directly to the image
        if (contentType?.startsWith('image/')) {
            console.log(`🖼️ Direct image link detected: ${metadataUrl}`)
            return {
                image: metadataUrl,
            }
        }

        // Otherwise, it's a JSON with metadata
        const metadata = await response.json()
        console.log(`✅ NFT Metadata JSON:`, JSON.stringify(metadata, null, 2))

        // Convert IPFS image URI to HTTP gateway URL if needed
        let imageUrl = metadata.image
        if (imageUrl && imageUrl.startsWith('ipfs://')) {
            const ipfsHash = imageUrl.replace('ipfs://', '')
            imageUrl = `https://ipfs.io/ipfs/${ipfsHash}`
            console.log(`🖼️ Converted IPFS image to HTTP: ${imageUrl}`)
        }

        if (!imageUrl) {
            console.warn(`⚠️ No 'image' field found in NFT metadata`)
        }

        return {
            image: imageUrl,
            name: metadata.name,
            description: metadata.description,
            creator: metadata.creator,
            properties: metadata.properties || metadata.attributes,
        }
    } catch (error) {
        console.error('Error fetching NFT metadata:', error)
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

        const { error } = await (supabaseAdmin.from('tokens').update as any)({
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
