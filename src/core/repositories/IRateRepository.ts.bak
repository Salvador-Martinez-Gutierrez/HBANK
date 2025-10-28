/**
 * Rate Repository Interface
 *
 * This interface defines the contract for exchange rate data access.
 * It abstracts the Hedera Consensus Service (HCS) from the domain layer.
 *
 * @module core/repositories
 */

import { Rate } from '@/domain/value-objects/Rate'

/**
 * Rate history query options
 */
export interface RateHistoryOptions {
    /** Number of records to return */
    limit?: number

    /** Start date for history */
    fromDate?: Date

    /** End date for history */
    toDate?: Date

    /** Sort order (asc or desc) */
    sortOrder?: 'asc' | 'desc'
}

/**
 * Rate Repository Interface
 *
 * Defines all operations for managing exchange rate data.
 * Implementations interact with Hedera Consensus Service (HCS)
 * to publish and retrieve rates.
 *
 * @example
 * ```typescript
 * class HederaRateRepository implements IRateRepository {
 *   async getLatest(): Promise<Rate> {
 *     const messages = await this.fetchFromHCS()
 *     const latestMessage = messages[messages.length - 1]
 *     return Rate.fromHCS(latestMessage)
 *   }
 * }
 * ```
 */
export interface IRateRepository {
    /**
     * Get the latest published exchange rate
     *
     * @returns The most recent rate from HCS
     * @throws {Error} If no rate is available
     *
     * @example
     * ```typescript
     * const rate = await repository.getLatest()
     * console.log(`Current rate: ${rate.value}`)
     * console.log(`Valid until: ${rate.validUntil}`)
     * ```
     */
    getLatest(): Promise<Rate>

    /**
     * Get a rate by its sequence number
     *
     * @param sequenceNumber - The HCS sequence number
     * @returns The rate if found, null otherwise
     *
     * @example
     * ```typescript
     * const rate = await repository.getBySequenceNumber('123456')
     * if (rate && !rate.isExpired()) {
     *   // Use the rate
     * }
     * ```
     */
    getBySequenceNumber(sequenceNumber: string): Promise<Rate | null>

    /**
     * Get rate history within a time range
     *
     * @param options - Query options for filtering and pagination
     * @returns Array of historical rates
     *
     * @example
     * ```typescript
     * const history = await repository.getHistory({
     *   fromDate: new Date('2025-10-01'),
     *   limit: 100,
     *   sortOrder: 'desc'
     * })
     *
     * for (const rate of history) {
     *   console.log(`${rate.timestamp}: ${rate.value}`)
     * }
     * ```
     */
    getHistory(options?: RateHistoryOptions): Promise<Rate[]>

    /**
     * Publish a new exchange rate to HCS
     *
     * @param rate - The rate to publish
     * @returns The published rate with HCS metadata
     *
     * @example
     * ```typescript
     * const newRate = Rate.create(1.005, 'pending')
     * const published = await repository.publish(newRate)
     * console.log(`Rate published with sequence: ${published.sequenceNumber}`)
     * ```
     */
    publish(rate: Rate): Promise<Rate>

    /**
     * Verify if a rate is valid and not expired
     *
     * @param sequenceNumber - The sequence number to verify
     * @returns True if the rate is valid and not expired
     *
     * @example
     * ```typescript
     * const isValid = await repository.isValid('123456')
     * if (!isValid) {
     *   throw new Error('Rate has expired')
     * }
     * ```
     */
    isValid(sequenceNumber: string): Promise<boolean>

    /**
     * Get rate statistics for a time period
     *
     * @param fromDate - Start date
     * @param toDate - End date
     * @returns Statistics including average, min, max rates
     *
     * @example
     * ```typescript
     * const stats = await repository.getStatistics(
     *   new Date('2025-10-01'),
     *   new Date('2025-10-31')
     * )
     * console.log(`Average rate: ${stats.average}`)
     * console.log(`Min rate: ${stats.min}`)
     * console.log(`Max rate: ${stats.max}`)
     * ```
     */
    getStatistics(
        fromDate: Date,
        toDate: Date
    ): Promise<{
        average: number
        min: number
        max: number
        count: number
    }>
}
