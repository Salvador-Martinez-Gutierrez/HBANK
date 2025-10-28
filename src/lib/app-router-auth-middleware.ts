/**
 * Auth middleware for Next.js App Router (Route Handlers)
 *
 * This provides JWT authentication for App Router route handlers.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from './jwt'
import { createScopedLogger, ScopedLogger } from './logger'
import type { AuthenticatedUser } from '@/types/auth'

export type AuthenticatedRouteContext<TRequest = unknown> = {
    req: NextRequest
    body: TRequest
    logger: ScopedLogger
    user: AuthenticatedUser
}

type AuthenticatedRouteHandler<TPayload = unknown> = (
    context: AuthenticatedRouteContext<TPayload>
) => Promise<NextResponse>

type AuthRouteOptions = {
    scope: string
}

/**
 * Wrapper for authenticated App Router route handlers
 * Verifies JWT from cookie and provides user context
 *
 * @example
 * ```ts
 * export const GET = withAuthRoute(
 *   async ({ req, user, logger }) => {
 *     const accountId = user.accountId
 *     // ... use accountId
 *     return NextResponse.json({ data })
 *   },
 *   { scope: 'api:portfolio:fetch-user' }
 * )
 * ```
 */
export const withAuthRoute = <TPayload>(
    handler: AuthenticatedRouteHandler<TPayload>,
    options: AuthRouteOptions
) => {
    return async (req: NextRequest): Promise<NextResponse> => {
        const { scope } = options

        // Extract request ID from headers or generate one
        const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID()

        const logger = createScopedLogger(scope, {
            requestId,
            method: req.method,
            path: req.nextUrl.pathname,
        })

        try {
            // Extract token from cookie
            const token = req.cookies.get('hbank-auth-token')?.value

            if (!token) {
                logger.warn('No auth token found in request')
                return NextResponse.json(
                    { error: 'Unauthorized: No token provided' },
                    { status: 401 }
                )
            }

            // Verify JWT
            const payload = await verifyJWT(token)

            if (!payload || !payload.sub) {
                logger.warn('Invalid JWT token')
                return NextResponse.json(
                    { error: 'Unauthorized: Invalid token' },
                    { status: 401 }
                )
            }

            const user: AuthenticatedUser = {
                accountId: payload.sub,
            }

            logger.info('Request authenticated successfully', {
                accountId: payload.sub,
            })

            // Parse body if it exists
            let body: TPayload | undefined = undefined
            if (req.method !== 'GET' && req.method !== 'DELETE') {
                try {
                    const contentType = req.headers.get('content-type')
                    if (contentType?.includes('application/json')) {
                        body = (await req.json()) as TPayload
                    }
                } catch (error) {
                    logger.warn('Failed to parse JSON body', {
                        error:
                            error instanceof Error
                                ? error.message
                                : 'Unknown error',
                    })
                    return NextResponse.json(
                        { error: 'Invalid JSON body' },
                        { status: 400 }
                    )
                }
            }

            // Call the handler
            return await handler({
                req,
                body: body as TPayload,
                logger,
                user,
            })
        } catch (error) {
            logger.error('Error in auth middleware', {
                error: error instanceof Error ? error.message : String(error),
            })
            return NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            )
        }
    }
}
