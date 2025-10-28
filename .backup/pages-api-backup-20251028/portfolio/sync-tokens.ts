/**
 * Endpoint para sincronizar tokens de una wallet
 * Requiere autenticación JWT
 */

import type { NextApiResponse } from 'next'
import { type AuthenticatedRequest, withAuth } from '@/lib/auth-middleware'
import { syncWalletTokens } from '@/services/portfolioWalletService'

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res
            .status(405)
            .json({ success: false, error: 'Method not allowed' })
    }

    try {
        // User is authenticated via JWT middleware

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

export default withAuth(handler)
