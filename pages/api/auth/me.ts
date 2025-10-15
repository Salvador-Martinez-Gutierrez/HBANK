/**
 * Endpoint para verificar la sesión actual
 *
 * GET /api/auth/me
 *
 * Devuelve el accountId del usuario autenticado
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyJWT } from '@/lib/jwt'
import { logger } from '@/lib/logger'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<{ accountId: string } | { error: string }>
) {
    // Solo permitir GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        // Extraer token de la cookie
        const token = req.cookies['hbank-auth-token']

        if (!token) {
            return res
                .status(401)
                .json({ error: 'Unauthorized: No token provided' })
        }

        // Verificar el JWT
        const payload = await verifyJWT(token)

        if (!payload || !payload.sub) {
            return res
                .status(401)
                .json({ error: 'Unauthorized: Invalid token' })
        }

        logger.info('User session verified', { accountId: payload.sub })

        return res.status(200).json({ accountId: payload.sub })
    } catch (error) {
        logger.error('Error in /api/auth/me', {
            error: error instanceof Error ? error.message : String(error),
        })
        return res.status(500).json({ error: 'Internal server error' })
    }
}
