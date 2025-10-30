/**
 * Event Handlers Module
 *
 * Registers all event handlers with the event bus.
 */

import { IEventBus } from '../EventBus'
import { registerAuditLogHandler, AuditLogHandler } from './AuditLogHandler'
import { registerMetricsHandler, MetricsHandler } from './MetricsHandler'
import { createScopedLogger } from '@/lib/logger'

const logger = createScopedLogger('event-handlers')

/**
 * Registered event handlers
 */
export interface RegisteredHandlers {
    auditLog: AuditLogHandler
    metrics: MetricsHandler
}

/**
 * Initializes and registers all event handlers with the event bus
 *
 * @param eventBus - The event bus instance to register handlers with
 * @returns Object containing all registered handler instances
 */
export function initializeEventHandlers(eventBus: IEventBus): RegisteredHandlers {
    logger.info('Initializing event handlers...')

    const auditLog = registerAuditLogHandler(eventBus)
    const metrics = registerMetricsHandler(eventBus)

    logger.info('All event handlers initialized successfully')

    return {
        auditLog,
        metrics,
    }
}

// Re-export handlers
export { AuditLogHandler, registerAuditLogHandler } from './AuditLogHandler'
export { MetricsHandler, registerMetricsHandler } from './MetricsHandler'
