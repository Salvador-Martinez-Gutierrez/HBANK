/**
 * User Repository Interface
 *
 * Defines the contract for user data access operations.
 * Implementations handle persistence to Supabase.
 */

import { Database } from '@/types/supabase'

/**
 * User row type from Supabase
 */
export type UserRow = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

/**
 * User Repository Interface
 *
 * Provides methods for accessing and managing user data.
 */
export interface IUserRepository {
    /**
     * Find a user by ID
     *
     * @param id - User UUID
     * @returns User if found, null otherwise
     */
    findById(id: string): Promise<UserRow | null>

    /**
     * Find a user by wallet address
     *
     * @param walletAddress - Hedera wallet address (e.g., "0.0.123456")
     * @returns User if found, null otherwise
     */
    findByWalletAddress(walletAddress: string): Promise<UserRow | null>

    /**
     * Create a new user
     *
     * @param user - User data to insert
     * @returns Created user
     */
    create(user: UserInsert): Promise<UserRow>

    /**
     * Update an existing user
     *
     * @param id - User UUID
     * @param updates - Fields to update
     * @returns Updated user
     */
    update(id: string, updates: UserUpdate): Promise<UserRow>

    /**
     * Delete a user
     *
     * @param id - User UUID
     */
    delete(id: string): Promise<void>

    /**
     * Check if a user exists by wallet address
     *
     * @param walletAddress - Hedera wallet address
     * @returns True if user exists
     */
    exists(walletAddress: string): Promise<boolean>
}
