import type { Database } from './supabase'

export type User = Database['public']['Tables']['users']['Row']
export type Wallet = Database['public']['Tables']['wallets']['Row']
export type TokenRegistry =
    Database['public']['Tables']['tokens_registry']['Row']
export type WalletToken = Database['public']['Tables']['wallet_tokens']['Row']
export type NFT = Database['public']['Tables']['nfts']['Row']

// Extended types for joined queries
export interface WalletTokenWithMetadata extends WalletToken {
    tokens_registry: TokenRegistry
}

export interface WalletWithTokens extends Wallet {
    wallet_tokens: WalletTokenWithMetadata[]
    nfts: NFT[]
}

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
