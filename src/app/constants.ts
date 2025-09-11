import {
    HashpackConnector,
    KabilaConnector,
    HWCConnector,
} from '@buidlerlabs/hashgraph-react-wallets/connectors'

// WalletConnect Project ID
export const WALLETCONNECT_PROJECT_ID =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

// App URL for metadata
export const APP_URL =
    process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'

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
export const INSTANT_WITHDRAW_FEE = 0.01
