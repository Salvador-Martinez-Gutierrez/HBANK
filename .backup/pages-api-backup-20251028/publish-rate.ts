import { NextApiRequest, NextApiResponse } from 'next'
import { HederaService } from '../../src/services/hederaService'

/**
 * POST /api/publish-rate
 *
 * Publishes exchange rate information to Hedera Consensus Service
 *
 * @param req - Request object containing rate, totalUsd, and husdSupply
 * @param res - Response object
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
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { rate, totalUsd, husdSupply } = req.body

        // Validate required fields
        if (
            rate === undefined ||
            rate === null ||
            totalUsd === undefined ||
            totalUsd === null ||
            husdSupply === undefined ||
            husdSupply === null
        ) {
            return res.status(400).json({
                error: 'rate, totalUsd, and husdSupply are required',
            })
        }

        // Validate data types and values
        if (
            typeof rate !== 'number' ||
            typeof totalUsd !== 'number' ||
            typeof husdSupply !== 'number'
        ) {
            return res.status(400).json({
                error: 'rate, totalUsd, and husdSupply must be numbers',
            })
        }

        // Validate rate is positive
        if (rate <= 0) {
            return res.status(400).json({
                error: 'Rate must be positive',
            })
        }

        // Validate totalUsd and husdSupply are positive
        if (totalUsd <= 0 || husdSupply <= 0) {
            return res.status(400).json({
                error: 'totalUsd and husdSupply must be positive',
            })
        }

        // // Validate rate calculation consistency (with 0.1% tolerance)
        // const calculatedRate = totalUsd / husdSupply
        // const tolerance = 0.001 // 0.1%
        // if (Math.abs(calculatedRate - rate) / rate > tolerance) {
        //     return res.status(400).json({
        //         error: 'Rate calculation is inconsistent with provided values',
        //     })
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
        return res.status(200).json({
            status: 'published',
            topicId: result.topicId,
            rate: result.rate,
            transactionId: result.transactionId, // <- Verify this line is there
        })
    } catch (error) {
        console.error('Publish rate endpoint error:', error)

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
                return res.status(400).json({
                    error: error.message,
                })
            }
        }

        // Return generic error message for security
        return res.status(500).json({
            error: 'Internal server error',
        })
    }
}
