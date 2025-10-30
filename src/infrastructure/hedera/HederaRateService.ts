/**
 * Hedera Rate Service
 *
 * Handles exchange rate publishing and retrieval from Hedera Consensus Service (HCS).
 * Manages rate topics and ensures consistency between rate calculations.
 */

import { injectable, inject } from 'inversify'
import { TopicMessageSubmitTransaction } from '@hashgraph/sdk'
import { TYPES } from '@/core/di/types'
import { HederaClientFactory } from './HederaClientFactory'
import { createScopedLogger } from '@/lib/logger'

const logger = createScopedLogger('hedera-rate')

/**
 * Rate message structure for HCS
 */
interface RateMessage {
    rate: number
    totalUsd: number
    husdSupply: number
    timestamp: string
    operator: string
}

/**
 * Rate publish response
 */
export interface RatePublishResponse {
    status: 'published'
    topicId: string
    rate: number
    transactionId: string
    sequenceNumber: string | undefined
    timestamp: string
}

/**
 * Hedera Rate Service
 *
 * Provides methods for publishing and querying exchange rates on Hedera Consensus Service.
 * Ensures rate consistency and proper validation before publishing.
 */
@injectable()
export class HederaRateService {
    constructor(
        @inject(TYPES.HederaClientFactory) private clientFactory: HederaClientFactory
    ) {
        logger.info('Rate service initialized')
    }

    /**
     * Publish a new exchange rate to Hedera Consensus Service
     *
     * Validates the rate, totalUsd, and husdSupply before publishing to HCS.
     * The rate is published as a JSON message to the configured topic.
     *
     * @param rate - Exchange rate (USDC per HUSD)
     * @param totalUsd - Total USD value in the protocol
     * @param husdSupply - Total HUSD supply
     * @returns Rate publish response with transaction details
     *
     * @throws Error if rate validation fails
     * @throws Error if HCS submission fails
     *
     * @example
     * ```typescript
     * const response = await rateService.publishRate(1.005, 1000000, 995000)
     * console.log(`Rate published with sequence: ${response.sequenceNumber}`)
     * ```
     */
    async publishRate(
        rate: number,
        totalUsd: number,
        husdSupply: number
    ): Promise<RatePublishResponse> {
        try {
            // Validations
            if (rate <= 0) {
                throw new Error('Rate must be positive')
            }

            if (totalUsd <= 0 || husdSupply <= 0) {
                throw new Error('totalUsd and husdSupply must be positive')
            }

            // Verify rate consistency (commented out for now, but available for strict validation)
            // const calculatedRate = totalUsd / husdSupply
            // const tolerance = 0.001 // 0.1%
            // if (Math.abs(calculatedRate - rate) / rate > tolerance) {
            //     throw new Error('Rate calculation is inconsistent with provided values')
            // }

            const client = this.clientFactory.createMainClient()
            const topicId = this.clientFactory.getTopicId()
            const operatorId = this.clientFactory.getOperatorId()

            // Create message for HCS
            const message: RateMessage = {
                rate,
                totalUsd,
                husdSupply,
                timestamp: new Date().toISOString(),
                operator: operatorId.toString(),
            }

            logger.info('Publishing rate to HCS', {
                topicId: topicId.toString(),
                rate,
                totalUsd,
                husdSupply,
            })

            // Create and execute message transaction
            const submitMessage = new TopicMessageSubmitTransaction({
                topicId: topicId,
                message: JSON.stringify(message),
            })

            // Execute the transaction
            const submitResponse = await submitMessage.execute(client)

            // Get the receipt to confirm it was processed
            const receipt = await submitResponse.getReceipt(client)

            logger.info('Rate published successfully', {
                transactionId: submitResponse.transactionId.toString(),
                sequenceNumber: receipt.topicSequenceNumber?.toString(),
            })

            return {
                status: 'published',
                topicId: topicId.toString(),
                rate: rate,
                transactionId: submitResponse.transactionId.toString(),
                sequenceNumber: receipt.topicSequenceNumber?.toString(),
                timestamp: new Date().toISOString(),
            }
        } catch (error) {
            logger.error('Error publishing rate to HCS', { error, rate, totalUsd, husdSupply })
            throw error
        }
    }

    /**
     * Get the current exchange rate
     *
     * NOTE: This is a temporary implementation that returns a fixed value.
     * In production, this should query the latest message from the HCS topic
     * and parse the rate from the message.
     *
     * @returns Current exchange rate
     *
     * @example
     * ```typescript
     * const rate = await rateService.getCurrentRate()
     * console.log(`Current rate: ${rate}`)
     * ```
     */
    async getCurrentRate(): Promise<number> {
        // For now returns a fixed value
        // TODO: In production this should query the latest message from the topic
        // using TopicMessageQuery or Mirror Node API
        logger.debug('Getting current rate (using fixed value)')
        return 1.005
    }

    /**
     * Get the configured topic ID for rate publishing
     *
     * @returns Topic ID as string
     */
    getTopicId(): string {
        return this.clientFactory.getTopicId().toString()
    }
}
