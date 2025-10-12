import type { NextApiRequest, NextApiResponse } from 'next'
import { getCurrentUser } from '@/services/portfolioAuthService'
import { syncWalletTokens } from '@/services/portfolioWalletService'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res
            .status(405)
            .json({ success: false, error: 'Method not allowed' })
    }

    try {
        // Pass req to getCurrentUser so it can read cookies
        const userResult = await getCurrentUser(req)

        if (!userResult.success || !userResult.user) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated',
            })
        }

        const { walletId, walletAddress } = req.body

        if (!walletId || !walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet ID and address are required',
            })
        }

        // Sync tokens from Hedera
        const syncResult = await syncWalletTokens(walletId, walletAddress)

        if (!syncResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to sync tokens',
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Tokens synced successfully',
        })
    } catch (error) {
        console.error('Error syncing tokens:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        })
    }
}
