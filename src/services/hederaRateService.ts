import { Client } from '@hashgraph/sdk'
import axios from 'axios'
import { createScopedLogger } from '@/lib/logger'

const logger = createScopedLogger('service:hederaRateService')


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
        this.client = Client.forTestnet()

        if (!process.env.RATE_PUBLISHER_ID || !process.env.RATE_PUBLISHER_KEY) {
            throw new Error('Rate publisher credentials not configured')
        }

        this.client.setOperator(
            process.env.RATE_PUBLISHER_ID,
            process.env.RATE_PUBLISHER_KEY
        )

        if (!process.env.TOPIC_ID) {
            throw new Error('Topic ID not configured')
        }

        this.topicId = process.env.TOPIC_ID
        this.mirrorNodeUrl = 'https://testnet.mirrornode.hedera.com'
    }

    async getLatestRate(): Promise<RateMessage | null> {
        try {
            // Use Mirror Node API to get topic messages
            const url = `${this.mirrorNodeUrl}/api/v1/topics/${this.topicId}/messages?order=desc&limit=10`

            const headers: Record<string, string> = {}
            if (process.env.MIRROR_NODE_API_KEY) {
                headers['x-api-key'] = process.env.MIRROR_NODE_API_KEY
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

    // Alternative method to get all recent rates
    async getRecentRates(limit: number = 10): Promise<RateMessage[]> {
        try {
            const url = `${this.mirrorNodeUrl}/api/v1/topics/${this.topicId}/messages?order=desc&limit=${limit}`

            const headers: Record<string, string> = {}
            if (process.env.MIRROR_NODE_API_KEY) {
                headers['x-api-key'] = process.env.MIRROR_NODE_API_KEY
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

    // Debug method to see raw messages
    async debugTopicMessages(): Promise<unknown[]> {
        try {
            const url = `${this.mirrorNodeUrl}/api/v1/topics/${this.topicId}/messages?order=desc&limit=5`

            const headers: Record<string, string> = {}
            if (process.env.MIRROR_NODE_API_KEY) {
                headers['x-api-key'] = process.env.MIRROR_NODE_API_KEY
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
