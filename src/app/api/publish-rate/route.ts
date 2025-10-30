/**
 * POST /api/publish-rate
 *
 * Publishes exchange rate information to Hedera Consensus Service
 *
 * This endpoint has been migrated to use:
 * - Dependency Injection (HederaRateService)
 * - Automatic error tracking (Sentry)
 * - Event sourcing (RatePublished event)
 * - Cache invalidation
 *
 * @example
 * POST /api/publish-rate
 * {
 *   "rate": 1.005,
 *   "totalUsd": 100000,
 *   "husdSupply": 99502.49
 * }
 *
 * @returns
 * {
 *   "success": true,
 *   "data": {
 *     "status": "published",
 *     "topicId": "0.0.67890",
 *     "rate": 1.005,
 *     "transactionId": "0.0.12345@1234567890.000",
 *     "sequenceNumber": "123"
 *   }
 * }
 */

import { NextRequest } from 'next/server'
import { withAPIWrapper, validateRequestBody } from '@/lib/api-wrapper'
import { getHederaRateService, getEventBus, getCacheService } from '@/lib/di-helpers'
import { RatePublished } from '@/domain/events/RateEvents'
import { CacheKeyBuilder } from '@/infrastructure/cache'

interface PublishRateRequest {
    rate: number
    totalUsd: number
    husdSupply: number
}

export const POST = withAPIWrapper(
    async (request: NextRequest) => {
        // Validate request body
        const validation = await validateRequestBody<PublishRateRequest>(request, [
            'rate',
            'totalUsd',
            'husdSupply',
        ])

        if ('error' in validation) return validation.error

        const { rate, totalUsd, husdSupply } = validation.body

        // Additional validation
        if (typeof rate !== 'number' || typeof totalUsd !== 'number' || typeof husdSupply !== 'number') {
            throw new Error('rate, totalUsd, and husdSupply must be numbers')
        }

        if (rate <= 0) {
            throw new Error('Rate must be positive')
        }

        if (totalUsd <= 0 || husdSupply <= 0) {
            throw new Error('totalUsd and husdSupply must be positive')
        }

        // Get services from DI container
        const rateService = getHederaRateService()
        const eventBus = getEventBus()
        const cacheService = getCacheService()

        // Publish rate to HCS
        const result = await rateService.publishRate(rate, totalUsd, husdSupply)

        // Invalidate rate cache
        await cacheService.delete(CacheKeyBuilder.currentRate())

        // Publish domain event for audit trail and notifications
        await eventBus.publish(
            new RatePublished(
                result.transactionId, // rateId (use transaction ID as unique identifier)
                result.rate,
                result.sequenceNumber || '',
                totalUsd,
                husdSupply,
                result.topicId,
                new Date()
            )
        )

        // Return result
        return {
            status: result.status,
            topicId: result.topicId,
            rate: result.rate,
            transactionId: result.transactionId,
            sequenceNumber: result.sequenceNumber,
        }
    },
    {
        errorPrefix: 'Failed to publish rate',
        sentryTags: {
            operation: 'publish_rate',
            service: 'HederaRateService',
        },
    }
)
