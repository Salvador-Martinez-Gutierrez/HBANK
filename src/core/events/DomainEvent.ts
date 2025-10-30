/**
 * Domain Event Base Class
 *
 * Abstract base class for all domain events in the system.
 * Domain events represent significant occurrences in the business domain
 * that other parts of the system may want to react to.
 *
 * @example
 * ```typescript
 * export class DepositCompleted extends DomainEvent {
 *   constructor(
 *     public readonly depositId: string,
 *     public readonly txId: string,
 *     public readonly husdAmount: number
 *   ) {
 *     super('deposit.completed', depositId)
 *   }
 * }
 * ```
 */
export abstract class DomainEvent {
    /**
     * Timestamp when the event occurred
     */
    public readonly occurredAt: Date

    /**
     * Unique identifier for this event instance
     */
    public readonly eventId: string

    /**
     * Creates a new domain event
     *
     * @param eventType - The type/name of the event (e.g., 'deposit.completed')
     * @param aggregateId - The ID of the aggregate root this event relates to
     */
    constructor(
        public readonly eventType: string,
        public readonly aggregateId: string
    ) {
        this.occurredAt = new Date()
        this.eventId = this.generateEventId()
    }

    /**
     * Generates a unique event ID
     */
    private generateEventId(): string {
        return `${this.eventType}-${this.aggregateId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    /**
     * Converts the event to a plain JSON object
     */
    toJSON(): Record<string, unknown> {
        return {
            eventId: this.eventId,
            eventType: this.eventType,
            aggregateId: this.aggregateId,
            occurredAt: this.occurredAt.toISOString(),
        }
    }
}
