/**
 * Hedera Service Interface
 *
 * Defines the contract for interacting with Hedera Hashgraph network.
 * Handles blockchain operations, transactions, and queries.
 */

import { Client } from '@hashgraph/sdk'

export interface IHederaService {
    /**
     * Get the configured Hedera client instance
     */
    getClient(): Client

    /**
     * Close the Hedera client connection
     */
    close(): void

    /**
     * Check account balance for a specific token
     * @param accountId - Hedera account ID
     * @param tokenId - Token ID to check balance for
     */
    checkBalance(accountId: string, tokenId: string): Promise<number>

    /**
     * Get all token balances for an account
     * @param accountId - Hedera account ID
     */
    getAccountBalances(accountId: string): Promise<Record<string, number>>

    /**
     * Schedule a deposit transaction
     */
    scheduleDeposit(
        userAccountId: string,
        amountUsdc: number,
        husdAmount: number,
        rateSequenceNumber: string
    ): Promise<{
        scheduleId: string
        transactionBytes: Uint8Array
    }>

    /**
     * Execute a scheduled deposit after user signature
     */
    executeScheduledDeposit(
        scheduleId: string,
        userSignature: Uint8Array
    ): Promise<string>

    /**
     * Schedule a withdrawal transaction
     */
    scheduleWithdraw(
        userAccountId: string,
        amountHusd: number,
        amountUsdc: number
    ): Promise<{
        scheduleId: string
        transactionBytes: Uint8Array
    }>

    /**
     * Execute instant withdrawal
     */
    executeInstantWithdraw(
        userAccountId: string,
        amountHusd: number,
        amountUsdc: number,
        feeAmount: number
    ): Promise<string>

    /**
     * Publish exchange rate to Hedera
     */
    publishRate(rate: number, sequenceNumber: string): Promise<string>

    /**
     * Get current exchange rate from Hedera
     */
    getCurrentRate(): Promise<{
        rate: number
        sequenceNumber: string
        timestamp: Date
    } | null>

    /**
     * Verify transaction on mirror node
     */
    verifyTransaction(transactionId: string): Promise<boolean>

    /**
     * Get transaction history for an account
     */
    getTransactionHistory(
        accountId: string,
        limit?: number
    ): Promise<Array<{
        transactionId: string
        timestamp: Date
        type: string
        amount: number
    }>>
}
