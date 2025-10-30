/**
 * Wallet Repository Interface
 *
 * Defines the contract for wallet data access operations.
 * Implementations handle persistence to Supabase.
 */

import { Database } from '@/types/supabase'

/**
 * Wallet row type from Supabase
 */
export type WalletRow = Database['public']['Tables']['wallets']['Row']
export type WalletInsert = Database['public']['Tables']['wallets']['Insert']
export type WalletUpdate = Database['public']['Tables']['wallets']['Update']

/**
 * Wallet filter options
 */
export interface WalletFilterOptions {
    userId?: string
    walletAddress?: string
}

/**
 * Wallet Repository Interface
 *
 * Provides methods for accessing and managing wallet data.
 */
export interface IWalletRepository {
    /**
     * Find a wallet by ID
     *
     * @param id - Wallet UUID
     * @returns Wallet if found, null otherwise
     */
    findById(id: string): Promise<WalletRow | null>

    /**
     * Find a wallet by address
     *
     * @param walletAddress - Hedera wallet address (e.g., "0.0.123456")
     * @returns Wallet if found, null otherwise
     */
    findByAddress(walletAddress: string): Promise<WalletRow | null>

    /**
     * Find all wallets for a user
     *
     * @param userId - User UUID
     * @returns Array of user's wallets, ordered by display_order
     */
    findByUserId(userId: string): Promise<WalletRow[]>

    /**
     * Create a new wallet
     *
     * @param wallet - Wallet data to insert
     * @returns Created wallet
     */
    create(wallet: WalletInsert): Promise<WalletRow>

    /**
     * Update an existing wallet
     *
     * @param id - Wallet UUID
     * @param updates - Fields to update
     * @returns Updated wallet
     */
    update(id: string, updates: WalletUpdate): Promise<WalletRow>

    /**
     * Delete a wallet
     *
     * @param id - Wallet UUID
     */
    delete(id: string): Promise<void>

    /**
     * Update wallet HBAR balance and price
     *
     * @param id - Wallet UUID
     * @param hbarBalance - New HBAR balance
     * @param hbarPriceUsd - Current HBAR price in USD
     * @returns Updated wallet
     */
    updateHbarBalance(id: string, hbarBalance: number, hbarPriceUsd: number): Promise<WalletRow>

    /**
     * Reorder wallets for a user
     *
     * @param userId - User UUID
     * @param walletOrder - Array of wallet IDs in desired order
     */
    reorderWallets(userId: string, walletOrder: string[]): Promise<void>
}
