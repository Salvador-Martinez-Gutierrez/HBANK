import { NextApiRequest, NextApiResponse } from 'next'
import { HederaRateService } from '../../src/services/hederaRateService'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const hederaService = new HederaRateService()
        
        // If debug parameter is passed, show raw messages
        if (req.query.debug === 'true') {
            const debugMessages = await hederaService.debugTopicMessages()
            return res.status(200).json({
                success: true,
                debug: true,
                topicId: process.env.TOPIC_ID,
                messages: debugMessages
            })
        }
        
        const latestRate = await hederaService.getLatestRate()

        if (!latestRate) {
            // Try to get debug information
            const debugMessages = await hederaService.debugTopicMessages()
            return res.status(404).json({
                error: 'No rate messages found in topic',
                topicId: process.env.TOPIC_ID,
                debug: debugMessages.slice(0, 2) // Show only the first 2 messages for debugging
            })
        }

        return res.status(200).json({
            success: true,
            data: {
                rate: latestRate.rate,
                timestamp: latestRate.timestamp,
                sequenceNumber: latestRate.sequenceNumber,
                details: latestRate.raw
            }
        })
    } catch (error) {
        console.error('Error fetching latest rate:', error)
        return res.status(500).json({
            error: 'Failed to fetch latest rate',
            details: error instanceof Error ? error.message : 'Unknown error'
        })
    }
}
