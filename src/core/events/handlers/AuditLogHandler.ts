/**
 * Audit Log Event Handler
 *
 * Listens to all domain events and logs them for audit trail purposes.
 * This creates a comprehensive audit log of all significant actions in the system.
 */

import { DomainEvent } from '../DomainEvent'
import { IEventBus } from '../EventBus'
import { createScopedLogger } from '@/lib/logger'
import {
    DepositInitialized,
    DepositCompleted,
    DepositFailed,
    WithdrawalRequested,
    WithdrawalCompleted,
    WithdrawalFailed,
    RatePublished,
} from '@/domain/events'

const logger = createScopedLogger('audit-log')

/**
 * Audit Log Handler
 *
 * Logs all important events to create an audit trail.
 * In a production system, these would also be persisted to a database.
 */
export class AuditLogHandler {
    /**
     * Handles deposit initialized events
     */
    async handleDepositInitialized(event: DepositInitialized): Promise<void> {
        logger.info('AUDIT: Deposit Initialized', {
            eventId: event.eventId,
            depositId: event.depositId,
            userAccountId: event.userAccountId,
            amountUsdc: event.amountUsdc,
            expectedAmountHusd: event.expectedAmountHusd,
            rate: event.rate,
            scheduleId: event.scheduleId,
            occurredAt: event.occurredAt.toISOString(),
        })
    }

    /**
     * Handles deposit completed events
     */
    async handleDepositCompleted(event: DepositCompleted): Promise<void> {
        logger.info('AUDIT: Deposit Completed', {
            eventId: event.eventId,
            depositId: event.depositId,
            userAccountId: event.userAccountId,
            amountUsdc: event.amountUsdc,
            amountHusd: event.amountHusd,
            transactionId: event.transactionId,
            completedAt: event.completedAt.toISOString(),
            occurredAt: event.occurredAt.toISOString(),
        })
    }

    /**
     * Handles deposit failed events
     */
    async handleDepositFailed(event: DepositFailed): Promise<void> {
        logger.error('AUDIT: Deposit Failed', {
            eventId: event.eventId,
            depositId: event.depositId,
            userAccountId: event.userAccountId,
            reason: event.reason,
            error: event.error,
            occurredAt: event.occurredAt.toISOString(),
        })
    }

    /**
     * Handles withdrawal requested events
     */
    async handleWithdrawalRequested(event: WithdrawalRequested): Promise<void> {
        logger.info('AUDIT: Withdrawal Requested', {
            eventId: event.eventId,
            withdrawalId: event.withdrawalId,
            userAccountId: event.userAccountId,
            amountHusd: event.amountHusd,
            expectedAmountUsdc: event.expectedAmountUsdc,
            withdrawalType: event.withdrawalType,
            rate: event.rate,
            feeAmount: event.feeAmount,
            unlockAt: event.unlockAt?.toISOString(),
            occurredAt: event.occurredAt.toISOString(),
        })
    }

    /**
     * Handles withdrawal completed events
     */
    async handleWithdrawalCompleted(event: WithdrawalCompleted): Promise<void> {
        logger.info('AUDIT: Withdrawal Completed', {
            eventId: event.eventId,
            withdrawalId: event.withdrawalId,
            userAccountId: event.userAccountId,
            amountHusd: event.amountHusd,
            amountUsdc: event.amountUsdc,
            withdrawalType: event.withdrawalType,
            transactionId: event.transactionId,
            feeAmount: event.feeAmount,
            completedAt: event.completedAt?.toISOString(),
            occurredAt: event.occurredAt.toISOString(),
        })
    }

    /**
     * Handles withdrawal failed events
     */
    async handleWithdrawalFailed(event: WithdrawalFailed): Promise<void> {
        logger.error('AUDIT: Withdrawal Failed', {
            eventId: event.eventId,
            withdrawalId: event.withdrawalId,
            userAccountId: event.userAccountId,
            reason: event.reason,
            error: event.error,
            occurredAt: event.occurredAt.toISOString(),
        })
    }

    /**
     * Handles rate published events
     */
    async handleRatePublished(event: RatePublished): Promise<void> {
        logger.info('AUDIT: Rate Published', {
            eventId: event.eventId,
            rateId: event.rateId,
            rate: event.rate,
            sequenceNumber: event.sequenceNumber,
            totalUsd: event.totalUsd,
            husdSupply: event.husdSupply,
            topicId: event.topicId,
            publishedAt: event.publishedAt.toISOString(),
            occurredAt: event.occurredAt.toISOString(),
        })
    }

    /**
     * Generic handler for any domain event (fallback)
     */
    async handleAnyEvent(event: DomainEvent): Promise<void> {
        logger.debug('AUDIT: Domain Event', {
            eventType: event.eventType,
            eventId: event.eventId,
            aggregateId: event.aggregateId,
            occurredAt: event.occurredAt.toISOString(),
        })
    }
}

/**
 * Registers the audit log handler with the event bus
 */
export function registerAuditLogHandler(eventBus: IEventBus): AuditLogHandler {
    const handler = new AuditLogHandler()

    // Register specific event handlers
    eventBus.subscribe('deposit.initialized', (e: DepositInitialized) =>
        handler.handleDepositInitialized(e)
    )
    eventBus.subscribe('deposit.completed', (e: DepositCompleted) =>
        handler.handleDepositCompleted(e)
    )
    eventBus.subscribe('deposit.failed', (e: DepositFailed) => handler.handleDepositFailed(e))

    eventBus.subscribe('withdrawal.requested', (e: WithdrawalRequested) =>
        handler.handleWithdrawalRequested(e)
    )
    eventBus.subscribe('withdrawal.completed', (e: WithdrawalCompleted) =>
        handler.handleWithdrawalCompleted(e)
    )
    eventBus.subscribe('withdrawal.failed', (e: WithdrawalFailed) =>
        handler.handleWithdrawalFailed(e)
    )

    eventBus.subscribe('rate.published', (e: RatePublished) => handler.handleRatePublished(e))

    logger.info('Audit log handler registered')

    return handler
}
