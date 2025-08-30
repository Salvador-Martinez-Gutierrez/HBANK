import { Client } from '@hashgraph/sdk'
import axios from 'axios'

// Definir interfaces para los tipos
interface MirrorNodeMessage {
    sequence_number: number;
    consensus_timestamp: string;
    message: string;
}

interface MirrorNodeResponse {
    messages?: MirrorNodeMessage[];
}

interface RateData {
    rate: number;
    totalUsd: number;
    husdSupply: number;
    timestamp: string;
    operator?: string;
}

interface LatestRateResult {
    rate: number;
    timestamp: string;
    sequenceNumber: number;
    raw: RateData;
}

// Agregar interfaz para RateMessage al inicio del archivo
interface RateMessage {
    rate: number;
    timestamp: string;
    sequenceNumber: string;
    raw: unknown;
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

    async getLatestRate(): Promise<LatestRateResult | null> {
        try {
            const url = `${this.mirrorNodeUrl}/api/v1/topics/${this.topicId}/messages?order=desc&limit=10`

            const headers: Record<string, string> = {}
            if (process.env.MIRROR_NODE_API_KEY) {
                headers['x-api-key'] = process.env.MIRROR_NODE_API_KEY
            }

            const response = await axios.get<MirrorNodeResponse>(url, { headers })

            if (!response.data.messages || response.data.messages.length === 0) {
                return null
            }

            for (const msg of response.data.messages) {
                try {
                    const decoded = Buffer.from(msg.message, 'base64').toString('utf-8')
                    const data = JSON.parse(decoded) as RateData

                    if (data.rate && typeof data.rate === 'number') {
                        return {
                            rate: data.rate,
                            timestamp: msg.consensus_timestamp,
                            sequenceNumber: msg.sequence_number,
                            raw: data
                        }
                    }
                } catch {
                    continue
                }
            }

            return null
        } catch (error) {
            console.error('Error fetching latest rate:', error)
            return null
        }
    }

    // Método alternativo para obtener todos los rates recientes
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
    async debugTopicMessages(): Promise<Array<{
        sequence_number: number;
        consensus_timestamp: string;
        raw_base64: string;
        decoded: RateData | string;
    }>> {
        try {
            const url = `${this.mirrorNodeUrl}/api/v1/topics/${this.topicId}/messages?order=desc&limit=5`

            const headers: Record<string, string> = {}
            if (process.env.MIRROR_NODE_API_KEY) {
                headers['x-api-key'] = process.env.MIRROR_NODE_API_KEY
            }

            const response = await axios.get<MirrorNodeResponse>(url, { headers })

            if (!response.data.messages) {
                return []
            }

            return response.data.messages.map((msg) => {
                let decoded: RateData | string = 'Error decoding'
                try {
                    const decodedString = Buffer.from(msg.message, 'base64').toString('utf-8')
                    decoded = JSON.parse(decodedString) as RateData
                } catch (e) {
                    decoded = 'Error decoding: ' + (e instanceof Error ? e.message : String(e))
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
