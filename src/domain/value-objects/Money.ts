/**
 * Money Value Object
 *
 * Represents monetary amounts with currency in the HBANK Protocol.
 * This value object ensures type safety and encapsulates currency
 * conversion logic.
 *
 * @module domain/value-objects
 */

import { InvalidValueError, CurrencyMismatchError } from '@/domain/errors/DomainError'
import { Rate } from './Rate'


/**
 * Supported currencies in HBANK Protocol
 */
export type Currency = 'USDC' | 'HUSD' | 'HBAR'

/**
 * Currency decimals configuration
 */
const CURRENCY_DECIMALS: Record<Currency, number> = {
    USDC: 6,  // USDC uses 6 decimals
    HUSD: 3,  // HUSD uses 3 decimals
    HBAR: 8,  // HBAR uses 8 decimals
}

/**
 * Currency multipliers for tiny unit conversion
 */
const CURRENCY_MULTIPLIERS: Record<Currency, number> = {
    USDC: 1_000_000,      // 10^6
    HUSD: 1_000,          // 10^3
    HBAR: 100_000_000,    // 10^8
}

/**
 * Money Value Object
 *
 * Immutable representation of a monetary amount with a specific currency.
 * Provides type-safe arithmetic operations and currency conversions.
 *
 * @example
 * ```typescript
 * const usdc = Money.usdc(100.50)
 * const husd = usdc.convertTo('HUSD', rate)
 *
 * const total = usdc.add(Money.usdc(50))
 * logger.info(total.toDisplayString()) // "$150.50 USDC"
 * ```
 */
export class Money {
    /**
     * Private constructor to enforce factory methods
     *
     * @param amount - The monetary amount (in base units, not tiny units)
     * @param currency - The currency type
     */
    private constructor(
        public readonly amount: number,
        public readonly currency: Currency
    ) {
        if (amount < 0) {
            throw new InvalidValueError('Amount cannot be negative', { amount, currency })
        }

        if (!Number.isFinite(amount)) {
            throw new InvalidValueError('Amount must be a finite number', { amount, currency })
        }
    }

    // ========================================
    // Factory Methods
    // ========================================

    /**
     * Create USDC money
     *
     * @param amount - Amount in USDC (e.g., 100.50 for $100.50)
     * @returns Money instance with USDC currency
     *
     * @example
     * ```typescript
     * const usdc = Money.usdc(100.50)
     * logger.info(usdc.amount) // 100.50
     * logger.info(usdc.currency) // 'USDC'
     * ```
     */
    static usdc(amount: number): Money {
        return new Money(amount, 'USDC')
    }

    /**
     * Create HUSD money
     *
     * @param amount - Amount in HUSD
     * @returns Money instance with HUSD currency
     *
     * @example
     * ```typescript
     * const husd = Money.husd(50.25)
     * ```
     */
    static husd(amount: number): Money {
        return new Money(amount, 'HUSD')
    }

    /**
     * Create HBAR money
     *
     * @param amount - Amount in HBAR
     * @returns Money instance with HBAR currency
     *
     * @example
     * ```typescript
     * const hbar = Money.hbar(1000)
     * ```
     */
    static hbar(amount: number): Money {
        return new Money(amount, 'HBAR')
    }

    /**
     * Create Money from tiny units (blockchain representation)
     *
     * @param tinyAmount - Amount in tiny units (e.g., 100000000 for 1 USDC)
     * @param currency - The currency type
     * @returns Money instance
     *
     * @example
     * ```typescript
     * const usdc = Money.fromTinyUnits(100000000, 'USDC') // 100 USDC
     * ```
     */
    static fromTinyUnits(tinyAmount: number, currency: Currency): Money {
        const multiplier = CURRENCY_MULTIPLIERS[currency]
        const amount = tinyAmount / multiplier
        return new Money(amount, currency)
    }

    /**
     * Create Money with specific currency
     *
     * @param amount - The monetary amount
     * @param currency - The currency type
     * @returns Money instance
     *
     * @example
     * ```typescript
     * const money = Money.of(100, 'USDC')
     * ```
     */
    static of(amount: number, currency: Currency): Money {
        return new Money(amount, currency)
    }

    /**
     * Create zero money for a currency
     *
     * @param currency - The currency type
     * @returns Money instance with zero amount
     *
     * @example
     * ```typescript
     * const zero = Money.zero('USDC')
     * logger.info(zero.isZero()) // true
     * ```
     */
    static zero(currency: Currency): Money {
        return new Money(0, currency)
    }

    // ========================================
    // Conversions
    // ========================================

    /**
     * Convert to another currency using exchange rate
     *
     * @param targetCurrency - The target currency
     * @param rate - The exchange rate to use
     * @returns New Money instance in target currency
     *
     * @example
     * ```typescript
     * const usdc = Money.usdc(100)
     * const rate = Rate.create(1.005, '123')
     * const husd = usdc.convertTo('HUSD', rate)
     * logger.info(husd.amount) // ~99.5 HUSD
     * ```
     */
    convertTo(targetCurrency: Currency, rate: Rate): Money {
        // No conversion needed if same currency
        if (this.currency === targetCurrency) {
            return this
        }

        // Only support USDC <-> HUSD conversion
        if (
            (this.currency === 'USDC' && targetCurrency === 'HUSD') ||
            (this.currency === 'HUSD' && targetCurrency === 'USDC')
        ) {
            const convertedAmount = rate.convert(this.amount, this.currency, targetCurrency)
            return new Money(convertedAmount, targetCurrency)
        }

        throw new InvalidValueError(
            `Unsupported conversion: ${this.currency} to ${targetCurrency}`,
            { from: this.currency, to: targetCurrency }
        )
    }

    /**
     * Convert to tiny units (blockchain representation)
     *
     * @returns Amount in tiny units as an integer
     *
     * @example
     * ```typescript
     * const usdc = Money.usdc(100.5)
     * logger.info(usdc.toTinyUnits()) // 100500000
     * ```
     */
    toTinyUnits(): number {
        const multiplier = CURRENCY_MULTIPLIERS[this.currency]
        return Math.floor(this.amount * multiplier)
    }

    // ========================================
    // Arithmetic Operations
    // ========================================

    /**
     * Add money (must be same currency)
     *
     * @param other - Money to add
     * @returns New Money instance with sum
     *
     * @example
     * ```typescript
     * const total = Money.usdc(100).add(Money.usdc(50))
     * logger.info(total.amount) // 150
     * ```
     */
    add(other: Money): Money {
        this.ensureSameCurrency(other)
        return new Money(this.amount + other.amount, this.currency)
    }

    /**
     * Subtract money (must be same currency)
     *
     * @param other - Money to subtract
     * @returns New Money instance with difference
     *
     * @example
     * ```typescript
     * const remaining = Money.usdc(100).subtract(Money.usdc(30))
     * logger.info(remaining.amount) // 70
     * ```
     */
    subtract(other: Money): Money {
        this.ensureSameCurrency(other)
        const result = this.amount - other.amount

        if (result < 0) {
            throw new InvalidValueError(
                'Subtraction would result in negative amount',
                { minuend: this.amount, subtrahend: other.amount }
            )
        }

        return new Money(result, this.currency)
    }

    /**
     * Multiply by a scalar
     *
     * @param multiplier - The multiplier
     * @returns New Money instance
     *
     * @example
     * ```typescript
     * const doubled = Money.usdc(100).multiply(2)
     * logger.info(doubled.amount) // 200
     * ```
     */
    multiply(multiplier: number): Money {
        if (multiplier < 0) {
            throw new InvalidValueError('Multiplier cannot be negative', { multiplier })
        }
        return new Money(this.amount * multiplier, this.currency)
    }

    /**
     * Divide by a scalar
     *
     * @param divisor - The divisor
     * @returns New Money instance
     *
     * @example
     * ```typescript
     * const half = Money.usdc(100).divide(2)
     * logger.info(half.amount) // 50
     * ```
     */
    divide(divisor: number): Money {
        if (divisor <= 0) {
            throw new InvalidValueError('Divisor must be positive', { divisor })
        }
        return new Money(this.amount / divisor, this.currency)
    }

    // ========================================
    // Comparison Operations
    // ========================================

    /**
     * Check if amount is greater than another
     *
     * @param other - Money to compare
     * @returns True if this amount is greater
     */
    isGreaterThan(other: Money): boolean {
        this.ensureSameCurrency(other)
        return this.amount > other.amount
    }

    /**
     * Check if amount is less than another
     *
     * @param other - Money to compare
     * @returns True if this amount is less
     */
    isLessThan(other: Money): boolean {
        this.ensureSameCurrency(other)
        return this.amount < other.amount
    }

    /**
     * Check if amount equals another
     *
     * @param other - Money to compare
     * @returns True if amounts are equal
     */
    equals(other: Money): boolean {
        return this.currency === other.currency && this.amount === other.amount
    }

    /**
     * Check if amount is zero
     *
     * @returns True if amount is zero
     */
    isZero(): boolean {
        return this.amount === 0
    }

    /**
     * Check if amount is positive
     *
     * @returns True if amount is greater than zero
     */
    isPositive(): boolean {
        return this.amount > 0
    }

    // ========================================
    // Display Methods
    // ========================================

    /**
     * Convert to display string with proper decimals
     *
     * @returns Formatted string
     *
     * @example
     * ```typescript
     * const usdc = Money.usdc(100.50)
     * logger.info(usdc.toDisplayString()) // "100.50 USDC"
     * ```
     */
    toDisplayString(): string {
        const decimals = CURRENCY_DECIMALS[this.currency]
        return `${this.amount.toFixed(decimals)} ${this.currency}`
    }

    /**
     * Convert to JSON representation
     *
     * @returns JSON object
     */
    toJSON(): { amount: number; currency: Currency } {
        return {
            amount: this.amount,
            currency: this.currency,
        }
    }

    // ========================================
    // Private Helpers
    // ========================================

    /**
     * Ensure another Money has the same currency
     *
     * @param other - Money to check
     * @throws {CurrencyMismatchError} If currencies don't match
     */
    private ensureSameCurrency(other: Money): void {
        if (this.currency !== other.currency) {
            throw new CurrencyMismatchError(
                'Cannot perform operation on different currencies',
                { currency1: this.currency, currency2: other.currency }
            )
        }
    }
}
