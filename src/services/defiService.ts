import { createScopedLogger } from '@/lib/logger'
import { serverEnv } from '@/config/serverEnv'

const logger = createScopedLogger('service:defiService')

/**
 * DeFi Service
 * Integrates with SaucerSwap and Bonzo Finance APIs to fetch DeFi positions
 */

// External API URLs from serverEnv
const SAUCERSWAP_API = serverEnv.externalApis.saucerSwap?.url ?? ''
const SAUCERSWAP_API_KEY = serverEnv.externalApis.saucerSwap?.apiKey ?? ''
const BONZO_API = serverEnv.externalApis.bonzo?.url ?? ''

// ========================================
// TYPES
// ========================================

export interface TokenData {
    decimals: number
    icon?: string
    id: string
    name: string
    price: string
    priceUsd: number
    symbol: string
    dueDiligenceComplete: boolean
    isFeeOnTransferToken: boolean
    description: string
    website: string
    sentinelReport: string | null
    twitterHandle: string
    timestampSecondsLastListingChange: number
}

export interface LpTokenData {
    id: number
    contractId: string
    lpToken: {
        decimals: number
        id: string
        name: string
        symbol: string
        priceUsd: string
    }
    lpTokenReserve: string
    tokenA: TokenData
    tokenReserveA: string
    tokenB: TokenData
    tokenReserveB: string
}

export interface FarmTotal {
    id: number
    timestamp: string
    total: string
}

export interface Farm {
    id: number
    poolId: number
    sauceEmissions: number
    hbarEmissions: number
    staked: string
}

export interface BonzoReserve {
    id: number
    name: string
    symbol: string
    decimals: number
    atoken_balance: {
        tiny_token: string
        token_display: string
        hbar_tinybar: string
        hbar_display: string
        usd_wad: string
        usd_display: string
        usd_abbreviated: string
    }
    supply_apy: number
    price_usd_display: string
    hts_address: string
}

export interface BonzoApiResponse {
    reserves: BonzoReserve[]
    user_credit: {
        total_supply: {
            tiny_token: string
            token_display: string
            hbar_tinybar: string
            hbar_display: string
            usd_wad: string
            usd_display: string
            usd_abbreviated: string
        }
    }
}

export interface LendingPosition {
    asset: string
    tokenAmount: string
    valueUsd: string
    apy: number
    tokenId: string
}

export interface LendingData {
    totalValueUsd: number
    totalValueHbar: number
    positions: LendingPosition[]
}

// ========================================
// SAUCERSWAP V1 POOLS
// ========================================

/**
 * Get LP token data from SaucerSwap
 * Returns pool information including token pairs and reserves
 */
export async function getLpTokenData(
    tokenId: string
): Promise<LpTokenData | undefined> {
    const url = `${SAUCERSWAP_API}/pools/known`

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-api-key': SAUCERSWAP_API_KEY,
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const pools = (await response.json()) as LpTokenData[]
        const matchingPool = pools.find((pool) => pool.lpToken.id === tokenId)

        if (matchingPool) {
            logger.info(`✅ Found LP pool for token ${tokenId}`)
            return matchingPool
        }

        return undefined
    } catch (error) {
        logger.error('Error fetching LP token data:', error)
        return undefined
    }
}

/**
 * Get LP token data by pool ID
 */
export async function getLpTokenDataByPoolId(
    poolId: number | null
): Promise<LpTokenData | null> {
    if (!poolId) return null

    const url = `${SAUCERSWAP_API}/pools/${poolId}`

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-api-key': SAUCERSWAP_API_KEY,
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            throw new Error(
                `Error fetching LP token data: ${response.statusText}`
            )
        }

        const data: LpTokenData = await response.json()
        logger.info(`✅ Fetched LP data for pool ${poolId}`)
        return data
    } catch (error) {
        logger.error('Error in getLpTokenDataByPoolId:', error)
        return null
    }
}

// ========================================
// SAUCERSWAP V1 FARMS
// ========================================

/**
 * Fetch farm totals for an account
 * Returns farms where the user has staked LP tokens
 */
export async function fetchFarmTotals(accountId: string): Promise<FarmTotal[]> {
    const url = `${SAUCERSWAP_API}/farms/totals/${accountId}`

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-api-key': SAUCERSWAP_API_KEY,
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            throw new Error(
                `Error fetching farm totals: ${response.statusText}`
            )
        }

        const data: FarmTotal[] = await response.json()
        // Filter to include only farms with total > 0
        const activeFarms = data.filter((farm) => parseFloat(farm.total) > 0)
        logger.info(
            `✅ Found ${activeFarms.length} active farms for account ${accountId}`
        )
        return activeFarms
    } catch (error) {
        logger.error('Error in fetchFarmTotals:', error)
        return []
    }
}

/**
 * Fetch pool ID for a specific farm
 */
export async function fetchPoolId(id: number): Promise<number | null> {
    const url = `${SAUCERSWAP_API}/farms`

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-api-key': SAUCERSWAP_API_KEY,
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            throw new Error(`Error fetching farms: ${response.statusText}`)
        }

        const farms: Farm[] = await response.json()
        const farm = farms.find((f) => f.id === id)

        if (farm) {
            logger.info(`✅ Found pool ID ${farm.poolId} for farm ${id}`)
            return farm.poolId
        }

        logger.info(`⚠️ No farm found with id: ${id}`)
        return null
    } catch (error) {
        logger.error('Error in fetchPoolId:', error)
        return null
    }
}

// ========================================
// BONZO FINANCE LENDING
// ========================================

/**
 * Get Bonzo lending data for an account
 * Returns lending positions and total value
 */
export async function getBonzoLendingData(
    accountId: string
): Promise<LendingData | undefined> {
    const url = `${BONZO_API}/Dashboard/${accountId}`

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = (await response.json()) as BonzoApiResponse

        // Parse total values
        const totalValueUsd = parseFloat(
            data.user_credit.total_supply.usd_display
                .replace('$', '')
                .replace(',', '')
        )
        const totalValueHbar = parseFloat(
            data.user_credit.total_supply.hbar_display
                .replace('ℏ', '')
                .replace(',', '')
        )

        // Get individual lending positions (only where balance > 0)
        const positions = data.reserves
            .filter((reserve) => {
                const balance = parseFloat(reserve.atoken_balance.token_display)
                return balance > 0
            })
            .map((reserve) => ({
                asset: reserve.symbol,
                tokenAmount: reserve.atoken_balance.token_display,
                valueUsd: reserve.atoken_balance.usd_display,
                apy: reserve.supply_apy,
                tokenId: reserve.hts_address,
            }))

        logger.info(
            `✅ Found ${positions.length} Bonzo lending positions for account ${accountId}`
        )

        return {
            totalValueUsd,
            totalValueHbar,
            positions,
        }
    } catch (error) {
        logger.error('Error fetching Bonzo lending data:', error)
        return undefined
    }
}

// ========================================
// HELPER: Classify LP Tokens
// ========================================

/**
 * Check if a token is an LP token from SaucerSwap
 * LP tokens from SaucerSwap start with "ssLP"
 */
export function isLpToken(tokenName: string): boolean {
    return tokenName.startsWith('ssLP')
}
