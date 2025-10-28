import { z } from 'zod'

const accountIdRegex = /^\d+\.\d+\.\d+$/
const tokenIdRegex = /^\d+\.\d+\.\d+$/
const topicIdRegex = /^\d+\.\d+\.\d+$/

const envSchema = z.object({
    NODE_ENV: z.string().optional(),
    USE_REAL_TESTNET: z
        .union([z.literal('true'), z.literal('false')])
        .optional(),
    DEPOSIT_WALLET_ID: z
        .string()
        .regex(accountIdRegex, 'Invalid Hedera account ID'),
    DEPOSIT_WALLET_KEY: z.string().min(10),
    EMISSIONS_ID: z.string().regex(accountIdRegex, 'Invalid Hedera account ID'),
    EMISSIONS_KEY: z.string().min(10),
    INSTANT_WITHDRAW_WALLET_ID: z
        .string()
        .regex(accountIdRegex, 'Invalid Hedera account ID'),
    INSTANT_WITHDRAW_WALLET_KEY: z.string().min(10),
    USDC_TOKEN_ID: z.string().regex(tokenIdRegex, 'Invalid Hedera token ID'),
    HUSD_TOKEN_ID: z.string().regex(tokenIdRegex, 'Invalid Hedera token ID'),
    USDC_DECIMALS: z.string().optional(),
    HUSD_DECIMALS: z.string().optional(),
    HBAR_DECIMALS: z.string().optional(),
    TOPIC_ID: z
        .string()
        .regex(topicIdRegex, 'Invalid Hedera topic ID')
        .optional(),
    WITHDRAW_TOPIC_ID: z
        .string()
        .regex(topicIdRegex, 'Invalid Hedera topic ID')
        .optional(),
    MIRROR_NODE_API_KEY: z.string().optional(),
    MAX_QUERY_PAYMENT_TINYBARS: z.string().optional(),
    MAX_SCHEDULE_SIGN_FEE_TINYBARS: z.string().optional(),
    INSTANT_WITHDRAW_RETRY_ATTEMPTS: z.string().optional(),
    INSTANT_WITHDRAW_RETRY_DELAY_MS: z.string().optional(),
    // JWT Secret for Hedera Wallet authentication
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    // Hedera Network (mainnet o testnet)
    HEDERA_NETWORK: z
        .enum(['mainnet', 'testnet'])
        .optional()
        .default('testnet'),
})

const parseInteger = (value: string | undefined, fallback: number): number => {
    if (!value) return fallback
    const parsed = Number.parseInt(value, 10)
    return Number.isNaN(parsed) ? fallback : parsed
}

const envResult = envSchema.safeParse(process.env)

if (!envResult.success) {
    console.error(
        '❌ Invalid server environment configuration',
        envResult.error.flatten()
    )
    throw new Error('Invalid server environment configuration')
}

const env = envResult.data

const toBoolean = (value: string | undefined, defaultValue: boolean) => {
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

export const serverEnv = {
    nodeEnv: env.NODE_ENV ?? 'development',
    isProduction: (env.NODE_ENV ?? 'development') === 'production',
    useRealTestnet: toBoolean(env.USE_REAL_TESTNET, true),
    operators: {
        deposit: {
            accountId: env.DEPOSIT_WALLET_ID,
            privateKey: env.DEPOSIT_WALLET_KEY,
        } as OperatorConfig,
        emissions: {
            accountId: env.EMISSIONS_ID,
            privateKey: env.EMISSIONS_KEY,
        } as OperatorConfig,
        instantWithdraw: {
            accountId: env.INSTANT_WITHDRAW_WALLET_ID,
            privateKey: env.INSTANT_WITHDRAW_WALLET_KEY,
        } as OperatorConfig,
    },
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
    decimals,
    topicId: env.TOPIC_ID,
    withdrawTopicId: env.WITHDRAW_TOPIC_ID,
    mirrorNodeApiKey: env.MIRROR_NODE_API_KEY,
    limits: {
        maxQueryPaymentTinybars: BigInt(
            parseInteger(env.MAX_QUERY_PAYMENT_TINYBARS, 50_000_000) // default 0.5 HBAR
        ),
        maxScheduleSignFeeTinybars: BigInt(
            parseInteger(env.MAX_SCHEDULE_SIGN_FEE_TINYBARS, 200_000_000) // default 2 HBAR
        ),
    },
    instantWithdraw: {
        retryAttempts: parseInteger(env.INSTANT_WITHDRAW_RETRY_ATTEMPTS, 6),
        retryDelayMs: parseInteger(env.INSTANT_WITHDRAW_RETRY_DELAY_MS, 750),
    },
    // Autenticación
    jwtSecret: env.JWT_SECRET,
    hederaNetwork: env.HEDERA_NETWORK ?? 'testnet',
} as const

export type ServerEnv = typeof serverEnv

export const ensureTestnetAccess = () => {
    if (!serverEnv.useRealTestnet) {
        throw new Error(
            'Hedera access is disabled because USE_REAL_TESTNET=false'
        )
    }
}
