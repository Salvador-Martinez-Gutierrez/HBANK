/**
 * Withdrawal Repository Interface
 *
 * This interface defines the contract for withdrawal data access.
 * It abstracts the infrastructure layer from the domain layer.
 *
 * @module core/repositories
 */

import { Withdrawal } from '@/domain/entities/Withdrawal'


/**
 * Pagination options for querying withdrawals
 */
export interface WithdrawalPaginationOptions {
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
 * Withdrawal filter options
 */
export interface WithdrawalFilterOptions {
    /** Filter by user account ID */
    userAccountId?: string

    /** Filter by status */
    status?: 'pending' | 'scheduled' | 'completed' | 'failed'

    /** Filter by type (instant or standard) */
    type?: 'instant' | 'standard'

    /** Filter by date range (from) */
    fromDate?: Date

    /** Filter by date range (to) */
    toDate?: Date
}

/**
 * Withdrawal Repository Interface
 *
 * Defines all operations for managing withdrawal data.
 * Implementations handle specific infrastructure details.
 *
 * @example
 * ```typescript
 * class HederaWithdrawRepository implements IWithdrawRepository {
 *   async findById(id: string): Promise<Withdrawal | null> {
 *     // Fetch from Hedera blockchain
 *     return Withdrawal.fromHedera(data)
 *   }
 * }
 * ```
 */
export interface IWithdrawRepository {
    /**
     * Find a withdrawal by its ID
     *
     * @param id - The withdrawal ID (schedule ID on Hedera)
     * @returns The withdrawal if found, null otherwise
     *
     * @example
     * ```typescript
     * const withdrawal = await repository.findById('0.0.123456@1234567890.000000000')
     * if (withdrawal) {
     *   logger.info(`Withdrawal type: ${withdrawal.type}`)
     * }
     * ```
     */
    findById(id: string): Promise<Withdrawal | null>

    /**
     * Find withdrawals by user account ID
     *
     * @param userAccountId - The Hedera account ID of the user
     * @param options - Pagination and filtering options
     * @returns Array of withdrawals
     *
     * @example
     * ```typescript
     * const withdrawals = await repository.findByUser('0.0.12345', {
     *   limit: 20,
     *   sortOrder: 'desc'
     * })
     * ```
     */
    findByUser(
        userAccountId: string,
        options?: WithdrawalPaginationOptions
    ): Promise<Withdrawal[]>

    /**
     * Find withdrawals with advanced filtering
     *
     * @param filters - Filter criteria
     * @param options - Pagination options
     * @returns Array of withdrawals matching the filters
     *
     * @example
     * ```typescript
     * const instantWithdrawals = await repository.findMany({
     *   type: 'instant',
     *   status: 'completed'
     * })
     * ```
     */
    findMany(
        filters: WithdrawalFilterOptions,
        options?: WithdrawalPaginationOptions
    ): Promise<Withdrawal[]>

    /**
     * Find pending withdrawals that need processing
     *
     * @returns Array of pending withdrawals
     *
     * @example
     * ```typescript
     * const pending = await repository.findPending()
     * for (const withdrawal of pending) {
     *   await processWithdrawal(withdrawal)
     * }
     * ```
     */
    findPending(): Promise<Withdrawal[]>

    /**
     * Save a new withdrawal
     *
     * @param withdrawal - The withdrawal to save
     * @returns The saved withdrawal with updated metadata
     *
     * @example
     * ```typescript
     * const withdrawal = Withdrawal.createInstant('0.0.12345', 50, rate, fee)
     * const saved = await repository.save(withdrawal)
     * logger.info(`Withdrawal saved with ID: ${saved.id}`)
     * ```
     */
    save(withdrawal: Withdrawal): Promise<Withdrawal>

    /**
     * Update an existing withdrawal
     *
     * @param withdrawal - The withdrawal to update
     * @returns The updated withdrawal
     *
     * @example
     * ```typescript
     * const withdrawal = await repository.findById(id)
     * const completed = withdrawal.complete(txId)
     * await repository.update(completed)
     * ```
     */
    update(withdrawal: Withdrawal): Promise<Withdrawal>

    /**
     * Delete a withdrawal (soft delete)
     *
     * @param id - The withdrawal ID to delete
     *
     * @example
     * ```typescript
     * await repository.delete('0.0.123456@1234567890.000000000')
     * ```
     */
    delete(id: string): Promise<void>

    /**
     * Count withdrawals matching the filters
     *
     * @param filters - Filter criteria
     * @returns Number of withdrawals matching the filters
     *
     * @example
     * ```typescript
     * const instantCount = await repository.count({ type: 'instant' })
     * logger.info(`Total instant withdrawals: ${instantCount}`)
     * ```
     */
    count(filters?: WithdrawalFilterOptions): Promise<number>
}
