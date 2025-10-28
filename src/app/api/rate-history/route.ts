import { NextRequest, NextResponse } from 'next/server'
import { HederaRateService } from '@/services/hederaRateService'

import { createScopedLogger } from '@/lib/logger'

const logger = createScopedLogger('api:rate-history')
export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const hederaService = new HederaRateService()

        // Get limit from query parameter, default to 50
        const limitParam = req.nextUrl.searchParams.get('limit')
        const limit = limitParam ? parseInt(limitParam) : 50

        const rateHistory = await hederaService.getRecentRates(
            Math.min(limit, 100)
        ) // Cap at 100

        if (!rateHistory || rateHistory.length === 0) {
            return NextResponse.json(
                {
                    error: 'No rate history found',
                    topicId: process.env.TOPIC_ID,
                    data: [],
                },
                { status: 404 }
            )
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

        return NextResponse.json({
            success: true,
            data: sortedHistory,
            count: sortedHistory.length,
        })
    } catch (error) {
        logger.error('Error fetching rate history:', error)
        return NextResponse.json(
            {
                error: 'Failed to fetch rate history',
                details:
                    error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
