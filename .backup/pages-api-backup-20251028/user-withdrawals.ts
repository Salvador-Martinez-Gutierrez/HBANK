import { NextApiRequest, NextApiResponse } from 'next'
import { WithdrawService } from '@/services/withdrawService'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { user } = req.query

        if (!user || typeof user !== 'string') {
            return res.status(400).json({
                error: 'Missing required parameter: user',
            })
        }

        console.log('Fetching withdrawals for user:', user)

        const withdrawService = new WithdrawService()
        const withdrawals = await withdrawService.getUserWithdrawals(user)

        return res.status(200).json({
            success: true,
            withdrawals,
        })
    } catch (error) {
        console.error('❌ Error fetching user withdrawals:', error)
        return res.status(500).json({
            error: 'Internal server error',
        })
    }
}
