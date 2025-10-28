/**
 * Endpoint para obtener datos del usuario autenticado
 * Usa JWT authentication (cookie HttpOnly)
 */

import { NextResponse } from 'next/server'
import { withAuthRoute } from '@/lib/app-router-auth-middleware'
import { syncOrCreateUser } from '@/services/portfolioUserService'

export const GET = withAuthRoute(
    async ({ req, user, logger: _logger }): Promise<NextResponse> => {
        const accountId = user.accountId
        const requestedAccountId = req.nextUrl.searchParams.get('accountId')

        if (!requestedAccountId) {
            return NextResponse.json(
                { error: 'Missing accountId parameter' },
                { status: 400 }
            )
        }

        // SECURITY: Verify the authenticated user is requesting their own data
        if (accountId !== requestedAccountId) {
            return NextResponse.json(
                {
                    error: 'Forbidden',
                    message: 'You can only access your own data',
                },
                { status: 403 }
            )
        }

        try {
            // Sync or create user in Supabase
            const result = await syncOrCreateUser(accountId)

            if (!result.success) {
                return NextResponse.json(
                    {
                        error: 'Failed to load user data',
                    },
                    { status: 500 }
                )
            }

            return NextResponse.json({
                success: true,
                user: result.user || null,
                accountId: accountId,
            })
        } catch (error) {
            console.error('Server-side user fetch error:', error)
            return NextResponse.json(
                {
                    error:
                        error instanceof Error
                            ? error.message
                            : 'Internal error',
                },
                { status: 500 }
            )
        }
    },
    { scope: 'api:portfolio:fetch-user' }
)
