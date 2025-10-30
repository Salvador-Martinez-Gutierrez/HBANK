/**
 * Deposit Domain Events
 *
 * Events related to the deposit lifecycle in the HBANK Protocol.
 * These events are published when significant state changes occur
 * in the deposit process.
 */

import { DomainEvent } from '@/core/events/DomainEvent'

/**
 * Deposit Initialized Event
 *
 * Published when a user initiates a deposit.
 * The scheduled transaction has been created but not yet signed.
 */
export class DepositInitialized extends DomainEvent {
    constructor(
        public readonly depositId: string,
        public readonly userAccountId: string,
        public readonly amountUsdc: number,
        public readonly expectedAmountHusd: number,
        public readonly rate: number,
        public readonly rateSequenceNumber: string,
        public readonly scheduleId: string
    ) {
        super('deposit.initialized', depositId)
    }

    toJSON(): Record<string, unknown> {
        return {
            ...super.toJSON(),
            depositId: this.depositId,
            userAccountId: this.userAccountId,
            amountUsdc: this.amountUsdc,
            expectedAmountHusd: this.expectedAmountHusd,
            rate: this.rate,
            rateSequenceNumber: this.rateSequenceNumber,
            scheduleId: this.scheduleId,
        }
    }
}

/**
 * Deposit Scheduled Event
 *
 * Published when a deposit is successfully scheduled on Hedera.
 * User has signed the transaction, treasury signature is pending.
 */
export class DepositScheduled extends DomainEvent {
    constructor(
        public readonly depositId: string,
        public readonly scheduleId: string,
        public readonly userSignedAt: Date
    ) {
        super('deposit.scheduled', depositId)
    }

    toJSON(): Record<string, unknown> {
        return {
            ...super.toJSON(),
            depositId: this.depositId,
            scheduleId: this.scheduleId,
            userSignedAt: this.userSignedAt.toISOString(),
        }
    }
}

/**
 * Deposit Completed Event
 *
 * Published when a deposit is successfully completed.
 * Both user and treasury have signed, transaction executed on Hedera.
 */
export class DepositCompleted extends DomainEvent {
    constructor(
        public readonly depositId: string,
        public readonly userAccountId: string,
        public readonly amountUsdc: number,
        public readonly amountHusd: number,
        public readonly transactionId: string,
        public readonly completedAt: Date
    ) {
        super('deposit.completed', depositId)
    }

    toJSON(): Record<string, unknown> {
        return {
            ...super.toJSON(),
            depositId: this.depositId,
            userAccountId: this.userAccountId,
            amountUsdc: this.amountUsdc,
            amountHusd: this.amountHusd,
            transactionId: this.transactionId,
            completedAt: this.completedAt.toISOString(),
        }
    }
}

/**
 * Deposit Failed Event
 *
 * Published when a deposit fails for any reason.
 */
export class DepositFailed extends DomainEvent {
    constructor(
        public readonly depositId: string,
        public readonly userAccountId: string,
        public readonly reason: string,
        public readonly error?: string
    ) {
        super('deposit.failed', depositId)
    }

    toJSON(): Record<string, unknown> {
        return {
            ...super.toJSON(),
            depositId: this.depositId,
            userAccountId: this.userAccountId,
            reason: this.reason,
            error: this.error,
        }
    }
}
