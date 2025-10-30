/**
 * Hedera Rate Service
 *
 * Manages fetching and parsing of USDC/hUSD exchange rates from the Hedera Consensus Service (HCS) topic.
 * Rates are published to an HCS topic and retrieved via the Hedera Mirror Node API.
 * Supports multiple rate field names for backward compatibility (rate, valor, value).
 */

import { Client } from '@hashgraph/sdk'
import axios from 'axios'
import { createScopedLogger } from '@/lib/logger'
import { serverEnv } from '@/config/serverEnv'

const logger = createScopedLogger('service:hederaRateService')

/**
 * Rate message structure from HCS topic
 */
export interface RateMessage {
    rate: number
    timestamp: string
    sequenceNumber: string
    raw: unknown
}

export class HederaRateService {
    private client: Client
    private topicId: string
    private mirrorNodeUrl: string

    constructor() {
        this.client = serverEnv.hedera.network === 'mainnet'
            ? Client.forMainnet()
            : Client.forTestnet()

        if (!serverEnv.operators.ratePublisher) {
            throw new Error('Rate publisher credentials not configured')
        }

        this.client.setOperator(
            serverEnv.operators.ratePublisher.accountId,
            serverEnv.operators.ratePublisher.privateKey
        )

        if (!serverEnv.topics.main) {
            throw new Error('Topic ID not configured')
        }

        this.topicId = serverEnv.topics.main
        this.mirrorNodeUrl = serverEnv.hedera.mirrorNodeUrl
    }

    /**
     * Get the latest exchange rate from the HCS topic
     *
     * Fetches the most recent rate message published to the HCS topic via the Mirror Node API.
     * Searches through the last 10 messages to find the first valid rate.
     * Supports multiple field names (rate, valor, value) for backward compatibility.
     *
     * @returns The latest rate message with rate, timestamp, and sequence number, or null if no valid rate found
     * @throws {Error} If the Mirror Node API request fails
     *
     * @example
     * ```typescript
     * const rateService = new HederaRateService()
     * const latestRate = await rateService.getLatestRate()
     * if (latestRate) {
     *   console.log(`Current rate: ${latestRate.rate}`)
     *   console.log(`Sequence: ${latestRate.sequenceNumber}`)
     * }
     * ```
     */
    async getLatestRate(): Promise<RateMessage | null> {
        try {
            // Use Mirror Node API to get topic messages
            const url = `${this.mirrorNodeUrl}/api/v1/topics/${this.topicId}/messages?order=desc&limit=10`

            const headers: Record<string, string> = {}
            if (serverEnv.hedera.mirrorNodeApiKey) {
                headers['x-api-key'] = serverEnv.hedera.mirrorNodeApiKey
            }

            const response = await axios.get(url, { headers })

            if (!response.data.messages || response.data.messages.length === 0) {
                logger.info('No messages found in topic:', this.topicId)
                return null
            }

            // Process messages to find the latest valid rate
            for (const message of response.data.messages) {
                try {
                    // Decode the message from base64
                    const decodedMessage = Buffer.from(
                        message.message,
                        'base64'
                    ).toString('utf-8')
                    const parsedMessage = JSON.parse(decodedMessage)

                    // Look for the rate field in the message
                    const rate =
                        parsedMessage.rate ??
                        parsedMessage.valor ??
                        parsedMessage.value

                    if (rate !== undefined && rate !== null) {
                        return {
                            rate: typeof rate === 'number' ? rate : parseFloat(rate),
                            timestamp: message.consensus_timestamp,
                            sequenceNumber: message.sequence_number.toString(),
                            raw: parsedMessage,
                        }
                    }
                } catch (e) {
                    logger.error('Error parsing message:', e)
                    // Try with the next message
                }
            }

            logger.info('No valid rate messages found in the retrieved messages')
            return null
        } catch (error) {
            logger.error('Error in getLatestRate:', error)
            if (axios.isAxiosError(error)) {
                logger.error('API Response:', error.response?.data)
                logger.error('API Status:', error.response?.status)
            }
            throw error
        }
    }

    /**
     * Get multiple recent exchange rates from the HCS topic
     *
     * Fetches recent rate messages published to the HCS topic for historical analysis or validation.
     * Returns up to the specified limit of valid rates found in the topic.
     *
     * @param limit - Maximum number of rate messages to retrieve (default: 10)
     * @returns Array of rate messages ordered by recency (newest first)
     *
     * @example
     * ```typescript
     * const rateService = new HederaRateService()
     * const recentRates = await rateService.getRecentRates(5)
     * recentRates.forEach(rate => {
     *   console.log(`${rate.timestamp}: ${rate.rate}`)
     * })
     * ```
     */
    async getRecentRates(limit: number = 10): Promise<RateMessage[]> {
        try {
            const url = `${this.mirrorNodeUrl}/api/v1/topics/${this.topicId}/messages?order=desc&limit=${limit}`

            const headers: Record<string, string> = {}
            if (serverEnv.hedera.mirrorNodeApiKey) {
                headers['x-api-key'] = serverEnv.hedera.mirrorNodeApiKey
            }

            const response = await axios.get(url, { headers })

            if (!response.data.messages || response.data.messages.length === 0) {
                return []
            }

            const rates: RateMessage[] = []

            for (const message of response.data.messages) {
                try {
                    const decodedMessage = Buffer.from(
                        message.message,
                        'base64'
                    ).toString('utf-8')
                    const parsedMessage = JSON.parse(decodedMessage)

                    const rate =
                        parsedMessage.rate ??
                        parsedMessage.valor ??
                        parsedMessage.value

                    if (rate !== undefined && rate !== null) {
                        rates.push({
                            rate: typeof rate === 'number' ? rate : parseFloat(rate),
                            timestamp: message.consensus_timestamp,
                            sequenceNumber: message.sequence_number.toString(),
                            raw: parsedMessage,
                        })
                    }
                } catch (e) {
                    logger.error('Error parsing message:', e)
                }
            }

            return rates
        } catch (error) {
            logger.error('Error in getRecentRates:', error)
            return []
        }
    }

    /**
     * Debug utility to inspect raw HCS topic messages
     *
     * Fetches and decodes recent messages from the HCS topic for debugging purposes.
     * Shows both the raw base64 message and the decoded JSON structure.
     * Useful for troubleshooting rate message format issues.
     *
     * @returns Array of decoded messages with metadata including sequence number and timestamp
     *
     * @example
     * ```typescript
     * const rateService = new HederaRateService()
     * const debugMessages = await rateService.debugTopicMessages()
     * console.log('Recent messages:', JSON.stringify(debugMessages, null, 2))
     * ```
     */
    async debugTopicMessages(): Promise<unknown[]> {
        try {
            const url = `${this.mirrorNodeUrl}/api/v1/topics/${this.topicId}/messages?order=desc&limit=5`

            const headers: Record<string, string> = {}
            if (serverEnv.hedera.mirrorNodeApiKey) {
                headers['x-api-key'] = serverEnv.hedera.mirrorNodeApiKey
            }

            const response = await axios.get(url, { headers })

            if (!response.data.messages) {
                return []
            }

            return response.data.messages.map((msg: { sequence_number: string; consensus_timestamp: string; message: string }) => {
                let decoded: unknown = null
                try {
                    const decodedString = Buffer.from(msg.message, 'base64').toString('utf-8')
                    decoded = JSON.parse(decodedString)
                } catch (e) {
                    decoded = 'Error decoding: ' + e
                }

                return {
                    sequence_number: msg.sequence_number,
                    consensus_timestamp: msg.consensus_timestamp,
                    raw_base64: msg.message,
                    decoded: decoded,
                }
            })
        } catch (error) {
            logger.error('Error in debugTopicMessages:', error)
            return []
        }
    }
}
