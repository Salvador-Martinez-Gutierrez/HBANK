/**
 * DI Container Demo
 *
 * This file demonstrates how to use the DI container to resolve dependencies.
 * This is for demonstration purposes only and can be deleted.
 */

/* eslint-disable no-console */

import 'reflect-metadata'
import { container } from './container'
import { TYPES } from './types'
import { IEventBus } from '@/core/events/EventBus'
import { ICacheService } from '@/infrastructure/cache'
import { DepositCompleted } from '@/domain/events'

/**
 * Demo function showing DI container usage
 */
export async function demoContainerUsage() {
    // Get EventBus from container
    const eventBus = container.get<IEventBus>(TYPES.EventBus)

    // Get CacheService from container
    const cache = container.get<ICacheService>(TYPES.CacheService)

    // Example 1: Publishing an event
    const depositEvent = new DepositCompleted(
        'deposit-123',
        'user-456',
        1000,
        1050,
        'tx-789',
        new Date()
    )

    await eventBus.publish(depositEvent)

    // Example 2: Using cache
    await cache.set('test-key', { value: 'Hello from DI container!' }, 60)
    const cached = await cache.get<{ value: string }>('test-key')

    console.log('Cached value:', cached)

    // Example 3: Get cache stats
    const stats = cache.getStats()
    console.log('Cache stats:', stats)

    return {
        eventBus,
        cache,
        stats,
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    demoContainerUsage()
        .then(() => {
            console.log('✅ DI Container demo completed successfully!')
            process.exit(0)
        })
        .catch((error) => {
            console.error('❌ DI Container demo failed:', error)
            process.exit(1)
        })
}
