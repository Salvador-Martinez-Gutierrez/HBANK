// ===================================
// VALORA PROTOCOL - CONSOLIDATED CONSTANTS
// Todas las constantes del proyecto centralizadas
// ===================================

import {
    HashpackConnector,
    KabilaConnector,
    HWCConnector,
} from '@buidlerlabs/hashgraph-react-wallets/connectors'

// ===================================
// HEDERA CONFIGURATION
// ===================================

// Hedera Network
export const HEDERA_CONFIG = {
    network: 'testnet',
    mirrorNode: process.env.TESTNET_MIRROR_NODE_ENDPOINT || 'https://testnet.mirrornode.hedera.com',
    validationCloudEndpoint: 'https://testnet.hedera.validationcloud.io/v1'
} as const

// Token IDs for Hedera Testnet
export const TOKENS = {
    HUSD: '0.0.6624255',
    USDC: '0.0.429274',
} as const

// Legacy export for backward compatibility
export const TOKEN_IDS = TOKENS

// Topic IDs
export const TOPICS = {
    RATE: '0.0.6626120',
    WITHDRAW: '0.0.6750041',
} as const

// Legacy exports
export const TOPIC_ID = TOPICS.RATE
export const WITHDRAW_TOPIC_ID = TOPICS.WITHDRAW

// Account IDs
export const ACCOUNTS = {
    treasury: process.env.TREASURY_ID || '0.0.6510977',
    emissions: process.env.EMISSIONS_ID || '0.0.6624253',
    depositWallet: process.env.DEPOSIT_WALLET_ID || '0.0.6510977',
    instantWithdrawWallet: process.env.INSTANT_WITHDRAW_WALLET_ID || '0.0.6510977',
    standardWithdrawWallet: process.env.STANDARD_WITHDRAW_WALLET_ID || '0.0.6510977',
    ratePublisher: process.env.RATE_PUBLISHER_ID || '0.0.6510977',
} as const

// Legacy exports
export const TREASURY_ID = ACCOUNTS.treasury
export const EMISSIONS_ID = ACCOUNTS.emissions

// ===================================
// BUSINESS LOGIC CONSTANTS
// ===================================

// Token decimals
export const DECIMALS = {
    USDC: 6,
    HUSD: 8,
} as const

// Fees
export const FEES = {
    instantWithdraw: parseFloat(process.env.INSTANT_WITHDRAW_FEE || '0.005'), // 0.5%
} as const

// Legacy export
export const INSTANT_WITHDRAW_FEE = FEES.instantWithdraw

// Withdrawal settings
export const WITHDRAWAL_CONFIG = {
    lockHours: 48,
    workerIntervalMinutes: 60,
    rateTolerance: 0.0001, // 0.01%
} as const

// ===================================
// APP CONFIGURATION
// ===================================

// WalletConnect Project ID
export const WALLETCONNECT_PROJECT_ID =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

// App URL for metadata
export const APP_URL =
    process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'

// ===================================
// WALLET CONFIGURATION
// ===================================

export const SUPPORTED_WALLETS = [
    {
        id: 'hashpack',
        name: 'Hashpack',
        icon: '/hashpack-wallet.png',
        iconSize: { width: 32, height: 32 },
        connector: HashpackConnector,
        mobileSupported: false,
    },
    {
        id: 'kabila',
        name: 'Kabila',
        icon: '/kabila-wallet.png',
        iconSize: { width: 22, height: 22 },
        connector: KabilaConnector,
        mobileSupported: false,
    },
    {
        id: 'walletconnect',
        name: 'WalletConnect',
        icon: '/walletconnect-logo.png',
        iconSize: { width: 32, height: 32 },
        connector: HWCConnector,
        mobileSupported: true,
    },
]

// Token IDs for Hedera Testnet
export const TOKEN_IDS = {
    hUSD: '0.0.6624255',
    USDC: '0.0.429274',
} as const

//TOPIC_IDs
export const TOPIC_ID = '0.0.6626120'
export const WITHDRAW_TOPIC_ID = '0.0.6750041'

export const TESTNET_MIRROR_NODE_ENDPOINT =
    'https://testnet.hedera.validationcloud.io/v1'

// Instant Withdrawal Configuration
export const INSTANT_WITHDRAW_FEE = 0.005
