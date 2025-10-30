/**
 * Hedera Balance Service
 *
 * Handles balance queries for Hedera accounts and tokens.
 */

import { injectable, inject } from 'inversify'
import { AccountBalanceQuery, AccountId, TokenId } from '@hashgraph/sdk'
import { TYPES } from '@/core/di/types'
import { HederaClientFactory } from './HederaClientFactory'
import { createScopedLogger } from '@/lib/logger'

const logger = createScopedLogger('hedera-balance')

/**
 * Hedera Balance Service
 *
 * Provides methods for querying account balances on Hedera network.
 */
@injectable()
export class HederaBalanceService {
    constructor(
        @inject(TYPES.HederaClientFactory) private clientFactory: HederaClientFactory
    ) {}

    /**
     * Check token balance for an account
     *
     * @param accountId - Hedera account ID (e.g., "0.0.123456")
     * @param tokenId - Hedera token ID (e.g., "0.0.654321")
     * @returns Token balance as a decimal number
     *
     * @example
     * ```typescript
     * const balance = await balanceService.checkBalance("0.0.123456", "0.0.456789")
     * console.log(`Balance: ${balance} USDC`)
     * ```
     */
    async checkBalance(accountId: string, tokenId: string): Promise<number> {
        try {
            logger.debug('Checking balance', { accountId, tokenId })

            const client = this.clientFactory.createMainClient()

            const query = new AccountBalanceQuery().setAccountId(
                AccountId.fromString(accountId)
            )

            const balance = await query.execute(client)

            // Get specific token balance
            const tokenBalance = balance.tokens?.get(TokenId.fromString(tokenId))

            if (!tokenBalance) {
                logger.debug('No balance found for token', { accountId, tokenId })
                return 0
            }

            // Convert to decimal using USDC decimals
            const decimalBalance = Number(tokenBalance.toString()) / this.clientFactory.USDC_MULTIPLIER

            logger.debug('Balance retrieved', {
                accountId,
                tokenId,
                balance: decimalBalance,
            })

            // Close client after use
            client.close()

            return decimalBalance
        } catch (error) {
            logger.error('Error checking balance', {
                error,
                accountId,
                tokenId,
            })

            // If there's an error, assume no balance
            return 0
        }
    }

    /**
     * Check HBAR balance for an account
     *
     * @param accountId - Hedera account ID
     * @returns HBAR balance as a decimal number
     */
    async checkHbarBalance(accountId: string): Promise<number> {
        try {
            logger.debug('Checking HBAR balance', { accountId })

            const client = this.clientFactory.createMainClient()

            const query = new AccountBalanceQuery().setAccountId(
                AccountId.fromString(accountId)
            )

            const balance = await query.execute(client)

            // Get HBAR balance
            const hbarBalance = Number(balance.hbars.toString()) / this.clientFactory.HBAR_MULTIPLIER

            logger.debug('HBAR balance retrieved', {
                accountId,
                balance: hbarBalance,
            })

            // Close client after use
            client.close()

            return hbarBalance
        } catch (error) {
            logger.error('Error checking HBAR balance', {
                error,
                accountId,
            })

            return 0
        }
    }

    /**
     * Check multiple token balances for an account
     *
     * @param accountId - Hedera account ID
     * @param tokenIds - Array of token IDs to check
     * @returns Map of token ID to balance
     */
    async checkMultipleBalances(
        accountId: string,
        tokenIds: string[]
    ): Promise<Map<string, number>> {
        const balances = new Map<string, number>()

        try {
            logger.debug('Checking multiple balances', {
                accountId,
                tokenCount: tokenIds.length,
            })

            const client = this.clientFactory.createMainClient()

            const query = new AccountBalanceQuery().setAccountId(
                AccountId.fromString(accountId)
            )

            const balance = await query.execute(client)

            // Get balances for all requested tokens
            for (const tokenId of tokenIds) {
                const tokenBalance = balance.tokens?.get(TokenId.fromString(tokenId))

                if (tokenBalance) {
                    const decimalBalance =
                        Number(tokenBalance.toString()) / this.clientFactory.USDC_MULTIPLIER
                    balances.set(tokenId, decimalBalance)
                } else {
                    balances.set(tokenId, 0)
                }
            }

            logger.debug('Multiple balances retrieved', {
                accountId,
                tokenCount: tokenIds.length,
            })

            // Close client after use
            client.close()

            return balances
        } catch (error) {
            logger.error('Error checking multiple balances', {
                error,
                accountId,
                tokenIds,
            })

            // Return zeros for all tokens on error
            for (const tokenId of tokenIds) {
                balances.set(tokenId, 0)
            }

            return balances
        }
    }
}
