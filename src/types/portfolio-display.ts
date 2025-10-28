/**
 * Portfolio Display Types
 *
 * Centralized types for displaying portfolio assets.
 * Used across multiple components to avoid duplication.
 */

/**
 * Fungible Token Display Data
 */
export interface TokenDisplay {
    id: string
    balance: string
    token_name?: string
    token_symbol?: string
    token_address: string
    token_icon?: string | null
    decimals: number
    price_usd: string
}

/**
 * NFT Display Data
 */
export interface NFTDisplay {
    id: string
    token_id: string
    serial_number: number
    metadata: Record<string, unknown>
    token_name?: string
    token_icon?: string | null
}

/**
 * Wallet Display Data
 */
export interface WalletDisplay {
    id: string
    label?: string
    hedera_account_id: string
    hbar_balance?: number
    hbar_price_usd?: number
}
