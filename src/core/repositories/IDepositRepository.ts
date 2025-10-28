/**
 * Deposit Repository Interface
 *
 * This interface defines the contract for deposit data access.
 * It abstracts the infrastructure layer (Hedera, database, etc.)
 * from the domain layer, following the Repository Pattern.
 *
 * @module core/repositories
 */

import { Deposit } from '@/domain/entities/Deposit'


/**
 * Pagination options for querying deposits
 */
export interface DepositPaginationOptions {
    /** Number of records to return */
    limit?: number

    /** Number of records to skip */
    offset?: number

    /** Sort order (asc or desc) */
    sortOrder?: 'asc' | 'desc'

    /** Sort field */
    sortBy?: 'createdAt' | 'amount' | 'status'
}

/**
 * Deposit filter options
 */
export interface DepositFilterOptions {
    /** Filter by user account ID */
    userAccountId?: string

    /** Filter by status */
    status?: 'pending' | 'scheduled' | 'completed' | 'failed'

    /** Filter by date range (from) */
    fromDate?: Date

    /** Filter by date range (to) */
    toDate?: Date
}

/**
 * Deposit Repository Interface
 *
 * Defines all operations for managing deposit data.
 * Implementations should handle the specific infrastructure
 * (Hedera blockchain, database, etc.)
 *
 * @example
 * ```typescript
 * class HederaDepositRepository implements IDepositRepository {
 *   async findById(id: string): Promise<Deposit | null> {
 *     const scheduleId = ScheduleId.fromString(id)
 *     const info = await scheduleId.getInfo(client)
 *     return Deposit.fromHedera(info)
 *   }
 * }
 * ```
 */
export interface IDepositRepository {
    /**
     * Find a deposit by its ID
     *
     * @param id - The deposit ID (schedule ID on Hedera)
     * @returns The deposit if found, null otherwise
     *
     * @example
     * ```typescript
     * const deposit = await repository.findById('0.0.123456@1234567890.000000000')
     * if (deposit) {
     *   logger.info(`Found deposit: ${deposit.id}`)
     * }
     * ```
     */
    findById(id: string): Promise<Deposit | null>

    /**
     * Find deposits by user account ID
     *
     * @param userAccountId - The Hedera account ID of the user
     * @param options - Pagination and filtering options
     * @returns Array of deposits
     *
     * @example
     * ```typescript
     * const deposits = await repository.findByUser('0.0.12345', {
     *   limit: 10,
     *   sortOrder: 'desc'
     * })
     * ```
     */
    findByUser(
        userAccountId: string,
        options?: DepositPaginationOptions
    ): Promise<Deposit[]>

    /**
     * Find deposits with advanced filtering
     *
     * @param filters - Filter criteria
     * @param options - Pagination options
     * @returns Array of deposits matching the filters
     *
     * @example
     * ```typescript
     * const recentCompletedDeposits = await repository.findMany({
     *   status: 'completed',
     *   fromDate: new Date('2025-10-01')
     * }, {
     *   limit: 50,
     *   sortBy: 'createdAt',
     *   sortOrder: 'desc'
     * })
     * ```
     */
    findMany(
        filters: DepositFilterOptions,
        options?: DepositPaginationOptions
    ): Promise<Deposit[]>

    /**
     * Save a new deposit
     *
     * @param deposit - The deposit to save
     * @returns The saved deposit with updated metadata
     *
     * @example
     * ```typescript
     * const deposit = Deposit.create('0.0.12345', 100, rate)
     * const saved = await repository.save(deposit)
     * logger.info(`Deposit saved with ID: ${saved.id}`)
     * ```
     */
    save(deposit: Deposit): Promise<Deposit>

    /**
     * Update an existing deposit
     *
     * @param deposit - The deposit to update
     * @returns The updated deposit
     *
     * @example
     * ```typescript
     * const deposit = await repository.findById(id)
     * const updated = deposit.execute()
     * await repository.update(updated)
     * ```
     */
    update(deposit: Deposit): Promise<Deposit>

    /**
     * Delete a deposit (soft delete)
     *
     * @param id - The deposit ID to delete
     *
     * @example
     * ```typescript
     * await repository.delete('0.0.123456@1234567890.000000000')
     * ```
     */
    delete(id: string): Promise<void>

    /**
     * Count deposits matching the filters
     *
     * @param filters - Filter criteria
     * @returns Number of deposits matching the filters
     *
     * @example
     * ```typescript
     * const count = await repository.count({ status: 'completed' })
     * logger.info(`Total completed deposits: ${count}`)
     * ```
     */
    count(filters?: DepositFilterOptions): Promise<number>
}
