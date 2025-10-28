/**
 * Logger Interface
 * Define the contract for all loggers in the application
 */
export interface ILogger {
    debug(message: string, meta?: Record<string, unknown>): void
    info(message: string, meta?: Record<string, unknown>): void
    warn(message: string, meta?: Record<string, unknown>): void
    error(message: string, error?: Error, meta?: Record<string, unknown>): void
}

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Log context for scoped loggers
 */
export interface LogContext {
    context?: string
    requestId?: string
    userId?: string
    [key: string]: unknown
}
