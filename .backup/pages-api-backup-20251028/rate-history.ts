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

        // Get limit from query parameter, default to 50
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50

        const rateHistory = await hederaService.getRecentRates(
            Math.min(limit, 100)
        ) // Cap at 100

        if (!rateHistory || rateHistory.length === 0) {
            return res.status(404).json({
                error: 'No rate history found',
                topicId: process.env.TOPIC_ID,
                data: [],
            })
        }

        // Keep the original order from API (already desc), then reverse for chronological order
        const sortedHistory = rateHistory
            .reverse() // Reverse to get chronological order (oldest to newest)
            .map((rate) => ({
                rate: rate.rate,
                timestamp: rate.timestamp,
                sequenceNumber: rate.sequenceNumber,
                formattedTime: new Date(rate.timestamp).toLocaleString(),
            }))

        return res.status(200).json({
            success: true,
            data: sortedHistory,
            count: sortedHistory.length,
        })
    } catch (error) {
        console.error('Error fetching rate history:', error)
        return res.status(500).json({
            error: 'Failed to fetch rate history',
            details: error instanceof Error ? error.message : 'Unknown error',
        })
    }
}
