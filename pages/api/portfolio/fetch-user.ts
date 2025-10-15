/**
 * Endpoint para obtener datos del usuario autenticado
 * Usa JWT authentication (cookie HttpOnly)
 */

import type { NextApiResponse } from 'next'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth-middleware'
import { syncOrCreateUser } from '@/services/portfolioUserService'

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const accountId = req.user.accountId
    const { accountId: requestedAccountId } = req.query

    if (!requestedAccountId || typeof requestedAccountId !== 'string') {
        return res.status(400).json({ error: 'Missing accountId parameter' })
    }

    // SECURITY: Verify the authenticated user is requesting their own data
    if (accountId !== requestedAccountId) {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'You can only access your own data',
        })
    }

    try {
        // Sync or create user in Supabase
        const result = await syncOrCreateUser(accountId)

        if (!result.success) {
            return res.status(500).json({
                error: 'Failed to load user data',
            })
        }

        return res.status(200).json({
            success: true,
            user: result.user || null,
            accountId: accountId,
        })
    } catch (error) {
        console.error('Server-side user fetch error:', error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal error',
        })
    }
}

export default withAuth(handler)
