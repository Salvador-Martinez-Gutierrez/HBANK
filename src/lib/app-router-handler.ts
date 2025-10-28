/**
 * API Handler adapter for Next.js App Router (Route Handlers)
 *
 * This replaces the old withApiHandler for the new App Router architecture.
 * It provides consistent error handling, logging, and method validation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { ApiError, internalError, unprocessableEntity } from './errors'
import { createScopedLogger, ScopedLogger } from './logger'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type RouteHandlerOptions = {
    scope: string
}

export type RouteHandlerContext<TRequest = unknown> = {
    req: NextRequest
    body: TRequest
    logger: ScopedLogger
}

type RouteHandler<TPayload = unknown> = (
    context: RouteHandlerContext<TPayload>
) => Promise<NextResponse>

const methodNotAllowed = (method: string) =>
    new ApiError(405, 'Method not allowed', {
        expose: true,
        details: { attempted: method },
    })

/**
 * Wrapper for App Router route handlers
 * Provides error handling, logging, and validation
 *
 * @example
 * ```ts
 * // src/app/api/deposit/init/route.ts
 * export const POST = withRouteHandler(
 *   async ({ req, body, logger }) => {
 *     const payload = depositInitSchema.parse(body)
 *     const result = await depositService.initializeDeposit(payload)
 *     return NextResponse.json(result)
 *   },
 *   { scope: 'api:deposit:init' }
 * )
 * ```
 */
export const withRouteHandler =
    <TPayload>(
        handler: RouteHandler<TPayload>,
        options: RouteHandlerOptions
    ) =>
    async (req: NextRequest): Promise<NextResponse> => {
        const { scope } = options

        // Extract request ID from headers or generate one
        const requestId =
            req.headers.get('x-request-id') ?? crypto.randomUUID()

        const logger = createScopedLogger(scope, {
            requestId,
            method: req.method,
            path: req.nextUrl.pathname,
        })

        try {
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
            })
        } catch (error: unknown) {
            // Handle ApiError
            if (error instanceof ApiError) {
                const level = error.statusCode >= 500 ? 'error' : 'warn'
                logger[level]('Handled ApiError', {
                    message: error.message,
                    details: error.details,
                })
                return NextResponse.json(
                    {
                        error: error.message,
                        ...(error.details ? { details: error.details } : {}),
                    },
                    { status: error.statusCode }
                )
            }

            // Handle Zod validation errors
            if (error instanceof ZodError) {
                logger.warn('Validation failed', { issues: error.issues })
                const response = unprocessableEntity(
                    'Validation failed',
                    error.flatten()
                )
                return NextResponse.json(
                    {
                        error: response.message,
                        details: response.details,
                    },
                    { status: response.statusCode }
                )
            }

            // Handle unexpected errors
            logger.error('Unhandled error', {
                message:
                    error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
            })

            const response = internalError('Unexpected server error')
            return NextResponse.json(
                { error: response.message },
                { status: response.statusCode }
            )
        }
    }

/**
 * Helper to create method-specific route handlers
 * This ensures only the specified HTTP method is allowed
 *
 * @example
 * ```ts
 * export const GET = createMethodHandler('GET', async ({ req, logger }) => {
 *   const data = await fetchData()
 *   return NextResponse.json(data)
 * }, { scope: 'api:data:fetch' })
 * ```
 */
export const createMethodHandler = <TPayload>(
    method: HttpMethod,
    handler: RouteHandler<TPayload>,
    options: RouteHandlerOptions
) => {
    return withRouteHandler<TPayload>(async (context) => {
        if (context.req.method !== method) {
            const error = methodNotAllowed(context.req.method)
            context.logger.warn('Rejected unsupported method', {
                attemptedMethod: context.req.method,
                allowedMethod: method,
            })
            return NextResponse.json(
                {
                    error: error.message,
                    allowedMethod: method,
                },
                { status: error.statusCode }
            )
        }

        return await handler(context)
    }, options)
}
