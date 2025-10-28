import type { NextApiRequest, NextApiResponse } from 'next'
import { updateAllTokenPrices } from '@/services/portfolioPriceService'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res
            .status(405)
            .json({ success: false, error: 'Method not allowed' })
    }

    try {
        // Optional: Add API key validation for security
        const apiKey = req.headers['x-api-key'] as string
        const expectedKey = process.env.CRON_API_KEY

        if (expectedKey && apiKey !== expectedKey) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
            })
        }

        const result = await updateAllTokenPrices()

        return res.status(200).json(result)
    } catch (error) {
        console.error('Error updating prices:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        })
    }
}
