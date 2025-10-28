/**
 * Rate Validation Service
 *
 * This service handles all validation logic for exchange rate operations.
 * It encapsulates business rules and validation constraints specific
 * to rate publishing and verification in the HBANK Protocol.
 *
 * @module features/rates/services
 */

import { injectable, inject } from 'inversify'
import { TYPES } from '@/core/di/types'
import type { ILogger } from '@/core/logging/Logger'
import { Rate } from '@/domain/value-objects/Rate'
import {
    BusinessRuleViolationError,
    ExpiredRateError,
    InvalidValueError,
} from '@/domain/errors/DomainError'

/**
 * Rate validation constraints
 */
const RATE_CONSTRAINTS = {
    /** Minimum acceptable rate (USDC/HUSD) */
    MIN_RATE: 0.99,

    /** Maximum acceptable rate (USDC/HUSD) */
    MAX_RATE: 1.1,

    /** Maximum deviation from previous rate (5%) */
    MAX_DEVIATION_PERCENTAGE: 0.05,

    /** Maximum rate age in milliseconds (5 minutes) */
    MAX_RATE_AGE: 5 * 60 * 1000,

    /** Minimum time between rate updates (1 minute) */
    MIN_UPDATE_INTERVAL: 1 * 60 * 1000,
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
 * Rate Validation Service
 *
 * Provides comprehensive validation for exchange rate operations.
 * Ensures rates are within acceptable bounds and not expired.
 *
 * @example
 * ```typescript
 * const validationService = container.get<RateValidationService>(
 *   TYPES.RateValidationService
 * )
 *
 * // Validate rate value
 * validationService.validateRateValue(1.005)
 *
 * // Validate rate not expired
 * validationService.validateRateNotExpired(rate)
 *
 * // Validate rate deviation
 * validationService.validateRateDeviation(newRate, previousRate)
 * ```
 */
@injectable()
export class RateValidationService {
    constructor(@inject(TYPES.Logger) private logger: ILogger) {}

    /**
     * Validate rate value is within acceptable bounds
     *
     * @param rateValue - The rate value to validate (USDC/HUSD)
     * @throws {BusinessRuleViolationError} If rate is out of bounds
     *
     * @example
     * ```typescript
     * validationService.validateRateValue(1.005) // OK
     * validationService.validateRateValue(0.5) // Throws error
     * validationService.validateRateValue(2.0) // Throws error
     * ```
     */
    validateRateValue(rateValue: number): void {
        this.logger.debug('Validating rate value', { rateValue })

        if (rateValue <= 0) {
            throw new InvalidValueError('Rate value must be positive', { rateValue })
        }

        if (!Number.isFinite(rateValue)) {
            throw new InvalidValueError('Rate value must be a finite number', { rateValue })
        }

        if (rateValue < RATE_CONSTRAINTS.MIN_RATE) {
            throw new BusinessRuleViolationError(
                `Rate value ${rateValue} is below minimum ${RATE_CONSTRAINTS.MIN_RATE}`,
                { rateValue, minRate: RATE_CONSTRAINTS.MIN_RATE }
            )
        }

        if (rateValue > RATE_CONSTRAINTS.MAX_RATE) {
            throw new BusinessRuleViolationError(
                `Rate value ${rateValue} exceeds maximum ${RATE_CONSTRAINTS.MAX_RATE}`,
                { rateValue, maxRate: RATE_CONSTRAINTS.MAX_RATE }
            )
        }

        this.logger.debug('Rate value is valid', { rateValue })
    }

    /**
     * Validate rate has not expired
     *
     * @param rate - Rate to validate
     * @throws {ExpiredRateError} If rate has expired
     *
     * @example
     * ```typescript
     * const rate = Rate.create(1.005, '123')
     * validationService.validateRateNotExpired(rate) // OK if not expired
     * ```
     */
    validateRateNotExpired(rate: Rate): void {
        this.logger.debug('Validating rate not expired', {
            sequenceNumber: rate.sequenceNumber,
            validUntil: rate.validUntil,
        })

        if (rate.isExpired()) {
            this.logger.warn('Rate has expired', {
                sequenceNumber: rate.sequenceNumber,
                validUntil: rate.validUntil,
            })

            throw new ExpiredRateError('Rate has expired', {
                sequenceNumber: rate.sequenceNumber,
                validUntil: rate.validUntil,
                now: new Date(),
            })
        }

        this.logger.debug('Rate is not expired', { sequenceNumber: rate.sequenceNumber })
    }

    /**
     * Validate rate age is acceptable
     *
     * @param rate - Rate to validate
     * @throws {BusinessRuleViolationError} If rate is too old
     *
     * @example
     * ```typescript
     * validationService.validateRateAge(rate) // Throws if rate is > 5 minutes old
     * ```
     */
    validateRateAge(rate: Rate): void {
        const now = new Date()
        const ageMs = now.getTime() - rate.timestamp.getTime()

        this.logger.debug('Validating rate age', {
            sequenceNumber: rate.sequenceNumber,
            ageMs,
        })

        if (ageMs > RATE_CONSTRAINTS.MAX_RATE_AGE) {
            throw new BusinessRuleViolationError(
                'Rate is too old',
                {
                    sequenceNumber: rate.sequenceNumber,
                    ageMs,
                    maxAgeMs: RATE_CONSTRAINTS.MAX_RATE_AGE,
                }
            )
        }

        this.logger.debug('Rate age is acceptable', { sequenceNumber: rate.sequenceNumber })
    }

    /**
     * Validate deviation from previous rate
     *
     * Ensures new rate doesn't deviate too much from previous rate,
     * which could indicate an error or manipulation.
     *
     * @param newRate - New rate to validate
     * @param previousRate - Previous rate for comparison
     * @throws {BusinessRuleViolationError} If deviation is too large
     *
     * @example
     * ```typescript
     * const previous = Rate.create(1.005, '123')
     * const current = Rate.create(1.006, '124')
     * validationService.validateRateDeviation(current, previous) // OK
     *
     * const extreme = Rate.create(1.10, '125')
     * validationService.validateRateDeviation(extreme, previous) // Throws
     * ```
     */
    validateRateDeviation(newRate: Rate, previousRate: Rate): void {
        this.logger.debug('Validating rate deviation', {
            newRate: newRate.value,
            previousRate: previousRate.value,
        })

        const deviation = Math.abs(newRate.value - previousRate.value)
        const deviationPercentage = deviation / previousRate.value

        this.logger.debug('Calculated rate deviation', {
            deviation,
            deviationPercentage,
        })

        if (deviationPercentage > RATE_CONSTRAINTS.MAX_DEVIATION_PERCENTAGE) {
            this.logger.warn('Rate deviation exceeds maximum', {
                newRate: newRate.value,
                previousRate: previousRate.value,
                deviation,
                deviationPercentage,
            })

            throw new BusinessRuleViolationError(
                `Rate deviation of ${(deviationPercentage * 100).toFixed(2)}% exceeds maximum ${RATE_CONSTRAINTS.MAX_DEVIATION_PERCENTAGE * 100}%`,
                {
                    newRate: newRate.value,
                    previousRate: previousRate.value,
                    deviation,
                    deviationPercentage,
                    maxDeviation: RATE_CONSTRAINTS.MAX_DEVIATION_PERCENTAGE,
                }
            )
        }

        this.logger.debug('Rate deviation is acceptable')
    }

    /**
     * Validate minimum time between rate updates
     *
     * @param newRateTimestamp - Timestamp of new rate
     * @param previousRateTimestamp - Timestamp of previous rate
     * @throws {BusinessRuleViolationError} If update interval is too short
     *
     * @example
     * ```typescript
     * const previous = new Date('2025-10-28T10:00:00Z')
     * const current = new Date('2025-10-28T10:01:00Z')
     * validationService.validateUpdateInterval(current, previous) // OK
     * ```
     */
    validateUpdateInterval(
        newRateTimestamp: Date,
        previousRateTimestamp: Date
    ): void {
        const intervalMs = newRateTimestamp.getTime() - previousRateTimestamp.getTime()

        this.logger.debug('Validating update interval', { intervalMs })

        if (intervalMs < RATE_CONSTRAINTS.MIN_UPDATE_INTERVAL) {
            throw new BusinessRuleViolationError(
                'Rate update interval is too short',
                {
                    intervalMs,
                    minIntervalMs: RATE_CONSTRAINTS.MIN_UPDATE_INTERVAL,
                }
            )
        }

        this.logger.debug('Update interval is acceptable')
    }

    /**
     * Validate sequence number format
     *
     * @param sequenceNumber - Sequence number to validate
     * @throws {InvalidValueError} If sequence number is invalid
     *
     * @example
     * ```typescript
     * validationService.validateSequenceNumber('123456') // OK
     * validationService.validateSequenceNumber('') // Throws
     * ```
     */
    validateSequenceNumber(sequenceNumber: string): void {
        this.logger.debug('Validating sequence number', { sequenceNumber })

        if (!sequenceNumber || sequenceNumber.trim().length === 0) {
            throw new InvalidValueError('Sequence number cannot be empty', {
                sequenceNumber,
            })
        }

        // Sequence numbers should be numeric strings
        if (!/^\d+$/.test(sequenceNumber)) {
            throw new InvalidValueError('Sequence number must be numeric', {
                sequenceNumber,
            })
        }

        this.logger.debug('Sequence number is valid', { sequenceNumber })
    }

    /**
     * Validate complete rate publishing request
     *
     * @param params - Rate publishing parameters
     * @throws Various domain errors if validation fails
     *
     * @example
     * ```typescript
     * validationService.validateRatePublishRequest({
     *   rateValue: 1.005,
     *   previousRate: previousRate
     * })
     * ```
     */
    validateRatePublishRequest(params: {
        rateValue: number
        previousRate?: Rate
        sequenceNumber?: string
    }): void {
        this.logger.info('Validating rate publish request', {
            rateValue: params.rateValue,
        })

        // Validate rate value
        this.validateRateValue(params.rateValue)

        // Validate sequence number if provided
        if (params.sequenceNumber) {
            this.validateSequenceNumber(params.sequenceNumber)
        }

        // Validate deviation from previous rate if provided
        if (params.previousRate) {
            const newRate = Rate.create(params.rateValue, params.sequenceNumber || 'temp')
            this.validateRateDeviation(newRate, params.previousRate)
        }

        this.logger.info('Rate publish request is valid')
    }

    /**
     * Soft validation (returns result instead of throwing)
     *
     * @param params - Rate parameters to validate
     * @returns Validation result
     *
     * @example
     * ```typescript
     * const result = validationService.softValidate({
     *   rateValue: 1.005
     * })
     *
     * if (!result.isValid) {
     *   console.log(result.error)
     * }
     * ```
     */
    softValidate(params: {
        rateValue: number
        previousRate?: Rate
    }): ValidationResult {
        try {
            this.validateRatePublishRequest(params)
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
