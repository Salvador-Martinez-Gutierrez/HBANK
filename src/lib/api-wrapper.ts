/**
 * API Route Wrapper
 *
 * Provides automatic error handling, Sentry integration, and standardized
 * response formatting for Next.js API routes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { captureException, setUser, addBreadcrumb } from './sentry'

/**
 * Standard API error response
 */
export interface APIError {
    error: string
    message: string
    code?: string
    details?: unknown
}

/**
 * Standard API success response
 */
export interface APISuccess<T = unknown> {
    success: true
    data: T
}

/**
 * API Route Handler type
 */
export type APIRouteHandler<T = unknown> = (
    request: NextRequest,
    context?: { params?: Record<string, string> }
) => Promise<T>

/**
 * Options for the API wrapper
 */
export interface APIWrapperOptions {
    /**
     * Custom error message prefix
     */
    errorPrefix?: string

    /**
     * Tags to add to Sentry events
     */
    sentryTags?: Record<string, string>

    /**
     * Whether to require authentication
     */
    requireAuth?: boolean

    /**
     * Rate limit (requests per minute)
     */
    rateLimit?: number
}

/**
 * Wrap an API route with automatic error handling and Sentry integration
 *
 * Features:
 * - Automatic error catching and logging to Sentry
 * - Standardized JSON response format
 * - Request breadcrumbs for debugging
 * - User context extraction from headers
 * - Error sanitization (no stack traces in production)
 *
 * @param handler - The async function to handle the request
 * @param options - Configuration options
 * @returns NextResponse with standardized format
 *
 * @example
 * ```typescript
 * export const GET = withAPIWrapper(async (request) => {
 *   const data = await fetchSomeData()
 *   return { data }
 * }, {
 *   errorPrefix: 'Failed to fetch data',
 *   sentryTags: { operation: 'fetch' }
 * })
 * ```
 */
export function withAPIWrapper<T = unknown>(
    handler: APIRouteHandler<T>,
    options: APIWrapperOptions = {}
): (
    request: NextRequest,
    context?: { params?: Record<string, string> }
) => Promise<NextResponse<APISuccess<T> | APIError>> {
    return async (request: NextRequest, context?: { params?: Record<string, string> }) => {
        const startTime = Date.now()

        try {
            // Add breadcrumb for this request
            addBreadcrumb({
                category: 'api',
                message: `${request.method} ${request.nextUrl.pathname}`,
                level: 'info',
                data: {
                    method: request.method,
                    path: request.nextUrl.pathname,
                    query: Object.fromEntries(request.nextUrl.searchParams),
                },
            })

            // Extract and set user context if available
            const userId = request.headers.get('x-user-id')
            const userWallet = request.headers.get('x-user-wallet')
            if (userId || userWallet) {
                setUser({
                    id: userId || undefined,
                    username: userWallet || undefined,
                })
            }

            // Execute the handler
            const result = await handler(request, context)

            // Log successful completion
            const duration = Date.now() - startTime
            addBreadcrumb({
                category: 'api',
                message: `Request completed in ${duration}ms`,
                level: 'info',
                data: { duration },
            })

            // Return success response
            return NextResponse.json<APISuccess<T>>(
                {
                    success: true,
                    data: result,
                },
                { status: 200 }
            )
        } catch (error) {
            const duration = Date.now() - startTime

            // Determine error message
            const errorMessage =
                error instanceof Error ? error.message : 'An unexpected error occurred'

            const fullMessage = options.errorPrefix
                ? `${options.errorPrefix}: ${errorMessage}`
                : errorMessage

            // Capture error in Sentry
            captureException(error, {
                tags: {
                    api_route: request.nextUrl.pathname,
                    method: request.method,
                    ...(options.sentryTags || {}),
                },
                extra: {
                    path: request.nextUrl.pathname,
                    method: request.method,
                    query: Object.fromEntries(request.nextUrl.searchParams),
                    duration,
                    errorPrefix: options.errorPrefix,
                },
                level: 'error',
            })

            // Log error breadcrumb
            addBreadcrumb({
                category: 'api.error',
                message: fullMessage,
                level: 'error',
                data: {
                    duration,
                    error: errorMessage,
                },
            })

            // Return error response
            return NextResponse.json<APIError>(
                {
                    error: 'API Error',
                    message: fullMessage,
                    code: error instanceof Error && 'code' in error ? String(error.code) : undefined,
                    // Only include details in development
                    details: process.env.NODE_ENV === 'development' ? error : undefined,
                },
                { status: 500 }
            )
        }
    }
}

/**
 * Create a standardized error response
 *
 * @param message - Error message
 * @param status - HTTP status code
 * @param code - Error code
 * @returns NextResponse with error
 *
 * @example
 * ```typescript
 * if (!userId) {
 *   return errorResponse('User ID is required', 400, 'MISSING_USER_ID')
 * }
 * ```
 */
export function errorResponse(
    message: string,
    status: number = 400,
    code?: string
): NextResponse<APIError> {
    return NextResponse.json<APIError>(
        {
            error: 'Request Error',
            message,
            code,
        },
        { status }
    )
}

/**
 * Create a standardized success response
 *
 * @param data - Response data
 * @param status - HTTP status code
 * @returns NextResponse with success
 *
 * @example
 * ```typescript
 * return successResponse({ balance: 100 })
 * ```
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse<APISuccess<T>> {
    return NextResponse.json<APISuccess<T>>(
        {
            success: true,
            data,
        },
        { status }
    )
}

/**
 * Validate required query parameters
 *
 * @param request - Next.js request object
 * @param params - Array of required parameter names
 * @returns Object with parameter values or error response
 *
 * @example
 * ```typescript
 * const validation = validateQueryParams(request, ['accountId', 'tokenId'])
 * if ('error' in validation) return validation.error
 *
 * const { accountId, tokenId } = validation.params
 * ```
 */
export function validateQueryParams(
    request: NextRequest,
    params: string[]
): { params: Record<string, string> } | { error: NextResponse<APIError> } {
    const values: Record<string, string> = {}

    for (const param of params) {
        const value = request.nextUrl.searchParams.get(param)
        if (!value) {
            return {
                error: errorResponse(`Missing required parameter: ${param}`, 400, 'MISSING_PARAMETER'),
            }
        }
        values[param] = value
    }

    return { params: values }
}

/**
 * Validate request body
 *
 * @param request - Next.js request object
 * @param requiredFields - Array of required field names
 * @returns Parsed body or error response
 *
 * @example
 * ```typescript
 * const validation = await validateRequestBody(request, ['userId', 'amount'])
 * if ('error' in validation) return validation.error
 *
 * const { userId, amount } = validation.body
 * ```
 */
export async function validateRequestBody<T = Record<string, unknown>>(
    request: NextRequest,
    requiredFields: string[]
): Promise<{ body: T } | { error: NextResponse<APIError> }> {
    try {
        const body = (await request.json()) as T & Record<string, unknown>

        for (const field of requiredFields) {
            if (!(field in body) || body[field] === undefined || body[field] === null) {
                return {
                    error: errorResponse(
                        `Missing required field: ${field}`,
                        400,
                        'MISSING_FIELD'
                    ),
                }
            }
        }

        return { body }
    } catch (_error) {
        return {
            error: errorResponse('Invalid JSON body', 400, 'INVALID_JSON'),
        }
    }
}
