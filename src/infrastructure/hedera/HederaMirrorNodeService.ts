/**
 * Hedera Mirror Node Service
 *
 * Handles verification and queries to Hedera Mirror Node.
 * Provides transaction verification and schedule checking functionality.
 */

import { injectable } from 'inversify'
import { createScopedLogger } from '@/lib/logger'

const logger = createScopedLogger('hedera-mirror-node')

/**
 * Mirror Node transaction data
 */
interface MirrorNodeTransaction {
    result: string
    consensus_timestamp: string
    token_transfers?: unknown[]
}

/**
 * Mirror Node schedule data
 */
interface MirrorNodeSchedule {
    executed_timestamp: string | null
    deleted: boolean
}

/**
 * Hedera Mirror Node Service
 *
 * Provides methods for querying and verifying transactions on Hedera Mirror Node.
 */
@injectable()
export class HederaMirrorNodeService {
    private readonly mirrorNodeUrl: string
    private readonly husdTokenId: string

    constructor() {
        this.mirrorNodeUrl =
            process.env.TESTNET_MIRROR_NODE_ENDPOINT ?? 'https://testnet.mirrornode.hedera.com'

        const husdTokenId = process.env.HUSD_TOKEN_ID
        if (!husdTokenId) {
            throw new Error('Missing required environment variable: HUSD_TOKEN_ID')
        }
        this.husdTokenId = husdTokenId

        logger.info('Mirror Node service initialized', {
            mirrorNodeUrl: this.mirrorNodeUrl,
        })
    }

    /**
     * Check if a transaction exists in Mirror Node
     *
     * @param txId - Transaction ID to check
     * @returns True if transaction exists
     */
    async checkTransactionInMirrorNode(txId: string): Promise<boolean> {
        try {
            logger.debug('Checking transaction in Mirror Node', { txId })

            const response = await fetch(`${this.mirrorNodeUrl}/api/v1/transactions/${txId}`)

            if (response.ok) {
                const txData = (await response.json()) as MirrorNodeTransaction

                logger.info('Transaction found in Mirror Node', {
                    txId,
                    status: txData.result,
                    timestamp: txData.consensus_timestamp,
                    transfers: txData.token_transfers?.length ?? 0,
                })

                return true
            } else {
                logger.info('Transaction not found in Mirror Node', {
                    txId,
                    status: response.status,
                })

                return false
            }
        } catch (error) {
            logger.error('Error checking transaction in Mirror Node', {
                error,
                txId,
            })

            return false
        }
    }

    /**
     * Verify if a scheduled transaction has been executed
     *
     * @param scheduleId - Schedule ID to verify
     * @returns True if schedule has been executed
     */
    async verifyScheduleTransactionExecuted(scheduleId: string): Promise<boolean> {
        try {
            logger.info('Verifying schedule transaction', { scheduleId })

            const response = await fetch(`${this.mirrorNodeUrl}/api/v1/schedules/${scheduleId}`)

            if (!response.ok) {
                logger.info('Schedule not found in Mirror Node', {
                    scheduleId,
                    status: response.status,
                })

                return false
            }

            const scheduleData = (await response.json()) as MirrorNodeSchedule

            const isExecuted = scheduleData.executed_timestamp !== null

            logger.info('Schedule status retrieved', {
                scheduleId,
                executed: isExecuted,
                executed_timestamp: scheduleData.executed_timestamp,
                deleted: scheduleData.deleted,
            })

            return isExecuted
        } catch (error) {
            logger.error('Error verifying schedule transaction', {
                error,
                scheduleId,
            })

            return false
        }
    }

    /**
     * Verify HUSD transfer from user to treasury
     *
     * Implements retry logic to account for Mirror Node synchronization delays.
     *
     * @param userAccountId - User's account ID
     * @param treasuryId - Treasury account ID
     * @param expectedAmount - Expected HUSD amount
     * @param since - ISO timestamp to search from
     * @returns True if transfer is verified
     */
    async verifyHUSDTransfer(
        userAccountId: string,
        treasuryId: string,
        expectedAmount: number,
        since: string
    ): Promise<boolean> {
        try {
            logger.info('Verifying HUSD transfer', {
                userAccountId,
                treasuryId,
                expectedAmount,
                since,
                husdTokenId: this.husdTokenId,
            })

            // Add buffer time to account for clock differences
            const sinceWithBuffer = new Date(new Date(since).getTime() - 60000).toISOString()

            logger.debug('Using buffered timestamp', {
                original: since,
                buffered: sinceWithBuffer,
            })

            // Retry logic for Mirror Node synchronization
            const maxRetries = 8
            const retryDelays = [500, 1000, 2000, 3000, 5000, 8000, 12000, 15000]

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                logger.debug('Verification attempt', {
                    attempt,
                    maxRetries,
                })

                const verified = await this.performHUSDTransferCheck(
                    userAccountId,
                    treasuryId,
                    expectedAmount,
                    sinceWithBuffer,
                    attempt
                )

                if (verified) {
                    logger.info('HUSD transfer verified', {
                        attempt,
                        userAccountId,
                        treasuryId,
                        amount: expectedAmount,
                    })

                    return true
                }

                // Wait before retrying (except on last attempt)
                if (attempt < maxRetries) {
                    const delay = retryDelays[attempt - 1]

                    logger.debug('Waiting before retry', {
                        delay,
                        reason: 'Mirror Node synchronization',
                    })

                    await new Promise((resolve) => setTimeout(resolve, delay))
                }
            }

            logger.warn('HUSD transfer verification failed after retries', {
                maxRetries,
                userAccountId,
                treasuryId,
                expectedAmount,
                suggestion: `Check Hedera Explorer for account ${userAccountId}`,
            })

            return false
        } catch (error) {
            logger.error('Error verifying HUSD transfer', {
                error,
                userAccountId,
                treasuryId,
                expectedAmount,
            })

            return false
        }
    }

    /**
     * Perform a single HUSD transfer verification check
     *
     * @param userAccountId - User's account ID
     * @param treasuryId - Treasury account ID
     * @param expectedAmount - Expected HUSD amount
     * @param since - ISO timestamp
     * @param attempt - Current attempt number
     * @returns True if transfer is found
     */
    private async performHUSDTransferCheck(
        userAccountId: string,
        treasuryId: string,
        expectedAmount: number,
        since: string,
        attempt: number
    ): Promise<boolean> {
        const sinceTimestamp = new Date(since).getTime() / 1000

        const queryUrl =
            `${this.mirrorNodeUrl}/api/v1/transactions?` +
            `account.id=${userAccountId}&` +
            `timestamp=gte:${sinceTimestamp}&` +
            `transactiontype=cryptotransfer&` +
            `order=desc&` +
            `limit=100`

        logger.debug('Querying Mirror Node for transfers', {
            attempt,
            queryUrl,
        })

        try {
            const response = await fetch(queryUrl)

            if (!response.ok) {
                logger.warn('Mirror Node query failed', {
                    status: response.status,
                    attempt,
                })

                return false
            }

            const data = (await response.json()) as {
                transactions: Array<{
                    token_transfers?: Array<{
                        token_id: string
                        account: string
                        amount: number
                    }>
                }>
            }

            logger.debug('Mirror Node response received', {
                transactionCount: data.transactions?.length ?? 0,
                attempt,
            })

            // Search for the expected transfer
            for (const tx of data.transactions || []) {
                if (!tx.token_transfers) continue

                // Look for HUSD token transfers
                const husdTransfers = tx.token_transfers.filter(
                    (transfer) => transfer.token_id === this.husdTokenId
                )

                // Check if we find the expected transfer
                for (const transfer of husdTransfers) {
                    const isFromUser = transfer.account === userAccountId && transfer.amount < 0
                    const amountMatches = Math.abs(transfer.amount) === expectedAmount

                    if (isFromUser && amountMatches) {
                        logger.info('Matching transfer found', {
                            tokenId: transfer.token_id,
                            from: transfer.account,
                            amount: transfer.amount,
                            expected: expectedAmount,
                        })

                        return true
                    }
                }
            }

            logger.debug('No matching transfer found in this batch', {
                attempt,
            })

            return false
        } catch (error) {
            logger.error('Error performing HUSD transfer check', {
                error,
                attempt,
            })

            return false
        }
    }

    /**
     * Get the configured Mirror Node URL
     */
    getMirrorNodeUrl(): string {
        return this.mirrorNodeUrl
    }

    /**
     * Get the configured HUSD token ID
     */
    getHusdTokenId(): string {
        return this.husdTokenId
    }
}
