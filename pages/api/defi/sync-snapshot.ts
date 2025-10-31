/**
 * POST /api/defi/sync-snapshot
 *
 * Protected endpoint called by VPS cron job to sync DeFi data.
 * Fetches pools, farms, and tokens from SaucerSwap and stores
 * them in Supabase snapshot tables.
 *
 * Authentication: Requires CRON_API_KEY in Authorization header
 *
 * Cron schedule: Every 5 minutes
 * Example: curl -X POST https://your-domain.com/api/defi/sync-snapshot \
 *               -H "Authorization: Bearer YOUR_CRON_API_KEY"
 */

import { NextRequest, NextResponse } from 'next/server'
import { serverEnv } from '@/config/serverEnv'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logger } from '@/lib/logger'
import type { SyncSnapshotResponse } from '@/types/defi'
import type { Json } from '@/types/supabase'
import { getCacheService } from '@/lib/di-helpers'

// SaucerSwap API imports
interface SaucerSwapPool {
    id: string
    tokenA: string
    tokenB: string
    lpToken: string
    [key: string]: unknown
}

interface SaucerSwapFarm {
    id: string
    lpToken: string
    rewardTokenId: string
    [key: string]: unknown
}

interface SaucerSwapToken {
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
 * Validates the API key from the request
 */
function validateApiKey(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
        logger.warn('Sync snapshot request missing authorization header')
        return false
    }

    const token = authHeader.replace('Bearer ', '')
    const expectedKey = serverEnv.apiKeys.cron

    if (!expectedKey) {
        logger.error('CRON_API_KEY not configured in environment')
        return false
    }

    if (token !== expectedKey) {
        logger.warn('Invalid CRON_API_KEY provided')
        return false
    }

    return true
}

/**
 * Fetches all pools from SaucerSwap API
 */
async function fetchSaucerSwapPools(): Promise<SaucerSwapPool[]> {
    const apiKey = serverEnv.externalApis.saucerSwap?.apiKey

    if (!apiKey) {
        throw new Error('SAUCERSWAP_API_KEY not configured')
    }

    const response = await fetch('https://api.saucerswap.finance/v2/pools', {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
    })

    if (!response.ok) {
        throw new Error(`SaucerSwap pools API error: ${response.status}`)
    }

    return response.json()
}

/**
 * Fetches all farms from SaucerSwap API
 */
async function fetchSaucerSwapFarms(): Promise<SaucerSwapFarm[]> {
    const apiKey = serverEnv.externalApis.saucerSwap?.apiKey

    if (!apiKey) {
        throw new Error('SAUCERSWAP_API_KEY not configured')
    }

    const response = await fetch('https://api.saucerswap.finance/farms', {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
    })

    if (!response.ok) {
        throw new Error(`SaucerSwap farms API error: ${response.status}`)
    }

    return response.json()
}

/**
 * Fetches all tokens from SaucerSwap API
 */
async function fetchSaucerSwapTokens(): Promise<SaucerSwapToken[]> {
    const apiKey = serverEnv.externalApis.saucerSwap?.apiKey

    if (!apiKey) {
        throw new Error('SAUCERSWAP_API_KEY not configured')
    }

    const response = await fetch('https://api.saucerswap.finance/tokens', {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
    })

    if (!response.ok) {
        throw new Error(`SaucerSwap tokens API error: ${response.status}`)
    }

    return response.json()
}

export async function POST(request: NextRequest) {
    const startTime = Date.now()

    try {
        // Validate API key
        if (!validateApiKey(request)) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            )
        }

        logger.info('Starting DeFi snapshot sync...')

        // Fetch data from SaucerSwap in parallel
        const [pools, farms, tokens] = await Promise.all([
            fetchSaucerSwapPools(),
            fetchSaucerSwapFarms(),
            fetchSaucerSwapTokens(),
        ])

        logger.info('Fetched SaucerSwap data', {
            poolsCount: pools.length,
            farmsCount: farms.length,
            tokensCount: tokens.length,
        })

        // Save to database (inserts new snapshots)
        const timestamp = new Date().toISOString()

        const [poolsResult, farmsResult, tokensResult] = await Promise.all([
            supabaseAdmin.from('defi_pools_snapshot').insert({
                pool_data: pools as unknown as Json,
                last_updated: timestamp,
            }),

            supabaseAdmin.from('defi_farms_snapshot').insert({
                farm_data: farms as unknown as Json,
                last_updated: timestamp,
            }),

            supabaseAdmin.from('defi_tokens_snapshot').insert({
                token_data: tokens as unknown as Json,
                last_updated: timestamp,
            }),
        ])

        // Check for errors
        if (poolsResult.error) {
            logger.error('Failed to save pools snapshot', {
                error: poolsResult.error,
            })
            throw new Error(
                `Failed to save pools: ${poolsResult.error.message}`
            )
        }

        if (farmsResult.error) {
            logger.error('Failed to save farms snapshot', {
                error: farmsResult.error,
            })
            throw new Error(
                `Failed to save farms: ${farmsResult.error.message}`
            )
        }

        if (tokensResult.error) {
            logger.error('Failed to save tokens snapshot', {
                error: tokensResult.error,
            })
            throw new Error(
                `Failed to save tokens: ${tokensResult.error.message}`
            )
        }

        logger.info('Saved snapshots to database')

        // Invalidate Redis cache so next request fetches fresh data
        try {
            const cacheService = getCacheService()
            await Promise.all([
                cacheService.delete('defi:snapshot:pools'),
                cacheService.delete('defi:snapshot:farms'),
                cacheService.delete('defi:snapshot:tokens'),
                cacheService.delete('defi:snapshot:combined'),
            ])
            logger.info('Invalidated snapshot cache')
        } catch (error) {
            logger.warn('Failed to invalidate cache', { error })
            // Non-critical error, continue
        }

        const duration = Date.now() - startTime

        const response: SyncSnapshotResponse = {
            success: true,
            message: 'DeFi snapshot synced successfully',
            stats: {
                poolsCount: pools.length,
                farmsCount: farms.length,
                tokensCount: tokens.length,
                timestamp,
            },
        }

        logger.info('DeFi snapshot sync completed', {
            duration,
            ...response.stats,
        })

        return NextResponse.json(response)
    } catch (error) {
        logger.error('Failed to sync DeFi snapshot', { error })

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
