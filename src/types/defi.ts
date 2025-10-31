/**
 * DeFi Snapshot Types
 *
 * Types for the Data Aggregation API (Proxy Layer)
 * that caches SaucerSwap data to reduce API calls.
 */

import type { LpTokenData, Farm } from '@/services/defiService'

/**
 * Database table: defi_pools_snapshot
 */
export interface DefiPoolsSnapshot {
    id: string
    pool_data: LpTokenData[]
    last_updated: string
    created_at: string
}

/**
 * Database table: defi_farms_snapshot
 */
export interface DefiFarmsSnapshot {
    id: string
    farm_data: Farm[]
    last_updated: string
    created_at: string
}

/**
 * Database table: defi_tokens_snapshot
 */
export interface DefiTokensSnapshot {
    id: string
    token_data: TokenPrice[]
    last_updated: string
    created_at: string
}

/**
 * Token price data from SaucerSwap
 */
export interface TokenPrice {
    id: string
    name: string
    symbol: string
    decimals: number
    priceUsd: number
    icon?: string
    dueDiligenceComplete?: boolean
    isFeeOnTransferToken?: boolean
}

/**
 * Response from GET /api/defi/snapshot
 */
export interface DefiSnapshotResponse {
    pools: LpTokenData[]
    farms: Farm[]
    tokens: TokenPrice[]
    metadata: {
        lastUpdated: string
        source: 'cache' | 'database'
        cacheExpiresIn?: number // seconds until cache expires
    }
}

/**
 * Response from POST /api/defi/sync-snapshot
 */
export interface SyncSnapshotResponse {
    success: boolean
    message: string
    stats: {
        poolsCount: number
        farmsCount: number
        tokensCount: number
        timestamp: string
    }
}
