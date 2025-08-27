import { Client } from '@hashgraph/sdk'
import axios from 'axios'

export interface RateMessage {
    rate: number
    timestamp: string
    sequenceNumber: string
    raw: any
}

export class HederaRateService {
    private client: Client
    private topicId: string
    private mirrorNodeUrl: string

    constructor() {
        this.client = Client.forTestnet()

        if (!process.env.OPERATOR_ID || !process.env.OPERATOR_KEY) {
            throw new Error('Hedera credentials not configured')
        }

        this.client.setOperator(
            process.env.OPERATOR_ID,
            process.env.OPERATOR_KEY
        )

        if (!process.env.TOPIC_ID) {
            throw new Error('Topic ID not configured')
        }

        this.topicId = process.env.TOPIC_ID
        this.mirrorNodeUrl = 'https://testnet.mirrornode.hedera.com'
    }

    async getLatestRate(): Promise<RateMessage | null> {
        try {
            // Usar Mirror Node API para obtener mensajes del topic
            const url = `${this.mirrorNodeUrl}/api/v1/topics/${this.topicId}/messages?order=desc&limit=10`

            const headers: any = {}
            if (process.env.MIRROR_NODE_API_KEY) {
                headers['x-api-key'] = process.env.MIRROR_NODE_API_KEY
            }

            const response = await axios.get(url, { headers })

            if (!response.data.messages || response.data.messages.length === 0) {
                console.log('No messages found in topic:', this.topicId)
                return null
            }

            // Procesar mensajes para encontrar el último rate válido
            for (const message of response.data.messages) {
                try {
                    // Decodificar el mensaje de base64
                    const decodedMessage = Buffer.from(
                        message.message,
                        'base64'
                    ).toString('utf-8')
                    const parsedMessage = JSON.parse(decodedMessage)

                    // Buscar el campo rate en el mensaje
                    const rate =
                        parsedMessage.rate ||
                        parsedMessage.valor ||
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
                    console.error('Error parsing message:', e)
                    // Intentar con el siguiente mensaje
                }
            }

            console.log('No valid rate messages found in the retrieved messages')
            return null
        } catch (error) {
            console.error('Error in getLatestRate:', error)
            if (axios.isAxiosError(error)) {
                console.error('API Response:', error.response?.data)
                console.error('API Status:', error.response?.status)
            }
            throw error
        }
    }

    // Método alternativo para obtener todos los rates recientes
    async getRecentRates(limit: number = 10): Promise<RateMessage[]> {
        try {
            const url = `${this.mirrorNodeUrl}/api/v1/topics/${this.topicId}/messages?order=desc&limit=${limit}`

            const headers: any = {}
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
                        parsedMessage.rate ||
                        parsedMessage.valor ||
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
                    console.error('Error parsing message:', e)
                }
            }

            return rates
        } catch (error) {
            console.error('Error in getRecentRates:', error)
            return []
        }
    }

    // Método de depuración para ver los mensajes raw
    async debugTopicMessages(): Promise<any[]> {
        try {
            const url = `${this.mirrorNodeUrl}/api/v1/topics/${this.topicId}/messages?order=desc&limit=5`

            const headers: any = {}
            if (process.env.MIRROR_NODE_API_KEY) {
                headers['x-api-key'] = process.env.MIRROR_NODE_API_KEY
            }

            const response = await axios.get(url, { headers })

            if (!response.data.messages) {
                return []
            }

            return response.data.messages.map((msg: any) => {
                let decoded = null
                try {
                    decoded = Buffer.from(msg.message, 'base64').toString('utf-8')
                    decoded = JSON.parse(decoded)
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
            console.error('Error in debugTopicMessages:', error)
            return []
        }
    }
}
