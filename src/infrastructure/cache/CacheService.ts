/**
 * Cache Service Interface
 *
 * Provides a generic caching abstraction that can be implemented by different
 * cache backends (Redis, in-memory, etc.)
 */

import { createScopedLogger } from '@/lib/logger'

const logger = createScopedLogger('cache')

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
    hits: number
    misses: number
    sets: number
    deletes: number
    errors: number
    hitRate: number
}

/**
 * Cache Service Interface
 *
 * Defines the contract for all cache implementations.
 */
export interface ICacheService {
    /**
     * Get a value from cache
     *
     * @param key - Cache key
     * @returns Cached value or null if not found
     */
    get<T>(key: string): Promise<T | null>

    /**
     * Set a value in cache with optional TTL
     *
     * @param key - Cache key
     * @param value - Value to cache
     * @param ttlSeconds - Time to live in seconds (optional)
     */
    set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>

    /**
     * Delete a value from cache
     *
     * @param key - Cache key
     */
    delete(key: string): Promise<void>

    /**
     * Delete multiple values from cache by pattern
     *
     * @param pattern - Key pattern (e.g., "user:*")
     */
    deletePattern(pattern: string): Promise<void>

    /**
     * Check if a key exists in cache
     *
     * @param key - Cache key
     */
    exists(key: string): Promise<boolean>

    /**
     * Clear all cache entries
     */
    clear(): Promise<void>

    /**
     * Get cache statistics
     */
    getStats(): CacheStats

    /**
     * Reset cache statistics
     */
    resetStats(): void

    /**
     * Close cache connection
     */
    disconnect(): Promise<void>
}

/**
 * Base Cache Service with metrics tracking
 */
export abstract class BaseCacheService implements ICacheService {
    protected stats: CacheStats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0,
        hitRate: 0,
    }

    abstract get<T>(key: string): Promise<T | null>
    abstract set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>
    abstract delete(key: string): Promise<void>
    abstract deletePattern(pattern: string): Promise<void>
    abstract exists(key: string): Promise<boolean>
    abstract clear(): Promise<void>
    abstract disconnect(): Promise<void>

    protected recordHit(): void {
        this.stats.hits++
        this.updateHitRate()
    }

    protected recordMiss(): void {
        this.stats.misses++
        this.updateHitRate()
    }

    protected recordSet(): void {
        this.stats.sets++
    }

    protected recordDelete(): void {
        this.stats.deletes++
    }

    protected recordError(): void {
        this.stats.errors++
    }

    private updateHitRate(): void {
        const total = this.stats.hits + this.stats.misses
        this.stats.hitRate = total > 0 ? this.stats.hits / total : 0
    }

    getStats(): CacheStats {
        return { ...this.stats }
    }

    resetStats(): void {
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 0,
            hitRate: 0,
        }
        logger.info('Cache statistics reset')
    }
}

/**
 * Cache key builder utilities
 */
export class CacheKeyBuilder {
    /**
     * Build a cache key for the current exchange rate
     */
    static currentRate(): string {
        return 'rate:current'
    }

    /**
     * Build a cache key for rate history
     */
    static rateHistory(limit: number): string {
        return `rate:history:${limit}`
    }

    /**
     * Build a cache key for TVL
     */
    static tvl(): string {
        return 'tvl:current'
    }

    /**
     * Build a cache key for token price
     */
    static tokenPrice(tokenId: string): string {
        return `token:price:${tokenId}`
    }

    /**
     * Build a cache key for wallet balance
     */
    static walletBalance(accountId: string, tokenId: string): string {
        return `wallet:balance:${accountId}:${tokenId}`
    }

    /**
     * Build a cache key for user deposits
     */
    static userDeposits(userAccountId: string): string {
        return `user:deposits:${userAccountId}`
    }

    /**
     * Build a cache key for user withdrawals
     */
    static userWithdrawals(userAccountId: string): string {
        return `user:withdrawals:${userAccountId}`
    }

    /**
     * Build a cache key for instant withdrawal max amount
     */
    static instantWithdrawalMax(): string {
        return 'withdrawal:instant:max'
    }
}
