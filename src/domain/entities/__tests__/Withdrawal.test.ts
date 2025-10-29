/**
 * Withdrawal Entity Tests
 *
 * Comprehensive test suite for the Withdrawal domain entity covering:
 * - Factory methods (instant and standard)
 * - Business logic (state transitions, fee calculations)
 * - Calculation methods
 * - Query methods
 * - Validation and error handling
 * - Immutability
 */

import { Withdrawal, WithdrawalStatus, WithdrawalType } from '../Withdrawal'
import { Money } from '@/domain/value-objects/Money'
import { Rate } from '@/domain/value-objects/Rate'
import { AccountId } from '@/domain/value-objects/AccountId'
import {
    WithdrawalError,
    InvalidStateError,
    BusinessRuleViolationError,
} from '@/domain/errors/DomainError'

describe('Withdrawal Entity', () => {
    let validRate: Rate

    beforeEach(() => {
        // Create a valid rate that won't expire during tests
        const timestamp = new Date()
        const validUntil = new Date(timestamp.getTime() + 10 * 60 * 1000) // 10 minutes
        validRate = Rate.withValidity(1.005, 'seq-123', timestamp, validUntil)
    })

    describe('Factory Methods', () => {
        describe('createInstant()', () => {
            it('should create instant withdrawal with valid data', () => {
                const withdrawal = Withdrawal.createInstant('0.0.12345', 100, validRate, 'Test withdrawal')

                expect(withdrawal.id).toBeDefined()
                expect(withdrawal.userAccountId.toString()).toBe('0.0.12345')
                expect(withdrawal.amountHusd.amount).toBe(100)
                expect(withdrawal.amountHusd.currency).toBe('HUSD')
                expect(withdrawal.rate).toBe(validRate)
                expect(withdrawal.type).toBe(WithdrawalType.Instant)
                expect(withdrawal.status).toBe(WithdrawalStatus.Pending)
                expect(withdrawal.memo).toBe('Test withdrawal')
                expect(withdrawal.createdAt).toBeInstanceOf(Date)
                expect(withdrawal.feeAmount).toBeDefined()
                expect(withdrawal.feeAmount?.amount).toBe(0.5) // 0.5% of 100
            })

            it('should calculate fee correctly', () => {
                const withdrawal = Withdrawal.createInstant('0.0.12345', 100, validRate)

                expect(withdrawal.feeAmount?.amount).toBe(0.5) // 0.5% fee
            })

            it('should throw error for amount below minimum', () => {
                expect(() => Withdrawal.createInstant('0.0.12345', 0.005, validRate)).toThrow(
                    BusinessRuleViolationError
                )
            })

            it('should throw error for amount above maximum', () => {
                expect(() => Withdrawal.createInstant('0.0.12345', 10001, validRate)).toThrow(
                    BusinessRuleViolationError
                )
            })

            it('should accept amount at minimum threshold', () => {
                const withdrawal = Withdrawal.createInstant('0.0.12345', 0.01, validRate)

                expect(withdrawal.amountHusd.amount).toBe(0.01)
            })

            it('should accept amount at maximum threshold', () => {
                const withdrawal = Withdrawal.createInstant('0.0.12345', 10000, validRate)

                expect(withdrawal.amountHusd.amount).toBe(10000)
            })

            it('should throw error for zero amount', () => {
                expect(() => Withdrawal.createInstant('0.0.12345', 0, validRate)).toThrow(
                    WithdrawalError
                )
            })

            it('should throw error for negative amount', () => {
                expect(() => Withdrawal.createInstant('0.0.12345', -100, validRate)).toThrow(
                    WithdrawalError
                )
            })

            it('should throw error for expired rate', () => {
                const expiredRate = Rate.withValidity(
                    1.005,
                    'seq-123',
                    new Date('2025-01-01T10:00:00Z'),
                    new Date('2025-01-01T10:05:00Z')
                )

                expect(() => Withdrawal.createInstant('0.0.12345', 100, expiredRate)).toThrow(
                    WithdrawalError
                )
            })
        })

        describe('createStandard()', () => {
            it('should create standard withdrawal with valid data', () => {
                const withdrawal = Withdrawal.createStandard('0.0.12345', 100, validRate, 'Test')

                expect(withdrawal.id).toBeDefined()
                expect(withdrawal.userAccountId.toString()).toBe('0.0.12345')
                expect(withdrawal.amountHusd.amount).toBe(100)
                expect(withdrawal.type).toBe(WithdrawalType.Standard)
                expect(withdrawal.status).toBe(WithdrawalStatus.Pending)
                expect(withdrawal.feeAmount).toBeUndefined() // No fee for standard
            })

            it('should not have fee amount', () => {
                const withdrawal = Withdrawal.createStandard('0.0.12345', 100, validRate)

                expect(withdrawal.feeAmount).toBeUndefined()
            })

            it('should accept any positive amount', () => {
                const small = Withdrawal.createStandard('0.0.12345', 0.001, validRate)
                const large = Withdrawal.createStandard('0.0.12345', 1000000, validRate)

                expect(small.amountHusd.amount).toBe(0.001)
                expect(large.amountHusd.amount).toBe(1000000)
            })

            it('should throw error for zero amount', () => {
                expect(() => Withdrawal.createStandard('0.0.12345', 0, validRate)).toThrow(
                    WithdrawalError
                )
            })

            it('should throw error for expired rate', () => {
                const expiredRate = Rate.withValidity(
                    1.005,
                    'seq-123',
                    new Date('2025-01-01T10:00:00Z'),
                    new Date('2025-01-01T10:05:00Z')
                )

                expect(() => Withdrawal.createStandard('0.0.12345', 100, expiredRate)).toThrow(
                    WithdrawalError
                )
            })
        })

        describe('fromData()', () => {
            it('should reconstitute instant withdrawal from data', () => {
                const createdAt = new Date('2025-10-28T10:00:00Z')
                const completedAt = new Date('2025-10-28T10:05:00Z')

                const withdrawal = Withdrawal.fromData({
                    id: 'test-id-123',
                    userAccountId: '0.0.12345',
                    amountHusd: 100,
                    rate: validRate,
                    type: WithdrawalType.Instant,
                    status: WithdrawalStatus.Completed,
                    feeAmount: 0.5,
                    scheduleId: '0.0.123@456',
                    createdAt,
                    completedAt,
                    transactionId: '0.0.789@123',
                    memo: 'Test memo'
                })

                expect(withdrawal.type).toBe(WithdrawalType.Instant)
                expect(withdrawal.feeAmount?.amount).toBe(0.5)
                expect(withdrawal.status).toBe(WithdrawalStatus.Completed)
            })

            it('should reconstitute standard withdrawal from data', () => {
                const withdrawal = Withdrawal.fromData({
                    id: 'test-id',
                    userAccountId: '0.0.12345',
                    amountHusd: 100,
                    rate: validRate,
                    type: WithdrawalType.Standard,
                    status: WithdrawalStatus.Pending,
                    createdAt: new Date()
                })

                expect(withdrawal.type).toBe(WithdrawalType.Standard)
                expect(withdrawal.feeAmount).toBeUndefined()
            })
        })
    })

    describe('Business Logic Methods', () => {
        describe('calculateUsdcAmount()', () => {
            it('should calculate USDC for instant withdrawal (after fee)', () => {
                const withdrawal = Withdrawal.createInstant('0.0.12345', 100, validRate)

                const usdc = withdrawal.calculateUsdcAmount()

                // Net HUSD = 100 - 0.5 (fee) = 99.5
                // USDC = 99.5 * 1.005 = 99.9975
                expect(usdc.currency).toBe('USDC')
                expect(usdc.amount).toBeCloseTo(99.9975, 2)
            })

            it('should calculate USDC for standard withdrawal (no fee)', () => {
                const withdrawal = Withdrawal.createStandard('0.0.12345', 100, validRate)

                const usdc = withdrawal.calculateUsdcAmount()

                // USDC = 100 * 1.005 = 100.5
                expect(usdc.currency).toBe('USDC')
                expect(usdc.amount).toBeCloseTo(100.5, 2)
            })

            it('should use the withdrawal rate', () => {
                const withdrawal = Withdrawal.createStandard('0.0.12345', 50, validRate)

                const usdc = withdrawal.calculateUsdcAmount()

                expect(usdc.amount).toBeCloseTo(50.25, 2)
            })
        })

        describe('calculateFeeAmount()', () => {
            it('should return fee for instant withdrawal', () => {
                const withdrawal = Withdrawal.createInstant('0.0.12345', 100, validRate)

                const fee = withdrawal.calculateFeeAmount()

                expect(fee.amount).toBe(0.5)
                expect(fee.currency).toBe('HUSD')
            })

            it('should return zero for standard withdrawal', () => {
                const withdrawal = Withdrawal.createStandard('0.0.12345', 100, validRate)

                const fee = withdrawal.calculateFeeAmount()

                expect(fee.amount).toBe(0)
                expect(fee.currency).toBe('HUSD')
            })

            it('should calculate fee as 0.5% of amount', () => {
                const w1 = Withdrawal.createInstant('0.0.12345', 200, validRate)
                const w2 = Withdrawal.createInstant('0.0.12345', 50, validRate)

                expect(w1.calculateFeeAmount().amount).toBe(1.0) // 0.5% of 200
                expect(w2.calculateFeeAmount().amount).toBe(0.25) // 0.5% of 50
            })
        })

        describe('calculateNetAmount()', () => {
            it('should return amount minus fee for instant', () => {
                const withdrawal = Withdrawal.createInstant('0.0.12345', 100, validRate)

                const net = withdrawal.calculateNetAmount()

                expect(net.amount).toBe(99.5) // 100 - 0.5 fee
            })

            it('should return full amount for standard', () => {
                const withdrawal = Withdrawal.createStandard('0.0.12345', 100, validRate)

                const net = withdrawal.calculateNetAmount()

                expect(net.amount).toBe(100) // No fee
            })
        })

        describe('schedule()', () => {
            it('should transition from pending to scheduled', () => {
                const withdrawal = Withdrawal.createStandard('0.0.12345', 100, validRate)

                const scheduled = withdrawal.schedule('0.0.123@456')

                expect(scheduled.status).toBe(WithdrawalStatus.Scheduled)
                expect(scheduled.scheduleId).toBe('0.0.123@456')
                expect(scheduled).not.toBe(withdrawal) // Immutability
            })

            it('should preserve withdrawal data', () => {
                const withdrawal = Withdrawal.createInstant('0.0.12345', 100, validRate, 'Test')

                const scheduled = withdrawal.schedule('0.0.123@456')

                expect(scheduled.amountHusd.amount).toBe(withdrawal.amountHusd.amount)
                expect(scheduled.feeAmount?.amount).toBe(withdrawal.feeAmount?.amount)
                expect(scheduled.memo).toBe(withdrawal.memo)
            })

            it('should throw error if not pending', () => {
                const withdrawal = Withdrawal.createStandard('0.0.12345', 100, validRate)
                const scheduled = withdrawal.schedule('0.0.123@456')

                expect(() => scheduled.schedule('0.0.999@999')).toThrow(InvalidStateError)
            })
        })

        describe('complete()', () => {
            it('should complete from pending status', () => {
                const withdrawal = Withdrawal.createStandard('0.0.12345', 100, validRate)

                const completed = withdrawal.complete('0.0.789@123')

                expect(completed.status).toBe(WithdrawalStatus.Completed)
                expect(completed.transactionId).toBe('0.0.789@123')
                expect(completed.completedAt).toBeInstanceOf(Date)
            })

            it('should complete from scheduled status', () => {
                const withdrawal = Withdrawal.createStandard('0.0.12345', 100, validRate)
                const scheduled = withdrawal.schedule('0.0.123@456')

                const completed = scheduled.complete('0.0.789@123')

                expect(completed.status).toBe(WithdrawalStatus.Completed)
                expect(completed.scheduleId).toBe('0.0.123@456') // Preserved
            })

            it('should throw error if already completed', () => {
                const withdrawal = Withdrawal.createStandard('0.0.12345', 100, validRate)
                const completed = withdrawal.complete('0.0.789@123')

                expect(() => completed.complete('0.0.999@999')).toThrow(InvalidStateError)
            })

            it('should throw error if failed', () => {
                const withdrawal = Withdrawal.createStandard('0.0.12345', 100, validRate)
                const failed = withdrawal.fail('Test')

                expect(() => failed.complete('0.0.789@123')).toThrow(InvalidStateError)
            })
        })

        describe('fail()', () => {
            it('should mark withdrawal as failed', () => {
                const withdrawal = Withdrawal.createStandard('0.0.12345', 100, validRate, 'Original')

                const failed = withdrawal.fail('Insufficient balance')

                expect(failed.status).toBe(WithdrawalStatus.Failed)
                expect(failed.memo).toContain('Insufficient balance')
                expect(failed.memo).toContain('Original')
            })

            it('should work without reason', () => {
                const withdrawal = Withdrawal.createStandard('0.0.12345', 100, validRate)

                const failed = withdrawal.fail()

                expect(failed.status).toBe(WithdrawalStatus.Failed)
            })

            it('should fail from any status', () => {
                const pending = Withdrawal.createStandard('0.0.12345', 100, validRate)
                const scheduled = pending.schedule('0.0.123@456')
                const completed = scheduled.complete('0.0.789@123')

                expect(pending.fail().status).toBe(WithdrawalStatus.Failed)
                expect(scheduled.fail().status).toBe(WithdrawalStatus.Failed)
                expect(completed.fail().status).toBe(WithdrawalStatus.Failed)
            })
        })
    })

    describe('Query Methods', () => {
        it('isInstant() should return true for instant withdrawals', () => {
            const instant = Withdrawal.createInstant('0.0.12345', 100, validRate)
            const standard = Withdrawal.createStandard('0.0.12345', 100, validRate)

            expect(instant.isInstant()).toBe(true)
            expect(standard.isInstant()).toBe(false)
        })

        it('isStandard() should return true for standard withdrawals', () => {
            const instant = Withdrawal.createInstant('0.0.12345', 100, validRate)
            const standard = Withdrawal.createStandard('0.0.12345', 100, validRate)

            expect(instant.isStandard()).toBe(false)
            expect(standard.isStandard()).toBe(true)
        })

        it('isPending() should return true for pending withdrawals', () => {
            const withdrawal = Withdrawal.createStandard('0.0.12345', 100, validRate)

            expect(withdrawal.isPending()).toBe(true)
            expect(withdrawal.isScheduled()).toBe(false)
            expect(withdrawal.isCompleted()).toBe(false)
            expect(withdrawal.isFailed()).toBe(false)
        })

        it('isScheduled() should return true for scheduled withdrawals', () => {
            const withdrawal = Withdrawal.createStandard('0.0.12345', 100, validRate)
            const scheduled = withdrawal.schedule('0.0.123@456')

            expect(scheduled.isScheduled()).toBe(true)
            expect(scheduled.isPending()).toBe(false)
        })

        it('isCompleted() should return true for completed withdrawals', () => {
            const withdrawal = Withdrawal.createStandard('0.0.12345', 100, validRate)
            const completed = withdrawal.complete('0.0.789@123')

            expect(completed.isCompleted()).toBe(true)
            expect(completed.isPending()).toBe(false)
        })

        it('isFailed() should return true for failed withdrawals', () => {
            const withdrawal = Withdrawal.createStandard('0.0.12345', 100, validRate)
            const failed = withdrawal.fail()

            expect(failed.isFailed()).toBe(true)
            expect(failed.isPending()).toBe(false)
        })

        it('isRateExpired() should check rate expiration', () => {
            const withdrawal = Withdrawal.createStandard('0.0.12345', 100, validRate)

            expect(withdrawal.isRateExpired()).toBe(false)
        })
    })

    describe('Conversion Methods', () => {
        describe('toJSON()', () => {
            it('should serialize instant withdrawal to JSON', () => {
                const withdrawal = Withdrawal.createInstant('0.0.12345', 100, validRate, 'Test')

                const json = withdrawal.toJSON()

                expect(json.id).toBeDefined()
                expect(json.userAccountId).toBe('0.0.12345')
                expect(json.amountHusd).toBe(100)
                expect(json.feeAmount).toBe(0.5)
                expect(json.netAmount).toBe(99.5)
                expect(json.amountUsdc).toBeCloseTo(99.9975, 2)
                expect(json.type).toBe(WithdrawalType.Instant)
                expect(json.status).toBe(WithdrawalStatus.Pending)
            })

            it('should serialize standard withdrawal to JSON', () => {
                const withdrawal = Withdrawal.createStandard('0.0.12345', 100, validRate)

                const json = withdrawal.toJSON()

                expect(json.feeAmount).toBeUndefined()
                expect(json.netAmount).toBe(100)
                expect(json.type).toBe(WithdrawalType.Standard)
            })
        })

        describe('toDisplaySummary()', () => {
            it('should create readable summary for instant withdrawal', () => {
                const withdrawal = Withdrawal.createInstant('0.0.12345', 100, validRate)

                const summary = withdrawal.toDisplaySummary()

                expect(summary).toContain('Instant')
                expect(summary).toContain('100.000 HUSD')
                expect(summary).toContain('fee')
                expect(summary).toContain('pending')
            })

            it('should create readable summary for standard withdrawal', () => {
                const withdrawal = Withdrawal.createStandard('0.0.12345', 100, validRate)

                const summary = withdrawal.toDisplaySummary()

                expect(summary).toContain('Standard')
                expect(summary).toContain('100.000 HUSD')
                expect(summary).not.toContain('fee')
            })
        })
    })

    describe('Immutability', () => {
        it('should not mutate original on schedule', () => {
            const original = Withdrawal.createStandard('0.0.12345', 100, validRate)

            const scheduled = original.schedule('0.0.123@456')

            expect(original.status).toBe(WithdrawalStatus.Pending)
            expect(original.scheduleId).toBeUndefined()
            expect(scheduled.status).toBe(WithdrawalStatus.Scheduled)
        })

        it('should not mutate original on complete', () => {
            const original = Withdrawal.createStandard('0.0.12345', 100, validRate)

            const completed = original.complete('0.0.789@123')

            expect(original.status).toBe(WithdrawalStatus.Pending)
            expect(completed.status).toBe(WithdrawalStatus.Completed)
        })

        it('should not mutate original on fail', () => {
            const original = Withdrawal.createStandard('0.0.12345', 100, validRate)

            const failed = original.fail()

            expect(original.status).toBe(WithdrawalStatus.Pending)
            expect(failed.status).toBe(WithdrawalStatus.Failed)
        })
    })

    describe('Edge Cases', () => {
        it('should handle minimum instant withdrawal amount', () => {
            const withdrawal = Withdrawal.createInstant('0.0.12345', 0.01, validRate)

            expect(withdrawal.amountHusd.amount).toBe(0.01)
            expect(withdrawal.feeAmount?.amount).toBe(0.00005) // 0.5% of 0.01
        })

        it('should handle maximum instant withdrawal amount', () => {
            const withdrawal = Withdrawal.createInstant('0.0.12345', 10000, validRate)

            expect(withdrawal.amountHusd.amount).toBe(10000)
            expect(withdrawal.feeAmount?.amount).toBe(50) // 0.5% of 10000
        })

        it('should maintain data integrity through full lifecycle', () => {
            const original = Withdrawal.createInstant('0.0.12345', 100, validRate, 'Test')
            const scheduled = original.schedule('0.0.123@456')
            const completed = scheduled.complete('0.0.789@123')

            expect(original.id).toBe(scheduled.id)
            expect(scheduled.id).toBe(completed.id)
            expect(original.amountHusd.amount).toBe(completed.amountHusd.amount)
            expect(original.feeAmount?.amount).toBe(completed.feeAmount?.amount)
        })

        it('should handle very small fee amounts', () => {
            const withdrawal = Withdrawal.createInstant('0.0.12345', 0.02, validRate)

            const fee = withdrawal.calculateFeeAmount()

            expect(fee.amount).toBeCloseTo(0.0001, 6) // 0.5% of 0.02
        })
    })
})
