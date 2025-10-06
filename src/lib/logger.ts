type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const SENSITIVE_KEYS = [
    'key',
    'privateKey',
    'secret',
    'authorization',
    'password',
    'token',
]

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

const log = (
    level: LogLevel,
    scope: string,
    message: string,
    meta?: Record<string, unknown>
) => {
    const entry = {
        level,
        scope,
        message,
        timestamp: new Date().toISOString(),
        ...(meta ? sanitize(meta) : {}),
    }

    const serialized = JSON.stringify(entry)

    switch (level) {
        case 'debug':
            console.debug(serialized)
            break
        case 'info':
            console.info(serialized)
            break
        case 'warn':
            console.warn(serialized)
            break
        case 'error':
        default:
            console.error(serialized)
            break
    }
}

export type ScopedLogger = {
    debug: (message: string, meta?: Record<string, unknown>) => void
    info: (message: string, meta?: Record<string, unknown>) => void
    warn: (message: string, meta?: Record<string, unknown>) => void
    error: (message: string, meta?: Record<string, unknown>) => void
    child: (childScope: string, meta?: Record<string, unknown>) => ScopedLogger
}

export const createScopedLogger = (
    scope: string,
    baseMeta?: Record<string, unknown>
): ScopedLogger => {
    const scopedLog = (
        level: LogLevel,
        message: string,
        meta?: Record<string, unknown>
    ) => {
        log(level, scope, message, { ...baseMeta, ...meta })
    }

    const child = (childScope: string, meta?: Record<string, unknown>) =>
        createScopedLogger(`${scope}:${childScope}`, { ...baseMeta, ...meta })

    return {
        debug: (message, meta) => scopedLog('debug', message, meta),
        info: (message, meta) => scopedLog('info', message, meta),
        warn: (message, meta) => scopedLog('warn', message, meta),
        error: (message, meta) => scopedLog('error', message, meta),
        child,
    }
}

export const logger = createScopedLogger('app')
