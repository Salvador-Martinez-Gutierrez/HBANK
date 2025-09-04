// Server-side constants (sin importaciones problemáticas de wallet)

// Token IDs for Hedera Testnet
export const TOKEN_IDS = {
    hUSD: '0.0.6624255',
    USDC: '0.0.429274',
} as const

//TOPIC_IDs
export const RATE_TOPIC_ID = '0.0.6626120'
export const WITHDRAW_TOPIC_ID = '0.0.6750041'

// Wallet IDs (without keys for frontend usage)
export const TREASURY_ID = process.env.TREASURY_ID || '0.0.6510977'
export const EMISSIONS_ID = process.env.EMISSIONS_ID || '0.0.6624253'
export const DEPOSIT_WALLET_ID = process.env.DEPOSIT_WALLET_ID || '0.0.6510977'
export const INSTANT_WITHDRAW_WALLET_ID = process.env.INSTANT_WITHDRAW_WALLET_ID || '0.0.6510977'
export const STANDARD_WITHDRAW_WALLET_ID = process.env.STANDARD_WITHDRAW_WALLET_ID || '0.0.6510977'
export const RATE_PUBLISHER_ID = process.env.RATE_PUBLISHER_ID || '0.0.6510977'

// Hedera Environment
export const TESTNET_MIRROR_NODE_ENDPOINT =
    process.env.TESTNET_MIRROR_NODE_ENDPOINT ||
    'https://testnet.mirrornode.hedera.com'

// Token details
export const USDC_DECIMALS = 6
export const HUSD_DECIMALS = 8

// Withdrawal settings
export const WITHDRAWAL_LOCK_HOURS = 48
export const WITHDRAWAL_WORKER_INTERVAL_MINUTES = 60

// Rate validation
export const RATE_TOLERANCE = 0.0001 // 0.01%

// Instant Withdrawal Configuration
export const INSTANT_WITHDRAW_FEE = parseFloat(
    process.env.INSTANT_WITHDRAW_FEE || '0.01'
)
