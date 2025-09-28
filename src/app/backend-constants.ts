// ===================================
// BACKEND CONSTANTS
// Constantes solo para uso en el backend (API routes, servicios)
// No incluye imports de browser/frontend
// ===================================

// ===================================
// HEDERA CONFIGURATION
// ===================================

// Hedera Network
export const HEDERA_CONFIG = {
    network: 'testnet',
    mirrorNode:
        process.env.TESTNET_MIRROR_NODE_ENDPOINT ||
        'https://testnet.mirrornode.hedera.com',
}

// Environment endpoints
export const TESTNET_MIRROR_NODE_ENDPOINT =
    process.env.TESTNET_MIRROR_NODE_ENDPOINT ||
    'https://testnet.mirrornode.hedera.com'

// ===================================
// TOPIC IDS
// ===================================

export const WITHDRAW_TOPIC_ID = process.env.WITHDRAW_TOPIC_ID || '0.0.6908400'
export const RATES_TOPIC_ID = process.env.RATES_TOPIC_ID || '0.0.6908395'

// ===================================
// ACCOUNT IDS
// ===================================

export const ACCOUNTS = {
    treasury: process.env.TREASURY_WALLET_ID || '0.0.6887438',
    emissions: process.env.EMISSIONS_WALLET_ID || '0.0.6887460',
    instantWithdraw: process.env.INSTANT_WITHDRAW_WALLET_ID || '0.0.6887450',
    standardWithdraw: process.env.STANDARD_WITHDRAW_WALLET_ID || '0.0.6887453',
    operator: process.env.HEDERA_OPERATOR_ID || '0.0.6887438',
    deposit: process.env.DEPOSIT_WALLET_ID || '0.0.6887448', // Wallet de depósitos
}

// ===================================
// TOKEN IDS
// ===================================

export const TOKENS = {
    hbar: '0.0.0', // Native HBAR
    usdc: process.env.USDC_TOKEN_ID || '0.0.429274',
    husd: process.env.HUSD_TOKEN_ID || '0.0.6889338',
}

// ===================================
// NUMERIC CONSTANTS
// ===================================

export const NUMERIC = {
    // Token decimals
    USDC_DECIMALS: 6,
    HUSD_DECIMALS: 3, // FIXED: HUSD uses 3 decimals, not 8
    HBAR_DECIMALS: 8,

    // Multipliers based on decimals
    USDC_MULTIPLIER: 1_000_000, // 10^6
    HUSD_MULTIPLIER: 1_000, // 10^3 - FIXED: HUSD uses 3 decimals
    HBAR_MULTIPLIER: 100_000_000, // 10^8

    // Fees and limits
    INSTANT_WITHDRAW_FEE: 0.005, // 0.5%
    INSTANT_WITHDRAW_MIN: 0.01, // $0.01
    INSTANT_WITHDRAW_MAX: 10000, // $10,000
}

// ===================================
// VALIDATION CONSTANTS
// ===================================

export const VALIDATION = {
    MIN_HUSD_AMOUNT: 0.01,
    MAX_HUSD_AMOUNT: 1_000_000,
    ACCOUNT_ID_REGEX: /^\d+\.\d+\.\d+$/,
}
