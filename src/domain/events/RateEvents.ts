/**
 * Rate Domain Events
 *
 * Events related to exchange rate publishing and updates.
 */

import { DomainEvent } from '@/core/events/DomainEvent'

/**
 * Rate Published Event
 *
 * Published when a new exchange rate is published to the Hedera Consensus Service.
 */
export class RatePublished extends DomainEvent {
    constructor(
        public readonly rateId: string,
        public readonly rate: number,
        public readonly sequenceNumber: string,
        public readonly totalUsd: number,
        public readonly husdSupply: number,
        public readonly topicId: string,
        public readonly publishedAt: Date
    ) {
        super('rate.published', rateId)
    }

    toJSON(): Record<string, unknown> {
        return {
            ...super.toJSON(),
            rateId: this.rateId,
            rate: this.rate,
            sequenceNumber: this.sequenceNumber,
            totalUsd: this.totalUsd,
            husdSupply: this.husdSupply,
            topicId: this.topicId,
            publishedAt: this.publishedAt.toISOString(),
        }
    }
}

/**
 * Rate Updated Event
 *
 * Published when the current exchange rate is updated (internal cache/state).
 */
export class RateUpdated extends DomainEvent {
    constructor(
        public readonly rateId: string,
        public readonly oldRate: number,
        public readonly newRate: number,
        public readonly sequenceNumber: string,
        public readonly updatedAt: Date
    ) {
        super('rate.updated', rateId)
    }

    toJSON(): Record<string, unknown> {
        return {
            ...super.toJSON(),
            rateId: this.rateId,
            oldRate: this.oldRate,
            newRate: this.newRate,
            sequenceNumber: this.sequenceNumber,
            updatedAt: this.updatedAt.toISOString(),
        }
    }
}
