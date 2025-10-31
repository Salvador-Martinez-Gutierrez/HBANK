/**
 * Endpoint to log out
 *
 * POST /api/auth/logout
 *
 * Invalidates the JWT and clears the session cookie
 */

import { NextResponse } from 'next/server'
import { withRouteHandler } from '@/lib/app-router-handler'
import { withRateLimit } from '@/lib/rate-limit'

export const POST = withRateLimit('PUBLIC')(withRouteHandler(
    async ({ logger }): Promise<NextResponse> => {
        logger.info('User logged out successfully')

        const response = NextResponse.json({
            success: true,
            message: 'Logged out successfully',
        })

        // Clear the authentication cookie
        response.cookies.set('hbank-auth-token', '', {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            path: '/',
            maxAge: 0,
        })

        return response
    },
    { scope: 'api:auth:logout' }
))
