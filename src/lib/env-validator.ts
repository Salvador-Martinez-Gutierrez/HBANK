/**
 * Environment Variables Validator
 *
 * Validates that all required environment variables are set.
 * Call this at application startup to fail fast if configuration is missing.
 */

/* eslint-disable no-console */

import { createScopedLogger } from './logger'

const logger = createScopedLogger('env-validator')

/**
 * Required environment variables for core functionality
 */
const REQUIRED_VARS = [
    // Hedera - Main Operator
    'OPERATOR_ID',
    'OPERATOR_KEY',

    // Hedera - Tokens
    'USDC_TOKEN_ID',
    'HUSD_TOKEN_ID',

    // Hedera - Topics
    'TOPIC_ID',

    // Supabase
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',

    // JWT
    'JWT_SECRET',
] as const

/**
 * Optional environment variables (warnings if not set)
 */
const OPTIONAL_VARS = [
    // Hedera - Wallets
    'DEPOSIT_WALLET_ID',
    'DEPOSIT_WALLET_KEY',
    'TREASURY_WALLET_ID',
    'TREASURY_WALLET_KEY',
    'EMISSIONS_WALLET_ID',
    'EMISSIONS_WALLET_KEY',
    'INSTANT_WITHDRAW_WALLET_ID',
    'INSTANT_WITHDRAW_WALLET_KEY',
    'STANDARD_WITHDRAW_WALLET_ID',
    'STANDARD_WITHDRAW_WALLET_KEY',

    // Monitoring
    'NEXT_PUBLIC_SENTRY_DSN',

    // Cache
    'REDIS_URL',

    // Telegram (optional notifications)
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID',
] as const

/**
 * Environment variable categories
 */
interface EnvCheck {
    name: string
    required: boolean
    category: string
    set: boolean
    masked?: string
}

/**
 * Mask sensitive values for logging
 */
function maskValue(value: string): string {
    if (value.length < 8) return '***'
    return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
}

/**
 * Check if an environment variable is set
 */
function checkEnvVar(name: string, required: boolean, category: string): EnvCheck {
    const value = process.env[name]
    const isSet = value !== undefined && value !== null && value.trim() !== ''

    return {
        name,
        required,
        category,
        set: isSet,
        masked: isSet ? maskValue(value!) : undefined,
    }
}

/**
 * Validate all environment variables
 *
 * @param throwOnMissing - If true, throws an error if required vars are missing
 * @returns Object with validation results
 *
 * @example
 * ```typescript
 * // At application startup
 * validateEnv(true) // Throws if required vars missing
 *
 * // In development/testing
 * const result = validateEnv(false)
 * console.log(`${result.valid} / ${result.total} variables set`)
 * ```
 */
export function validateEnv(throwOnMissing: boolean = false): {
    valid: boolean
    total: number
    missing: string[]
    warnings: string[]
    checks: EnvCheck[]
} {
    const checks: EnvCheck[] = []

    // Check required vars
    for (const varName of REQUIRED_VARS) {
        checks.push(checkEnvVar(varName, true, 'Required'))
    }

    // Check optional vars
    for (const varName of OPTIONAL_VARS) {
        checks.push(checkEnvVar(varName, false, 'Optional'))
    }

    // Find missing required vars
    const missing = checks.filter((c) => c.required && !c.set).map((c) => c.name)

    // Find missing optional vars (warnings)
    const warnings = checks.filter((c) => !c.required && !c.set).map((c) => c.name)

    const valid = missing.length === 0

    // Log results
    if (!valid) {
        logger.error('Missing required environment variables', { missing })
    }

    if (warnings.length > 0) {
        logger.warn('Optional environment variables not set', { warnings })
    }

    const totalSet = checks.filter((c) => c.set).length
    logger.info(`Environment validation: ${totalSet}/${checks.length} variables set`, {
        required: REQUIRED_VARS.length - missing.length,
        optional: OPTIONAL_VARS.length - warnings.length,
    })

    // Log detailed status in development
    if (process.env.NODE_ENV === 'development') {
        const grouped = checks.reduce((acc, check) => {
            if (!acc[check.category]) acc[check.category] = []
            acc[check.category].push(check)
            return acc
        }, {} as Record<string, EnvCheck[]>)

        logger.debug('Environment variables by category', grouped)
    }

    // Throw if required vars are missing and throwOnMissing is true
    if (throwOnMissing && !valid) {
        throw new Error(
            `Missing required environment variables: ${missing.join(', ')}.\n\n` +
                `Please check your .env.local file and ensure all required variables are set.\n` +
                `See .env.example for a template.`
        )
    }

    return {
        valid,
        total: checks.length,
        missing,
        warnings,
        checks,
    }
}

/**
 * Print environment status to console
 *
 * Useful for debugging and deployment verification
 */
export function printEnvStatus(): void {
    const result = validateEnv(false)

    console.log('\n' + '='.repeat(60))
    console.log('ENVIRONMENT CONFIGURATION STATUS')
    console.log('='.repeat(60) + '\n')

    console.log(`✓ Total Variables: ${result.total}`)
    console.log(`✓ Set: ${result.total - result.missing.length - result.warnings.length}`)
    console.log(`✗ Missing Required: ${result.missing.length}`)
    console.log(`⚠ Missing Optional: ${result.warnings.length}\n`)

    if (result.missing.length > 0) {
        console.log('Missing Required Variables:')
        result.missing.forEach((name) => console.log(`  ✗ ${name}`))
        console.log('')
    }

    if (result.warnings.length > 0) {
        console.log('Missing Optional Variables:')
        result.warnings.forEach((name) => console.log(`  ⚠ ${name}`))
        console.log('')
    }

    // Group by category
    const byCategory = result.checks.reduce((acc, check) => {
        if (!acc[check.category]) acc[check.category] = []
        acc[check.category].push(check)
        return acc
    }, {} as Record<string, EnvCheck[]>)

    Object.entries(byCategory).forEach(([category, checks]) => {
        console.log(`${category}:`)
        checks.forEach((check) => {
            const symbol = check.set ? '✓' : check.required ? '✗' : '⚠'
            const value = check.set ? check.masked : 'NOT SET'
            console.log(`  ${symbol} ${check.name}: ${value}`)
        })
        console.log('')
    })

    console.log('='.repeat(60) + '\n')

    if (!result.valid) {
        console.error('⚠️  CONFIGURATION INCOMPLETE - See missing variables above\n')
    } else {
        console.log('✅ All required variables are set!\n')
    }
}

/**
 * Get cache implementation name
 */
export function getCacheType(): 'redis' | 'memory' {
    return process.env.REDIS_URL ? 'redis' : 'memory'
}

/**
 * Get environment name
 */
export function getEnvironment(): string {
    return process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV || 'development'
}

/**
 * Check if Sentry is enabled
 */
export function isSentryEnabled(): boolean {
    return !!(process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NEXT_PUBLIC_SENTRY_DSN.length > 0)
}

/**
 * Print startup information
 */
export function printStartupInfo(): void {
    console.log('\n' + '🚀 '.repeat(30))
    console.log('HBANK Protocol Starting...')
    console.log('🚀 '.repeat(30) + '\n')

    console.log(`Environment: ${getEnvironment()}`)
    console.log(`Cache: ${getCacheType().toUpperCase()}`)
    console.log(`Sentry: ${isSentryEnabled() ? 'ENABLED' : 'DISABLED'}`)
    console.log(`Hedera Network: ${process.env.HEDERA_NETWORK || 'testnet'}`)
    console.log('')

    printEnvStatus()
}
