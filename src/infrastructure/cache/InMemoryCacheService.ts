/**
 * In-Memory Cache Service
 *
 * Simple in-memory cache implementation for development and testing.
 * Not suitable for production use in distributed environments.
 */

import { injectable } from 'inversify'
import { BaseCacheService } from './CacheService'
import { createScopedLogger } from '@/lib/logger'

const logger = createScopedLogger('memory-cache')

/**
 * Cache entry with expiration
 */
interface CacheEntry<T> {
    value: T
    expiresAt?: number
}

/**
 * In-Memory Cache Service
 *
 * Implements ICacheService using a simple Map for storage.
 * Suitable for development, testing, and single-instance deployments.
 */
@injectable()
export class InMemoryCacheService extends BaseCacheService {
    private cache: Map<string, CacheEntry<unknown>> = new Map()
    private cleanupInterval: NodeJS.Timeout | null = null

    constructor(cleanupIntervalMs: number = 60000) {
        super()

        // Setup periodic cleanup of expired entries
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpired()
        }, cleanupIntervalMs)

        logger.info('In-memory cache service initialized', {
            cleanupIntervalMs,
        })
    }

    /**
     * Get value from cache
     */
    async get<T>(key: string): Promise<T | null> {
        const entry = this.cache.get(key) as CacheEntry<T> | undefined

        if (!entry) {
            this.recordMiss()
            logger.debug('Cache miss', { key })
            return null
        }

        // Check if entry has expired
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            this.cache.delete(key)
            this.recordMiss()
            logger.debug('Cache miss (expired)', { key })
            return null
        }

        this.recordHit()
        logger.debug('Cache hit', { key })
        return entry.value
    }

    /**
     * Set value in cache with optional TTL
     */
    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
        const entry: CacheEntry<T> = {
            value,
            expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
        }

        this.cache.set(key, entry)
        this.recordSet()
        logger.debug('Cache set', { key, ttl: ttlSeconds })
    }

    /**
     * Delete value from cache
     */
    async delete(key: string): Promise<void> {
        this.cache.delete(key)
        this.recordDelete()
        logger.debug('Cache delete', { key })
    }

    /**
     * Delete multiple values by pattern
     */
    async deletePattern(pattern: string): Promise<void> {
        // Convert simple glob pattern to regex
        const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.')
        const regex = new RegExp(`^${regexPattern}$`)

        let deletedCount = 0
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key)
                deletedCount++
            }
        }

        if (deletedCount > 0) {
            this.recordDelete()
            logger.debug('Cache pattern delete', { pattern, count: deletedCount })
        }
    }

    /**
     * Check if key exists
     */
    async exists(key: string): Promise<boolean> {
        const entry = this.cache.get(key)

        if (!entry) {
            return false
        }

        // Check if entry has expired
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            this.cache.delete(key)
            return false
        }

        return true
    }

    /**
     * Clear all cache entries
     */
    async clear(): Promise<void> {
        const size = this.cache.size
        this.cache.clear()
        logger.info('Cache cleared', { count: size })
    }

    /**
     * Cleanup expired entries
     */
    private cleanupExpired(): void {
        const now = Date.now()
        let expiredCount = 0

        for (const [key, entry] of this.cache.entries()) {
            if (entry.expiresAt && now > entry.expiresAt) {
                this.cache.delete(key)
                expiredCount++
            }
        }

        if (expiredCount > 0) {
            logger.debug('Cleaned up expired entries', { count: expiredCount })
        }
    }

    /**
     * Disconnect (cleanup)
     */
    async disconnect(): Promise<void> {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval)
            this.cleanupInterval = null
        }
        await this.clear()
        logger.info('In-memory cache service disconnected')
    }

    /**
     * Get current cache size
     */
    getSize(): number {
        return this.cache.size
    }
}
