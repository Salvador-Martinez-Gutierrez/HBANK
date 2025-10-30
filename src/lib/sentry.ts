/**
 * Sentry Utility Service
 *
 * Provides convenient methods for error tracking, performance monitoring,
 * and user feedback throughout the application.
 */

import * as Sentry from '@sentry/nextjs'

/**
 * Capture an exception with Sentry
 *
 * Use this to manually report errors to Sentry with additional context.
 *
 * @param error - Error object or string
 * @param context - Additional context for the error
 *
 * @example
 * ```typescript
 * try {
 *   await depositService.createDeposit(...)
 * } catch (error) {
 *   captureException(error, {
 *     tags: { operation: 'deposit' },
 *     extra: { userId, amount }
 *   })
 *   throw error
 * }
 * ```
 */
export function captureException(
    error: Error | unknown,
    context?: {
        tags?: Record<string, string>
        extra?: Record<string, unknown>
        level?: Sentry.SeverityLevel
        user?: Sentry.User
    }
) {
    Sentry.withScope((scope) => {
        // Add tags
        if (context?.tags) {
            Object.entries(context.tags).forEach(([key, value]) => {
                scope.setTag(key, value)
            })
        }

        // Add extra context
        if (context?.extra) {
            scope.setContext('additional', context.extra)
        }

        // Set severity level
        if (context?.level) {
            scope.setLevel(context.level)
        }

        // Set user context
        if (context?.user) {
            scope.setUser(context.user)
        }

        Sentry.captureException(error)
    })
}

/**
 * Capture a message with Sentry
 *
 * Use this to log important messages or warnings to Sentry.
 *
 * @param message - Message to log
 * @param level - Severity level
 * @param context - Additional context
 *
 * @example
 * ```typescript
 * captureMessage('Unusual withdrawal amount detected', 'warning', {
 *   tags: { operation: 'withdrawal' },
 *   extra: { amount, userId }
 * })
 * ```
 */
export function captureMessage(
    message: string,
    level: Sentry.SeverityLevel = 'info',
    context?: {
        tags?: Record<string, string>
        extra?: Record<string, unknown>
    }
) {
    Sentry.withScope((scope) => {
        scope.setLevel(level)

        if (context?.tags) {
            Object.entries(context.tags).forEach(([key, value]) => {
                scope.setTag(key, value)
            })
        }

        if (context?.extra) {
            scope.setContext('additional', context.extra)
        }

        Sentry.captureMessage(message, level)
    })
}

/**
 * Set user context for all subsequent events
 *
 * Call this when a user logs in or their identity becomes known.
 *
 * @param user - User information
 *
 * @example
 * ```typescript
 * setUser({
 *   id: user.id,
 *   email: user.email,
 *   username: user.walletAddress
 * })
 * ```
 */
export function setUser(user: Sentry.User | null) {
    Sentry.setUser(user)
}

/**
 * Add a breadcrumb for debugging
 *
 * Breadcrumbs help understand the sequence of events leading to an error.
 *
 * @param breadcrumb - Breadcrumb data
 *
 * @example
 * ```typescript
 * addBreadcrumb({
 *   category: 'deposit',
 *   message: 'User initiated deposit',
 *   level: 'info',
 *   data: { amount, currency: 'USDC' }
 * })
 * ```
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
    Sentry.addBreadcrumb(breadcrumb)
}

/**
 * Start a new transaction for performance monitoring
 *
 * Use this to track the performance of critical operations.
 *
 * @param name - Transaction name
 * @param op - Operation type
 * @returns Transaction object (must call finish() when done)
 *
 * @example
 * ```typescript
 * const transaction = startTransaction('deposit.create', 'http.server')
 * try {
 *   await createDeposit(...)
 * } finally {
 *   transaction.finish()
 * }
 * ```
 */
export function startTransaction(name: string, op: string) {
    return Sentry.startTransaction({ name, op })
}

/**
 * Wrap an async function with Sentry error handling
 *
 * Automatically captures any errors thrown by the function.
 *
 * @param fn - Async function to wrap
 * @param context - Error context
 * @returns Wrapped function
 *
 * @example
 * ```typescript
 * const safeDeposit = withErrorHandling(
 *   createDeposit,
 *   { tags: { operation: 'deposit' } }
 * )
 *
 * await safeDeposit(userId, amount)
 * ```
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    context?: {
        tags?: Record<string, string>
        extra?: Record<string, unknown>
    }
): T {
    return (async (...args: unknown[]) => {
        try {
            return await fn(...args)
        } catch (error) {
            captureException(error, context)
            throw error
        }
    }) as T
}

/**
 * Track a custom metric/event
 *
 * Use this to track business metrics and custom events.
 *
 * @param name - Event name
 * @param data - Event data
 *
 * @example
 * ```typescript
 * trackEvent('deposit.completed', {
 *   amount: 100,
 *   currency: 'USDC',
 *   userId
 * })
 * ```
 */
export function trackEvent(name: string, data?: Record<string, unknown>) {
    Sentry.addBreadcrumb({
        category: 'custom.event',
        message: name,
        level: 'info',
        data,
    })

    // Also capture as a message with low level
    captureMessage(name, 'debug', {
        tags: { event: 'custom' },
        extra: data,
    })
}

// Re-export Sentry for direct access if needed
export { Sentry }
