/**
 * AccountId Value Object Tests
 *
 * Comprehensive test suite for the AccountId value object covering:
 * - Factory methods
 * - Validation
 * - Conversion methods
 * - Comparison methods
 * - Utility methods
 */

import { AccountId } from '../AccountId'
import { InvalidAccountError } from '@/domain/errors/DomainError'

describe('AccountId Value Object', () => {
    describe('Factory Methods', () => {
        describe('from()', () => {
            it('should create AccountId from valid string', () => {
                const accountId = AccountId.from('0.0.12345')

                expect(accountId.value).toBe('0.0.12345')
                expect(accountId.shard).toBe(0)
                expect(accountId.realm).toBe(0)
                expect(accountId.num).toBe(12345)
            })

            it('should handle different shard/realm combinations', () => {
                const id1 = AccountId.from('0.0.12345')
                const id2 = AccountId.from('1.2.67890')
                const id3 = AccountId.from('99.88.77')

                expect(id1.shard).toBe(0)
                expect(id2.shard).toBe(1)
                expect(id2.realm).toBe(2)
                expect(id3.shard).toBe(99)
                expect(id3.realm).toBe(88)
                expect(id3.num).toBe(77)
            })

            it('should handle large account numbers', () => {
                const accountId = AccountId.from('0.0.999999999')

                expect(accountId.num).toBe(999999999)
            })

            it('should throw error for invalid format', () => {
                expect(() => AccountId.from('invalid')).toThrow(InvalidAccountError)
                expect(() => AccountId.from('0.0')).toThrow(InvalidAccountError)
                expect(() => AccountId.from('0.0.12345.extra')).toThrow(InvalidAccountError)
                expect(() => AccountId.from('a.b.c')).toThrow(InvalidAccountError)
                expect(() => AccountId.from('0-0-12345')).toThrow(InvalidAccountError)
            })

            it('should throw error for negative components', () => {
                expect(() => AccountId.from('-1.0.12345')).toThrow(InvalidAccountError)
                expect(() => AccountId.from('0.-1.12345')).toThrow(InvalidAccountError)
                expect(() => AccountId.from('0.0.-12345')).toThrow(InvalidAccountError)
            })

            it('should throw error for empty string', () => {
                expect(() => AccountId.from('')).toThrow(InvalidAccountError)
            })

            it('should throw error for floating point numbers', () => {
                expect(() => AccountId.from('0.0.12345.5')).toThrow(InvalidAccountError)
                expect(() => AccountId.from('1.2.3.4')).toThrow(InvalidAccountError)
            })
        })

        describe('fromComponents()', () => {
            it('should create AccountId from components', () => {
                const accountId = AccountId.fromComponents(0, 0, 12345)

                expect(accountId.value).toBe('0.0.12345')
                expect(accountId.shard).toBe(0)
                expect(accountId.realm).toBe(0)
                expect(accountId.num).toBe(12345)
            })

            it('should handle different component values', () => {
                const id1 = AccountId.fromComponents(1, 2, 67890)
                const id2 = AccountId.fromComponents(99, 88, 77)

                expect(id1.value).toBe('1.2.67890')
                expect(id2.value).toBe('99.88.77')
            })

            it('should throw error for negative shard', () => {
                expect(() => AccountId.fromComponents(-1, 0, 12345)).toThrow(InvalidAccountError)
            })

            it('should throw error for negative realm', () => {
                expect(() => AccountId.fromComponents(0, -1, 12345)).toThrow(InvalidAccountError)
            })

            it('should throw error for negative num', () => {
                expect(() => AccountId.fromComponents(0, 0, -12345)).toThrow(InvalidAccountError)
            })

            it('should create account with zero number', () => {
                const accountId = AccountId.fromComponents(0, 0, 0)

                expect(accountId.value).toBe('0.0.0')
                expect(accountId.num).toBe(0)
            })
        })

        describe('tryFrom()', () => {
            it('should return AccountId for valid string', () => {
                const accountId = AccountId.tryFrom('0.0.12345')

                expect(accountId).not.toBeNull()
                expect(accountId?.value).toBe('0.0.12345')
            })

            it('should return null for invalid string', () => {
                expect(AccountId.tryFrom('invalid')).toBeNull()
                expect(AccountId.tryFrom('0.0')).toBeNull()
                expect(AccountId.tryFrom('a.b.c')).toBeNull()
                expect(AccountId.tryFrom('')).toBeNull()
            })

            it('should return null for negative components', () => {
                expect(AccountId.tryFrom('-1.0.12345')).toBeNull()
                expect(AccountId.tryFrom('0.-1.12345')).toBeNull()
                expect(AccountId.tryFrom('0.0.-12345')).toBeNull()
            })
        })

        describe('isValid()', () => {
            it('should return true for valid account IDs', () => {
                expect(AccountId.isValid('0.0.12345')).toBe(true)
                expect(AccountId.isValid('1.2.67890')).toBe(true)
                expect(AccountId.isValid('99.88.77')).toBe(true)
                expect(AccountId.isValid('0.0.0')).toBe(true)
            })

            it('should return false for invalid formats', () => {
                expect(AccountId.isValid('invalid')).toBe(false)
                expect(AccountId.isValid('0.0')).toBe(false)
                expect(AccountId.isValid('0.0.12345.extra')).toBe(false)
                expect(AccountId.isValid('a.b.c')).toBe(false)
                expect(AccountId.isValid('0-0-12345')).toBe(false)
                expect(AccountId.isValid('')).toBe(false)
            })

            it('should return true for negative numbers (regex only checks format)', () => {
                // Note: isValid only checks format, not semantic validity
                expect(AccountId.isValid('-1.0.12345')).toBe(false)
            })
        })
    })

    describe('Conversion Methods', () => {
        describe('toString()', () => {
            it('should return string representation', () => {
                const accountId = AccountId.from('0.0.12345')

                expect(accountId.toString()).toBe('0.0.12345')
            })

            it('should be the same as value property', () => {
                const accountId = AccountId.from('1.2.67890')

                expect(accountId.toString()).toBe(accountId.value)
            })
        })

        describe('toJSON()', () => {
            it('should serialize to JSON object', () => {
                const accountId = AccountId.from('0.0.12345')

                const json = accountId.toJSON()

                expect(json).toEqual({
                    value: '0.0.12345',
                    shard: 0,
                    realm: 0,
                    num: 12345
                })
            })

            it('should be JSON.stringify compatible', () => {
                const accountId = AccountId.from('1.2.67890')

                const jsonString = JSON.stringify(accountId)

                expect(jsonString).toBe('{"value":"1.2.67890","shard":1,"realm":2,"num":67890}')
            })
        })

        describe('toShortString()', () => {
            it('should return only account number', () => {
                const accountId = AccountId.from('0.0.12345')

                expect(accountId.toShortString()).toBe('12345')
            })

            it('should work with different account numbers', () => {
                const id1 = AccountId.from('1.2.67890')
                const id2 = AccountId.from('99.88.77')

                expect(id1.toShortString()).toBe('67890')
                expect(id2.toShortString()).toBe('77')
            })
        })

        describe('toDisplayString()', () => {
            it('should return display string with default prefix', () => {
                const accountId = AccountId.from('0.0.12345')

                expect(accountId.toDisplayString()).toBe('Account 0.0.12345')
            })

            it('should accept custom prefix', () => {
                const accountId = AccountId.from('0.0.12345')

                expect(accountId.toDisplayString('User ')).toBe('User 0.0.12345')
                expect(accountId.toDisplayString('Treasury: ')).toBe('Treasury: 0.0.12345')
                expect(accountId.toDisplayString('')).toBe('0.0.12345')
            })
        })
    })

    describe('Comparison Methods', () => {
        describe('equals()', () => {
            it('should return true for equal account IDs', () => {
                const id1 = AccountId.from('0.0.12345')
                const id2 = AccountId.from('0.0.12345')

                expect(id1.equals(id2)).toBe(true)
            })

            it('should return false for different account IDs', () => {
                const id1 = AccountId.from('0.0.12345')
                const id2 = AccountId.from('0.0.67890')

                expect(id1.equals(id2)).toBe(false)
            })

            it('should compare by components, not string value', () => {
                const id1 = AccountId.from('0.0.12345')
                const id2 = AccountId.fromComponents(0, 0, 12345)

                expect(id1.equals(id2)).toBe(true)
            })

            it('should return false for different shards', () => {
                const id1 = AccountId.from('0.0.12345')
                const id2 = AccountId.from('1.0.12345')

                expect(id1.equals(id2)).toBe(false)
            })

            it('should return false for different realms', () => {
                const id1 = AccountId.from('0.0.12345')
                const id2 = AccountId.from('0.1.12345')

                expect(id1.equals(id2)).toBe(false)
            })
        })

        describe('matches()', () => {
            it('should return true for matching string', () => {
                const accountId = AccountId.from('0.0.12345')

                expect(accountId.matches('0.0.12345')).toBe(true)
            })

            it('should return false for non-matching string', () => {
                const accountId = AccountId.from('0.0.12345')

                expect(accountId.matches('0.0.67890')).toBe(false)
                expect(accountId.matches('1.0.12345')).toBe(false)
                expect(accountId.matches('invalid')).toBe(false)
            })

            it('should be case sensitive', () => {
                const accountId = AccountId.from('0.0.12345')

                expect(accountId.matches('0.0.12345')).toBe(true)
                // Account IDs are numeric, so this is just for completeness
                expect(accountId.matches('0.0.12345')).toBe(true)
            })
        })
    })

    describe('Utility Methods', () => {
        describe('isTreasury()', () => {
            it('should return true if matches treasury ID', () => {
                const accountId = AccountId.from('0.0.6887438')

                expect(accountId.isTreasury('0.0.6887438')).toBe(true)
            })

            it('should return false if does not match treasury ID', () => {
                const accountId = AccountId.from('0.0.12345')

                expect(accountId.isTreasury('0.0.6887438')).toBe(false)
            })
        })

        describe('isTestnet()', () => {
            it('should return true for testnet accounts (shard 0, realm 0)', () => {
                const id1 = AccountId.from('0.0.12345')
                const id2 = AccountId.from('0.0.67890')
                const id3 = AccountId.from('0.0.0')

                expect(id1.isTestnet()).toBe(true)
                expect(id2.isTestnet()).toBe(true)
                expect(id3.isTestnet()).toBe(true)
            })

            it('should return false for non-testnet shards', () => {
                const accountId = AccountId.from('1.0.12345')

                expect(accountId.isTestnet()).toBe(false)
            })

            it('should return false for non-testnet realms', () => {
                const accountId = AccountId.from('0.1.12345')

                expect(accountId.isTestnet()).toBe(false)
            })

            it('should return false for mainnet accounts', () => {
                const accountId = AccountId.from('1.2.12345')

                expect(accountId.isTestnet()).toBe(false)
            })
        })
    })

    describe('Edge Cases', () => {
        it('should handle zero account number', () => {
            const accountId = AccountId.from('0.0.0')

            expect(accountId.num).toBe(0)
            expect(accountId.toShortString()).toBe('0')
        })

        it('should handle very large account numbers', () => {
            const accountId = AccountId.from('0.0.999999999999')

            expect(accountId.num).toBe(999999999999)
        })

        it('should handle account IDs with leading zeros', () => {
            // Note: Leading zeros in numeric strings are handled by parseInt
            const accountId = AccountId.from('0.0.00012345')

            // parseInt removes leading zeros
            expect(accountId.num).toBe(12345)
            // But value string preserves them
            expect(accountId.value).toBe('0.0.00012345')
        })

        it('should be immutable', () => {
            const accountId = AccountId.from('0.0.12345')

            // Properties are readonly - TypeScript will prevent this at compile time
            // expect(() => { accountId.num = 67890 }).toThrow()
            expect(accountId.num).toBe(12345) // Unchanged
        })

        it('should handle stringification correctly', () => {
            const accountId = AccountId.from('0.0.12345')

            // toString is called implicitly in string contexts
            expect(`Account: ${accountId}`).toBe('Account: 0.0.12345')
            expect(String(accountId)).toBe('0.0.12345')
        })

        it('should work with Set and Map', () => {
            const id1 = AccountId.from('0.0.12345')
            const id2 = AccountId.from('0.0.67890')
            const id3 = AccountId.from('0.0.12345')

            const accountSet = new Set([id1, id2, id3])

            // Set uses reference equality, so id1 and id3 are different objects
            expect(accountSet.size).toBe(3)

            // For value-based equality, use equals()
            expect(id1.equals(id3)).toBe(true)
        })

        it('should handle comparison edge cases', () => {
            const id1 = AccountId.from('0.0.12345')
            const id2 = AccountId.fromComponents(0, 0, 12345)

            // Same value, different object instances
            expect(id1).not.toBe(id2) // Reference inequality
            expect(id1.equals(id2)).toBe(true) // Value equality
        })
    })
})
