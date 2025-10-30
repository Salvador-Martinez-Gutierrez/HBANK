// ===================================
// BACKEND CONSTANTS
// Constants for backend use only (API routes, services)
// No incluye imports de browser/frontend
// ===================================

import { serverEnv } from '@/config/serverEnv'

// ===================================
// HEDERA CONFIGURATION
// ===================================

// Hedera Network
export const HEDERA_CONFIG = {
    network: serverEnv.hedera.network,
    mirrorNode: serverEnv.hedera.mirrorNodeUrl,
}

// Environment endpoints
export const TESTNET_MIRROR_NODE_ENDPOINT = serverEnv.hedera.mirrorNodeUrl

// ===================================
// TOPIC IDS
// ===================================

export const WITHDRAW_TOPIC_ID = serverEnv.topics.withdraw
export const RATES_TOPIC_ID = serverEnv.topics.main

// ===================================
// ACCOUNT IDS
// ===================================

export const ACCOUNTS = {
    treasury: serverEnv.operators.treasury?.accountId ?? '',
    emissions: serverEnv.operators.emissions.accountId,
    instantWithdraw: serverEnv.operators.instantWithdraw.accountId,
    standardWithdraw: serverEnv.operators.standardWithdraw?.accountId ?? '',
    operator: serverEnv.operators.legacy?.accountId ?? serverEnv.operators.treasury?.accountId ?? '',
    deposit: serverEnv.operators.deposit.accountId,
}

// ===================================
// TOKEN IDS
// ===================================

export const TOKENS = {
    hbar: '0.0.0', // Native HBAR
    usdc: serverEnv.tokens.usdc.tokenId,
    husd: serverEnv.tokens.husd.tokenId,
}

// ===================================
// NUMERIC CONSTANTS
// ===================================

export const NUMERIC = {
    // Token decimals
    USDC_DECIMALS: serverEnv.decimals.usdc,
    HUSD_DECIMALS: serverEnv.decimals.husd,
    HBAR_DECIMALS: serverEnv.decimals.hbar,

    // Multipliers based on decimals
    USDC_MULTIPLIER: Math.pow(10, serverEnv.decimals.usdc),
    HUSD_MULTIPLIER: Math.pow(10, serverEnv.decimals.husd),
    HBAR_MULTIPLIER: Math.pow(10, serverEnv.decimals.hbar),

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
