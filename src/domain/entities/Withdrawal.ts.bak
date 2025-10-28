/**
 * Withdrawal Entity
 *
 * Domain entity representing a withdrawal operation in the HBANK Protocol.
 * This entity contains all business logic related to withdrawals and ensures
 * business rules are enforced.
 *
 * @module domain/entities
 */

import { v4 as uuid } from 'uuid'
import { Money } from '@/domain/value-objects/Money'
import { Rate } from '@/domain/value-objects/Rate'
import { AccountId } from '@/domain/value-objects/AccountId'
import {
    WithdrawalError,
    InvalidStateError,
    InvalidValueError,
    BusinessRuleViolationError,
} from '@/domain/errors/DomainError'

/**
 * Withdrawal status enumeration
 */
export enum WithdrawalStatus {
    /** Withdrawal has been created but not yet processed */
    Pending = 'pending',

    /** Withdrawal has been scheduled on Hedera */
    Scheduled = 'scheduled',

    /** Withdrawal has been executed successfully */
    Completed = 'completed',

    /** Withdrawal has failed or been cancelled */
    Failed = 'failed',
}

/**
 * Withdrawal type enumeration
 */
export enum WithdrawalType {
    /** Instant withdrawal (0.5% fee, immediate) */
    Instant = 'instant',

    /** Standard withdrawal (no fee, batch processed) */
    Standard = 'standard',
}

/**
 * Instant withdrawal constraints
 */
const INSTANT_WITHDRAW_CONFIG = {
    /** Minimum amount for instant withdrawal (in HUSD) */
    MIN_AMOUNT: 0.01,

    /** Maximum amount for instant withdrawal (in HUSD) */
    MAX_AMOUNT: 10000,

    /** Fee percentage (0.5%) */
    FEE_PERCENTAGE: 0.005,
}

/**
 * Withdrawal Entity
 *
 * Represents a withdrawal transaction where a user burns HUSD tokens
 * and receives USDC based on the current exchange rate.
 *
 * This is an immutable entity - all mutations return new instances.
 *
 * @example
 * ```typescript
 * // Create instant withdrawal
 * const withdrawal = Withdrawal.createInstant('0.0.12345', 50, rate)
 *
 * // Create standard withdrawal
 * const withdrawal = Withdrawal.createStandard('0.0.12345', 100, rate)
 *
 * // Execute withdrawal
 * const completed = withdrawal.complete('0.0.987654@9876543210.000000000')
 *
 * // Calculate amounts
 * const usdc = withdrawal.calculateUsdcAmount()
 * const fee = withdrawal.calculateFeeAmount()
 * ```
 */
export class Withdrawal {
    /**
     * Private constructor to enforce factory methods
     */
    private constructor(
        /** Unique identifier for this withdrawal */
        public readonly id: string,

        /** User's Hedera account ID */
        public readonly userAccountId: AccountId,

        /** Amount of HUSD being withdrawn */
        public readonly amountHusd: Money,

        /** Exchange rate used for this withdrawal */
        public readonly rate: Rate,

        /** Type of withdrawal (instant or standard) */
        public readonly type: WithdrawalType,

        /** Current status of the withdrawal */
        public readonly status: WithdrawalStatus,

        /** Fee amount (only for instant withdrawals) */
        public readonly feeAmount?: Money,

        /** Hedera schedule ID (if scheduled) */
        public readonly scheduleId?: string,

        /** When the withdrawal was created */
        public readonly createdAt: Date = new Date(),

        /** When the withdrawal was completed */
        public readonly completedAt?: Date,

        /** Transaction ID (if completed) */
        public readonly transactionId?: string,

        /** Memo/notes for the withdrawal */
        public readonly memo?: string
    ) {
        // Validate that amount is in HUSD
        if (amountHusd.currency !== 'HUSD') {
            throw new InvalidValueError('Withdrawal amount must be in HUSD', {
                currency: amountHusd.currency,
            })
        }

        // Validate fee amount currency if present
        if (feeAmount && feeAmount.currency !== 'HUSD') {
            throw new InvalidValueError('Fee amount must be in HUSD', {
                currency: feeAmount.currency,
            })
        }
    }

    // ========================================
    // Factory Methods
    // ========================================

    /**
     * Create instant withdrawal
     *
     * @param userAccountId - User's Hedera account ID
     * @param amountHusd - Amount to withdraw in HUSD
     * @param rate - Exchange rate to use
     * @param memo - Optional memo
     * @returns New Withdrawal instance
     *
     * @throws {WithdrawalError} If amount violates instant withdrawal limits
     * @throws {InvalidValueError} If rate has expired
     *
     * @example
     * ```typescript
     * const withdrawal = Withdrawal.createInstant('0.0.12345', 50, rate)
     * console.log(`Fee: ${withdrawal.feeAmount?.toDisplayString()}`)
     * ```
     */
    static createInstant(
        userAccountId: string,
        amountHusd: number,
        rate: Rate,
        memo?: string
    ): Withdrawal {
        // Validate amount
        if (amountHusd <= 0) {
            throw new WithdrawalError('Withdrawal amount must be positive', { amountHusd })
        }

        // Validate instant withdrawal limits
        if (amountHusd < INSTANT_WITHDRAW_CONFIG.MIN_AMOUNT) {
            throw new BusinessRuleViolationError(
                `Instant withdrawal must be at least ${INSTANT_WITHDRAW_CONFIG.MIN_AMOUNT} HUSD`,
                { amountHusd, minAmount: INSTANT_WITHDRAW_CONFIG.MIN_AMOUNT }
            )
        }

        if (amountHusd > INSTANT_WITHDRAW_CONFIG.MAX_AMOUNT) {
            throw new BusinessRuleViolationError(
                `Instant withdrawal cannot exceed ${INSTANT_WITHDRAW_CONFIG.MAX_AMOUNT} HUSD`,
                { amountHusd, maxAmount: INSTANT_WITHDRAW_CONFIG.MAX_AMOUNT }
            )
        }

        // Validate rate is not expired
        if (rate.isExpired()) {
            throw new WithdrawalError('Cannot create withdrawal with expired rate', {
                sequenceNumber: rate.sequenceNumber,
                validUntil: rate.validUntil,
            })
        }

        // Calculate fee
        const feeAmount = Money.husd(amountHusd * INSTANT_WITHDRAW_CONFIG.FEE_PERCENTAGE)

        return new Withdrawal(
            uuid(),
            AccountId.from(userAccountId),
            Money.husd(amountHusd),
            rate,
            WithdrawalType.Instant,
            WithdrawalStatus.Pending,
            feeAmount,
            undefined,
            new Date(),
            undefined,
            undefined,
            memo
        )
    }

    /**
     * Create standard withdrawal
     *
     * @param userAccountId - User's Hedera account ID
     * @param amountHusd - Amount to withdraw in HUSD
     * @param rate - Exchange rate to use
     * @param memo - Optional memo
     * @returns New Withdrawal instance
     *
     * @throws {WithdrawalError} If amount is invalid
     * @throws {InvalidValueError} If rate has expired
     *
     * @example
     * ```typescript
     * const withdrawal = Withdrawal.createStandard('0.0.12345', 100, rate)
     * ```
     */
    static createStandard(
        userAccountId: string,
        amountHusd: number,
        rate: Rate,
        memo?: string
    ): Withdrawal {
        // Validate amount
        if (amountHusd <= 0) {
            throw new WithdrawalError('Withdrawal amount must be positive', { amountHusd })
        }

        // Validate rate is not expired
        if (rate.isExpired()) {
            throw new WithdrawalError('Cannot create withdrawal with expired rate', {
                sequenceNumber: rate.sequenceNumber,
                validUntil: rate.validUntil,
            })
        }

        return new Withdrawal(
            uuid(),
            AccountId.from(userAccountId),
            Money.husd(amountHusd),
            rate,
            WithdrawalType.Standard,
            WithdrawalStatus.Pending,
            undefined, // No fee for standard withdrawals
            undefined,
            new Date(),
            undefined,
            undefined,
            memo
        )
    }

    /**
     * Reconstitute withdrawal from data source
     *
     * @param data - Withdrawal data
     * @returns Withdrawal instance
     */
    static fromData(data: {
        id: string
        userAccountId: string
        amountHusd: number
        rate: Rate
        type: WithdrawalType
        status: WithdrawalStatus
        feeAmount?: number
        scheduleId?: string
        createdAt: Date
        completedAt?: Date
        transactionId?: string
        memo?: string
    }): Withdrawal {
        return new Withdrawal(
            data.id,
            AccountId.from(data.userAccountId),
            Money.husd(data.amountHusd),
            data.rate,
            data.type,
            data.status,
            data.feeAmount ? Money.husd(data.feeAmount) : undefined,
            data.scheduleId,
            data.createdAt,
            data.completedAt,
            data.transactionId,
            data.memo
        )
    }

    // ========================================
    // Business Logic Methods
    // ========================================

    /**
     * Calculate the amount of USDC to be sent to user
     *
     * @returns USDC amount based on the exchange rate (after fees for instant)
     *
     * @example
     * ```typescript
     * const withdrawal = Withdrawal.createInstant('0.0.12345', 100, rate)
     * const usdc = withdrawal.calculateUsdcAmount()
     * console.log(usdc.toDisplayString()) // Net amount after fee
     * ```
     */
    calculateUsdcAmount(): Money {
        // For instant withdrawals, subtract fee first
        let husdAfterFee = this.amountHusd

        if (this.type === WithdrawalType.Instant && this.feeAmount) {
            husdAfterFee = this.amountHusd.subtract(this.feeAmount)
        }

        // Convert to USDC using the rate
        return husdAfterFee.convertTo('USDC', this.rate)
    }

    /**
     * Calculate the fee amount (instant withdrawals only)
     *
     * @returns Fee amount or zero for standard withdrawals
     */
    calculateFeeAmount(): Money {
        return this.feeAmount || Money.zero('HUSD')
    }

    /**
     * Calculate net amount after fees
     *
     * @returns Net HUSD amount that will be burned
     */
    calculateNetAmount(): Money {
        if (this.feeAmount) {
            return this.amountHusd.subtract(this.feeAmount)
        }
        return this.amountHusd
    }

    /**
     * Schedule this withdrawal on Hedera
     *
     * @param scheduleId - Hedera schedule ID
     * @returns New Withdrawal instance with scheduled status
     *
     * @throws {InvalidStateError} If withdrawal is not pending
     */
    schedule(scheduleId: string): Withdrawal {
        if (this.status !== WithdrawalStatus.Pending) {
            throw new InvalidStateError('Can only schedule pending withdrawals', {
                currentStatus: this.status,
            })
        }

        return new Withdrawal(
            this.id,
            this.userAccountId,
            this.amountHusd,
            this.rate,
            this.type,
            WithdrawalStatus.Scheduled,
            this.feeAmount,
            scheduleId,
            this.createdAt,
            undefined,
            undefined,
            this.memo
        )
    }

    /**
     * Complete this withdrawal
     *
     * @param transactionId - Hedera transaction ID
     * @returns New Withdrawal instance with completed status
     *
     * @throws {InvalidStateError} If withdrawal is not pending or scheduled
     */
    complete(transactionId: string): Withdrawal {
        if (
            this.status !== WithdrawalStatus.Pending &&
            this.status !== WithdrawalStatus.Scheduled
        ) {
            throw new InvalidStateError(
                'Can only complete pending or scheduled withdrawals',
                { currentStatus: this.status }
            )
        }

        return new Withdrawal(
            this.id,
            this.userAccountId,
            this.amountHusd,
            this.rate,
            this.type,
            WithdrawalStatus.Completed,
            this.feeAmount,
            this.scheduleId,
            this.createdAt,
            new Date(),
            transactionId,
            this.memo
        )
    }

    /**
     * Mark this withdrawal as failed
     *
     * @param reason - Reason for failure
     * @returns New Withdrawal instance with failed status
     */
    fail(reason?: string): Withdrawal {
        const failMemo = reason ? `${this.memo || ''} [Failed: ${reason}]` : this.memo

        return new Withdrawal(
            this.id,
            this.userAccountId,
            this.amountHusd,
            this.rate,
            this.type,
            WithdrawalStatus.Failed,
            this.feeAmount,
            this.scheduleId,
            this.createdAt,
            undefined,
            undefined,
            failMemo
        )
    }

    // ========================================
    // Query Methods
    // ========================================

    /**
     * Check if withdrawal is instant type
     */
    isInstant(): boolean {
        return this.type === WithdrawalType.Instant
    }

    /**
     * Check if withdrawal is standard type
     */
    isStandard(): boolean {
        return this.type === WithdrawalType.Standard
    }

    /**
     * Check if withdrawal is pending
     */
    isPending(): boolean {
        return this.status === WithdrawalStatus.Pending
    }

    /**
     * Check if withdrawal is scheduled
     */
    isScheduled(): boolean {
        return this.status === WithdrawalStatus.Scheduled
    }

    /**
     * Check if withdrawal is completed
     */
    isCompleted(): boolean {
        return this.status === WithdrawalStatus.Completed
    }

    /**
     * Check if withdrawal has failed
     */
    isFailed(): boolean {
        return this.status === WithdrawalStatus.Failed
    }

    /**
     * Check if rate has expired
     */
    isRateExpired(): boolean {
        return this.rate.isExpired()
    }

    // ========================================
    // Conversion Methods
    // ========================================

    /**
     * Convert to JSON representation
     */
    toJSON(): {
        id: string
        userAccountId: string
        amountHusd: number
        amountUsdc: number
        feeAmount?: number
        netAmount: number
        rate: ReturnType<Rate['toJSON']>
        type: WithdrawalType
        status: WithdrawalStatus
        scheduleId?: string
        createdAt: string
        completedAt?: string
        transactionId?: string
        memo?: string
    } {
        const usdcAmount = this.calculateUsdcAmount()
        const netAmount = this.calculateNetAmount()

        return {
            id: this.id,
            userAccountId: this.userAccountId.toString(),
            amountHusd: this.amountHusd.amount,
            amountUsdc: usdcAmount.amount,
            feeAmount: this.feeAmount?.amount,
            netAmount: netAmount.amount,
            rate: this.rate.toJSON(),
            type: this.type,
            status: this.status,
            scheduleId: this.scheduleId,
            createdAt: this.createdAt.toISOString(),
            completedAt: this.completedAt?.toISOString(),
            transactionId: this.transactionId,
            memo: this.memo,
        }
    }

    /**
     * Convert to display summary
     */
    toDisplaySummary(): string {
        const usdc = this.calculateUsdcAmount()
        const typeStr = this.isInstant() ? 'Instant' : 'Standard'
        const feeStr = this.feeAmount
            ? ` (fee: ${this.feeAmount.toDisplayString()})`
            : ''
        return `${typeStr} Withdrawal ${this.id}: ${this.amountHusd.toDisplayString()} → ${usdc.toDisplayString()}${feeStr} (${this.status})`
    }
}
