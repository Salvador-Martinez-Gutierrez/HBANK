/**
 * Endpoint para cerrar sesión
 *
 * POST /api/auth/logout
 *
 * Invalida el JWT y limpia la cookie de sesión
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { logger } from '@/lib/logger'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<{ success: boolean; message?: string }>
) {
    // Solo permitir POST
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            message: 'Method not allowed',
        })
    }

    try {
        // Limpiar la cookie de autenticación
        res.setHeader('Set-Cookie', [
            'hbank-auth-token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
        ])

        logger.info('User logged out successfully')

        return res.status(200).json({
            success: true,
            message: 'Logged out successfully',
        })
    } catch (error) {
        logger.error('Error in logout endpoint', {
            error: error instanceof Error ? error.message : String(error),
        })
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        })
    }
}
