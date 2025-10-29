/**
 * Money Value Object Tests
 *
 * Comprehensive test suite for the Money value object covering:
 * - Factory methods
 * - Arithmetic operations
 * - Comparison operations
 * - Currency conversions
 * - Edge cases and error handling
 */

import { Money } from '../Money'
import { Rate } from '../Rate'
import { InvalidValueError, CurrencyMismatchError } from '@/domain/errors/DomainError'

describe('Money Value Object', () => {
    describe('Factory Methods', () => {
        describe('usdc()', () => {
            it('should create USDC money with correct amount', () => {
                const money = Money.usdc(100.50)

                expect(money.amount).toBe(100.50)
                expect(money.currency).toBe('USDC')
            })

            it('should throw error for negative amount', () => {
                expect(() => Money.usdc(-10)).toThrow(InvalidValueError)
            })

            it('should throw error for infinite amount', () => {
                expect(() => Money.usdc(Infinity)).toThrow(InvalidValueError)
            })

            it('should throw error for NaN amount', () => {
                expect(() => Money.usdc(NaN)).toThrow(InvalidValueError)
            })

            it('should accept zero amount', () => {
                const money = Money.usdc(0)

                expect(money.amount).toBe(0)
                expect(money.isZero()).toBe(true)
            })
        })

        describe('husd()', () => {
            it('should create HUSD money with correct amount', () => {
                const money = Money.husd(50.25)

                expect(money.amount).toBe(50.25)
                expect(money.currency).toBe('HUSD')
            })
        })

        describe('hbar()', () => {
            it('should create HBAR money with correct amount', () => {
                const money = Money.hbar(1000)

                expect(money.amount).toBe(1000)
                expect(money.currency).toBe('HBAR')
            })
        })

        describe('fromTinyUnits()', () => {
            it('should convert USDC tiny units correctly', () => {
                // 100 USDC = 100,000,000 tiny units (6 decimals)
                const money = Money.fromTinyUnits(100_000_000, 'USDC')

                expect(money.amount).toBe(100)
                expect(money.currency).toBe('USDC')
            })

            it('should convert HUSD tiny units correctly', () => {
                // 50 HUSD = 50,000 tiny units (3 decimals)
                const money = Money.fromTinyUnits(50_000, 'HUSD')

                expect(money.amount).toBe(50)
                expect(money.currency).toBe('HUSD')
            })

            it('should convert HBAR tiny units correctly', () => {
                // 1 HBAR = 100,000,000 tiny units (8 decimals)
                const money = Money.fromTinyUnits(100_000_000, 'HBAR')

                expect(money.amount).toBe(1)
                expect(money.currency).toBe('HBAR')
            })

            it('should handle fractional amounts', () => {
                // 0.5 USDC = 500,000 tiny units
                const money = Money.fromTinyUnits(500_000, 'USDC')

                expect(money.amount).toBe(0.5)
            })
        })

        describe('of()', () => {
            it('should create money with specified currency', () => {
                const money = Money.of(100, 'USDC')

                expect(money.amount).toBe(100)
                expect(money.currency).toBe('USDC')
            })
        })

        describe('zero()', () => {
            it('should create zero money for USDC', () => {
                const money = Money.zero('USDC')

                expect(money.amount).toBe(0)
                expect(money.currency).toBe('USDC')
                expect(money.isZero()).toBe(true)
            })

            it('should create zero money for HUSD', () => {
                const money = Money.zero('HUSD')

                expect(money.amount).toBe(0)
                expect(money.currency).toBe('HUSD')
            })
        })
    })

    describe('Conversions', () => {
        describe('toTinyUnits()', () => {
            it('should convert USDC to tiny units', () => {
                const money = Money.usdc(100.5)

                expect(money.toTinyUnits()).toBe(100_500_000)
            })

            it('should convert HUSD to tiny units', () => {
                const money = Money.husd(50.5)

                expect(money.toTinyUnits()).toBe(50_500)
            })

            it('should convert HBAR to tiny units', () => {
                const money = Money.hbar(1.5)

                expect(money.toTinyUnits()).toBe(150_000_000)
            })

            it('should floor fractional tiny units', () => {
                // Create amount that would result in fractional tiny units
                const money = Money.usdc(0.1234567)

                // Should floor to 123456 (not 123456.7)
                expect(money.toTinyUnits()).toBe(123_456)
            })
        })

        describe('convertTo()', () => {
            it('should return same instance if converting to same currency', () => {
                const usdc = Money.usdc(100)
                const result = usdc.convertTo('USDC', Rate.create(1.005, '123'))

                expect(result).toBe(usdc)
            })

            it('should convert USDC to HUSD using rate', () => {
                const usdc = Money.usdc(100)
                const rate = Rate.create(1.005, '123') // Rate = USDC/HUSD = 1.005

                const husd = usdc.convertTo('HUSD', rate)

                expect(husd.currency).toBe('HUSD')
                // HUSD = USDC / rate = 100 / 1.005 = ~99.5
                expect(husd.amount).toBeCloseTo(99.502, 2)
            })

            it('should convert HUSD to USDC using rate', () => {
                const husd = Money.husd(100)
                const rate = Rate.create(1.005, '123') // Rate = USDC/HUSD = 1.005

                const usdc = husd.convertTo('USDC', rate)

                expect(usdc.currency).toBe('USDC')
                // USDC = HUSD * rate = 100 * 1.005 = 100.5
                expect(usdc.amount).toBeCloseTo(100.5, 2)
            })

            it('should throw error for unsupported conversion', () => {
                const hbar = Money.hbar(100)
                const rate = Rate.create(1.005, '123')

                expect(() => hbar.convertTo('USDC', rate)).toThrow(InvalidValueError)
            })
        })
    })

    describe('Arithmetic Operations', () => {
        describe('add()', () => {
            it('should add money with same currency', () => {
                const money1 = Money.usdc(100)
                const money2 = Money.usdc(50)

                const result = money1.add(money2)

                expect(result.amount).toBe(150)
                expect(result.currency).toBe('USDC')
            })

            it('should throw error when adding different currencies', () => {
                const usdc = Money.usdc(100)
                const husd = Money.husd(50)

                expect(() => usdc.add(husd)).toThrow(CurrencyMismatchError)
            })

            it('should handle adding zero', () => {
                const money = Money.usdc(100)
                const zero = Money.zero('USDC')

                const result = money.add(zero)

                expect(result.amount).toBe(100)
            })

            it('should be immutable', () => {
                const money1 = Money.usdc(100)
                const money2 = Money.usdc(50)

                const result = money1.add(money2)

                expect(money1.amount).toBe(100) // Original unchanged
                expect(money2.amount).toBe(50)  // Original unchanged
                expect(result.amount).toBe(150) // New instance
            })
        })

        describe('subtract()', () => {
            it('should subtract money with same currency', () => {
                const money1 = Money.usdc(100)
                const money2 = Money.usdc(30)

                const result = money1.subtract(money2)

                expect(result.amount).toBe(70)
                expect(result.currency).toBe('USDC')
            })

            it('should throw error when subtracting different currencies', () => {
                const usdc = Money.usdc(100)
                const husd = Money.husd(30)

                expect(() => usdc.subtract(husd)).toThrow(CurrencyMismatchError)
            })

            it('should throw error when result would be negative', () => {
                const money1 = Money.usdc(50)
                const money2 = Money.usdc(100)

                expect(() => money1.subtract(money2)).toThrow(InvalidValueError)
            })

            it('should allow subtracting to zero', () => {
                const money1 = Money.usdc(100)
                const money2 = Money.usdc(100)

                const result = money1.subtract(money2)

                expect(result.amount).toBe(0)
                expect(result.isZero()).toBe(true)
            })
        })

        describe('multiply()', () => {
            it('should multiply by positive number', () => {
                const money = Money.usdc(100)

                const result = money.multiply(2)

                expect(result.amount).toBe(200)
                expect(result.currency).toBe('USDC')
            })

            it('should multiply by fractional number', () => {
                const money = Money.usdc(100)

                const result = money.multiply(0.5)

                expect(result.amount).toBe(50)
            })

            it('should multiply by zero', () => {
                const money = Money.usdc(100)

                const result = money.multiply(0)

                expect(result.amount).toBe(0)
                expect(result.isZero()).toBe(true)
            })

            it('should throw error for negative multiplier', () => {
                const money = Money.usdc(100)

                expect(() => money.multiply(-2)).toThrow(InvalidValueError)
            })
        })

        describe('divide()', () => {
            it('should divide by positive number', () => {
                const money = Money.usdc(100)

                const result = money.divide(2)

                expect(result.amount).toBe(50)
                expect(result.currency).toBe('USDC')
            })

            it('should divide by fractional number', () => {
                const money = Money.usdc(100)

                const result = money.divide(0.5)

                expect(result.amount).toBe(200)
            })

            it('should throw error for zero divisor', () => {
                const money = Money.usdc(100)

                expect(() => money.divide(0)).toThrow(InvalidValueError)
            })

            it('should throw error for negative divisor', () => {
                const money = Money.usdc(100)

                expect(() => money.divide(-2)).toThrow(InvalidValueError)
            })
        })
    })

    describe('Comparison Operations', () => {
        describe('equals()', () => {
            it('should return true for equal amounts and currencies', () => {
                const money1 = Money.usdc(100)
                const money2 = Money.usdc(100)

                expect(money1.equals(money2)).toBe(true)
            })

            it('should return false for different amounts', () => {
                const money1 = Money.usdc(100)
                const money2 = Money.usdc(50)

                expect(money1.equals(money2)).toBe(false)
            })

            it('should return false for different currencies', () => {
                const usdc = Money.usdc(100)
                const husd = Money.husd(100)

                expect(usdc.equals(husd)).toBe(false)
            })
        })

        describe('isGreaterThan()', () => {
            it('should return true when amount is greater', () => {
                const money1 = Money.usdc(100)
                const money2 = Money.usdc(50)

                expect(money1.isGreaterThan(money2)).toBe(true)
            })

            it('should return false when amount is less', () => {
                const money1 = Money.usdc(50)
                const money2 = Money.usdc(100)

                expect(money1.isGreaterThan(money2)).toBe(false)
            })

            it('should return false when amounts are equal', () => {
                const money1 = Money.usdc(100)
                const money2 = Money.usdc(100)

                expect(money1.isGreaterThan(money2)).toBe(false)
            })

            it('should throw error for different currencies', () => {
                const usdc = Money.usdc(100)
                const husd = Money.husd(50)

                expect(() => usdc.isGreaterThan(husd)).toThrow(CurrencyMismatchError)
            })
        })

        describe('isLessThan()', () => {
            it('should return true when amount is less', () => {
                const money1 = Money.usdc(50)
                const money2 = Money.usdc(100)

                expect(money1.isLessThan(money2)).toBe(true)
            })

            it('should return false when amount is greater', () => {
                const money1 = Money.usdc(100)
                const money2 = Money.usdc(50)

                expect(money1.isLessThan(money2)).toBe(false)
            })

            it('should return false when amounts are equal', () => {
                const money1 = Money.usdc(100)
                const money2 = Money.usdc(100)

                expect(money1.isLessThan(money2)).toBe(false)
            })
        })

        describe('isZero()', () => {
            it('should return true for zero amount', () => {
                const money = Money.zero('USDC')

                expect(money.isZero()).toBe(true)
            })

            it('should return false for non-zero amount', () => {
                const money = Money.usdc(100)

                expect(money.isZero()).toBe(false)
            })
        })

        describe('isPositive()', () => {
            it('should return true for positive amount', () => {
                const money = Money.usdc(100)

                expect(money.isPositive()).toBe(true)
            })

            it('should return false for zero amount', () => {
                const money = Money.zero('USDC')

                expect(money.isPositive()).toBe(false)
            })
        })
    })

    describe('Display Methods', () => {
        describe('toDisplayString()', () => {
            it('should format USDC with 6 decimals', () => {
                const money = Money.usdc(100.5)

                expect(money.toDisplayString()).toBe('100.500000 USDC')
            })

            it('should format HUSD with 3 decimals', () => {
                const money = Money.husd(50.5)

                expect(money.toDisplayString()).toBe('50.500 HUSD')
            })

            it('should format HBAR with 8 decimals', () => {
                const money = Money.hbar(1.5)

                expect(money.toDisplayString()).toBe('1.50000000 HBAR')
            })

            it('should format zero correctly', () => {
                const money = Money.zero('USDC')

                expect(money.toDisplayString()).toBe('0.000000 USDC')
            })
        })

        describe('toJSON()', () => {
            it('should serialize to JSON object', () => {
                const money = Money.usdc(100.5)

                const json = money.toJSON()

                expect(json).toEqual({
                    amount: 100.5,
                    currency: 'USDC'
                })
            })

            it('should be JSON.stringify compatible', () => {
                const money = Money.usdc(100.5)

                const jsonString = JSON.stringify(money)

                expect(jsonString).toBe('{"amount":100.5,"currency":"USDC"}')
            })
        })
    })

    describe('Edge Cases', () => {
        it('should handle very small amounts', () => {
            const money = Money.usdc(0.000001) // 1 micro USDC

            expect(money.amount).toBe(0.000001)
            expect(money.toTinyUnits()).toBe(1)
        })

        it('should handle very large amounts', () => {
            const money = Money.usdc(1_000_000_000) // 1 billion USDC

            expect(money.amount).toBe(1_000_000_000)
            expect(money.toTinyUnits()).toBe(1_000_000_000_000_000)
        })

        it('should handle rounding in arithmetic operations', () => {
            const money = Money.usdc(10)
            const result = money.divide(3) // 3.333333...

            expect(result.amount).toBeCloseTo(3.333333, 5)
        })

        it('should maintain immutability across all operations', () => {
            const original = Money.usdc(100)

            original.add(Money.usdc(50))
            original.subtract(Money.usdc(30))
            original.multiply(2)
            original.divide(2)

            expect(original.amount).toBe(100) // Original never changes
        })
    })
})
