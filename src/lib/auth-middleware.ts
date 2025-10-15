/**
 * Middleware para proteger rutas API con autenticación JWT
 *
 * Uso:
 *
 * ```typescript
 * import { withAuth } from '@/lib/auth-middleware'
 *
 * async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
 *   // req.user.accountId está disponible
 *   const accountId = req.user.accountId
 *   // ...
 * }
 *
 * export default withAuth(handler)
 * ```
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyJWT } from './jwt'
import { logger } from './logger'
import type { AuthenticatedUser } from '@/types/auth'

/**
 * Request extendido con información del usuario autenticado
 */
export interface AuthenticatedRequest extends NextApiRequest {
    user: AuthenticatedUser
}

/**
 * Tipo para handlers autenticados
 */
export type AuthenticatedHandler = (
    req: AuthenticatedRequest,
    res: NextApiResponse
) => Promise<void> | void

/**
 * Middleware que verifica el JWT en la cookie
 */
export function withAuth(handler: AuthenticatedHandler) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        try {
            // Extraer token de la cookie
            const token = req.cookies['hbank-auth-token']

            if (!token) {
                logger.warn('No auth token found in request')
                return res
                    .status(401)
                    .json({ error: 'Unauthorized: No token provided' })
            }

            // Verificar el JWT
            const payload = await verifyJWT(token)

            if (!payload || !payload.sub) {
                logger.warn('Invalid JWT token')
                return res
                    .status(401)
                    .json({ error: 'Unauthorized: Invalid token' })
            }

            // Agregar el usuario al request
            const authenticatedReq = req as AuthenticatedRequest
            authenticatedReq.user = {
                accountId: payload.sub,
            }

            logger.info('Request authenticated successfully', {
                accountId: payload.sub,
            })

            // Ejecutar el handler
            return handler(authenticatedReq, res)
        } catch (error) {
            logger.error('Error in auth middleware', {
                error: error instanceof Error ? error.message : String(error),
            })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }
}

/**
 * Middleware opcional: valida JWT pero no retorna error si no está presente
 * Útil para endpoints que funcionan con y sin autenticación
 */
export function withOptionalAuth(handler: AuthenticatedHandler) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        try {
            // Extraer token de la cookie
            const token = req.cookies['hbank-auth-token']

            if (token) {
                // Verificar el JWT
                const payload = await verifyJWT(token)

                if (payload && payload.sub) {
                    // Agregar el usuario al request
                    const authenticatedReq = req as AuthenticatedRequest
                    authenticatedReq.user = {
                        accountId: payload.sub,
                    }

                    logger.info('Optional auth: Request authenticated', {
                        accountId: payload.sub,
                    })
                }
            }

            // Ejecutar el handler (con o sin usuario)
            return handler(req as AuthenticatedRequest, res)
        } catch (error) {
            logger.error('Error in optional auth middleware', {
                error: error instanceof Error ? error.message : String(error),
            })
            // En modo opcional, no retornamos error
            return handler(req as AuthenticatedRequest, res)
        }
    }
}

/**
 * Utilidad para extraer el accountId del request (si está autenticado)
 */
export function getAuthenticatedAccountId(req: NextApiRequest): string | null {
    const authenticatedReq = req as AuthenticatedRequest
    return authenticatedReq.user?.accountId || null
}
