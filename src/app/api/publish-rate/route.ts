import { NextRequest, NextResponse } from 'next/server'
import { HederaService } from '@/services/hederaService'
import { createScopedLogger } from '@/lib/logger'

const logger = createScopedLogger('api:publish-rate:route.ts')


/**
 * POST /api/publish-rate
 *
 * Publishes exchange rate information to Hedera Consensus Service
 *
 * @param req - Request object containing rate, totalUsd, and husdSupply
 *
 * @example
 * POST /api/publish-rate
 * {
 *   "rate": 1.005,
 *   "totalUsd": 100000,
 *   "husdSupply": 99502.49
 * }
 *
 * @returns
 * {
 *   "status": "published",
 *   "topicId": "0.0.67890",
 *   "rate": 1.005
 * }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const body = await req.json()
        const { rate, totalUsd, husdSupply } = body

        // Validate required fields
        if (
            rate === undefined ||
            rate === null ||
            totalUsd === undefined ||
            totalUsd === null ||
            husdSupply === undefined ||
            husdSupply === null
        ) {
            return NextResponse.json(
                {
                    error: 'rate, totalUsd, and husdSupply are required',
                },
                { status: 400 }
            )
        }

        // Validate data types and values
        if (
            typeof rate !== 'number' ||
            typeof totalUsd !== 'number' ||
            typeof husdSupply !== 'number'
        ) {
            return NextResponse.json(
                {
                    error: 'rate, totalUsd, and husdSupply must be numbers',
                },
                { status: 400 }
            )
        }

        // Validate rate is positive
        if (rate <= 0) {
            return NextResponse.json(
                {
                    error: 'Rate must be positive',
                },
                { status: 400 }
            )
        }

        // Validate totalUsd and husdSupply are positive
        if (totalUsd <= 0 || husdSupply <= 0) {
            return NextResponse.json(
                {
                    error: 'totalUsd and husdSupply must be positive',
                },
                { status: 400 }
            )
        }

        // // Validate rate calculation consistency (with 0.1% tolerance)
        // const calculatedRate = totalUsd / husdSupply
        // const tolerance = 0.001 // 0.1%
        // if (Math.abs(calculatedRate - rate) / rate > tolerance) {
        //     return NextResponse.json(
        //         {
        //             error: 'Rate calculation is inconsistent with provided values',
        //         },
        //         { status: 400 }
        //     )
        // }

        // Initialize Hedera service
        const hederaService = new HederaService()

        // Publish rate to HCS
        const result = await hederaService.publishRate(
            rate,
            totalUsd,
            husdSupply
        )

        // Return success response - MAKE SURE IT INCLUDES transactionId
        return NextResponse.json({
            status: 'published',
            topicId: result.topicId,
            rate: result.rate,
            transactionId: result.transactionId, // <- Verify this line is there
        })
    } catch (error) {
        logger.error('Publish rate endpoint error:', error)

        // Check if it's a validation error from the service
        if (error instanceof Error) {
            if (
                error.message.includes('Rate must be positive') ||
                error.message.includes('Rate change cannot exceed 10%') ||
                error.message.includes('Rate calculation is inconsistent') ||
                error.message.includes(
                    'totalUsd and husdSupply must be positive'
                )
            ) {
                return NextResponse.json(
                    {
                        error: error.message,
                    },
                    { status: 400 }
                )
            }
        }

        // Return generic error message for security
        return NextResponse.json(
            {
                error: 'Internal server error',
            },
            { status: 500 }
        )
    }
}
