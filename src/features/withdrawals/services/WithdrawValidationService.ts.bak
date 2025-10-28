/**
 * Withdrawal Validation Service
 *
 * This service handles all validation logic for withdrawal operations.
 * It encapsulates business rules and validation constraints specific
 * to withdrawals (both instant and standard) in the HBANK Protocol.
 *
 * @module features/withdrawals/services
 */

import { injectable, inject } from 'inversify'
import { TYPES } from '@/core/di/types'
import type { ILogger } from '@/core/logging/Logger'
import { AccountId } from '@/domain/value-objects/AccountId'
import { Rate } from '@/domain/value-objects/Rate'
import { WithdrawalType } from '@/domain/entities/Withdrawal'
import {
    BusinessRuleViolationError,
    ExpiredRateError,
    InsufficientBalanceError,
} from '@/domain/errors/DomainError'

/**
 * Withdrawal validation constraints
 */
const WITHDRAWAL_CONSTRAINTS = {
    /** Minimum withdrawal amount in HUSD */
    MIN_AMOUNT: 0.01,

    /** Maximum withdrawal amount in HUSD */
    MAX_AMOUNT: 1_000_000,

    /** Instant withdrawal specific constraints */
    INSTANT: {
        /** Minimum instant withdrawal in HUSD */
        MIN_AMOUNT: 0.01,

        /** Maximum instant withdrawal in HUSD */
        MAX_AMOUNT: 10_000,

        /** Fee percentage (0.5%) */
        FEE_PERCENTAGE: 0.005,
    },
}

/**
 * Validation result type
 */
export interface ValidationResult {
    /** Whether validation passed */
    isValid: boolean

    /** Error message if validation failed */
    error?: string

    /** Additional context about the validation */
    context?: Record<string, unknown>
}

/**
 * Withdrawal Validation Service
 *
 * Provides comprehensive validation for withdrawal operations.
 * Handles both instant and standard withdrawal validations.
 *
 * @example
 * ```typescript
 * const validationService = container.get<WithdrawValidationService>(
 *   TYPES.WithdrawValidationService
 * )
 *
 * // Validate instant withdrawal
 * validationService.validateWithdrawalAmount(50, WithdrawalType.Instant)
 * validationService.validateAccountId('0.0.12345')
 * validationService.validateRate(rate)
 * ```
 */
@injectable()
export class WithdrawValidationService {
    constructor(@inject(TYPES.Logger) private logger: ILogger) {}

    /**
     * Validate withdrawal amount based on type
     *
     * @param amount - Amount in HUSD to validate
     * @param type - Withdrawal type (instant or standard)
     * @throws {BusinessRuleViolationError} If amount is invalid
     *
     * @example
     * ```typescript
     * validationService.validateWithdrawalAmount(50, WithdrawalType.Instant) // OK
     * validationService.validateWithdrawalAmount(20000, WithdrawalType.Instant) // Throws
     * validationService.validateWithdrawalAmount(20000, WithdrawalType.Standard) // OK
     * ```
     */
    validateWithdrawalAmount(amount: number, type: WithdrawalType): void {
        this.logger.debug('Validating withdrawal amount', { amount, type })

        if (amount <= 0) {
            throw new BusinessRuleViolationError('Withdrawal amount must be positive', {
                amount,
            })
        }

        if (amount < WITHDRAWAL_CONSTRAINTS.MIN_AMOUNT) {
            throw new BusinessRuleViolationError(
                `Withdrawal amount must be at least ${WITHDRAWAL_CONSTRAINTS.MIN_AMOUNT} HUSD`,
                { amount, minAmount: WITHDRAWAL_CONSTRAINTS.MIN_AMOUNT }
            )
        }

        if (!Number.isFinite(amount)) {
            throw new BusinessRuleViolationError(
                'Withdrawal amount must be a finite number',
                { amount }
            )
        }

        // Additional validation for instant withdrawals
        if (type === WithdrawalType.Instant) {
            this.validateInstantWithdrawalAmount(amount)
        }

        // Standard withdrawal max amount check
        if (type === WithdrawalType.Standard && amount > WITHDRAWAL_CONSTRAINTS.MAX_AMOUNT) {
            throw new BusinessRuleViolationError(
                `Standard withdrawal cannot exceed ${WITHDRAWAL_CONSTRAINTS.MAX_AMOUNT} HUSD`,
                { amount, maxAmount: WITHDRAWAL_CONSTRAINTS.MAX_AMOUNT }
            )
        }

        this.logger.debug('Withdrawal amount is valid', { amount, type })
    }

    /**
     * Validate instant withdrawal specific constraints
     *
     * @param amount - Amount in HUSD
     * @throws {BusinessRuleViolationError} If amount violates instant withdrawal limits
     *
     * @example
     * ```typescript
     * validationService.validateInstantWithdrawalAmount(50) // OK
     * validationService.validateInstantWithdrawalAmount(20000) // Throws
     * ```
     */
    validateInstantWithdrawalAmount(amount: number): void {
        this.logger.debug('Validating instant withdrawal amount', { amount })

        if (amount < WITHDRAWAL_CONSTRAINTS.INSTANT.MIN_AMOUNT) {
            throw new BusinessRuleViolationError(
                `Instant withdrawal must be at least ${WITHDRAWAL_CONSTRAINTS.INSTANT.MIN_AMOUNT} HUSD`,
                { amount, minAmount: WITHDRAWAL_CONSTRAINTS.INSTANT.MIN_AMOUNT }
            )
        }

        if (amount > WITHDRAWAL_CONSTRAINTS.INSTANT.MAX_AMOUNT) {
            throw new BusinessRuleViolationError(
                `Instant withdrawal cannot exceed ${WITHDRAWAL_CONSTRAINTS.INSTANT.MAX_AMOUNT} HUSD`,
                { amount, maxAmount: WITHDRAWAL_CONSTRAINTS.INSTANT.MAX_AMOUNT }
            )
        }

        this.logger.debug('Instant withdrawal amount is valid', { amount })
    }

    /**
     * Validate Hedera account ID format
     *
     * @param accountId - Account ID string to validate
     * @throws {InvalidAccountError} If account ID is invalid
     *
     * @example
     * ```typescript
     * validationService.validateAccountId('0.0.12345') // OK
     * validationService.validateAccountId('invalid') // Throws error
     * ```
     */
    validateAccountId(accountId: string): void {
        this.logger.debug('Validating account ID', { accountId })

        try {
            AccountId.from(accountId)
        } catch (error) {
            this.logger.warn('Invalid account ID format', { accountId })
            throw error
        }

        this.logger.debug('Account ID is valid', { accountId })
    }

    /**
     * Validate exchange rate
     *
     * @param rate - Rate to validate
     * @throws {ExpiredRateError} If rate has expired
     * @throws {BusinessRuleViolationError} If rate is invalid
     *
     * @example
     * ```typescript
     * const rate = Rate.create(1.005, '123')
     * validationService.validateRate(rate) // OK if not expired
     * ```
     */
    validateRate(rate: Rate): void {
        this.logger.debug('Validating rate', {
            sequenceNumber: rate.sequenceNumber,
            value: rate.value,
        })

        if (rate.isExpired()) {
            this.logger.warn('Rate has expired', {
                sequenceNumber: rate.sequenceNumber,
                validUntil: rate.validUntil,
            })

            throw new ExpiredRateError('Cannot use expired rate for withdrawal', {
                sequenceNumber: rate.sequenceNumber,
                validUntil: rate.validUntil,
                now: new Date(),
            })
        }

        if (rate.value <= 0 || rate.value > 2) {
            this.logger.warn('Rate value is out of reasonable bounds', { rate: rate.value })

            throw new BusinessRuleViolationError('Rate value is invalid', {
                rate: rate.value,
            })
        }

        this.logger.debug('Rate is valid', { sequenceNumber: rate.sequenceNumber })
    }

    /**
     * Validate user has sufficient HUSD balance
     *
     * @param userBalance - User's HUSD balance
     * @param withdrawalAmount - Amount user wants to withdraw
     * @throws {InsufficientBalanceError} If balance is insufficient
     *
     * @example
     * ```typescript
     * validationService.validateBalance(500, 100) // OK
     * validationService.validateBalance(50, 100) // Throws error
     * ```
     */
    validateBalance(userBalance: number, withdrawalAmount: number): void {
        this.logger.debug('Validating balance', { userBalance, withdrawalAmount })

        if (userBalance < withdrawalAmount) {
            this.logger.warn('Insufficient balance', { userBalance, withdrawalAmount })

            throw new InsufficientBalanceError(
                'Insufficient HUSD balance for withdrawal',
                {
                    balance: userBalance,
                    required: withdrawalAmount,
                    shortfall: withdrawalAmount - userBalance,
                }
            )
        }

        this.logger.debug('Balance is sufficient', { userBalance, withdrawalAmount })
    }

    /**
     * Calculate and validate withdrawal fee
     *
     * @param amount - Withdrawal amount in HUSD
     * @param type - Withdrawal type
     * @returns Fee amount (0 for standard withdrawals)
     *
     * @example
     * ```typescript
     * const fee = validationService.calculateFee(100, WithdrawalType.Instant) // 0.5
     * const noFee = validationService.calculateFee(100, WithdrawalType.Standard) // 0
     * ```
     */
    calculateFee(amount: number, type: WithdrawalType): number {
        if (type === WithdrawalType.Instant) {
            const fee = amount * WITHDRAWAL_CONSTRAINTS.INSTANT.FEE_PERCENTAGE
            this.logger.debug('Calculated instant withdrawal fee', { amount, fee })
            return fee
        }

        this.logger.debug('No fee for standard withdrawal', { amount })
        return 0
    }

    /**
     * Calculate net amount after fees
     *
     * @param amount - Withdrawal amount in HUSD
     * @param type - Withdrawal type
     * @returns Net amount user will receive
     *
     * @example
     * ```typescript
     * const net = validationService.calculateNetAmount(100, WithdrawalType.Instant) // 99.5
     * const net = validationService.calculateNetAmount(100, WithdrawalType.Standard) // 100
     * ```
     */
    calculateNetAmount(amount: number, type: WithdrawalType): number {
        const fee = this.calculateFee(amount, type)
        const netAmount = amount - fee

        this.logger.debug('Calculated net withdrawal amount', { amount, fee, netAmount })
        return netAmount
    }

    /**
     * Validate complete withdrawal request
     *
     * @param params - Withdrawal parameters to validate
     * @throws Various domain errors if validation fails
     *
     * @example
     * ```typescript
     * validationService.validateWithdrawalRequest({
     *   userAccountId: '0.0.12345',
     *   amount: 50,
     *   type: WithdrawalType.Instant,
     *   rate: rate,
     *   userBalance: 500
     * })
     * ```
     */
    validateWithdrawalRequest(params: {
        userAccountId: string
        amount: number
        type: WithdrawalType
        rate: Rate
        userBalance?: number
    }): void {
        this.logger.info('Validating complete withdrawal request', {
            userAccountId: params.userAccountId,
            amount: params.amount,
            type: params.type,
        })

        this.validateAccountId(params.userAccountId)
        this.validateWithdrawalAmount(params.amount, params.type)
        this.validateRate(params.rate)

        if (params.userBalance !== undefined) {
            this.validateBalance(params.userBalance, params.amount)
        }

        this.logger.info('Withdrawal request is valid', {
            userAccountId: params.userAccountId,
            amount: params.amount,
            type: params.type,
        })
    }

    /**
     * Soft validation (returns result instead of throwing)
     *
     * @param params - Withdrawal parameters to validate
     * @returns Validation result
     *
     * @example
     * ```typescript
     * const result = validationService.softValidate({
     *   userAccountId: '0.0.12345',
     *   amount: 50,
     *   type: WithdrawalType.Instant,
     *   rate: rate
     * })
     *
     * if (!result.isValid) {
     *   console.log(result.error)
     * }
     * ```
     */
    softValidate(params: {
        userAccountId: string
        amount: number
        type: WithdrawalType
        rate: Rate
        userBalance?: number
    }): ValidationResult {
        try {
            this.validateWithdrawalRequest(params)
            return { isValid: true }
        } catch (error) {
            if (error instanceof Error) {
                return {
                    isValid: false,
                    error: error.message,
                    context: (error as { context?: Record<string, unknown> }).context,
                }
            }
            return {
                isValid: false,
                error: 'Unknown validation error',
            }
        }
    }
}
