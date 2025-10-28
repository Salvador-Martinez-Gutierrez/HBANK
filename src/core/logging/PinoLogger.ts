import pino, { Logger as PinoInstance } from 'pino'
import { ILogger, LogContext } from './Logger'

/**
 * Pino Logger Implementation
 * Structured logging with JSON output for production
 */
export class PinoLogger implements ILogger {
    private logger: PinoInstance

    constructor(context?: string, baseContext?: LogContext) {
        const isDevelopment = process.env.NODE_ENV === 'development'
        const logLevel = (process.env.LOG_LEVEL as pino.Level) || 'info'

        this.logger = pino({
            level: logLevel,
            ...(isDevelopment && {
                transport: {
                    target: 'pino-pretty',
                    options: {
                        colorize: true,
                        translateTime: 'HH:MM:ss',
                        ignore: 'pid,hostname',
                    },
                },
            }),
        })

        // Add base context
        if (context || baseContext) {
            this.logger = this.logger.child({
                context,
                ...baseContext,
            })
        }
    }

    debug(message: string, meta?: Record<string, unknown>): void {
        this.logger.debug(meta || {}, message)
    }

    info(message: string, meta?: Record<string, unknown>): void {
        this.logger.info(meta || {}, message)
    }

    warn(message: string, meta?: Record<string, unknown>): void {
        this.logger.warn(meta || {}, message)
    }

    error(message: string, error?: Error, meta?: Record<string, unknown>): void {
        this.logger.error(
            {
                ...meta,
                ...(error && {
                    error: {
                        message: error.message,
                        stack: error.stack,
                        name: error.name,
                    },
                }),
            },
            message
        )
    }

    /**
     * Create a child logger with additional context
     */
    child(context: LogContext): PinoLogger {
        const childLogger = new PinoLogger()
        childLogger.logger = this.logger.child(context)
        return childLogger
    }
}

/**
 * Factory function to create a logger
 */
export function createLogger(context?: string, baseContext?: LogContext): ILogger {
    return new PinoLogger(context, baseContext)
}
