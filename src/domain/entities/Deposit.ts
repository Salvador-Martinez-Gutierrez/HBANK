/**
 * Deposit Entity
 *
 * Domain entity representing a deposit operation in the HBANK Protocol.
 * This entity contains all business logic related to deposits and ensures
 * business rules are enforced.
 *
 * @module domain/entities
 */

import { v4 as uuid } from 'uuid'
import { Money } from '@/domain/value-objects/Money'
import { Rate } from '@/domain/value-objects/Rate'
import { AccountId } from '@/domain/value-objects/AccountId'
import {
    DepositError,
    InvalidStateError,
    InvalidValueError,
} from '@/domain/errors/DomainError'

/**
 * Deposit status enumeration
 */
export enum DepositStatus {
    /** Deposit has been created but not yet scheduled on Hedera */
    Pending = 'pending',

    /** Deposit has been scheduled on Hedera, waiting for user signature */
    Scheduled = 'scheduled',

    /** Deposit has been executed successfully */
    Completed = 'completed',

    /** Deposit has failed or been cancelled */
    Failed = 'failed',
}

/**
 * Deposit Entity
 *
 * Represents a deposit transaction where a user deposits USDC
 * and receives HUSD tokens based on the current exchange rate.
 *
 * This is an immutable entity - all mutations return new instances.
 *
 * @example
 * ```typescript
 * // Create new deposit
 * const deposit = Deposit.create('0.0.12345', 100, rate)
 *
 * // Schedule on Hedera
 * const scheduled = deposit.schedule('0.0.123456@1234567890.000000000')
 *
 * // Execute deposit
 * const completed = scheduled.execute('0.0.987654@9876543210.000000000')
 *
 * // Calculate HUSD amount
 * const husd = deposit.calculateHusdAmount()
 * logger.info(`Will receive: ${husd.toDisplayString()}`)
 * ```
 */
export class Deposit {
    /**
     * Private constructor to enforce factory methods
     */
    private constructor(
        /** Unique identifier for this deposit */
        public readonly id: string,

        /** User's Hedera account ID */
        public readonly userAccountId: AccountId,

        /** Amount of USDC being deposited */
        public readonly amountUsdc: Money,

        /** Exchange rate used for this deposit */
        public readonly rate: Rate,

        /** Current status of the deposit */
        public readonly status: DepositStatus,

        /** Hedera schedule ID (if scheduled) */
        public readonly scheduleId?: string,

        /** When the deposit was created */
        public readonly createdAt: Date = new Date(),

        /** When the deposit was executed */
        public readonly executedAt?: Date,

        /** Transaction ID (if executed) */
        public readonly transactionId?: string,

        /** Memo/notes for the deposit */
        public readonly memo?: string
    ) {
        // Validate that amount is in USDC
        if (amountUsdc.currency !== 'USDC') {
            throw new InvalidValueError('Deposit amount must be in USDC', {
                currency: amountUsdc.currency,
            })
        }
    }

    // ========================================
    // Factory Methods
    // ========================================

    /**
     * Create a new pending deposit
     *
     * @param userAccountId - User's Hedera account ID
     * @param amountUsdc - Amount to deposit in USDC
     * @param rate - Exchange rate to use
     * @param memo - Optional memo
     * @returns New Deposit instance
     *
     * @throws {DepositError} If amount is invalid
     * @throws {InvalidValueError} If rate has expired
     *
     * @example
     * ```typescript
     * const deposit = Deposit.create('0.0.12345', 100, rate, 'My deposit')
     * ```
     */
    static create(
        userAccountId: string,
        amountUsdc: number,
        rate: Rate,
        memo?: string
    ): Deposit {
        // Validate amount
        if (amountUsdc <= 0) {
            throw new DepositError('Deposit amount must be positive', { amountUsdc })
        }

        // Validate rate is not expired
        if (rate.isExpired()) {
            throw new DepositError('Cannot create deposit with expired rate', {
                sequenceNumber: rate.sequenceNumber,
                validUntil: rate.validUntil,
            })
        }

        return new Deposit(
            uuid(),
            AccountId.from(userAccountId),
            Money.usdc(amountUsdc),
            rate,
            DepositStatus.Pending,
            undefined,
            new Date(),
            undefined,
            undefined,
            memo
        )
    }

    /**
     * Reconstitute deposit from data source
     *
     * @param data - Deposit data
     * @returns Deposit instance
     *
     * @example
     * ```typescript
     * const deposit = Deposit.fromData({
     *   id: 'uuid',
     *   userAccountId: '0.0.12345',
     *   amountUsdc: 100,
     *   rate: rateData,
     *   status: 'completed',
     *   // ...
     * })
     * ```
     */
    static fromData(data: {
        id: string
        userAccountId: string
        amountUsdc: number
        rate: Rate
        status: DepositStatus
        scheduleId?: string
        createdAt: Date
        executedAt?: Date
        transactionId?: string
        memo?: string
    }): Deposit {
        return new Deposit(
            data.id,
            AccountId.from(data.userAccountId),
            Money.usdc(data.amountUsdc),
            data.rate,
            data.status,
            data.scheduleId,
            data.createdAt,
            data.executedAt,
            data.transactionId,
            data.memo
        )
    }

    // ========================================
    // Business Logic Methods
    // ========================================

    /**
     * Calculate the amount of HUSD to be minted
     *
     * @returns HUSD amount based on the exchange rate
     *
     * @example
     * ```typescript
     * const deposit = Deposit.create('0.0.12345', 100, rate)
     * const husd = deposit.calculateHusdAmount()
     * logger.info(husd.toDisplayString()) // "99.502 HUSD"
     * ```
     */
    calculateHusdAmount(): Money {
        return this.amountUsdc.convertTo('HUSD', this.rate)
    }

    /**
     * Schedule this deposit on Hedera
     *
     * @param scheduleId - Hedera schedule ID
     * @returns New Deposit instance with scheduled status
     *
     * @throws {InvalidStateError} If deposit is not pending
     *
     * @example
     * ```typescript
     * const scheduled = deposit.schedule('0.0.123456@1234567890.000000000')
     * ```
     */
    schedule(scheduleId: string): Deposit {
        if (this.status !== DepositStatus.Pending) {
            throw new InvalidStateError('Can only schedule pending deposits', {
                currentStatus: this.status,
            })
        }

        return new Deposit(
            this.id,
            this.userAccountId,
            this.amountUsdc,
            this.rate,
            DepositStatus.Scheduled,
            scheduleId,
            this.createdAt,
            undefined,
            undefined,
            this.memo
        )
    }

    /**
     * Execute this deposit
     *
     * @param transactionId - Hedera transaction ID
     * @returns New Deposit instance with completed status
     *
     * @throws {InvalidStateError} If deposit is not scheduled
     *
     * @example
     * ```typescript
     * const completed = deposit.execute('0.0.987654@9876543210.000000000')
     * ```
     */
    execute(transactionId: string): Deposit {
        if (this.status !== DepositStatus.Scheduled) {
            throw new InvalidStateError('Can only execute scheduled deposits', {
                currentStatus: this.status,
            })
        }

        return new Deposit(
            this.id,
            this.userAccountId,
            this.amountUsdc,
            this.rate,
            DepositStatus.Completed,
            this.scheduleId,
            this.createdAt,
            new Date(),
            transactionId,
            this.memo
        )
    }

    /**
     * Mark this deposit as failed
     *
     * @param reason - Reason for failure
     * @returns New Deposit instance with failed status
     *
     * @example
     * ```typescript
     * const failed = deposit.fail('Insufficient balance')
     * ```
     */
    fail(reason?: string): Deposit {
        const failMemo = reason ? `${this.memo ?? ''} [Failed: ${reason}]` : this.memo

        return new Deposit(
            this.id,
            this.userAccountId,
            this.amountUsdc,
            this.rate,
            DepositStatus.Failed,
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
     * Check if deposit is pending
     *
     * @returns True if status is pending
     */
    isPending(): boolean {
        return this.status === DepositStatus.Pending
    }

    /**
     * Check if deposit is scheduled
     *
     * @returns True if status is scheduled
     */
    isScheduled(): boolean {
        return this.status === DepositStatus.Scheduled
    }

    /**
     * Check if deposit is completed
     *
     * @returns True if status is completed
     */
    isCompleted(): boolean {
        return this.status === DepositStatus.Completed
    }

    /**
     * Check if deposit has failed
     *
     * @returns True if status is failed
     */
    isFailed(): boolean {
        return this.status === DepositStatus.Failed
    }

    /**
     * Check if rate has expired
     *
     * @returns True if the deposit's rate has expired
     */
    isRateExpired(): boolean {
        return this.rate.isExpired()
    }

    // ========================================
    // Conversion Methods
    // ========================================

    /**
     * Convert to JSON representation
     *
     * @returns JSON object
     */
    toJSON(): {
        id: string
        userAccountId: string
        amountUsdc: number
        amountHusd: number
        rate: ReturnType<Rate['toJSON']>
        status: DepositStatus
        scheduleId?: string
        createdAt: string
        executedAt?: string
        transactionId?: string
        memo?: string
    } {
        const husdAmount = this.calculateHusdAmount()

        return {
            id: this.id,
            userAccountId: this.userAccountId.toString(),
            amountUsdc: this.amountUsdc.amount,
            amountHusd: husdAmount.amount,
            rate: this.rate.toJSON(),
            status: this.status,
            scheduleId: this.scheduleId,
            createdAt: this.createdAt.toISOString(),
            executedAt: this.executedAt?.toISOString(),
            transactionId: this.transactionId,
            memo: this.memo,
        }
    }

    /**
     * Convert to display summary
     *
     * @returns Human-readable summary
     */
    toDisplaySummary(): string {
        const husd = this.calculateHusdAmount()
        return `Deposit ${this.id}: ${this.amountUsdc.toDisplayString()} → ${husd.toDisplayString()} (${this.status})`
    }
}
