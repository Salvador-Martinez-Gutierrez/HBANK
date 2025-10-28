/**
 * Endpoint to verify current session
 *
 * GET /api/auth/me
 *
 * Returns the accountId of the authenticated user
 */

import { NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/jwt'
import { withRouteHandler } from '@/lib/app-router-handler'

export const GET = withRouteHandler(
    async ({ req, logger }): Promise<NextResponse> => {
        // Extract token from cookie
        const token = req.cookies.get('hbank-auth-token')?.value

        if (!token) {
            return NextResponse.json(
                { error: 'Unauthorized: No token provided' },
                { status: 401 }
            )
        }

        // Verify JWT
        const payload = await verifyJWT(token)

        if (!payload?.sub) {
            return NextResponse.json(
                { error: 'Unauthorized: Invalid token' },
                { status: 401 }
            )
        }

        logger.info('User session verified', { accountId: payload.sub })

        return NextResponse.json({ accountId: payload.sub })
    },
    { scope: 'api:auth:me' }
)
