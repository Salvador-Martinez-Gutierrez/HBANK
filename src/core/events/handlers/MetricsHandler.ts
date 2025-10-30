/**
 * Metrics Event Handler
 *
 * Tracks business metrics and analytics from domain events.
 * Useful for monitoring system health, user activity, and business KPIs.
 */

import { IEventBus } from '../EventBus'
import { createScopedLogger } from '@/lib/logger'
import {
    DepositCompleted,
    WithdrawalCompleted,
    RatePublished,
} from '@/domain/events'

const logger = createScopedLogger('metrics')

/**
 * Simple in-memory metrics storage
 * In production, these would be sent to a metrics service (e.g., Prometheus, Datadog)
 */
interface Metrics {
    totalDeposits: number
    totalDepositVolume: number
    totalWithdrawals: number
    totalWithdrawalVolume: number
    instantWithdrawals: number
    standardWithdrawals: number
    avgDepositAmount: number
    avgWithdrawalAmount: number
    lastRateUpdate?: {
        rate: number
        timestamp: Date
    }
}

/**
 * Metrics Handler
 *
 * Tracks and aggregates business metrics from events.
 */
export class MetricsHandler {
    private metrics: Metrics = {
        totalDeposits: 0,
        totalDepositVolume: 0,
        totalWithdrawals: 0,
        totalWithdrawalVolume: 0,
        instantWithdrawals: 0,
        standardWithdrawals: 0,
        avgDepositAmount: 0,
        avgWithdrawalAmount: 0,
    }

    /**
     * Handles deposit completed events
     */
    async handleDepositCompleted(event: DepositCompleted): Promise<void> {
        this.metrics.totalDeposits++
        this.metrics.totalDepositVolume += event.amountUsdc

        // Update running average
        this.metrics.avgDepositAmount =
            this.metrics.totalDepositVolume / this.metrics.totalDeposits

        logger.info('Metrics: Deposit completed', {
            totalDeposits: this.metrics.totalDeposits,
            totalVolume: this.metrics.totalDepositVolume,
            avgAmount: this.metrics.avgDepositAmount.toFixed(2),
        })
    }

    /**
     * Handles withdrawal completed events
     */
    async handleWithdrawalCompleted(event: WithdrawalCompleted): Promise<void> {
        this.metrics.totalWithdrawals++
        this.metrics.totalWithdrawalVolume += event.amountUsdc

        // Track withdrawal type
        if (event.withdrawalType === 'instant') {
            this.metrics.instantWithdrawals++
        } else {
            this.metrics.standardWithdrawals++
        }

        // Update running average
        this.metrics.avgWithdrawalAmount =
            this.metrics.totalWithdrawalVolume / this.metrics.totalWithdrawals

        logger.info('Metrics: Withdrawal completed', {
            totalWithdrawals: this.metrics.totalWithdrawals,
            totalVolume: this.metrics.totalWithdrawalVolume,
            avgAmount: this.metrics.avgWithdrawalAmount.toFixed(2),
            instantCount: this.metrics.instantWithdrawals,
            standardCount: this.metrics.standardWithdrawals,
        })
    }

    /**
     * Handles rate published events
     */
    async handleRatePublished(event: RatePublished): Promise<void> {
        this.metrics.lastRateUpdate = {
            rate: event.rate,
            timestamp: event.publishedAt,
        }

        logger.info('Metrics: Rate updated', {
            rate: event.rate,
            sequenceNumber: event.sequenceNumber,
            totalUsd: event.totalUsd,
            husdSupply: event.husdSupply,
        })
    }

    /**
     * Gets current metrics snapshot
     */
    getMetrics(): Readonly<Metrics> {
        return { ...this.metrics }
    }

    /**
     * Resets all metrics (useful for testing)
     */
    reset(): void {
        this.metrics = {
            totalDeposits: 0,
            totalDepositVolume: 0,
            totalWithdrawals: 0,
            totalWithdrawalVolume: 0,
            instantWithdrawals: 0,
            standardWithdrawals: 0,
            avgDepositAmount: 0,
            avgWithdrawalAmount: 0,
        }
        logger.info('Metrics reset')
    }
}

/**
 * Registers the metrics handler with the event bus
 */
export function registerMetricsHandler(eventBus: IEventBus): MetricsHandler {
    const handler = new MetricsHandler()

    eventBus.subscribe('deposit.completed', (e: DepositCompleted) =>
        handler.handleDepositCompleted(e)
    )
    eventBus.subscribe('withdrawal.completed', (e: WithdrawalCompleted) =>
        handler.handleWithdrawalCompleted(e)
    )
    eventBus.subscribe('rate.published', (e: RatePublished) => handler.handleRatePublished(e))

    logger.info('Metrics handler registered')

    return handler
}
