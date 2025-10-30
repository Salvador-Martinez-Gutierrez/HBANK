/**
 * Redis Cache Service
 *
 * Production-ready cache implementation using Redis.
 * Provides high-performance caching with automatic serialization/deserialization.
 */

import { injectable } from 'inversify'
import Redis, { RedisOptions } from 'ioredis'
import { BaseCacheService } from './CacheService'
import { createScopedLogger } from '@/lib/logger'

const logger = createScopedLogger('redis-cache')

/**
 * Redis Cache Service Configuration
 */
export interface RedisCacheConfig {
    host?: string
    port?: number
    password?: string
    db?: number
    keyPrefix?: string
    maxRetries?: number
    enableOfflineQueue?: boolean
}

/**
 * Redis Cache Service
 *
 * Implements ICacheService using Redis as the backend.
 * Handles automatic JSON serialization/deserialization and connection management.
 */
@injectable()
export class RedisCacheService extends BaseCacheService {
    private redis: Redis
    private keyPrefix: string

    constructor(config: RedisCacheConfig = {}) {
        super()

        this.keyPrefix = config.keyPrefix || 'hbank:'

        const redisOptions: RedisOptions = {
            host: config.host || process.env.REDIS_HOST || 'localhost',
            port: config.port || parseInt(process.env.REDIS_PORT || '6379'),
            password: config.password || process.env.REDIS_PASSWORD,
            db: config.db || parseInt(process.env.REDIS_DB || '0'),
            maxRetriesPerRequest: config.maxRetries || 3,
            enableOfflineQueue: config.enableOfflineQueue ?? true,
            retryStrategy: (times: number) => {
                const delay = Math.min(times * 50, 2000)
                logger.warn(`Retrying Redis connection attempt ${times}`, { delay })
                return delay
            },
        }

        this.redis = new Redis(redisOptions)

        this.setupEventHandlers()
    }

    /**
     * Setup Redis connection event handlers
     */
    private setupEventHandlers(): void {
        this.redis.on('connect', () => {
            logger.info('Redis connection established')
        })

        this.redis.on('ready', () => {
            logger.info('Redis client ready')
        })

        this.redis.on('error', (error) => {
            logger.error('Redis connection error', { error })
            this.recordError()
        })

        this.redis.on('close', () => {
            logger.warn('Redis connection closed')
        })

        this.redis.on('reconnecting', () => {
            logger.info('Redis reconnecting...')
        })
    }

    /**
     * Build full key with prefix
     */
    private buildKey(key: string): string {
        return `${this.keyPrefix}${key}`
    }

    /**
     * Get value from cache
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const fullKey = this.buildKey(key)
            const value = await this.redis.get(fullKey)

            if (value === null) {
                this.recordMiss()
                logger.debug('Cache miss', { key })
                return null
            }

            this.recordHit()
            logger.debug('Cache hit', { key })

            return JSON.parse(value) as T
        } catch (error) {
            this.recordError()
            logger.error('Cache get error', { key, error })
            return null
        }
    }

    /**
     * Set value in cache with optional TTL
     */
    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
        try {
            const fullKey = this.buildKey(key)
            const serialized = JSON.stringify(value)

            if (ttlSeconds) {
                await this.redis.setex(fullKey, ttlSeconds, serialized)
            } else {
                await this.redis.set(fullKey, serialized)
            }

            this.recordSet()
            logger.debug('Cache set', { key, ttl: ttlSeconds })
        } catch (error) {
            this.recordError()
            logger.error('Cache set error', { key, error })
            throw error
        }
    }

    /**
     * Delete value from cache
     */
    async delete(key: string): Promise<void> {
        try {
            const fullKey = this.buildKey(key)
            await this.redis.del(fullKey)
            this.recordDelete()
            logger.debug('Cache delete', { key })
        } catch (error) {
            this.recordError()
            logger.error('Cache delete error', { key, error })
            throw error
        }
    }

    /**
     * Delete multiple values by pattern
     */
    async deletePattern(pattern: string): Promise<void> {
        try {
            const fullPattern = this.buildKey(pattern)
            const keys = await this.redis.keys(fullPattern)

            if (keys.length > 0) {
                await this.redis.del(...keys)
                this.recordDelete()
                logger.debug('Cache pattern delete', { pattern, count: keys.length })
            }
        } catch (error) {
            this.recordError()
            logger.error('Cache pattern delete error', { pattern, error })
            throw error
        }
    }

    /**
     * Check if key exists
     */
    async exists(key: string): Promise<boolean> {
        try {
            const fullKey = this.buildKey(key)
            const exists = await this.redis.exists(fullKey)
            return exists === 1
        } catch (error) {
            this.recordError()
            logger.error('Cache exists error', { key, error })
            return false
        }
    }

    /**
     * Clear all cache entries with the prefix
     */
    async clear(): Promise<void> {
        try {
            const pattern = `${this.keyPrefix}*`
            const keys = await this.redis.keys(pattern)

            if (keys.length > 0) {
                await this.redis.del(...keys)
                logger.info('Cache cleared', { count: keys.length })
            }
        } catch (error) {
            this.recordError()
            logger.error('Cache clear error', { error })
            throw error
        }
    }

    /**
     * Disconnect from Redis
     */
    async disconnect(): Promise<void> {
        try {
            await this.redis.quit()
            logger.info('Redis connection closed gracefully')
        } catch (error) {
            logger.error('Error closing Redis connection', { error })
            this.redis.disconnect()
        }
    }

    /**
     * Get Redis client instance (for advanced operations)
     */
    getClient(): Redis {
        return this.redis
    }
}
