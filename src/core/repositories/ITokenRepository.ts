/**
 * Token Repository Interface
 *
 * Defines the contract for token registry data access operations.
 * Implementations handle persistence to Supabase.
 */

import { Database } from '@/types/supabase'

/**
 * Token row type from Supabase
 */
export type TokenRow = Database['public']['Tables']['tokens_registry']['Row']
export type TokenInsert = Database['public']['Tables']['tokens_registry']['Insert']
export type TokenUpdate = Database['public']['Tables']['tokens_registry']['Update']

/**
 * Token Repository Interface
 *
 * Provides methods for accessing and managing token registry data.
 */
export interface ITokenRepository {
    /**
     * Find a token by ID
     *
     * @param id - Token UUID
     * @returns Token if found, null otherwise
     */
    findById(id: string): Promise<TokenRow | null>

    /**
     * Find a token by token address (Hedera token ID)
     *
     * @param tokenAddress - Hedera token ID (e.g., "0.0.123456")
     * @returns Token if found, null otherwise
     */
    findByAddress(tokenAddress: string): Promise<TokenRow | null>

    /**
     * Find tokens by symbol
     *
     * @param symbol - Token symbol (e.g., "HBAR", "USDC")
     * @returns Array of matching tokens
     */
    findBySymbol(symbol: string): Promise<TokenRow[]>

    /**
     * Get all tokens
     *
     * @returns Array of all tokens in registry
     */
    findAll(): Promise<TokenRow[]>

    /**
     * Create a new token
     *
     * @param token - Token data to insert
     * @returns Created token
     */
    create(token: TokenInsert): Promise<TokenRow>

    /**
     * Update an existing token
     *
     * @param id - Token UUID
     * @param updates - Fields to update
     * @returns Updated token
     */
    update(id: string, updates: TokenUpdate): Promise<TokenRow>

    /**
     * Update token price
     *
     * @param id - Token UUID
     * @param priceUsd - New price in USD
     * @returns Updated token
     */
    updatePrice(id: string, priceUsd: number): Promise<TokenRow>

    /**
     * Delete a token
     *
     * @param id - Token UUID
     */
    delete(id: string): Promise<void>

    /**
     * Check if a token exists by address
     *
     * @param tokenAddress - Hedera token ID
     * @returns True if token exists
     */
    exists(tokenAddress: string): Promise<boolean>
}
