import { NextRequest, NextResponse } from 'next/server'
import { HederaRateService } from '@/services/hederaRateService'

export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const hederaService = new HederaRateService()

        // If debug parameter is passed, show raw messages
        const debug = req.nextUrl.searchParams.get('debug')
        if (debug === 'true') {
            const debugMessages = await hederaService.debugTopicMessages()
            return NextResponse.json({
                success: true,
                debug: true,
                topicId: process.env.TOPIC_ID,
                messages: debugMessages,
            })
        }

        const latestRate = await hederaService.getLatestRate()

        if (!latestRate) {
            // Try to get debug information
            const debugMessages = await hederaService.debugTopicMessages()
            return NextResponse.json(
                {
                    error: 'No rate messages found in topic',
                    topicId: process.env.TOPIC_ID,
                    debug: debugMessages.slice(0, 2), // Show only the first 2 messages for debugging
                },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: {
                rate: latestRate.rate,
                timestamp: latestRate.timestamp,
                sequenceNumber: latestRate.sequenceNumber,
                details: latestRate.raw,
            },
        })
    } catch (error) {
        console.error('Error fetching latest rate:', error)
        return NextResponse.json(
            {
                error: 'Failed to fetch latest rate',
                details:
                    error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
