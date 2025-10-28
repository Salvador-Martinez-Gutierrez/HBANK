/**
 * Portfolio Wallet Service Interface
 *
 * Defines the contract for managing user wallets in the portfolio tracker.
 */

export interface Wallet {
    id: string
    user_id: string
    hedera_account_id: string
    label?: string
    created_at: Date
    hbar_balance?: number
    hbar_price_usd?: number
}

export interface WalletWithAssets extends Wallet {
    tokens: Array<{
        token_id: string
        balance: string
        decimals: number
        name?: string
        symbol?: string
        price_usd?: number
    }>
    nfts: Array<{
        token_id: string
        serial_number: number
        metadata?: Record<string, unknown>
    }>
    defi_positions: Array<{
        protocol: string
        position_type: string
        amount: number
        value_usd?: number
    }>
}

export interface SyncResult {
    success: boolean
    walletsUpdated: number
    tokensUpdated: number
    errors: Array<{ walletId: string; error: string }>
}

export interface IPortfolioWalletService {
    /**
     * Get all wallets for a user
     */
    getUserWallets(userId: string): Promise<Wallet[]>

    /**
     * Get wallet with full asset details
     */
    getWalletWithAssets(walletId: string): Promise<WalletWithAssets | null>

    /**
     * Add new wallet to portfolio
     */
    addWallet(
        userId: string,
        hederaAccountId: string,
        label?: string
    ): Promise<Wallet>

    /**
     * Remove wallet from portfolio
     */
    removeWallet(walletId: string, userId: string): Promise<void>

    /**
     * Update wallet label
     */
    updateWalletLabel(
        walletId: string,
        userId: string,
        label: string
    ): Promise<void>

    /**
     * Sync wallet data from Hedera
     */
    syncWallet(walletId: string): Promise<SyncResult>

    /**
     * Sync all wallets for a user
     */
    syncAllUserWallets(userId: string): Promise<SyncResult>

    /**
     * Update token prices
     */
    updateTokenPrices(tokenIds: string[]): Promise<{
        updated: number
        failed: number
    }>

    /**
     * Get aggregated portfolio value
     */
    getPortfolioValue(userId: string): Promise<{
        totalValueUsd: number
        hbarValue: number
        tokensValue: number
        defiValue: number
        nftCount: number
    }>
}
