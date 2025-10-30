/**
 * GET /api/rate
 *
 * Gets the current exchange rate with caching
 *
 * This endpoint demonstrates:
 * - Dependency Injection (HederaRateService)
 * - Cache integration (5 minute TTL)
 * - Automatic error tracking (Sentry)
 * - Performance monitoring
 *
 * @returns
 * {
 *   "success": true,
 *   "data": {
 *     "rate": 1.005,
 *     "cached": true,
 *     "timestamp": "2025-01-29T10:30:00.000Z"
 *   }
 * }
 */

import { NextRequest } from 'next/server'
import { withAPIWrapper } from '@/lib/api-wrapper'
import { getHederaRateService, getCacheService } from '@/lib/di-helpers'
import { CacheKeyBuilder } from '@/infrastructure/cache'

interface RateResponse {
    rate: number
    cached: boolean
    timestamp: string
}

export const GET = withAPIWrapper(
    async (_request: NextRequest) => {
        const cacheService = getCacheService()
        const rateService = getHederaRateService()

        // Try to get from cache first
        const cacheKey = CacheKeyBuilder.currentRate()
        const cachedRate = await cacheService.get<RateResponse>(cacheKey)

        if (cachedRate) {
            // Cache hit - return cached value
            return {
                ...cachedRate,
                cached: true,
            }
        }

        // Cache miss - fetch from service
        const rate = await rateService.getCurrentRate()
        const response: RateResponse = {
            rate,
            cached: false,
            timestamp: new Date().toISOString(),
        }

        // Store in cache for 5 minutes (300 seconds)
        const ttl = parseInt(process.env.CACHE_TTL_RATE || '300', 10)
        await cacheService.set(cacheKey, response, ttl)

        return response
    },
    {
        errorPrefix: 'Failed to get current rate',
        sentryTags: {
            operation: 'get_rate',
            service: 'HederaRateService',
        },
    }
)
