/**
 * Withdrawal Domain Events
 *
 * Events related to the withdrawal lifecycle in the HBANK Protocol.
 * Covers both instant and standard withdrawal types.
 */

import { DomainEvent } from '@/core/events/DomainEvent'

/**
 * Withdrawal Requested Event
 *
 * Published when a user initiates a withdrawal request.
 * For standard withdrawals, this starts the 48-hour timelock.
 */
export class WithdrawalRequested extends DomainEvent {
    constructor(
        public readonly withdrawalId: string,
        public readonly userAccountId: string,
        public readonly amountHusd: number,
        public readonly expectedAmountUsdc: number,
        public readonly withdrawalType: 'instant' | 'standard',
        public readonly rate: number,
        public readonly rateSequenceNumber: string,
        public readonly feeAmount?: number,
        public readonly unlockAt?: Date
    ) {
        super('withdrawal.requested', withdrawalId)
    }

    toJSON(): Record<string, unknown> {
        return {
            ...super.toJSON(),
            withdrawalId: this.withdrawalId,
            userAccountId: this.userAccountId,
            amountHusd: this.amountHusd,
            expectedAmountUsdc: this.expectedAmountUsdc,
            withdrawalType: this.withdrawalType,
            rate: this.rate,
            rateSequenceNumber: this.rateSequenceNumber,
            feeAmount: this.feeAmount,
            unlockAt: this.unlockAt?.toISOString(),
        }
    }
}

/**
 * Withdrawal Scheduled Event
 *
 * Published when a withdrawal has been scheduled on Hedera.
 * For standard withdrawals, this happens after the timelock expires.
 */
export class WithdrawalScheduled extends DomainEvent {
    constructor(
        public readonly withdrawalId: string,
        public readonly scheduleId: string,
        public readonly scheduledAt: Date
    ) {
        super('withdrawal.scheduled', withdrawalId)
    }

    toJSON(): Record<string, unknown> {
        return {
            ...super.toJSON(),
            withdrawalId: this.withdrawalId,
            scheduleId: this.scheduleId,
            scheduledAt: this.scheduledAt.toISOString(),
        }
    }
}

/**
 * Withdrawal Completed Event
 *
 * Published when a withdrawal is successfully completed.
 * USDC has been transferred to the user's account.
 */
export class WithdrawalCompleted extends DomainEvent {
    constructor(
        public readonly withdrawalId: string,
        public readonly userAccountId: string,
        public readonly amountHusd: number,
        public readonly amountUsdc: number,
        public readonly withdrawalType: 'instant' | 'standard',
        public readonly transactionId: string,
        public readonly feeAmount?: number,
        public readonly completedAt?: Date
    ) {
        super('withdrawal.completed', withdrawalId)
    }

    toJSON(): Record<string, unknown> {
        return {
            ...super.toJSON(),
            withdrawalId: this.withdrawalId,
            userAccountId: this.userAccountId,
            amountHusd: this.amountHusd,
            amountUsdc: this.amountUsdc,
            withdrawalType: this.withdrawalType,
            transactionId: this.transactionId,
            feeAmount: this.feeAmount,
            completedAt: this.completedAt?.toISOString(),
        }
    }
}

/**
 * Withdrawal Failed Event
 *
 * Published when a withdrawal fails for any reason.
 */
export class WithdrawalFailed extends DomainEvent {
    constructor(
        public readonly withdrawalId: string,
        public readonly userAccountId: string,
        public readonly reason: string,
        public readonly error?: string
    ) {
        super('withdrawal.failed', withdrawalId)
    }

    toJSON(): Record<string, unknown> {
        return {
            ...super.toJSON(),
            withdrawalId: this.withdrawalId,
            userAccountId: this.userAccountId,
            reason: this.reason,
            error: this.error,
        }
    }
}
