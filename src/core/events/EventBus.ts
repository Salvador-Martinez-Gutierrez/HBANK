/**
 * Event Bus Interface and Implementation
 *
 * Provides a publish-subscribe mechanism for domain events.
 * Allows different parts of the system to react to domain events
 * without tight coupling.
 */

import { injectable } from 'inversify'
import { DomainEvent } from './DomainEvent'
import { createScopedLogger } from '@/lib/logger'

const logger = createScopedLogger('event-bus')

/**
 * Event handler function type
 */
export type EventHandler<T extends DomainEvent> = (event: T) => Promise<void> | void

/**
 * Event Bus Interface
 */
export interface IEventBus {
    /**
     * Publishes an event to all registered handlers
     *
     * @param event - The domain event to publish
     */
    publish<T extends DomainEvent>(event: T): Promise<void>

    /**
     * Subscribes a handler to a specific event type
     *
     * @param eventType - The type of event to subscribe to
     * @param handler - The function to call when the event is published
     */
    subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void

    /**
     * Unsubscribes a handler from an event type
     *
     * @param eventType - The type of event to unsubscribe from
     * @param handler - The handler function to remove
     */
    unsubscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void

    /**
     * Clears all event handlers
     */
    clear(): void
}

/**
 * In-Memory Event Bus Implementation
 *
 * Simple in-memory implementation of the event bus.
 * Suitable for development and testing. For production,
 * consider using a distributed event bus (e.g., Redis Pub/Sub, RabbitMQ).
 */
@injectable()
export class InMemoryEventBus implements IEventBus {
    private handlers: Map<string, Set<EventHandler<DomainEvent>>> = new Map()

    /**
     * Publishes an event to all registered handlers
     */
    async publish<T extends DomainEvent>(event: T): Promise<void> {
        const handlers = this.handlers.get(event.eventType)

        if (!handlers || handlers.size === 0) {
            logger.debug('No handlers registered for event type', {
                eventType: event.eventType,
                eventId: event.eventId,
            })
            return
        }

        logger.info('Publishing event', {
            eventType: event.eventType,
            eventId: event.eventId,
            handlerCount: handlers.size,
        })

        // Execute all handlers in parallel
        const promises = Array.from(handlers).map((handler) =>
            this.executeHandler(handler, event)
        )

        await Promise.allSettled(promises)
    }

    /**
     * Executes a single event handler with error handling
     */
    private async executeHandler<T extends DomainEvent>(
        handler: EventHandler<T>,
        event: T
    ): Promise<void> {
        try {
            await handler(event)
            logger.debug('Event handler executed successfully', {
                eventType: event.eventType,
                eventId: event.eventId,
            })
        } catch (error) {
            logger.error('Error executing event handler', {
                eventType: event.eventType,
                eventId: event.eventId,
                error: error instanceof Error ? error.message : 'Unknown error',
            })
            // Don't rethrow - we don't want one failing handler to affect others
        }
    }

    /**
     * Subscribes a handler to an event type
     */
    subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, new Set())
        }

        this.handlers.get(eventType)!.add(handler as EventHandler<DomainEvent>)

        logger.debug('Handler subscribed to event type', {
            eventType,
            handlerCount: this.handlers.get(eventType)!.size,
        })
    }

    /**
     * Unsubscribes a handler from an event type
     */
    unsubscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
        const handlers = this.handlers.get(eventType)
        if (handlers) {
            handlers.delete(handler as EventHandler<DomainEvent>)

            if (handlers.size === 0) {
                this.handlers.delete(eventType)
            }

            logger.debug('Handler unsubscribed from event type', {
                eventType,
                remainingHandlers: handlers.size,
            })
        }
    }

    /**
     * Clears all event handlers
     */
    clear(): void {
        const eventTypeCount = this.handlers.size
        this.handlers.clear()

        logger.info('All event handlers cleared', {
            clearedEventTypes: eventTypeCount,
        })
    }

    /**
     * Gets the number of handlers for an event type (for testing/debugging)
     */
    getHandlerCount(eventType: string): number {
        return this.handlers.get(eventType)?.size ?? 0
    }
}

/**
 * Singleton instance of the event bus
 * In a real application with DI, this would be managed by the DI container
 */
let eventBusInstance: IEventBus | null = null

/**
 * Gets or creates the event bus instance
 */
export function getEventBus(): IEventBus {
    if (!eventBusInstance) {
        eventBusInstance = new InMemoryEventBus()
        logger.info('Event bus initialized')
    }
    return eventBusInstance
}

/**
 * Resets the event bus instance (primarily for testing)
 */
export function resetEventBus(): void {
    if (eventBusInstance) {
        eventBusInstance.clear()
    }
    eventBusInstance = null
    logger.info('Event bus reset')
}
