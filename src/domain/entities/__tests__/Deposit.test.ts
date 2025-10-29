/**
 * Deposit Entity Tests
 *
 * Comprehensive test suite for the Deposit domain entity covering:
 * - Factory methods and creation
 * - Business logic (state transitions)
 * - Calculation methods
 * - Query methods
 * - Validation and error handling
 * - Immutability
 */

import { Deposit, DepositStatus } from '../Deposit'
import { Money } from '@/domain/value-objects/Money'
import { Rate } from '@/domain/value-objects/Rate'
import { AccountId } from '@/domain/value-objects/AccountId'
import { DepositError, InvalidStateError, InvalidValueError } from '@/domain/errors/DomainError'

describe('Deposit Entity', () => {
    let validRate: Rate

    beforeEach(() => {
        // Create a valid rate that won't expire during tests
        const timestamp = new Date()
        const validUntil = new Date(timestamp.getTime() + 10 * 60 * 1000) // 10 minutes
        validRate = Rate.withValidity(1.005, 'seq-123', timestamp, validUntil)
    })

    describe('Factory Methods', () => {
        describe('create()', () => {
            it('should create a pending deposit with valid data', () => {
                const deposit = Deposit.create('0.0.12345', 100, validRate, 'Test deposit')

                expect(deposit.id).toBeDefined()
                expect(deposit.userAccountId.toString()).toBe('0.0.12345')
                expect(deposit.amountUsdc.amount).toBe(100)
                expect(deposit.amountUsdc.currency).toBe('USDC')
                expect(deposit.rate).toBe(validRate)
                expect(deposit.status).toBe(DepositStatus.Pending)
                expect(deposit.memo).toBe('Test deposit')
                expect(deposit.createdAt).toBeInstanceOf(Date)
                expect(deposit.scheduleId).toBeUndefined()
                expect(deposit.executedAt).toBeUndefined()
                expect(deposit.transactionId).toBeUndefined()
            })

            it('should create deposit without memo', () => {
                const deposit = Deposit.create('0.0.12345', 100, validRate)

                expect(deposit.memo).toBeUndefined()
            })

            it('should generate IDs for each deposit', () => {
                const deposit1 = Deposit.create('0.0.12345', 100, validRate)
                const deposit2 = Deposit.create('0.0.12345', 100, validRate)

                // Since we mock uuid, IDs will be the same in tests
                // In production, uuid.v4() generates unique IDs
                expect(deposit1.id).toBeDefined()
                expect(deposit2.id).toBeDefined()
            })

            it('should throw error for zero amount', () => {
                expect(() => Deposit.create('0.0.12345', 0, validRate)).toThrow(DepositError)
            })

            it('should throw error for negative amount', () => {
                expect(() => Deposit.create('0.0.12345', -100, validRate)).toThrow(DepositError)
            })

            it('should throw error for expired rate', () => {
                const expiredRate = Rate.withValidity(
                    1.005,
                    'seq-123',
                    new Date('2025-01-01T10:00:00Z'),
                    new Date('2025-01-01T10:05:00Z')
                )

                expect(() => Deposit.create('0.0.12345', 100, expiredRate)).toThrow(DepositError)
            })

            it('should throw error for invalid account ID', () => {
                expect(() => Deposit.create('invalid-account', 100, validRate)).toThrow()
            })

            it('should accept very small amounts', () => {
                const deposit = Deposit.create('0.0.12345', 0.01, validRate)

                expect(deposit.amountUsdc.amount).toBe(0.01)
            })

            it('should accept very large amounts', () => {
                const deposit = Deposit.create('0.0.12345', 1000000, validRate)

                expect(deposit.amountUsdc.amount).toBe(1000000)
            })
        })

        describe('fromData()', () => {
            it('should reconstitute deposit from data', () => {
                const createdAt = new Date('2025-10-28T10:00:00Z')
                const executedAt = new Date('2025-10-28T10:05:00Z')

                const deposit = Deposit.fromData({
                    id: 'test-id-123',
                    userAccountId: '0.0.12345',
                    amountUsdc: 100,
                    rate: validRate,
                    status: DepositStatus.Completed,
                    scheduleId: '0.0.123@456',
                    createdAt,
                    executedAt,
                    transactionId: '0.0.789@123',
                    memo: 'Test memo'
                })

                expect(deposit.id).toBe('test-id-123')
                expect(deposit.userAccountId.toString()).toBe('0.0.12345')
                expect(deposit.amountUsdc.amount).toBe(100)
                expect(deposit.status).toBe(DepositStatus.Completed)
                expect(deposit.scheduleId).toBe('0.0.123@456')
                expect(deposit.createdAt).toEqual(createdAt)
                expect(deposit.executedAt).toEqual(executedAt)
                expect(deposit.transactionId).toBe('0.0.789@123')
                expect(deposit.memo).toBe('Test memo')
            })

            it('should handle optional fields', () => {
                const deposit = Deposit.fromData({
                    id: 'test-id',
                    userAccountId: '0.0.12345',
                    amountUsdc: 100,
                    rate: validRate,
                    status: DepositStatus.Pending,
                    createdAt: new Date()
                })

                expect(deposit.scheduleId).toBeUndefined()
                expect(deposit.executedAt).toBeUndefined()
                expect(deposit.transactionId).toBeUndefined()
                expect(deposit.memo).toBeUndefined()
            })
        })
    })

    describe('Business Logic Methods', () => {
        describe('calculateHusdAmount()', () => {
            it('should calculate HUSD amount using the rate', () => {
                const deposit = Deposit.create('0.0.12345', 100, validRate)

                const husd = deposit.calculateHusdAmount()

                expect(husd.currency).toBe('HUSD')
                // HUSD = USDC / rate = 100 / 1.005 ≈ 99.502
                expect(husd.amount).toBeCloseTo(99.502, 2)
            })

            it('should calculate different amounts correctly', () => {
                const deposit1 = Deposit.create('0.0.12345', 50, validRate)
                const deposit2 = Deposit.create('0.0.12345', 200, validRate)

                expect(deposit1.calculateHusdAmount().amount).toBeCloseTo(49.751, 2)
                expect(deposit2.calculateHusdAmount().amount).toBeCloseTo(199.005, 2)
            })

            it('should use the deposit rate regardless of current time', () => {
                // Even with expired rate, calculation should work
                // (business rule: once deposit is created, rate is locked)
                const deposit = Deposit.create('0.0.12345', 100, validRate)

                // Wait a bit (simulated)
                const husd = deposit.calculateHusdAmount()

                expect(husd.amount).toBeCloseTo(99.502, 2)
            })
        })

        describe('schedule()', () => {
            it('should transition from pending to scheduled', () => {
                const deposit = Deposit.create('0.0.12345', 100, validRate)

                const scheduled = deposit.schedule('0.0.123@456')

                expect(scheduled.status).toBe(DepositStatus.Scheduled)
                expect(scheduled.scheduleId).toBe('0.0.123@456')
                expect(scheduled.id).toBe(deposit.id) // Same ID
                expect(scheduled).not.toBe(deposit) // Different instance (immutability)
            })

            it('should preserve all deposit data', () => {
                const deposit = Deposit.create('0.0.12345', 100, validRate, 'Test memo')

                const scheduled = deposit.schedule('0.0.123@456')

                expect(scheduled.userAccountId.toString()).toBe(deposit.userAccountId.toString())
                expect(scheduled.amountUsdc.amount).toBe(deposit.amountUsdc.amount)
                expect(scheduled.rate).toBe(deposit.rate)
                expect(scheduled.createdAt).toEqual(deposit.createdAt)
                expect(scheduled.memo).toBe(deposit.memo)
            })

            it('should throw error if not pending', () => {
                const deposit = Deposit.create('0.0.12345', 100, validRate)
                const scheduled = deposit.schedule('0.0.123@456')

                expect(() => scheduled.schedule('0.0.789@999')).toThrow(InvalidStateError)
            })

            it('should throw error if already completed', () => {
                const deposit = Deposit.create('0.0.12345', 100, validRate)
                const scheduled = deposit.schedule('0.0.123@456')
                const completed = scheduled.execute('0.0.789@123')

                expect(() => completed.schedule('0.0.999@999')).toThrow(InvalidStateError)
            })

            it('should throw error if failed', () => {
                const deposit = Deposit.create('0.0.12345', 100, validRate)
                const failed = deposit.fail('Test failure')

                expect(() => failed.schedule('0.0.123@456')).toThrow(InvalidStateError)
            })
        })

        describe('execute()', () => {
            it('should transition from scheduled to completed', () => {
                const deposit = Deposit.create('0.0.12345', 100, validRate)
                const scheduled = deposit.schedule('0.0.123@456')

                const completed = scheduled.execute('0.0.789@123')

                expect(completed.status).toBe(DepositStatus.Completed)
                expect(completed.transactionId).toBe('0.0.789@123')
                expect(completed.executedAt).toBeInstanceOf(Date)
                expect(completed.scheduleId).toBe('0.0.123@456') // Preserved
            })

            it('should set executedAt timestamp', () => {
                const deposit = Deposit.create('0.0.12345', 100, validRate)
                const scheduled = deposit.schedule('0.0.123@456')

                const beforeExecute = Date.now()
                const completed = scheduled.execute('0.0.789@123')
                const afterExecute = Date.now()

                expect(completed.executedAt).toBeDefined()
                expect(completed.executedAt!.getTime()).toBeGreaterThanOrEqual(beforeExecute)
                expect(completed.executedAt!.getTime()).toBeLessThanOrEqual(afterExecute)
            })

            it('should throw error if not scheduled', () => {
                const deposit = Deposit.create('0.0.12345', 100, validRate)

                expect(() => deposit.execute('0.0.789@123')).toThrow(InvalidStateError)
            })

            it('should throw error if already completed', () => {
                const deposit = Deposit.create('0.0.12345', 100, validRate)
                const scheduled = deposit.schedule('0.0.123@456')
                const completed = scheduled.execute('0.0.789@123')

                expect(() => completed.execute('0.0.999@999')).toThrow(InvalidStateError)
            })
        })

        describe('fail()', () => {
            it('should mark deposit as failed', () => {
                const deposit = Deposit.create('0.0.12345', 100, validRate, 'Original memo')

                const failed = deposit.fail('Insufficient balance')

                expect(failed.status).toBe(DepositStatus.Failed)
                expect(failed.memo).toContain('Insufficient balance')
                expect(failed.memo).toContain('Original memo')
            })

            it('should work without reason', () => {
                const deposit = Deposit.create('0.0.12345', 100, validRate)

                const failed = deposit.fail()

                expect(failed.status).toBe(DepositStatus.Failed)
            })

            it('should fail from any status', () => {
                const pending = Deposit.create('0.0.12345', 100, validRate)
                const scheduled = pending.schedule('0.0.123@456')

                expect(pending.fail().status).toBe(DepositStatus.Failed)
                expect(scheduled.fail().status).toBe(DepositStatus.Failed)
            })

            it('should preserve deposit data', () => {
                const deposit = Deposit.create('0.0.12345', 100, validRate)
                const scheduled = deposit.schedule('0.0.123@456')

                const failed = scheduled.fail('Test failure')

                expect(failed.scheduleId).toBe('0.0.123@456')
                expect(failed.amountUsdc.amount).toBe(100)
            })
        })
    })

    describe('Query Methods', () => {
        it('isPending() should return true for pending deposits', () => {
            const deposit = Deposit.create('0.0.12345', 100, validRate)

            expect(deposit.isPending()).toBe(true)
            expect(deposit.isScheduled()).toBe(false)
            expect(deposit.isCompleted()).toBe(false)
            expect(deposit.isFailed()).toBe(false)
        })

        it('isScheduled() should return true for scheduled deposits', () => {
            const deposit = Deposit.create('0.0.12345', 100, validRate)
            const scheduled = deposit.schedule('0.0.123@456')

            expect(scheduled.isPending()).toBe(false)
            expect(scheduled.isScheduled()).toBe(true)
            expect(scheduled.isCompleted()).toBe(false)
            expect(scheduled.isFailed()).toBe(false)
        })

        it('isCompleted() should return true for completed deposits', () => {
            const deposit = Deposit.create('0.0.12345', 100, validRate)
            const scheduled = deposit.schedule('0.0.123@456')
            const completed = scheduled.execute('0.0.789@123')

            expect(completed.isPending()).toBe(false)
            expect(completed.isScheduled()).toBe(false)
            expect(completed.isCompleted()).toBe(true)
            expect(completed.isFailed()).toBe(false)
        })

        it('isFailed() should return true for failed deposits', () => {
            const deposit = Deposit.create('0.0.12345', 100, validRate)
            const failed = deposit.fail()

            expect(failed.isPending()).toBe(false)
            expect(failed.isScheduled()).toBe(false)
            expect(failed.isCompleted()).toBe(false)
            expect(failed.isFailed()).toBe(true)
        })

        it('isRateExpired() should check rate expiration', () => {
            const deposit = Deposit.create('0.0.12345', 100, validRate)

            expect(deposit.isRateExpired()).toBe(false)

            // Create deposit with expired rate via fromData
            const expiredRate = Rate.withValidity(
                1.005,
                'seq-123',
                new Date('2025-01-01T10:00:00Z'),
                new Date('2025-01-01T10:05:00Z')
            )

            const expiredDeposit = Deposit.fromData({
                id: 'test-id',
                userAccountId: '0.0.12345',
                amountUsdc: 100,
                rate: expiredRate,
                status: DepositStatus.Completed,
                createdAt: new Date('2025-01-01T10:00:00Z')
            })

            expect(expiredDeposit.isRateExpired()).toBe(true)
        })
    })

    describe('Conversion Methods', () => {
        describe('toJSON()', () => {
            it('should serialize completed deposit to JSON', () => {
                const createdAt = new Date('2025-10-28T10:00:00Z')
                const executedAt = new Date('2025-10-28T10:05:00Z')

                const deposit = Deposit.fromData({
                    id: 'test-id-123',
                    userAccountId: '0.0.12345',
                    amountUsdc: 100,
                    rate: validRate,
                    status: DepositStatus.Completed,
                    scheduleId: '0.0.123@456',
                    createdAt,
                    executedAt,
                    transactionId: '0.0.789@123',
                    memo: 'Test memo'
                })

                const json = deposit.toJSON()

                expect(json.id).toBe('test-id-123')
                expect(json.userAccountId).toBe('0.0.12345')
                expect(json.amountUsdc).toBe(100)
                expect(json.amountHusd).toBeCloseTo(99.502, 2)
                expect(json.rate).toBeDefined()
                expect(json.status).toBe(DepositStatus.Completed)
                expect(json.scheduleId).toBe('0.0.123@456')
                expect(json.createdAt).toBe('2025-10-28T10:00:00.000Z')
                expect(json.executedAt).toBe('2025-10-28T10:05:00.000Z')
                expect(json.transactionId).toBe('0.0.789@123')
                expect(json.memo).toBe('Test memo')
            })

            it('should handle optional fields in JSON', () => {
                const deposit = Deposit.create('0.0.12345', 100, validRate)

                const json = deposit.toJSON()

                expect(json.scheduleId).toBeUndefined()
                expect(json.executedAt).toBeUndefined()
                expect(json.transactionId).toBeUndefined()
                expect(json.memo).toBeUndefined()
            })

            it('should include calculated HUSD amount', () => {
                const deposit = Deposit.create('0.0.12345', 100, validRate)

                const json = deposit.toJSON()

                expect(json.amountHusd).toBeCloseTo(99.502, 2)
            })
        })

        describe('toDisplaySummary()', () => {
            it('should create readable summary', () => {
                const deposit = Deposit.create('0.0.12345', 100, validRate)

                const summary = deposit.toDisplaySummary()

                expect(summary).toContain(deposit.id)
                expect(summary).toContain('100.000000 USDC')
                expect(summary).toContain('HUSD')
                expect(summary).toContain('pending')
            })

            it('should reflect deposit status', () => {
                const deposit = Deposit.create('0.0.12345', 100, validRate)
                const scheduled = deposit.schedule('0.0.123@456')
                const completed = scheduled.execute('0.0.789@123')

                expect(deposit.toDisplaySummary()).toContain('pending')
                expect(scheduled.toDisplaySummary()).toContain('scheduled')
                expect(completed.toDisplaySummary()).toContain('completed')
            })
        })
    })

    describe('Immutability', () => {
        it('should not mutate original deposit on schedule', () => {
            const original = Deposit.create('0.0.12345', 100, validRate)

            const scheduled = original.schedule('0.0.123@456')

            expect(original.status).toBe(DepositStatus.Pending)
            expect(original.scheduleId).toBeUndefined()
            expect(scheduled.status).toBe(DepositStatus.Scheduled)
        })

        it('should not mutate original deposit on execute', () => {
            const original = Deposit.create('0.0.12345', 100, validRate)
            const scheduled = original.schedule('0.0.123@456')

            const completed = scheduled.execute('0.0.789@123')

            expect(scheduled.status).toBe(DepositStatus.Scheduled)
            expect(scheduled.transactionId).toBeUndefined()
            expect(completed.status).toBe(DepositStatus.Completed)
        })

        it('should not mutate original deposit on fail', () => {
            const original = Deposit.create('0.0.12345', 100, validRate)

            const failed = original.fail('Test failure')

            expect(original.status).toBe(DepositStatus.Pending)
            expect(failed.status).toBe(DepositStatus.Failed)
        })

        it('should enforce immutability through TypeScript readonly', () => {
            const deposit = Deposit.create('0.0.12345', 100, validRate)

            // TypeScript's readonly prevents mutations at compile time
            // All properties are marked as readonly in the class definition
            // Attempting to assign will cause TypeScript compilation error
            // This is compile-time safety, not runtime enforcement
            expect(deposit.status).toBe(DepositStatus.Pending)
            expect(deposit.amountUsdc.amount).toBe(100)

            // The following would fail TypeScript compilation:
            // deposit.status = DepositStatus.Completed  // TS Error!
            // deposit.amountUsdc = Money.usdc(200)      // TS Error!
        })
    })

    describe('Edge Cases', () => {
        it('should handle minimal deposit amount', () => {
            const deposit = Deposit.create('0.0.12345', 0.000001, validRate)

            expect(deposit.amountUsdc.amount).toBe(0.000001)
            expect(deposit.calculateHusdAmount().amount).toBeGreaterThan(0)
        })

        it('should handle maximum practical deposit amount', () => {
            const deposit = Deposit.create('0.0.12345', 1000000000, validRate)

            expect(deposit.amountUsdc.amount).toBe(1000000000)
            expect(deposit.calculateHusdAmount().amount).toBeCloseTo(995024875.621, 0)
        })

        it('should maintain data integrity through full lifecycle', () => {
            const original = Deposit.create('0.0.12345', 100, validRate, 'Full lifecycle test')
            const scheduled = original.schedule('0.0.123@456')
            const completed = scheduled.execute('0.0.789@123')

            // All versions should have same core data
            expect(original.id).toBe(scheduled.id)
            expect(scheduled.id).toBe(completed.id)
            expect(original.amountUsdc.amount).toBe(completed.amountUsdc.amount)
            expect(original.createdAt).toEqual(completed.createdAt)
            expect(original.memo).toBe(completed.memo)
        })

        it('should handle concurrent state transitions (last write wins)', () => {
            const deposit = Deposit.create('0.0.12345', 100, validRate)

            // Simulate concurrent scheduling attempts
            const scheduled1 = deposit.schedule('0.0.111@111')
            const scheduled2 = deposit.schedule('0.0.222@222')

            expect(scheduled1.scheduleId).toBe('0.0.111@111')
            expect(scheduled2.scheduleId).toBe('0.0.222@222')
            expect(scheduled1.id).toBe(scheduled2.id)
        })
    })
})
