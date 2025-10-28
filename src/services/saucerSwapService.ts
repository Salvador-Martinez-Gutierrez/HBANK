import { createScopedLogger } from '@/lib/logger'

const logger = createScopedLogger('service:saucerSwapService')

/**
 * SaucerSwap Service
 * Integrates with SaucerSwap API to fetch token prices and metadata for Hedera mainnet
 */

// Environment variables - will fail at runtime if not set
const SAUCERSWAP_API = process.env.SAUCERSWAP_API_URL ?? ''
const SAUCERSWAP_API_KEY = process.env.SAUCERSWAP_API_KEY ?? ''

interface SaucerSwapToken {
    id: string
    symbol: string
    name: string
    decimals: number
    icon?: string
    priceUsd?: number
    dueDiligenceComplete?: boolean
    isFeeOnTransferToken?: boolean
}

// In-memory cache for tokens to minimize API calls
let cachedTokensMap: Map<string, SaucerSwapToken> | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes cache (increased to avoid 429 errors)

// Pending request promise - to avoid multiple simultaneous API calls
let pendingRequest: Promise<{
    success: boolean
    tokens?: SaucerSwapToken[]
    error?: string
}> | null = null

interface TokenPrice {
    tokenId: string
    priceUsd: number
    timestamp: number
}

/**
 * Get all tokens from SaucerSwap with caching
 * This is the main function that should be called once per sync operation
 * Implements request coalescing to avoid multiple simultaneous API calls
 */
export async function getAllSaucerSwapTokens(): Promise<{
    success: boolean
    tokens?: SaucerSwapToken[]
    error?: string
}> {
    // Check if cache is still valid
    const now = Date.now()
    if (cachedTokensMap && now - cacheTimestamp < CACHE_TTL) {
        const cacheAge = Math.round((now - cacheTimestamp) / 1000)
        logger.info(
            `🔄 Using cached SaucerSwap tokens (age: ${cacheAge}s, TTL: ${
                CACHE_TTL / 1000
            }s)`
        )
        return {
            success: true,
            tokens: Array.from(cachedTokensMap.values()),
        }
    }

    // 🚀 REQUEST COALESCING: If there's already a pending request, wait for it
    // This ensures that multiple simultaneous calls share the same API request
    if (pendingRequest) {
        logger.info('⏳ Request already in progress, waiting for result...')
        return pendingRequest
    }

    logger.info(
        `🔄 Cache ${
            cachedTokensMap ? 'expired' : 'empty'
        }, fetching fresh data from SaucerSwap...`
    )

    // Create a new pending request that other calls can await
    pendingRequest = (async () => {
        try {
            logger.info('📡 Fetching tokens from SaucerSwap API...')

            // Add retry logic for 429 errors
            let retries = 0
            const maxRetries = 3
            let response: Response | null = null

            while (retries < maxRetries) {
                response = await fetch(`${SAUCERSWAP_API}/tokens`, {
                    headers: {
                        'x-api-key': SAUCERSWAP_API_KEY,
                    },
                })

                // If 429 (rate limit), wait and retry
                if (response.status === 429) {
                    retries++
                    if (retries < maxRetries) {
                        const waitTime = 2000 * retries // Exponential backoff: 2s, 4s, 6s
                        logger.warn(
                            `⚠️ Rate limited (429). Retrying in ${waitTime}ms... (${retries}/${maxRetries})`
                        )
                        await new Promise((resolve) =>
                            setTimeout(resolve, waitTime)
                        )
                        continue
                    }
                }

                // Success or other error - exit loop
                break
            }

            if (!response?.ok) {
                throw new Error(
                    `SaucerSwap API error: ${response?.status ?? 'unknown'}`
                )
            }

            const tokens: SaucerSwapToken[] = await response.json()

            // Update cache
            cachedTokensMap = new Map(tokens.map((t) => [t.id, t]))
            cacheTimestamp = now

            logger.info(`✅ Loaded ${tokens.length} tokens from SaucerSwap`)

            return {
                success: true,
                tokens,
            }
        } catch (error) {
            logger.error('Error fetching SaucerSwap tokens:', error)
            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Failed to fetch tokens',
            }
        } finally {
            // Clear pending request so future calls can make new requests
            pendingRequest = null
        }
    })()

    return pendingRequest
}

/**
 * Get token information from cache (no API call)
 * Use this instead of direct API calls to avoid rate limiting
 */
export async function getTokenInfo(tokenId: string): Promise<{
    success: boolean
    token?: SaucerSwapToken
    error?: string
}> {
    // Ensure cache is loaded
    if (!cachedTokensMap) {
        const result = await getAllSaucerSwapTokens()
        if (!result.success) {
            return {
                success: false,
                error: 'Failed to load token cache',
            }
        }
    }

    // Safe to use - cache loaded above or error returned
    if (!cachedTokensMap) {
        return {
            success: false,
            error: 'Token cache not available',
        }
    }

    const token = cachedTokensMap.get(tokenId)

    if (!token) {
        return {
            success: false,
            error: 'Token not found on SaucerSwap',
        }
    }

    return {
        success: true,
        token,
    }
}

/**
 * Get token price from cache (no API call)
 */
export async function getTokenPrice(tokenId: string): Promise<{
    success: boolean
    priceUsd?: number
    error?: string
}> {
    try {
        // Get from cache only, no individual API calls
        const tokenInfo = await getTokenInfo(tokenId)

        if (tokenInfo.success && tokenInfo.token?.priceUsd) {
            return {
                success: true,
                priceUsd: tokenInfo.token.priceUsd,
            }
        }

        return {
            success: false,
            error: 'Price not available for this token',
        }
    } catch (error) {
        logger.error(`Error fetching token ${tokenId} price:`, error)
        return {
            success: false,
            priceUsd: 0,
            error:
                error instanceof Error
                    ? error.message
                    : 'Failed to fetch price',
        }
    }
}

/**
 * Get multiple token prices in batch from cache (no API calls)
 */
export async function getBatchTokenPrices(
    tokenIds: string[]
): Promise<TokenPrice[]> {
    const prices: TokenPrice[] = []
    const timestamp = Date.now()

    // All lookups from cache, no API calls
    for (const tokenId of tokenIds) {
        const result = await getTokenPrice(tokenId)
        prices.push({
            tokenId,
            priceUsd: result.priceUsd ?? 0,
            timestamp,
        })
    }

    return prices
}

/**
 * Special handling for HBAR price
 */
export async function getHbarPrice(): Promise<{
    success: boolean
    priceUsd?: number
    error?: string
}> {
    // HBAR is typically represented as WHBAR on SaucerSwap
    // Token ID for WHBAR on mainnet
    const WHBAR_TOKEN_ID = '0.0.1456986'

    return getTokenPrice(WHBAR_TOKEN_ID)
}

/**
 * Get token metadata (name, symbol, icon) from SaucerSwap
 */
export async function getTokenMetadata(tokenId: string): Promise<{
    success: boolean
    metadata?: {
        name: string
        symbol: string
        decimals: number
        icon?: string
    }
    error?: string
}> {
    const result = await getTokenInfo(tokenId)

    if (!result.success || !result.token) {
        return {
            success: false,
            error: result.error,
        }
    }

    return {
        success: true,
        metadata: {
            name: result.token.name,
            symbol: result.token.symbol,
            decimals: result.token.decimals,
            icon: result.token.icon,
        },
    }
}

/**
 * Create a token lookup map for efficient batch processing
 * This will use the cached map if available, or fetch once if not
 */
export async function createTokenLookupMap(): Promise<
    Map<string, SaucerSwapToken>
> {
    // Ensure tokens are loaded (will use cache if available)
    const result = await getAllSaucerSwapTokens()

    if (!result.success || !cachedTokensMap) {
        return new Map()
    }

    return cachedTokensMap
}
