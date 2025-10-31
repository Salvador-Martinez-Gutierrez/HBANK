/**
 * GET /api/defi/snapshot
 *
 * Public endpoint that returns cached DeFi data (pools, farms, tokens).
 * This endpoint serves data from cache (Redis/Memory) with a fallback
 * to the Supabase snapshot tables.
 *
 * Flow:
 * 1. Try Redis cache (60s TTL)
 * 2. If cache miss, fetch from Supabase snapshot tables
 * 3. Update cache for subsequent requests
 *
 * This replaces direct calls to SaucerSwap API, reducing API calls
 * from ~22 per sync to ~4-6 per sync.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logger } from '@/lib/logger'
import { getCacheService } from '@/lib/di-helpers'
import type { DefiSnapshotResponse } from '@/types/defi'
import type { LpTokenData, Farm } from '@/services/defiService'

// Cache keys
const CACHE_KEY_COMBINED = 'defi:snapshot:combined'
const CACHE_TTL = 60 // 60 seconds

interface TokenPrice {
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
 * Fetch latest snapshots from database
 */
async function fetchFromDatabase() {
    const [poolsResult, farmsResult, tokensResult] = await Promise.all([
        supabaseAdmin
            .from('defi_pools_snapshot')
            .select('pool_data, last_updated')
            .order('last_updated', { ascending: false })
            .limit(1)
            .single(),

        supabaseAdmin
            .from('defi_farms_snapshot')
            .select('farm_data, last_updated')
            .order('last_updated', { ascending: false })
            .limit(1)
            .single(),

        supabaseAdmin
            .from('defi_tokens_snapshot')
            .select('token_data, last_updated')
            .order('last_updated', { ascending: false })
            .limit(1)
            .single(),
    ])

    if (poolsResult.error) {
        logger.error('Failed to fetch pools snapshot', {
            error: poolsResult.error,
        })
        throw new Error(`Failed to fetch pools: ${poolsResult.error.message}`)
    }

    if (farmsResult.error) {
        logger.error('Failed to fetch farms snapshot', {
            error: farmsResult.error,
        })
        throw new Error(`Failed to fetch farms: ${farmsResult.error.message}`)
    }

    if (tokensResult.error) {
        logger.error('Failed to fetch tokens snapshot', {
            error: tokensResult.error,
        })
        throw new Error(`Failed to fetch tokens: ${tokensResult.error.message}`)
    }

    return {
        pools: poolsResult.data.pool_data as LpTokenData[],
        farms: farmsResult.data.farm_data as Farm[],
        tokens: tokensResult.data.token_data as TokenPrice[],
        lastUpdated: poolsResult.data.last_updated,
    }
}

export async function GET(_request: NextRequest) {
    const startTime = Date.now()

    try {
        const cacheService = getCacheService()

        // Try cache first
        const cached = await cacheService.get<DefiSnapshotResponse>(
            CACHE_KEY_COMBINED
        )

        if (cached) {
            const duration = Date.now() - startTime
            logger.info('DeFi snapshot served from cache', { duration })

            return NextResponse.json({
                ...cached,
                metadata: {
                    ...cached.metadata,
                    source: 'cache',
                    cacheExpiresIn: CACHE_TTL,
                },
            })
        }

        // Cache miss - fetch from database
        logger.info('DeFi snapshot cache miss, fetching from database')

        const data = await fetchFromDatabase()

        const response: DefiSnapshotResponse = {
            pools: data.pools,
            farms: data.farms,
            tokens: data.tokens,
            metadata: {
                lastUpdated: data.lastUpdated,
                source: 'database',
            },
        }

        // Update cache for next requests
        try {
            await cacheService.set(CACHE_KEY_COMBINED, response, CACHE_TTL)
            logger.info('Updated DeFi snapshot cache')
        } catch (error) {
            logger.warn('Failed to update cache', { error })
            // Non-critical, continue
        }

        const duration = Date.now() - startTime
        logger.info('DeFi snapshot served from database', {
            duration,
            poolsCount: data.pools.length,
            farmsCount: data.farms.length,
            tokensCount: data.tokens.length,
        })

        return NextResponse.json(response)
    } catch (error) {
        logger.error('Failed to fetch DeFi snapshot', { error })

        return NextResponse.json(
            {
                success: false,
                message:
                    error instanceof Error
                        ? error.message
                        : 'Internal server error',
            },
            { status: 500 }
        )
    }
}
