/**
 * Hedera Withdrawal Service
 *
 * Handles withdrawal operations including USDC transfers to users,
 * HUSD rollbacks, and publishing withdrawal requests/results to HCS.
 */

import { injectable, inject } from 'inversify'
import { TransferTransaction, TopicMessageSubmitTransaction, TokenId, AccountId, TopicId } from '@hashgraph/sdk'
import { TYPES } from '@/core/di/types'
import { HederaClientFactory } from './HederaClientFactory'
import { WithdrawRequest, WithdrawResult } from '@/types/withdrawal'
import { createScopedLogger } from '@/lib/logger'
import { serverEnv } from '@/config/serverEnv'

const logger = createScopedLogger('hedera-withdrawal')

/**
 * Hedera Withdrawal Service
 *
 * Provides methods for executing withdrawals including:
 * - USDC transfers from withdrawal wallet to users
 * - HUSD rollbacks when withdrawals fail
 * - Publishing withdrawal requests and results to HCS
 */
@injectable()
export class HederaWithdrawalService {
    constructor(
        @inject(TYPES.HederaClientFactory) private clientFactory: HederaClientFactory
    ) {
        logger.info('Withdrawal service initialized')
    }

    /**
     * Execute USDC transfer from standard withdrawal wallet to user
     *
     * Transfers USDC from the protocol's standard withdrawal wallet to the user's account.
     * This is used for completing standard (48h delay) withdrawal requests.
     *
     * @param user - User's Hedera account ID
     * @param amountUSDC - Amount of USDC to transfer
     * @returns Transaction ID of the completed transfer
     *
     * @throws Error if USDC token ID is not configured
     * @throws Error if user parameter is invalid
     * @throws Error if transfer fails
     *
     * @example
     * ```typescript
     * const txId = await withdrawalService.transferUSDCToUser('0.0.12345', 100)
     * console.log(`USDC transferred: ${txId}`)
     * ```
     */
    async transferUSDCToUser(user: string, amountUSDC: number): Promise<string> {
        try {
            const standardWithdrawWallet = this.clientFactory.getWalletCredentials('standard-withdraw')
            const usdcTokenId = serverEnv.tokens.usdc.tokenId

            if (!usdcTokenId) {
                throw new Error('Missing required token ID')
            }

            // Validate user parameter
            if (!user || typeof user !== 'string') {
                throw new Error(`Invalid user parameter: ${user} (type: ${typeof user})`)
            }

            logger.info('Transferring USDC to user', {
                user,
                standardWithdrawWallet: standardWithdrawWallet.id,
                amount: amountUSDC,
            })

            // Create client with standard withdrawal wallet credentials
            const standardWithdrawClient = this.clientFactory.createClientForWallet(
                standardWithdrawWallet.id,
                standardWithdrawWallet.key
            )

            // Create the transfer transaction
            const transferTx = new TransferTransaction()
                .addTokenTransfer(
                    TokenId.fromString(usdcTokenId),
                    AccountId.fromString(standardWithdrawWallet.id),
                    -Math.floor(amountUSDC * this.clientFactory.USDC_MULTIPLIER) // Negative = outgoing
                )
                .addTokenTransfer(
                    TokenId.fromString(usdcTokenId),
                    AccountId.fromString(user),
                    Math.floor(amountUSDC * this.clientFactory.USDC_MULTIPLIER) // Positive = incoming
                )

            const transferResponse = await transferTx.execute(standardWithdrawClient)
            const receipt = await transferResponse.getReceipt(standardWithdrawClient)

            if (receipt.status.toString() !== 'SUCCESS') {
                throw new Error(`Transfer failed with status: ${receipt.status}`)
            }

            logger.info('USDC transferred to user successfully', {
                transactionId: transferResponse.transactionId.toString(),
            })

            return transferResponse.transactionId.toString()
        } catch (error) {
            logger.error('Error transferring USDC to user', { error, user, amountUSDC })
            throw error
        }
    }

    /**
     * Rollback HUSD tokens to user when withdrawal fails
     *
     * Returns HUSD from the treasury back to the user when a withdrawal
     * request fails or is cancelled. This ensures the user doesn't lose
     * their HUSD tokens.
     *
     * @param user - User's Hedera account ID
     * @param amountHUSD - Amount of HUSD to return
     * @returns Transaction ID of the rollback transfer
     *
     * @throws Error if HUSD token ID is not configured
     * @throws Error if user parameter is invalid
     * @throws Error if rollback fails
     *
     * @example
     * ```typescript
     * const txId = await withdrawalService.rollbackHUSDToUser('0.0.12345', 100)
     * console.log(`HUSD returned to user: ${txId}`)
     * ```
     */
    async rollbackHUSDToUser(user: string, amountHUSD: number): Promise<string> {
        try {
            const treasuryWallet = this.clientFactory.getWalletCredentials('treasury')
            const husdTokenId = serverEnv.tokens.husd.tokenId

            if (!husdTokenId) {
                throw new Error('Missing required token ID')
            }

            // Validate user parameter
            if (!user || typeof user !== 'string') {
                throw new Error(`Invalid user parameter: ${user}`)
            }

            logger.info('Rolling back HUSD to user', {
                user,
                treasury: treasuryWallet.id,
                amount: amountHUSD,
            })

            // Create client with treasury wallet credentials
            const treasuryClient = this.clientFactory.createClientForWallet(
                treasuryWallet.id,
                treasuryWallet.key
            )

            // Create the transfer transaction to return HUSD to user
            const transferTx = new TransferTransaction()
                .addTokenTransfer(
                    TokenId.fromString(husdTokenId),
                    AccountId.fromString(treasuryWallet.id),
                    -Math.floor(amountHUSD * this.clientFactory.HUSD_MULTIPLIER) // Negative = outgoing
                )
                .addTokenTransfer(
                    TokenId.fromString(husdTokenId),
                    AccountId.fromString(user),
                    Math.floor(amountHUSD * this.clientFactory.HUSD_MULTIPLIER) // Positive = incoming
                )

            const transferResponse = await transferTx.execute(treasuryClient)
            const receipt = await transferResponse.getReceipt(treasuryClient)

            if (receipt.status.toString() !== 'SUCCESS') {
                throw new Error(`Rollback failed with status: ${receipt.status}`)
            }

            logger.info('HUSD rollback completed successfully', {
                transactionId: transferResponse.transactionId.toString(),
            })

            return transferResponse.transactionId.toString()
        } catch (error) {
            logger.error('Error rolling back HUSD to user', { error, user, amountHUSD })
            throw error
        }
    }

    /**
     * Publish a withdrawal request to Hedera Consensus Service
     *
     * Creates a withdrawal request message and publishes it to the withdrawal topic.
     * The request includes unlock time (48h delay for standard withdrawals).
     *
     * @param requestId - Unique request identifier
     * @param user - User's Hedera account ID
     * @param amountHUSD - Amount of HUSD being withdrawn
     * @param rate - Exchange rate at time of request
     * @param rateSequenceNumber - HCS sequence number of the rate
     * @param scheduleId - Hedera schedule ID for the HUSD transfer
     * @returns Transaction ID of the published message
     *
     * @throws Error if withdrawal topic ID is not configured
     * @throws Error if message publishing fails
     *
     * @example
     * ```typescript
     * const txId = await withdrawalService.publishWithdrawRequest(
     *   'req_123',
     *   '0.0.12345',
     *   100,
     *   1.005,
     *   '12345',
     *   '0.0.67890'
     * )
     * console.log(`Request published: ${txId}`)
     * ```
     */
    async publishWithdrawRequest(
        requestId: string,
        user: string,
        amountHUSD: number,
        rate: number,
        rateSequenceNumber: string,
        scheduleId: string
    ): Promise<string> {
        try {
            const withdrawTopicId = serverEnv.topics.withdraw

            if (!withdrawTopicId) {
                throw new Error('Missing WITHDRAW_TOPIC_ID')
            }

            const message: WithdrawRequest = {
                type: 'withdraw_request',
                requestId,
                user,
                amountHUSD,
                rate,
                rateSequenceNumber,
                scheduleId,
                requestedAt: new Date().toISOString(),
                unlockAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48h from now
                status: 'pending',
            }

            const client = this.clientFactory.createMainClient()

            const response = await new TopicMessageSubmitTransaction()
                .setTopicId(TopicId.fromString(withdrawTopicId))
                .setMessage(JSON.stringify(message))
                .execute(client)

            const receipt = await response.getReceipt(client)

            if (receipt.status.toString() !== 'SUCCESS') {
                throw new Error(`Failed to publish withdrawal request: ${receipt.status}`)
            }

            logger.info('Withdrawal request published to HCS', {
                requestId,
                topic: withdrawTopicId,
                message,
            })

            return response.transactionId.toString()
        } catch (error) {
            logger.error('Error publishing withdrawal request', {
                error,
                requestId,
                user,
                amountHUSD,
            })
            throw error
        }
    }

    /**
     * Publish a withdrawal result to Hedera Consensus Service
     *
     * Publishes the outcome of a withdrawal request (completed or failed)
     * to the withdrawal topic for transparency and auditability.
     *
     * @param requestId - Unique request identifier
     * @param status - Result status ('completed' or 'failed')
     * @param txId - Transaction ID if withdrawal completed successfully
     * @param error - Error message if withdrawal failed
     * @returns Transaction ID of the published message
     *
     * @throws Error if withdrawal topic ID is not configured
     * @throws Error if message publishing fails
     *
     * @example
     * ```typescript
     * // Success case
     * await withdrawalService.publishWithdrawResult('req_123', 'completed', '0.0.12345@1234567890.000')
     *
     * // Failure case
     * await withdrawalService.publishWithdrawResult('req_123', 'failed', undefined, 'Insufficient balance')
     * ```
     */
    async publishWithdrawResult(
        requestId: string,
        status: 'completed' | 'failed',
        txId?: string,
        error?: string
    ): Promise<string> {
        try {
            const withdrawTopicId = serverEnv.topics.withdraw

            if (!withdrawTopicId) {
                throw new Error('Missing WITHDRAW_TOPIC_ID')
            }

            const message: WithdrawResult = {
                type: 'withdraw_result',
                requestId,
                status,
                txId,
                failureReason: error,
                processedAt: new Date().toISOString(),
            }

            const client = this.clientFactory.createMainClient()

            const response = await new TopicMessageSubmitTransaction()
                .setTopicId(TopicId.fromString(withdrawTopicId))
                .setMessage(JSON.stringify(message))
                .execute(client)

            const receipt = await response.getReceipt(client)

            if (receipt.status.toString() !== 'SUCCESS') {
                throw new Error(`Failed to publish withdrawal result: ${receipt.status}`)
            }

            logger.info('Withdrawal result published successfully', {
                requestId,
                status,
            })

            return response.transactionId.toString()
        } catch (error) {
            logger.error('Error publishing withdrawal result', { error, requestId, status })
            throw error
        }
    }

    /**
     * Get the configured withdrawal topic ID
     *
     * @returns Withdrawal topic ID as string
     * @throws Error if withdrawal topic ID is not configured
     */
    getWithdrawalTopicId(): string {
        const withdrawTopicId = serverEnv.topics.withdraw

        if (!withdrawTopicId) {
            throw new Error('Missing WITHDRAW_TOPIC_ID')
        }

        return withdrawTopicId
    }
}
