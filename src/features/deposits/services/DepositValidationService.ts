/**
 * Deposit Validation Service
 *
 * This service handles all validation logic for deposit operations.
 * It encapsulates business rules and validation constraints specific
 * to deposits in the HBANK Protocol.
 *
 * @module features/deposits/services
 */

import { injectable, inject } from 'inversify'
import { TYPES } from '@/core/di/types'
import type { ILogger } from '@/core/logging/Logger'
import { AccountId } from '@/domain/value-objects/AccountId'
import { Rate } from '@/domain/value-objects/Rate'
import {
    BusinessRuleViolationError,
    ExpiredRateError,
    InsufficientBalanceError,
} from '@/domain/errors/DomainError'

/**
 * Deposit validation constraints
 */
const DEPOSIT_CONSTRAINTS = {
    /** Minimum deposit amount in USDC */
    MIN_AMOUNT: 0.01,

    /** Maximum deposit amount in USDC */
    MAX_AMOUNT: 1_000_000,

    /** Maximum rate age in milliseconds (5 minutes) */
    MAX_RATE_AGE: 5 * 60 * 1000,
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
 * Deposit Validation Service
 *
 * Provides comprehensive validation for deposit operations.
 * All validation methods throw domain errors on failure.
 *
 * @example
 * ```typescript
 * const validationService = container.get<DepositValidationService>(
 *   TYPES.DepositValidationService
 * )
 *
 * // Validate deposit request
 * validationService.validateDepositAmount(100)
 * validationService.validateAccountId('0.0.12345')
 * validationService.validateRate(rate)
 * ```
 */
@injectable()
export class DepositValidationService {
    constructor(@inject(TYPES.Logger) private logger: ILogger) {}

    /**
     * Validate deposit amount
     *
     * @param amount - Amount in USDC to validate
     * @throws {BusinessRuleViolationError} If amount is invalid
     *
     * @example
     * ```typescript
     * validationService.validateDepositAmount(100) // OK
     * validationService.validateDepositAmount(0) // Throws error
     * ```
     */
    validateDepositAmount(amount: number): void {
        this.logger.debug('Validating deposit amount', { amount })

        if (amount <= 0) {
            throw new BusinessRuleViolationError('Deposit amount must be positive', {
                amount,
            })
        }

        if (amount < DEPOSIT_CONSTRAINTS.MIN_AMOUNT) {
            throw new BusinessRuleViolationError(
                `Deposit amount must be at least ${DEPOSIT_CONSTRAINTS.MIN_AMOUNT} USDC`,
                { amount, minAmount: DEPOSIT_CONSTRAINTS.MIN_AMOUNT }
            )
        }

        if (amount > DEPOSIT_CONSTRAINTS.MAX_AMOUNT) {
            throw new BusinessRuleViolationError(
                `Deposit amount cannot exceed ${DEPOSIT_CONSTRAINTS.MAX_AMOUNT} USDC`,
                { amount, maxAmount: DEPOSIT_CONSTRAINTS.MAX_AMOUNT }
            )
        }

        if (!Number.isFinite(amount)) {
            throw new BusinessRuleViolationError('Deposit amount must be a finite number', {
                amount,
            })
        }

        this.logger.debug('Deposit amount is valid', { amount })
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

        // Use AccountId value object for validation
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

        // Check if rate has expired
        if (rate.isExpired()) {
            this.logger.warn('Rate has expired', {
                sequenceNumber: rate.sequenceNumber,
                validUntil: rate.validUntil,
            })

            throw new ExpiredRateError('Cannot use expired rate for deposit', {
                sequenceNumber: rate.sequenceNumber,
                validUntil: rate.validUntil,
                now: new Date(),
            })
        }

        // Validate rate value is reasonable
        if (rate.value <= 0 || rate.value > 2) {
            this.logger.warn('Rate value is out of reasonable bounds', { rate: rate.value })

            throw new BusinessRuleViolationError('Rate value is invalid', {
                rate: rate.value,
            })
        }

        this.logger.debug('Rate is valid', { sequenceNumber: rate.sequenceNumber })
    }

    /**
     * Validate rate sequence number matches
     *
     * @param rate - Rate to validate
     * @param expectedSequence - Expected sequence number
     * @throws {BusinessRuleViolationError} If sequences don't match
     *
     * @example
     * ```typescript
     * validationService.validateRateSequence(rate, '123456')
     * ```
     */
    validateRateSequence(rate: Rate, expectedSequence: string): void {
        this.logger.debug('Validating rate sequence', {
            expected: expectedSequence,
            actual: rate.sequenceNumber,
        })

        if (!rate.matchesSequence(expectedSequence)) {
            throw new BusinessRuleViolationError('Rate sequence number mismatch', {
                expected: expectedSequence,
                actual: rate.sequenceNumber,
            })
        }

        this.logger.debug('Rate sequence is valid')
    }

    /**
     * Validate user has sufficient USDC balance
     *
     * @param userBalance - User's USDC balance
     * @param depositAmount - Amount user wants to deposit
     * @throws {InsufficientBalanceError} If balance is insufficient
     *
     * @example
     * ```typescript
     * validationService.validateBalance(500, 100) // OK
     * validationService.validateBalance(50, 100) // Throws error
     * ```
     */
    validateBalance(userBalance: number, depositAmount: number): void {
        this.logger.debug('Validating balance', { userBalance, depositAmount })

        if (userBalance < depositAmount) {
            this.logger.warn('Insufficient balance', { userBalance, depositAmount })

            throw new InsufficientBalanceError(
                'Insufficient USDC balance for deposit',
                {
                    balance: userBalance,
                    required: depositAmount,
                    shortfall: depositAmount - userBalance,
                }
            )
        }

        this.logger.debug('Balance is sufficient', { userBalance, depositAmount })
    }

    /**
     * Validate complete deposit request
     *
     * This is a convenience method that runs all validations.
     *
     * @param params - Deposit parameters to validate
     * @throws Various domain errors if validation fails
     *
     * @example
     * ```typescript
     * validationService.validateDepositRequest({
     *   userAccountId: '0.0.12345',
     *   amount: 100,
     *   rate: rate,
     *   userBalance: 500
     * })
     * ```
     */
    validateDepositRequest(params: {
        userAccountId: string
        amount: number
        rate: Rate
        userBalance?: number
        expectedSequence?: string
    }): void {
        this.logger.info('Validating complete deposit request', {
            userAccountId: params.userAccountId,
            amount: params.amount,
        })

        // Validate all components
        this.validateAccountId(params.userAccountId)
        this.validateDepositAmount(params.amount)
        this.validateRate(params.rate)

        if (params.expectedSequence) {
            this.validateRateSequence(params.rate, params.expectedSequence)
        }

        if (params.userBalance !== undefined) {
            this.validateBalance(params.userBalance, params.amount)
        }

        this.logger.info('Deposit request is valid', {
            userAccountId: params.userAccountId,
            amount: params.amount,
        })
    }

    /**
     * Soft validation (returns result instead of throwing)
     *
     * Use this when you want to collect all errors instead of
     * throwing on first error.
     *
     * @param params - Deposit parameters to validate
     * @returns Validation result
     *
     * @example
     * ```typescript
     * const result = validationService.softValidate({
     *   userAccountId: '0.0.12345',
     *   amount: 100,
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
        rate: Rate
        userBalance?: number
    }): ValidationResult {
        try {
            this.validateDepositRequest(params)
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
