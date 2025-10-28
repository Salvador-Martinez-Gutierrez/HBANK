/**
 * Domain Errors
 *
 * Custom error classes for domain-level business rule violations.
 * These errors represent invalid states or operations in the business domain.
 *
 * @module domain/errors
 */

/**
 * Base Domain Error
 *
 * All domain errors should extend this class.
 * Domain errors represent business rule violations and should be
 * caught and handled at the application layer.
 *
 * @example
 * ```typescript
 * if (amount <= 0) {
 *   throw new DomainError('Amount must be positive')
 * }
 * ```
 */
export class DomainError extends Error {
    /**
     * Error code for programmatic error handling
     */
    public readonly code: string

    /**
     * Additional context about the error
     */
    public readonly context?: Record<string, unknown>

    constructor(
        message: string,
        code: string = 'DOMAIN_ERROR',
        context?: Record<string, unknown>
    ) {
        super(message)
        this.name = 'DomainError'
        this.code = code
        this.context = context

        // Maintains proper stack trace for where our error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, DomainError)
        }
    }
}

/**
 * Invalid Value Error
 *
 * Thrown when a value object receives invalid data.
 *
 * @example
 * ```typescript
 * if (rate <= 0) {
 *   throw new InvalidValueError('Rate must be positive', { rate })
 * }
 * ```
 */
export class InvalidValueError extends DomainError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, 'INVALID_VALUE', context)
        this.name = 'InvalidValueError'
    }
}

/**
 * Invalid State Error
 *
 * Thrown when an entity is in an invalid state for an operation.
 *
 * @example
 * ```typescript
 * if (deposit.status !== 'scheduled') {
 *   throw new InvalidStateError(
 *     'Can only execute scheduled deposits',
 *     { currentStatus: deposit.status }
 *   )
 * }
 * ```
 */
export class InvalidStateError extends DomainError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, 'INVALID_STATE', context)
        this.name = 'InvalidStateError'
    }
}

/**
 * Business Rule Violation Error
 *
 * Thrown when a business rule is violated.
 *
 * @example
 * ```typescript
 * if (withdrawal.amount > maxAllowed) {
 *   throw new BusinessRuleViolationError(
 *     'Withdrawal exceeds maximum allowed amount',
 *     { amount: withdrawal.amount, maxAllowed }
 *   )
 * }
 * ```
 */
export class BusinessRuleViolationError extends DomainError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, 'BUSINESS_RULE_VIOLATION', context)
        this.name = 'BusinessRuleViolationError'
    }
}

/**
 * Expired Rate Error
 *
 * Thrown when attempting to use an expired exchange rate.
 *
 * @example
 * ```typescript
 * if (rate.isExpired()) {
 *   throw new ExpiredRateError(
 *     'Cannot use expired rate',
 *     { sequenceNumber: rate.sequenceNumber, validUntil: rate.validUntil }
 *   )
 * }
 * ```
 */
export class ExpiredRateError extends DomainError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, 'EXPIRED_RATE', context)
        this.name = 'ExpiredRateError'
    }
}

/**
 * Insufficient Balance Error
 *
 * Thrown when an account has insufficient balance for an operation.
 *
 * @example
 * ```typescript
 * if (balance < amount) {
 *   throw new InsufficientBalanceError(
 *     'Insufficient USDC balance',
 *     { balance, required: amount }
 *   )
 * }
 * ```
 */
export class InsufficientBalanceError extends DomainError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, 'INSUFFICIENT_BALANCE', context)
        this.name = 'InsufficientBalanceError'
    }
}

/**
 * Invalid Account Error
 *
 * Thrown when an account ID is invalid or doesn't exist.
 *
 * @example
 * ```typescript
 * if (!accountId.match(/^\d+\.\d+\.\d+$/)) {
 *   throw new InvalidAccountError(
 *     'Invalid Hedera account ID format',
 *     { accountId }
 *   )
 * }
 * ```
 */
export class InvalidAccountError extends DomainError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, 'INVALID_ACCOUNT', context)
        this.name = 'InvalidAccountError'
    }
}

/**
 * Currency Mismatch Error
 *
 * Thrown when operations are attempted with incompatible currencies.
 *
 * @example
 * ```typescript
 * if (money1.currency !== money2.currency) {
 *   throw new CurrencyMismatchError(
 *     'Cannot add money with different currencies',
 *     { currency1: money1.currency, currency2: money2.currency }
 *   )
 * }
 * ```
 */
export class CurrencyMismatchError extends DomainError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, 'CURRENCY_MISMATCH', context)
        this.name = 'CurrencyMismatchError'
    }
}

/**
 * Deposit Error
 *
 * Thrown when deposit-specific business rules are violated.
 *
 * @example
 * ```typescript
 * if (deposit.status === 'completed') {
 *   throw new DepositError(
 *     'Cannot modify completed deposit',
 *     { depositId: deposit.id, status: deposit.status }
 *   )
 * }
 * ```
 */
export class DepositError extends DomainError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, 'DEPOSIT_ERROR', context)
        this.name = 'DepositError'
    }
}

/**
 * Withdrawal Error
 *
 * Thrown when withdrawal-specific business rules are violated.
 *
 * @example
 * ```typescript
 * if (withdrawal.type === 'instant' && withdrawal.amount > maxInstant) {
 *   throw new WithdrawalError(
 *     'Instant withdrawal exceeds maximum',
 *     { amount: withdrawal.amount, max: maxInstant }
 *   )
 * }
 * ```
 */
export class WithdrawalError extends DomainError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, 'WITHDRAWAL_ERROR', context)
        this.name = 'WithdrawalError'
    }
}
