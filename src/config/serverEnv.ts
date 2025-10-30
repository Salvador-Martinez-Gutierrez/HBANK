/* eslint-disable no-console */
import { z } from 'zod'

// Note: We cannot import logger here as it would create a circular dependency
// (logger imports serverEnv, and serverEnv would import logger)
// So we use console.log for initialization logging

// ==========================================
// VALIDATION REGEX PATTERNS
// ==========================================

const accountIdRegex = /^\d+\.\d+\.\d+$/
const tokenIdRegex = /^\d+\.\d+\.\d+$/
const topicIdRegex = /^\d+\.\d+\.\d+$/

// ==========================================
// ENVIRONMENT SCHEMA
// ==========================================

const envSchema = z
    .object({
        // ==========================================
        // APPLICATION CONFIGURATION
        // ==========================================
        NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
        LOG_LEVEL: z
            .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
            .optional()
            .default('info'),

        // ==========================================
        // HEDERA CONFIGURATION
        // ==========================================

        // Network
        HEDERA_NETWORK: z
            .enum(['mainnet', 'testnet'])
            .optional()
            .default('testnet'),
        USE_REAL_TESTNET: z
            .union([z.literal('true'), z.literal('false')])
            .optional(),

        // Operator (legacy)
        OPERATOR_ID: z
            .string()
            .regex(accountIdRegex, 'Invalid Hedera account ID')
            .optional(),
        OPERATOR_KEY: z.string().min(10).optional(),

        // Wallets - Deposit
        DEPOSIT_WALLET_ID: z
            .string()
            .regex(accountIdRegex, 'Invalid Hedera account ID'),
        DEPOSIT_WALLET_KEY: z.string().min(10),

        // Wallets - Withdrawals
        INSTANT_WITHDRAW_WALLET_ID: z
            .string()
            .regex(accountIdRegex, 'Invalid Hedera account ID'),
        INSTANT_WITHDRAW_WALLET_KEY: z.string().min(10),
        STANDARD_WITHDRAW_WALLET_ID: z
            .string()
            .regex(accountIdRegex, 'Invalid Hedera account ID')
            .optional(),
        STANDARD_WITHDRAW_WALLET_KEY: z.string().min(10).optional(),

        // Wallets - Treasury & Emissions
        TREASURY_ID: z
            .string()
            .regex(accountIdRegex, 'Invalid Hedera account ID')
            .optional(),
        TREASURY_KEY: z.string().min(10).optional(),
        EMISSIONS_ID: z
            .string()
            .regex(accountIdRegex, 'Invalid Hedera account ID'),
        EMISSIONS_KEY: z.string().min(10),

        // Wallets - Rate Publisher
        RATE_PUBLISHER_ID: z
            .string()
            .regex(accountIdRegex, 'Invalid Hedera account ID')
            .optional(),
        RATE_PUBLISHER_KEY: z.string().min(10).optional(),

        // Tokens
        USDC_TOKEN_ID: z
            .string()
            .regex(tokenIdRegex, 'Invalid Hedera token ID'),
        HUSD_TOKEN_ID: z
            .string()
            .regex(tokenIdRegex, 'Invalid Hedera token ID'),

        // Decimals
        USDC_DECIMALS: z.string().optional(),
        HUSD_DECIMALS: z.string().optional(),
        HBAR_DECIMALS: z.string().optional(),

        // Topics
        TOPIC_ID: z
            .string()
            .regex(topicIdRegex, 'Invalid Hedera topic ID')
            .optional(),
        WITHDRAW_TOPIC_ID: z
            .string()
            .regex(topicIdRegex, 'Invalid Hedera topic ID')
            .optional(),

        // Mirror Node
        MIRROR_NODE_API_KEY: z.string().optional(),
        TESTNET_MIRROR_NODE_ENDPOINT: z.string().url().optional(),
        MAINNET_MIRROR_NODE_ENDPOINT: z.string().url().optional(),

        // Hedera Limits
        MAX_QUERY_PAYMENT_TINYBARS: z.string().optional(),
        MAX_SCHEDULE_SIGN_FEE_TINYBARS: z.string().optional(),
        INSTANT_WITHDRAW_RETRY_ATTEMPTS: z.string().optional(),
        INSTANT_WITHDRAW_RETRY_DELAY_MS: z.string().optional(),

        // ==========================================
        // AUTHENTICATION & SECURITY
        // ==========================================

        JWT_SECRET: z
            .string()
            .min(32, 'JWT_SECRET must be at least 32 characters'),

        // ==========================================
        // EXTERNAL SERVICES
        // ==========================================

        // Supabase
        NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
        NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
        SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

        // Telegram (Optional)
        TELEGRAM_BOT_TOKEN: z.string().min(10).optional(),
        TELEGRAM_CHAT_ID: z.string().optional(),

        // SaucerSwap (Optional)
        SAUCERSWAP_API_URL: z.string().url().optional(),
        SAUCERSWAP_API_KEY: z.string().optional(),

        // Bonzo (Optional)
        BONZO_API_URL: z.string().url().optional(),

        // Validation Cloud (Optional)
        VALIDATION_CLOUD_API_KEY: z.string().optional(),
        VALIDATION_CLOUD_BASE_URL: z.string().url().optional(),

        // ==========================================
        // INFRASTRUCTURE
        // ==========================================

        // Redis (Optional)
        REDIS_URL: z.string().optional(),
        REDIS_HOST: z.string().optional(),
        REDIS_PORT: z.string().optional(),
        REDIS_PASSWORD: z.string().optional(),
        REDIS_DB: z.string().optional(),

        // ==========================================
        // FEATURE FLAGS
        // ==========================================

        SKIP_WITHDRAW_LOCK_PERIOD: z.enum(['true', 'false']).optional(),

        // ==========================================
        // CACHE CONFIGURATION
        // ==========================================

        CACHE_TTL_RATE: z.string().optional(),

        // ==========================================
        // API KEYS & SECURITY
        // ==========================================

        CRON_API_KEY: z.string().optional(),

        // ==========================================
        // MONITORING
        // ==========================================

        NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
        SENTRY_DSN: z.string().url().optional(),
        SENTRY_ORG: z.string().optional(),
        SENTRY_PROJECT: z.string().optional(),
        SENTRY_AUTH_TOKEN: z.string().optional(),
    })
    // Cross-field validation
    .refine(
        (data) => {
            // If Telegram is configured, both fields must be present
            const hasBotToken = !!data.TELEGRAM_BOT_TOKEN
            const hasChatId = !!data.TELEGRAM_CHAT_ID
            return hasBotToken === hasChatId
        },
        {
            message:
                'TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must both be set or both be empty',
            path: ['TELEGRAM_BOT_TOKEN'],
        }
    )

// ==========================================
// PARSE AND VALIDATE
// ==========================================

const envResult = envSchema.safeParse(process.env)

if (!envResult.success) {
    console.error('❌ Invalid server environment configuration')
    console.error(
        'Field errors:',
        JSON.stringify(envResult.error.flatten().fieldErrors, null, 2)
    )
    console.error(
        'Form errors:',
        JSON.stringify(envResult.error.flatten().formErrors, null, 2)
    )
    console.error('\nDetailed issues:')
    envResult.error.issues.forEach((issue) => {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
    })
    throw new Error(
        'Invalid server environment configuration. Check logs above.'
    )
}

const env = envResult.data

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const parseInteger = (value: string | undefined, fallback: number): number => {
    if (!value) return fallback
    const parsed = Number.parseInt(value, 10)
    return Number.isNaN(parsed) ? fallback : parsed
}

const toBoolean = (
    value: string | undefined,
    defaultValue: boolean
): boolean => {
    if (value === undefined) return defaultValue
    return value === 'true'
}

const DEFAULT_DECIMALS = {
    usdc: 6,
    husd: 3,
    hbar: 8,
}

type DecimalsConfig = {
    usdc: number
    husd: number
    hbar: number
}

type OperatorConfig = {
    accountId: string
    privateKey: string
}

const decimals: DecimalsConfig = {
    usdc: parseInteger(env.USDC_DECIMALS, DEFAULT_DECIMALS.usdc),
    husd: parseInteger(env.HUSD_DECIMALS, DEFAULT_DECIMALS.husd),
    hbar: parseInteger(env.HBAR_DECIMALS, DEFAULT_DECIMALS.hbar),
}

// ==========================================
// EXPORTED CONFIGURATION
// ==========================================

export const serverEnv = {
    // Environment
    nodeEnv: env.NODE_ENV ?? 'development',
    isProduction: (env.NODE_ENV ?? 'development') === 'production',
    isDevelopment: (env.NODE_ENV ?? 'development') === 'development',

    // Logging
    logging: {
        level: env.LOG_LEVEL,
    },

    // Hedera Network
    hedera: {
        network: env.HEDERA_NETWORK,
        useRealTestnet: toBoolean(env.USE_REAL_TESTNET, true),
        mirrorNodeUrl:
            env.HEDERA_NETWORK === 'mainnet'
                ? env.MAINNET_MIRROR_NODE_ENDPOINT ??
                  'https://mainnet-public.mirrornode.hedera.com'
                : env.TESTNET_MIRROR_NODE_ENDPOINT ??
                  'https://testnet.mirrornode.hedera.com',
        mirrorNodeApiKey: env.MIRROR_NODE_API_KEY,
    },

    // Operators/Wallets
    operators: {
        legacy:
            env.OPERATOR_ID && env.OPERATOR_KEY
                ? ({
                      accountId: env.OPERATOR_ID,
                      privateKey: env.OPERATOR_KEY,
                  } as OperatorConfig)
                : undefined,
        deposit: {
            accountId: env.DEPOSIT_WALLET_ID,
            privateKey: env.DEPOSIT_WALLET_KEY,
        } as OperatorConfig,
        instantWithdraw: {
            accountId: env.INSTANT_WITHDRAW_WALLET_ID,
            privateKey: env.INSTANT_WITHDRAW_WALLET_KEY,
        } as OperatorConfig,
        standardWithdraw:
            env.STANDARD_WITHDRAW_WALLET_ID && env.STANDARD_WITHDRAW_WALLET_KEY
                ? ({
                      accountId: env.STANDARD_WITHDRAW_WALLET_ID,
                      privateKey: env.STANDARD_WITHDRAW_WALLET_KEY,
                  } as OperatorConfig)
                : undefined,
        treasury:
            env.TREASURY_ID && env.TREASURY_KEY
                ? ({
                      accountId: env.TREASURY_ID,
                      privateKey: env.TREASURY_KEY,
                  } as OperatorConfig)
                : undefined,
        emissions: {
            accountId: env.EMISSIONS_ID,
            privateKey: env.EMISSIONS_KEY,
        } as OperatorConfig,
        ratePublisher:
            env.RATE_PUBLISHER_ID && env.RATE_PUBLISHER_KEY
                ? ({
                      accountId: env.RATE_PUBLISHER_ID,
                      privateKey: env.RATE_PUBLISHER_KEY,
                  } as OperatorConfig)
                : undefined,
    },

    // Tokens
    tokens: {
        usdc: {
            tokenId: env.USDC_TOKEN_ID,
            decimals: decimals.usdc,
        },
        husd: {
            tokenId: env.HUSD_TOKEN_ID,
            decimals: decimals.husd,
        },
    },

    // Decimals
    decimals,

    // Topics
    topics: {
        main: env.TOPIC_ID,
        withdraw: env.WITHDRAW_TOPIC_ID,
    },

    // Hedera Limits
    limits: {
        maxQueryPaymentTinybars: BigInt(
            parseInteger(env.MAX_QUERY_PAYMENT_TINYBARS, 50_000_000) // default 0.5 HBAR
        ),
        maxScheduleSignFeeTinybars: BigInt(
            parseInteger(env.MAX_SCHEDULE_SIGN_FEE_TINYBARS, 200_000_000) // default 2 HBAR
        ),
    },

    // Instant Withdraw Configuration
    instantWithdraw: {
        retryAttempts: parseInteger(env.INSTANT_WITHDRAW_RETRY_ATTEMPTS, 6),
        retryDelayMs: parseInteger(env.INSTANT_WITHDRAW_RETRY_DELAY_MS, 750),
    },

    // Authentication
    jwtSecret: env.JWT_SECRET,

    // Legacy compatibility
    topicId: env.TOPIC_ID,
    withdrawTopicId: env.WITHDRAW_TOPIC_ID,
    mirrorNodeApiKey: env.MIRROR_NODE_API_KEY,
    hederaNetwork: env.HEDERA_NETWORK,
    useRealTestnet: toBoolean(env.USE_REAL_TESTNET, true),

    // Supabase
    supabase:
        env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            ? {
                  url: env.NEXT_PUBLIC_SUPABASE_URL,
                  anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                  serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
              }
            : undefined,

    // Telegram
    telegram:
        env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID
            ? {
                  botToken: env.TELEGRAM_BOT_TOKEN,
                  chatId: env.TELEGRAM_CHAT_ID,
                  enabled: true,
              }
            : {
                  enabled: false,
              },

    // External APIs
    externalApis: {
        saucerSwap: env.SAUCERSWAP_API_URL
            ? {
                  url: env.SAUCERSWAP_API_URL,
                  apiKey: env.SAUCERSWAP_API_KEY,
              }
            : undefined,
        bonzo: env.BONZO_API_URL
            ? {
                  url: env.BONZO_API_URL,
              }
            : undefined,
        validationCloud: env.VALIDATION_CLOUD_API_KEY
            ? {
                  apiKey: env.VALIDATION_CLOUD_API_KEY,
                  baseUrl:
                      env.VALIDATION_CLOUD_BASE_URL ??
                      'https://api.validationcloud.io',
              }
            : undefined,
    },

    // Cache
    cache: {
        type: env.REDIS_URL ? ('redis' as const) : ('memory' as const),
        redis: env.REDIS_URL
            ? {
                  url: env.REDIS_URL,
                  host: env.REDIS_HOST,
                  port: env.REDIS_PORT ? parseInt(env.REDIS_PORT) : undefined,
                  password: env.REDIS_PASSWORD,
                  db: env.REDIS_DB ? parseInt(env.REDIS_DB) : undefined,
              }
            : undefined,
    },

    // Feature Flags
    features: {
        skipWithdrawLockPeriod: env.SKIP_WITHDRAW_LOCK_PERIOD === 'true',
    },

    // Cache TTLs (in seconds)
    cacheTTL: {
        rate: parseInt(env.CACHE_TTL_RATE ?? '300', 10), // 5 minutes default
    },

    // API Keys
    apiKeys: {
        cron: env.CRON_API_KEY,
    },

    // Monitoring
    sentry: env.NEXT_PUBLIC_SENTRY_DSN
        ? {
              dsn: env.NEXT_PUBLIC_SENTRY_DSN,
              org: env.SENTRY_ORG,
              project: env.SENTRY_PROJECT,
              authToken: env.SENTRY_AUTH_TOKEN,
              enabled: true,
          }
        : {
              enabled: false,
          },
} as const

export type ServerEnv = typeof serverEnv

// ==========================================
// VALIDATION WARNINGS
// ==========================================

if (serverEnv.isProduction) {
    if (serverEnv.cache.type === 'memory') {
        console.warn(
            '[serverEnv] ⚠️ Using in-memory cache in production. Use Redis for multi-instance deployments.'
        )
    }

    if (serverEnv.features.skipWithdrawLockPeriod) {
        throw new Error(
            '🚨 SECURITY: SKIP_WITHDRAW_LOCK_PERIOD cannot be enabled in production'
        )
    }

    if (!serverEnv.sentry.enabled) {
        console.warn(
            '[serverEnv] ⚠️ Sentry monitoring is disabled in production'
        )
    }
}

// ==========================================
// HELPER FUNCTIONS (exported for compatibility)
// ==========================================

export const ensureTestnetAccess = () => {
    if (!serverEnv.useRealTestnet) {
        throw new Error(
            'Hedera access is disabled because USE_REAL_TESTNET=false'
        )
    }
}

// ==========================================
// LOG CONFIGURATION SUMMARY
// ==========================================
// Removed console.log statements to reduce noise during development
// Configuration is validated and available through serverEnv export
