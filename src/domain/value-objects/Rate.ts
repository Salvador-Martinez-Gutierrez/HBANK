/**
 * Rate Value Object
 *
 * Represents an exchange rate between USDC and HUSD in the HBANK Protocol.
 * This value object encapsulates rate validation, expiration logic, and
 * currency conversion calculations.
 *
 * @module domain/value-objects
 */

import { InvalidValueError, ExpiredRateError } from '@/domain/errors/DomainError'
import { Currency } from './Money'


/**
 * Rate validity duration in milliseconds (5 minutes)
 */
const RATE_VALIDITY_DURATION = 5 * 60 * 1000

/**
 * Rate Value Object
 *
 * Immutable representation of an exchange rate with validation and expiration.
 * Rates are published to Hedera Consensus Service (HCS) and have a limited
 * validity period.
 *
 * @example
 * ```typescript
 * const rate = Rate.create(1.005, '123456')
 * logger.info(`Rate: ${rate.value}`)
 * logger.info(`Expires: ${rate.validUntil}`)
 *
 * if (!rate.isExpired()) {
 *   const husd = rate.convert(100, 'USDC', 'HUSD')
 * }
 * ```
 */
export class Rate {
    /**
     * Private constructor to enforce factory methods
     *
     * @param value - The exchange rate value (USDC/HUSD)
     * @param sequenceNumber - HCS sequence number for this rate
     * @param timestamp - When the rate was published
     * @param validUntil - When the rate expires
     */
    private constructor(
        public readonly value: number,
        public readonly sequenceNumber: string,
        public readonly timestamp: Date,
        public readonly validUntil: Date
    ) {
        if (value <= 0) {
            throw new InvalidValueError('Rate must be positive', { value })
        }

        if (!Number.isFinite(value)) {
            throw new InvalidValueError('Rate must be a finite number', { value })
        }

        if (validUntil <= timestamp) {
            throw new InvalidValueError('Valid until must be after timestamp', {
                timestamp,
                validUntil,
            })
        }
    }

    // ========================================
    // Factory Methods
    // ========================================

    /**
     * Create a new rate with automatic expiration
     *
     * @param value - The exchange rate value
     * @param sequenceNumber - HCS sequence number
     * @param timestamp - Optional custom timestamp (defaults to now)
     * @returns New Rate instance
     *
     * @example
     * ```typescript
     * const rate = Rate.create(1.005, '123456')
     * // Rate will expire in 5 minutes from now
     * ```
     */
    static create(value: number, sequenceNumber: string, timestamp?: Date): Rate {
        const now = timestamp ?? new Date()
        const validUntil = new Date(now.getTime() + RATE_VALIDITY_DURATION)
        return new Rate(value, sequenceNumber, now, validUntil)
    }

    /**
     * Create rate from HCS message data
     *
     * @param value - The exchange rate value
     * @param sequenceNumber - HCS sequence number
     * @param timestamp - HCS message timestamp
     * @returns New Rate instance
     *
     * @example
     * ```typescript
     * const rate = Rate.fromHCS(1.005, '123456', new Date('2025-10-28'))
     * ```
     */
    static fromHCS(value: number, sequenceNumber: string, timestamp: Date): Rate {
        const validUntil = new Date(timestamp.getTime() + RATE_VALIDITY_DURATION)
        return new Rate(value, sequenceNumber, timestamp, validUntil)
    }

    /**
     * Create rate with custom validity period
     *
     * @param value - The exchange rate value
     * @param sequenceNumber - HCS sequence number
     * @param timestamp - When the rate was published
     * @param validUntil - When the rate expires
     * @returns New Rate instance
     *
     * @example
     * ```typescript
     * const rate = Rate.withValidity(
     *   1.005,
     *   '123456',
     *   new Date(),
     *   new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
     * )
     * ```
     */
    static withValidity(
        value: number,
        sequenceNumber: string,
        timestamp: Date,
        validUntil: Date
    ): Rate {
        return new Rate(value, sequenceNumber, timestamp, validUntil)
    }

    /**
     * Create rate from JSON representation
     *
     * @param json - JSON object with rate data
     * @returns New Rate instance
     *
     * @example
     * ```typescript
     * const rate = Rate.fromJSON({
     *   value: 1.005,
     *   sequenceNumber: '123456',
     *   timestamp: '2025-10-28T10:00:00Z',
     *   validUntil: '2025-10-28T10:05:00Z'
     * })
     * ```
     */
    static fromJSON(json: {
        value: number
        sequenceNumber: string
        timestamp: string | Date
        validUntil: string | Date
    }): Rate {
        return new Rate(
            json.value,
            json.sequenceNumber,
            new Date(json.timestamp),
            new Date(json.validUntil)
        )
    }

    // ========================================
    // Conversion Methods
    // ========================================

    /**
     * Convert amount from one currency to another using this rate
     *
     * @param amount - The amount to convert
     * @param fromCurrency - Source currency
     * @param toCurrency - Target currency
     * @returns Converted amount
     *
     * @throws {ExpiredRateError} If rate has expired
     * @throws {InvalidValueError} If conversion is not supported
     *
     * @example
     * ```typescript
     * const rate = Rate.create(1.005, '123')
     * const husd = rate.convert(100, 'USDC', 'HUSD') // ~99.5 HUSD
     * const usdc = rate.convert(100, 'HUSD', 'USDC') // ~100.5 USDC
     * ```
     */
    convert(amount: number, fromCurrency: Currency, toCurrency: Currency): number {
        // Ensure rate is not expired
        if (this.isExpired()) {
            throw new ExpiredRateError('Cannot use expired rate for conversion', {
                sequenceNumber: this.sequenceNumber,
                validUntil: this.validUntil,
                now: new Date(),
            })
        }

        // No conversion needed if same currency
        if (fromCurrency === toCurrency) {
            return amount
        }

        // USDC to HUSD: divide by rate
        // Rate = USDC/HUSD, so HUSD = USDC / rate
        if (fromCurrency === 'USDC' && toCurrency === 'HUSD') {
            return amount / this.value
        }

        // HUSD to USDC: multiply by rate
        // Rate = USDC/HUSD, so USDC = HUSD * rate
        if (fromCurrency === 'HUSD' && toCurrency === 'USDC') {
            return amount * this.value
        }

        throw new InvalidValueError(`Unsupported conversion: ${fromCurrency} to ${toCurrency}`, {
            from: fromCurrency,
            to: toCurrency,
        })
    }

    // ========================================
    // Validation Methods
    // ========================================

    /**
     * Check if rate has expired
     *
     * @param now - Optional custom timestamp (defaults to current time)
     * @returns True if rate has expired
     *
     * @example
     * ```typescript
     * if (rate.isExpired()) {
     *   throw new Error('Rate has expired')
     * }
     * ```
     */
    isExpired(now?: Date): boolean {
        const currentTime = now ?? new Date()
        return currentTime > this.validUntil
    }

    /**
     * Check if rate is valid (not expired)
     *
     * @param now - Optional custom timestamp
     * @returns True if rate is still valid
     *
     * @example
     * ```typescript
     * if (rate.isValid()) {
     *   // Use rate for conversion
     * }
     * ```
     */
    isValid(now?: Date): boolean {
        return !this.isExpired(now)
    }

    /**
     * Assert that rate is valid, throw if expired
     *
     * @throws {ExpiredRateError} If rate has expired
     *
     * @example
     * ```typescript
     * rate.assertValid() // Throws if expired
     * const husd = rate.convert(100, 'USDC', 'HUSD')
     * ```
     */
    assertValid(): void {
        if (this.isExpired()) {
            throw new ExpiredRateError('Rate has expired', {
                sequenceNumber: this.sequenceNumber,
                validUntil: this.validUntil,
                now: new Date(),
            })
        }
    }

    /**
     * Get remaining validity time in milliseconds
     *
     * @returns Milliseconds until expiration (0 if expired)
     *
     * @example
     * ```typescript
     * const remaining = rate.getRemainingValidity()
     * logger.info(`Rate expires in ${remaining / 1000} seconds`)
     * ```
     */
    getRemainingValidity(): number {
        const now = new Date()
        const remaining = this.validUntil.getTime() - now.getTime()
        return Math.max(0, remaining)
    }

    /**
     * Check if rate matches a specific sequence number
     *
     * @param sequenceNumber - Sequence number to check
     * @returns True if sequence numbers match
     *
     * @example
     * ```typescript
     * if (rate.matchesSequence('123456')) {
     *   // This is the correct rate
     * }
     * ```
     */
    matchesSequence(sequenceNumber: string): boolean {
        return this.sequenceNumber === sequenceNumber
    }

    // ========================================
    // Display Methods
    // ========================================

    /**
     * Convert to display string
     *
     * @returns Formatted string
     *
     * @example
     * ```typescript
     * const rate = Rate.create(1.005, '123')
     * logger.info(rate.toDisplayString())
     * // "1.00500 USDC/HUSD (seq: 123, expires: 2025-10-28 10:05:00)"
     * ```
     */
    toDisplayString(): string {
        return `${this.value.toFixed(5)} USDC/HUSD (seq: ${this.sequenceNumber}, expires: ${this.validUntil.toISOString()})`
    }

    /**
     * Convert to JSON representation
     *
     * @returns JSON object
     */
    toJSON(): {
        value: number
        sequenceNumber: string
        timestamp: string
        validUntil: string
        isExpired: boolean
    } {
        return {
            value: this.value,
            sequenceNumber: this.sequenceNumber,
            timestamp: this.timestamp.toISOString(),
            validUntil: this.validUntil.toISOString(),
            isExpired: this.isExpired(),
        }
    }

    // ========================================
    // Comparison Methods
    // ========================================

    /**
     * Compare with another rate
     *
     * @param other - Rate to compare with
     * @returns True if rates are equal
     */
    equals(other: Rate): boolean {
        return (
            this.value === other.value &&
            this.sequenceNumber === other.sequenceNumber &&
            this.timestamp.getTime() === other.timestamp.getTime() &&
            this.validUntil.getTime() === other.validUntil.getTime()
        )
    }

    /**
     * Check if this rate is newer than another
     *
     * @param other - Rate to compare with
     * @returns True if this rate is newer
     */
    isNewerThan(other: Rate): boolean {
        return this.timestamp > other.timestamp
    }
}
