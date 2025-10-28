/**
 * Structured logging configuration using Pino
 *
 * Provides consistent, structured logging across the application
 * with automatic request tracking, sensitive data redaction, and proper log levels.
 */

import pino from 'pino'

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

const SENSITIVE_KEYS = [
    'key',
    'privateKey',
    'secret',
    'authorization',
    'password',
    'token',
]

/**
 * Redact sensitive values for logging
 */
const redactValue = (value: unknown): unknown => {
    if (value === null || value === undefined) return value
    if (typeof value === 'string') {
        if (value.length <= 8) {
            return '***'
        }
        return `${value.slice(0, 2)}***${value.slice(-2)}`
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return value
    }
    if (Array.isArray(value)) {
        return value.map((item) => redactValue(item))
    }
    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(
                ([key, val]) => [key, redactValue(val)]
            )
        )
    }
    return '***'
}

/**
 * Sanitize payload by redacting sensitive keys
 */
const sanitize = (
    payload: Record<string, unknown>
): Record<string, unknown> => {
    return Object.fromEntries(
        Object.entries(payload).map(([key, value]) => {
            if (
                SENSITIVE_KEYS.some((sensitive) =>
                    key.toLowerCase().includes(sensitive)
                )
            ) {
                return [key, redactValue(value)]
            }
            if (typeof value === 'object' && value !== null) {
                return [key, sanitize(value as Record<string, unknown>)]
            }
            return [key, value]
        })
    )
}

/**
 * Pino logger configuration
 *
 * Note: We don't use pino-pretty in development due to worker thread issues
 * with Next.js hot-reload. Instead, we use basic formatting.
 */
const pinoConfig: pino.LoggerOptions = {
    level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    // Development: Basic formatting without worker threads
    ...(process.env.NODE_ENV !== 'production' && {
        formatters: {
            level: (label) => {
                return { level: label }
            },
        },
    }),
    // Production: structured JSON logs
    ...(process.env.NODE_ENV === 'production' && {
        formatters: {
            level: (label) => {
                return { level: label }
            },
        },
    }),
}

/**
 * Base Pino logger instance
 */
const pinoLogger = pino(pinoConfig)

/**
 * Scoped logger type with sanitization
 */
export type ScopedLogger = {
    trace: (message: string, meta?: Record<string, unknown>) => void
    debug: (message: string, meta?: Record<string, unknown>) => void
    info: (message: string, meta?: Record<string, unknown>) => void
    warn: (message: string, meta?: Record<string, unknown>) => void
    error: (message: string, meta?: Record<string, unknown>) => void
    fatal: (message: string, meta?: Record<string, unknown>) => void
    child: (childScope: string, meta?: Record<string, unknown>) => ScopedLogger
}

/**
 * Create a scoped logger with automatic sanitization
 *
 * @param scope - Scope identifier (e.g., 'api:deposit')
 * @param baseMeta - Base metadata to include in all logs
 * @returns Scoped logger instance
 *
 * @example
 * const logger = createScopedLogger('api:deposit', { requestId: '123' })
 * logger.info('Processing deposit', { amount: 100 })
 */
export const createScopedLogger = (
    scope: string,
    baseMeta?: Record<string, unknown>
): ScopedLogger => {
    const childLogger = pinoLogger.child({ scope, ...baseMeta })

    const scopedLog = (
        level: LogLevel,
        message: string,
        meta?: Record<string, unknown>
    ) => {
        const sanitizedMeta = meta ? sanitize(meta) : {}
        childLogger[level](sanitizedMeta, message)
    }

    const child = (childScope: string, meta?: Record<string, unknown>) =>
        createScopedLogger(`${scope}:${childScope}`, { ...baseMeta, ...meta })

    return {
        trace: (message, meta) => scopedLog('trace', message, meta),
        debug: (message, meta) => scopedLog('debug', message, meta),
        info: (message, meta) => scopedLog('info', message, meta),
        warn: (message, meta) => scopedLog('warn', message, meta),
        error: (message, meta) => scopedLog('error', message, meta),
        fatal: (message, meta) => scopedLog('fatal', message, meta),
        child,
    }
}

/**
 * Default application logger
 */
export const logger = createScopedLogger('app')

/**
 * Create a logger with additional context (alias for createScopedLogger)
 *
 * @param context - Additional context to include in all log entries
 * @returns Child logger with merged context
 */
export function createLogger(context: Record<string, unknown>): ScopedLogger {
    return createScopedLogger(context.scope as string || 'app', context)
}

/**
 * Export Pino logger type for compatibility
 */
export type Logger = ScopedLogger
