/**
 * Rate Value Object Tests
 *
 * Comprehensive test suite for the Rate value object covering:
 * - Factory methods
 * - Currency conversions
 * - Expiration logic
 * - Validation
 * - Edge cases
 */

import { Rate } from '../Rate'
import { InvalidValueError, ExpiredRateError } from '@/domain/errors/DomainError'

describe('Rate Value Object', () => {
    describe('Factory Methods', () => {
        describe('create()', () => {
            it('should create rate with automatic expiration', () => {
                const rate = Rate.create(1.005, '123456')

                expect(rate.value).toBe(1.005)
                expect(rate.sequenceNumber).toBe('123456')
                expect(rate.timestamp).toBeInstanceOf(Date)
                expect(rate.validUntil).toBeInstanceOf(Date)
            })

            it('should set expiration 5 minutes from now', () => {
                const before = Date.now()
                const rate = Rate.create(1.005, '123456')
                const after = Date.now()

                const expectedExpiration = 5 * 60 * 1000 // 5 minutes
                const minExpiration = before + expectedExpiration
                const maxExpiration = after + expectedExpiration

                expect(rate.validUntil.getTime()).toBeGreaterThanOrEqual(minExpiration)
                expect(rate.validUntil.getTime()).toBeLessThanOrEqual(maxExpiration)
            })

            it('should accept custom timestamp', () => {
                const customTimestamp = new Date('2025-10-28T10:00:00Z')
                const rate = Rate.create(1.005, '123456', customTimestamp)

                expect(rate.timestamp).toEqual(customTimestamp)
                expect(rate.validUntil.getTime()).toBe(customTimestamp.getTime() + 5 * 60 * 1000)
            })

            it('should throw error for zero rate', () => {
                expect(() => Rate.create(0, '123456')).toThrow(InvalidValueError)
            })

            it('should throw error for negative rate', () => {
                expect(() => Rate.create(-1.005, '123456')).toThrow(InvalidValueError)
            })

            it('should throw error for infinite rate', () => {
                expect(() => Rate.create(Infinity, '123456')).toThrow(InvalidValueError)
            })

            it('should throw error for NaN rate', () => {
                expect(() => Rate.create(NaN, '123456')).toThrow(InvalidValueError)
            })
        })

        describe('fromHCS()', () => {
            it('should create rate from HCS data', () => {
                const timestamp = new Date('2025-10-28T10:00:00Z')
                const rate = Rate.fromHCS(1.005, '123456', timestamp)

                expect(rate.value).toBe(1.005)
                expect(rate.sequenceNumber).toBe('123456')
                expect(rate.timestamp).toEqual(timestamp)
                expect(rate.validUntil.getTime()).toBe(timestamp.getTime() + 5 * 60 * 1000)
            })
        })

        describe('withValidity()', () => {
            it('should create rate with custom validity period', () => {
                const timestamp = new Date('2025-10-28T10:00:00Z')
                const validUntil = new Date('2025-10-28T10:10:00Z') // 10 minutes

                const rate = Rate.withValidity(1.005, '123456', timestamp, validUntil)

                expect(rate.timestamp).toEqual(timestamp)
                expect(rate.validUntil).toEqual(validUntil)
            })

            it('should throw error if validUntil is before timestamp', () => {
                const timestamp = new Date('2025-10-28T10:10:00Z')
                const validUntil = new Date('2025-10-28T10:00:00Z') // Before timestamp

                expect(() =>
                    Rate.withValidity(1.005, '123456', timestamp, validUntil)
                ).toThrow(InvalidValueError)
            })

            it('should throw error if validUntil equals timestamp', () => {
                const timestamp = new Date('2025-10-28T10:00:00Z')
                const validUntil = new Date('2025-10-28T10:00:00Z') // Same time

                expect(() =>
                    Rate.withValidity(1.005, '123456', timestamp, validUntil)
                ).toThrow(InvalidValueError)
            })
        })

        describe('fromJSON()', () => {
            it('should create rate from JSON with string dates', () => {
                const json = {
                    value: 1.005,
                    sequenceNumber: '123456',
                    timestamp: '2025-10-28T10:00:00Z',
                    validUntil: '2025-10-28T10:05:00Z'
                }

                const rate = Rate.fromJSON(json)

                expect(rate.value).toBe(1.005)
                expect(rate.sequenceNumber).toBe('123456')
                expect(rate.timestamp).toEqual(new Date(json.timestamp))
                expect(rate.validUntil).toEqual(new Date(json.validUntil))
            })

            it('should create rate from JSON with Date objects', () => {
                const timestamp = new Date('2025-10-28T10:00:00Z')
                const validUntil = new Date('2025-10-28T10:05:00Z')

                const json = {
                    value: 1.005,
                    sequenceNumber: '123456',
                    timestamp,
                    validUntil
                }

                const rate = Rate.fromJSON(json)

                expect(rate.timestamp).toEqual(timestamp)
                expect(rate.validUntil).toEqual(validUntil)
            })
        })
    })

    describe('Currency Conversion', () => {
        describe('convert()', () => {
            let validRate: Rate

            beforeEach(() => {
                // Create a rate that won't expire during the test
                const timestamp = new Date()
                const validUntil = new Date(timestamp.getTime() + 10 * 60 * 1000) // 10 minutes
                validRate = Rate.withValidity(1.005, '123', timestamp, validUntil)
            })

            it('should convert USDC to HUSD by dividing', () => {
                const result = validRate.convert(100, 'USDC', 'HUSD')

                // HUSD = USDC / rate = 100 / 1.005 ≈ 99.502
                expect(result).toBeCloseTo(99.502, 2)
            })

            it('should convert HUSD to USDC by multiplying', () => {
                const result = validRate.convert(100, 'HUSD', 'USDC')

                // USDC = HUSD * rate = 100 * 1.005 = 100.5
                expect(result).toBeCloseTo(100.5, 10)
            })

            it('should return same amount for same currency', () => {
                const result = validRate.convert(100, 'USDC', 'USDC')

                expect(result).toBe(100)
            })

            it('should handle zero amount', () => {
                const result = validRate.convert(0, 'USDC', 'HUSD')

                expect(result).toBe(0)
            })

            it('should handle very small amounts', () => {
                const result = validRate.convert(0.000001, 'USDC', 'HUSD')

                expect(result).toBeCloseTo(0.000000995, 9)
            })

            it('should handle very large amounts', () => {
                const result = validRate.convert(1_000_000_000, 'USDC', 'HUSD')

                expect(result).toBeCloseTo(995_024_875.621, 0)
            })

            it('should throw error for unsupported currency pairs', () => {
                expect(() => validRate.convert(100, 'HBAR', 'USDC')).toThrow(InvalidValueError)
                expect(() => validRate.convert(100, 'USDC', 'HBAR')).toThrow(InvalidValueError)
                expect(() => validRate.convert(100, 'HBAR', 'HUSD')).toThrow(InvalidValueError)
            })

            it('should throw error when using expired rate', () => {
                // Create expired rate (valid until in the past)
                const timestamp = new Date('2025-10-28T10:00:00Z')
                const validUntil = new Date('2025-10-28T10:05:00Z')
                const expiredRate = Rate.withValidity(1.005, '123', timestamp, validUntil)

                expect(() => expiredRate.convert(100, 'USDC', 'HUSD')).toThrow(ExpiredRateError)
            })

            it('should be reversible (round-trip conversion)', () => {
                const originalAmount = 100

                // Convert USDC -> HUSD -> USDC
                const husd = validRate.convert(originalAmount, 'USDC', 'HUSD')
                const backToUsdc = validRate.convert(husd, 'HUSD', 'USDC')

                expect(backToUsdc).toBeCloseTo(originalAmount, 10)
            })
        })
    })

    describe('Expiration Logic', () => {
        describe('isExpired()', () => {
            it('should return false for valid rate', () => {
                const rate = Rate.create(1.005, '123456')

                expect(rate.isExpired()).toBe(false)
            })

            it('should return true for expired rate', () => {
                // Create rate that expired in the past
                const timestamp = new Date('2025-10-28T10:00:00Z')
                const validUntil = new Date('2025-10-28T10:05:00Z')
                const rate = Rate.withValidity(1.005, '123', timestamp, validUntil)

                expect(rate.isExpired()).toBe(true)
            })

            it('should accept custom "now" parameter', () => {
                const timestamp = new Date('2025-10-28T10:00:00Z')
                const validUntil = new Date('2025-10-28T10:05:00Z')
                const rate = Rate.withValidity(1.005, '123', timestamp, validUntil)

                // Check at a time before expiration
                const beforeExpiration = new Date('2025-10-28T10:04:00Z')
                expect(rate.isExpired(beforeExpiration)).toBe(false)

                // Check at a time after expiration
                const afterExpiration = new Date('2025-10-28T10:06:00Z')
                expect(rate.isExpired(afterExpiration)).toBe(true)
            })

            it('should return true when exactly at expiration time', () => {
                const timestamp = new Date('2025-10-28T10:00:00Z')
                const validUntil = new Date('2025-10-28T10:05:00Z')
                const rate = Rate.withValidity(1.005, '123', timestamp, validUntil)

                // At exact expiration moment
                expect(rate.isExpired(validUntil)).toBe(false)
                // One millisecond after
                const oneMsAfter = new Date(validUntil.getTime() + 1)
                expect(rate.isExpired(oneMsAfter)).toBe(true)
            })
        })

        describe('isValid()', () => {
            it('should return true for non-expired rate', () => {
                const rate = Rate.create(1.005, '123456')

                expect(rate.isValid()).toBe(true)
            })

            it('should return false for expired rate', () => {
                const timestamp = new Date('2025-10-28T10:00:00Z')
                const validUntil = new Date('2025-10-28T10:05:00Z')
                const rate = Rate.withValidity(1.005, '123', timestamp, validUntil)

                expect(rate.isValid()).toBe(false)
            })

            it('should accept custom "now" parameter', () => {
                const timestamp = new Date('2025-10-28T10:00:00Z')
                const validUntil = new Date('2025-10-28T10:05:00Z')
                const rate = Rate.withValidity(1.005, '123', timestamp, validUntil)

                const beforeExpiration = new Date('2025-10-28T10:04:00Z')
                expect(rate.isValid(beforeExpiration)).toBe(true)

                const afterExpiration = new Date('2025-10-28T10:06:00Z')
                expect(rate.isValid(afterExpiration)).toBe(false)
            })
        })

        describe('getRemainingValidity()', () => {
            it('should return remaining time in milliseconds', () => {
                const timestamp = new Date('2025-10-28T10:00:00Z')
                const validUntil = new Date('2025-10-28T10:05:00.000Z')
                const rate = Rate.withValidity(1.005, '123', timestamp, validUntil)

                // Mock Date.now to control current time
                const now = new Date('2025-10-28T10:02:00.000Z')
                jest.spyOn(global, 'Date').mockImplementation(() => now as unknown as string)

                const remaining = rate.getRemainingValidity()

                expect(remaining).toBe(3 * 60 * 1000) // 3 minutes

                jest.restoreAllMocks()
            })

            it('should return 0 for expired rate', () => {
                const timestamp = new Date('2025-10-28T10:00:00Z')
                const validUntil = new Date('2025-10-28T10:05:00Z')
                const rate = Rate.withValidity(1.005, '123', timestamp, validUntil)

                // Current time is after expiration
                const remaining = rate.getRemainingValidity()

                expect(remaining).toBe(0)
            })

            it('should use current time', () => {
                const rate = Rate.create(1.005, '123456')

                const remaining = rate.getRemainingValidity()

                // Should be approximately 5 minutes (allowing some tolerance)
                expect(remaining).toBeGreaterThan(4.9 * 60 * 1000)
                expect(remaining).toBeLessThanOrEqual(5 * 60 * 1000)
            })
        })
    })

    describe('Display Methods', () => {
        describe('toJSON()', () => {
            it('should serialize to JSON object', () => {
                const timestamp = new Date('2025-10-28T10:00:00Z')
                const validUntil = new Date('2025-10-28T10:05:00Z')
                const rate = Rate.withValidity(1.005, '123456', timestamp, validUntil)

                const json = rate.toJSON()

                expect(json).toEqual({
                    value: 1.005,
                    sequenceNumber: '123456',
                    timestamp: timestamp.toISOString(),
                    validUntil: validUntil.toISOString(),
                    isExpired: true // Rate from 2025 is expired now
                })
            })

            it('should be JSON.stringify compatible', () => {
                const timestamp = new Date('2025-10-28T10:00:00Z')
                const validUntil = new Date('2025-10-28T10:05:00Z')
                const rate = Rate.withValidity(1.005, '123456', timestamp, validUntil)

                const jsonString = JSON.stringify(rate)

                expect(jsonString).toBe(
                    '{"value":1.005,"sequenceNumber":"123456",' +
                    '"timestamp":"2025-10-28T10:00:00.000Z",' +
                    '"validUntil":"2025-10-28T10:05:00.000Z",' +
                    '"isExpired":true}'
                )
            })

            it('should allow round-trip serialization', () => {
                const originalRate = Rate.create(1.005, '123456')

                // Serialize and deserialize
                const json = originalRate.toJSON()
                const restoredRate = Rate.fromJSON(json)

                expect(restoredRate.value).toBe(originalRate.value)
                expect(restoredRate.sequenceNumber).toBe(originalRate.sequenceNumber)
                expect(restoredRate.timestamp.getTime()).toBe(originalRate.timestamp.getTime())
                expect(restoredRate.validUntil.getTime()).toBe(originalRate.validUntil.getTime())
            })
        })
    })

    describe('Edge Cases', () => {
        it('should handle rate of exactly 1.0', () => {
            const rate = Rate.create(1.0, '123456')

            const husd = rate.convert(100, 'USDC', 'HUSD')
            const usdc = rate.convert(100, 'HUSD', 'USDC')

            expect(husd).toBe(100)
            expect(usdc).toBe(100)
        })

        it('should handle very small rates', () => {
            const rate = Rate.create(0.00001, '123456')

            const husd = rate.convert(100, 'USDC', 'HUSD')

            expect(husd).toBe(10_000_000) // 100 / 0.00001
        })

        it('should handle very large rates', () => {
            const rate = Rate.create(1000000, '123456')

            const husd = rate.convert(100, 'USDC', 'HUSD')

            expect(husd).toBe(0.0001) // 100 / 1000000
        })

        it('should handle different sequence number formats', () => {
            const numericSeq = Rate.create(1.005, '123456')
            const alphaSeq = Rate.create(1.005, 'ABC-123-XYZ')
            const mixedSeq = Rate.create(1.005, '2025-10-28-001')

            expect(numericSeq.sequenceNumber).toBe('123456')
            expect(alphaSeq.sequenceNumber).toBe('ABC-123-XYZ')
            expect(mixedSeq.sequenceNumber).toBe('2025-10-28-001')
        })

        it('should handle floating point precision in conversions', () => {
            const rate = Rate.create(1.005, '123')

            // Test that repeated conversions don't accumulate errors
            let amount = 100
            for (let i = 0; i < 1000; i++) {
                const husd = rate.convert(amount, 'USDC', 'HUSD')
                amount = rate.convert(husd, 'HUSD', 'USDC')
            }

            expect(amount).toBeCloseTo(100, 8) // Should still be ~100 after 1000 round trips
        })
    })
})
