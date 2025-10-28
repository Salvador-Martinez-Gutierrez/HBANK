/**
 * AccountId Value Object
 *
 * Represents a Hedera account ID in the HBANK Protocol.
 * This value object ensures account IDs are valid and provides
 * type-safe operations.
 *
 * @module domain/value-objects
 */

import { InvalidAccountError } from '@/domain/errors/DomainError'

/**
 * Regex pattern for validating Hedera account IDs
 * Format: shard.realm.num (e.g., 0.0.12345)
 */
const ACCOUNT_ID_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/

/**
 * AccountId Value Object
 *
 * Immutable representation of a Hedera account ID with validation.
 * Ensures that account IDs follow the correct format (shard.realm.num).
 *
 * @example
 * ```typescript
 * const accountId = AccountId.from('0.0.12345')
 * console.log(accountId.toString()) // "0.0.12345"
 * console.log(accountId.shard)      // 0
 * console.log(accountId.realm)      // 0
 * console.log(accountId.num)        // 12345
 * ```
 */
export class AccountId {
    /**
     * Private constructor to enforce factory methods
     *
     * @param value - The string representation of the account ID
     * @param shard - The shard number
     * @param realm - The realm number
     * @param num - The account number
     */
    private constructor(
        public readonly value: string,
        public readonly shard: number,
        public readonly realm: number,
        public readonly num: number
    ) {}

    // ========================================
    // Factory Methods
    // ========================================

    /**
     * Create AccountId from string
     *
     * @param value - Account ID string (format: shard.realm.num)
     * @returns New AccountId instance
     *
     * @throws {InvalidAccountError} If format is invalid
     *
     * @example
     * ```typescript
     * const accountId = AccountId.from('0.0.12345')
     * ```
     */
    static from(value: string): AccountId {
        const match = value.match(ACCOUNT_ID_PATTERN)

        if (!match) {
            throw new InvalidAccountError(
                'Invalid Hedera account ID format. Expected: shard.realm.num',
                { value }
            )
        }

        const shard = parseInt(match[1], 10)
        const realm = parseInt(match[2], 10)
        const num = parseInt(match[3], 10)

        // Validate components
        if (shard < 0 || realm < 0 || num < 0) {
            throw new InvalidAccountError('Account ID components must be non-negative', {
                value,
                shard,
                realm,
                num,
            })
        }

        return new AccountId(value, shard, realm, num)
    }

    /**
     * Create AccountId from components
     *
     * @param shard - The shard number
     * @param realm - The realm number
     * @param num - The account number
     * @returns New AccountId instance
     *
     * @throws {InvalidAccountError} If components are invalid
     *
     * @example
     * ```typescript
     * const accountId = AccountId.fromComponents(0, 0, 12345)
     * console.log(accountId.toString()) // "0.0.12345"
     * ```
     */
    static fromComponents(shard: number, realm: number, num: number): AccountId {
        if (shard < 0 || realm < 0 || num < 0) {
            throw new InvalidAccountError('Account ID components must be non-negative', {
                shard,
                realm,
                num,
            })
        }

        const value = `${shard}.${realm}.${num}`
        return new AccountId(value, shard, realm, num)
    }

    /**
     * Try to create AccountId from string, return null if invalid
     *
     * @param value - Account ID string
     * @returns AccountId instance or null if invalid
     *
     * @example
     * ```typescript
     * const accountId = AccountId.tryFrom('0.0.12345')
     * if (accountId) {
     *   console.log('Valid account ID')
     * } else {
     *   console.log('Invalid account ID')
     * }
     * ```
     */
    static tryFrom(value: string): AccountId | null {
        try {
            return AccountId.from(value)
        } catch {
            return null
        }
    }

    /**
     * Validate account ID string format
     *
     * @param value - Account ID string to validate
     * @returns True if valid format
     *
     * @example
     * ```typescript
     * if (AccountId.isValid('0.0.12345')) {
     *   const accountId = AccountId.from('0.0.12345')
     * }
     * ```
     */
    static isValid(value: string): boolean {
        return ACCOUNT_ID_PATTERN.test(value)
    }

    // ========================================
    // Conversion Methods
    // ========================================

    /**
     * Convert to string representation
     *
     * @returns Account ID string (format: shard.realm.num)
     *
     * @example
     * ```typescript
     * const accountId = AccountId.from('0.0.12345')
     * console.log(accountId.toString()) // "0.0.12345"
     * ```
     */
    toString(): string {
        return this.value
    }

    /**
     * Convert to JSON representation
     *
     * @returns JSON object with account ID data
     */
    toJSON(): {
        value: string
        shard: number
        realm: number
        num: number
    } {
        return {
            value: this.value,
            shard: this.shard,
            realm: this.realm,
            num: this.num,
        }
    }

    // ========================================
    // Comparison Methods
    // ========================================

    /**
     * Check equality with another AccountId
     *
     * @param other - AccountId to compare with
     * @returns True if account IDs are equal
     *
     * @example
     * ```typescript
     * const id1 = AccountId.from('0.0.12345')
     * const id2 = AccountId.from('0.0.12345')
     * console.log(id1.equals(id2)) // true
     * ```
     */
    equals(other: AccountId): boolean {
        return (
            this.shard === other.shard &&
            this.realm === other.realm &&
            this.num === other.num
        )
    }

    /**
     * Check if account ID matches a string
     *
     * @param value - String to compare with
     * @returns True if values match
     *
     * @example
     * ```typescript
     * const accountId = AccountId.from('0.0.12345')
     * console.log(accountId.matches('0.0.12345')) // true
     * console.log(accountId.matches('0.0.67890')) // false
     * ```
     */
    matches(value: string): boolean {
        return this.value === value
    }

    // ========================================
    // Utility Methods
    // ========================================

    /**
     * Check if this is a treasury account
     * (Based on environment configuration)
     *
     * @param treasuryId - Treasury account ID to compare with
     * @returns True if this is the treasury account
     *
     * @example
     * ```typescript
     * const accountId = AccountId.from('0.0.6887438')
     * const isTreasury = accountId.isTreasury('0.0.6887438')
     * ```
     */
    isTreasury(treasuryId: string): boolean {
        return this.matches(treasuryId)
    }

    /**
     * Check if account belongs to testnet (shard 0, realm 0)
     *
     * @returns True if testnet account
     *
     * @example
     * ```typescript
     * const accountId = AccountId.from('0.0.12345')
     * console.log(accountId.isTestnet()) // true
     * ```
     */
    isTestnet(): boolean {
        return this.shard === 0 && this.realm === 0
    }

    /**
     * Get short display string (just the account number)
     *
     * @returns Short display string
     *
     * @example
     * ```typescript
     * const accountId = AccountId.from('0.0.12345')
     * console.log(accountId.toShortString()) // "12345"
     * ```
     */
    toShortString(): string {
        return this.num.toString()
    }

    /**
     * Get display string with prefix
     *
     * @param prefix - Prefix to add (default: "Account ")
     * @returns Display string with prefix
     *
     * @example
     * ```typescript
     * const accountId = AccountId.from('0.0.12345')
     * console.log(accountId.toDisplayString()) // "Account 0.0.12345"
     * console.log(accountId.toDisplayString('User ')) // "User 0.0.12345"
     * ```
     */
    toDisplayString(prefix: string = 'Account '): string {
        return `${prefix}${this.value}`
    }
}
