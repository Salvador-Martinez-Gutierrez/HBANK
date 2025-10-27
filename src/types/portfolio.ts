import type { Database } from './supabase'

export type User = Database['public']['Tables']['users']['Row']
export type Wallet = Database['public']['Tables']['wallets']['Row']
export type TokenRegistry =
    Database['public']['Tables']['tokens_registry']['Row']
export type WalletToken = Database['public']['Tables']['wallet_tokens']['Row']
export type LiquidityPoolToken =
    Database['public']['Tables']['liquidity_pool_tokens']['Row']
export type NFT = Database['public']['Tables']['wallet_nfts']['Row']
export type WalletDefi = Database['public']['Tables']['wallet_defi']['Row']

// Token type enum
export type TokenType = 'FUNGIBLE' | 'NON_FUNGIBLE' | 'LP_TOKEN'

// DeFi position type enum
export type DefiPositionType =
    | 'SAUCERSWAP_V1_POOL'
    | 'SAUCERSWAP_V1_FARM'
    | 'BONZO_LENDING'

// Extended types for joined queries
export interface WalletTokenWithMetadata extends WalletToken {
    tokens_registry: TokenRegistry
}

export interface LPTokenWithMetadata extends LiquidityPoolToken {
    tokens_registry: TokenRegistry
}

export interface NFTWithMetadata extends NFT {
    tokens_registry?: TokenRegistry
}

export interface WalletDefiWithMetadata extends WalletDefi {
    tokens_registry?: TokenRegistry
}

export interface WalletWithAssets extends Wallet {
    wallet_tokens: WalletTokenWithMetadata[]
    liquidity_pool_tokens: LPTokenWithMetadata[]
    wallet_nfts: NFTWithMetadata[]
    wallet_defi: WalletDefiWithMetadata[]
}

// Legacy type alias for backward compatibility
export type WalletWithTokens = WalletWithAssets

export interface PortfolioData {
    user: User
    wallets: WalletWithTokens[]
    totalValueUsd: string
}

export interface TokenBalance {
    tokenAddress: string
    tokenName: string
    tokenSymbol: string
    balance: string
    decimals: number
    priceUsd: string
    valueUsd: string
}

export interface AuthPayload {
    walletAddress: string
    signature: string
    message: string
    timestamp: number
}

export interface AuthResponse {
    success: boolean
    userId?: string
    token?: string
    error?: string
}
