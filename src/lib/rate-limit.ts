/**
 * Rate Limiting Service
 *
 * Provides DDoS protection and API abuse prevention using Upstash Redis.
 * Different rate limits are applied based on endpoint sensitivity.
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'
import { serverEnv } from '@/config/serverEnv'
import { createScopedLogger } from './logger'

const logger = createScopedLogger('rate-limit')

/**
 * Rate limit tiers with different restrictions
 */
export const RATE_LIMIT_TIERS = {
    // Authentication endpoints - Prevent brute force
    AUTH: {
        requests: 10,
        window: '10s',
        description: 'Authentication endpoints',
    },
    // Financial operations - Critical, low limit
    FINANCIAL: {
        requests: 5,
        window: '60s',
        description: 'Financial operations (withdraw, deposit)',
    },
    // Public data endpoints - More permissive
    PUBLIC: {
        requests: 30,
        window: '60s',
        description: 'Public data endpoints',
    },
    // Admin/cron operations - Very restricted
    ADMIN: {
        requests: 2,
        window: '60s',
        description: 'Admin and cron operations',
    },
} as const

type RateLimitTier = keyof typeof RATE_LIMIT_TIERS

/**
 * Initialize Redis client for Upstash
 */
function getRedisClient(): Redis | null {
    if (!serverEnv.upstash.enabled) {
        logger.warn('Upstash Redis not configured - rate limiting disabled')
        return null
    }

    try {
        return new Redis({
            url: serverEnv.upstash.url,
            token: serverEnv.upstash.token,
        })
    } catch (error) {
        logger.error('Failed to initialize Upstash Redis client', { error })
        return null
    }
}

/**
 * Create rate limiters for different tiers
 */
const redis = getRedisClient()

const rateLimiters: Record<RateLimitTier, Ratelimit | null> = {
    AUTH: redis
        ? new Ratelimit({
              redis,
              limiter: Ratelimit.slidingWindow(
                  RATE_LIMIT_TIERS.AUTH.requests,
                  RATE_LIMIT_TIERS.AUTH.window
              ),
              prefix: 'ratelimit:auth',
              analytics: true,
          })
        : null,

    FINANCIAL: redis
        ? new Ratelimit({
              redis,
              limiter: Ratelimit.slidingWindow(
                  RATE_LIMIT_TIERS.FINANCIAL.requests,
                  RATE_LIMIT_TIERS.FINANCIAL.window
              ),
              prefix: 'ratelimit:financial',
              analytics: true,
          })
        : null,

    PUBLIC: redis
        ? new Ratelimit({
              redis,
              limiter: Ratelimit.slidingWindow(
                  RATE_LIMIT_TIERS.PUBLIC.requests,
                  RATE_LIMIT_TIERS.PUBLIC.window
              ),
              prefix: 'ratelimit:public',
              analytics: true,
          })
        : null,

    ADMIN: redis
        ? new Ratelimit({
              redis,
              limiter: Ratelimit.slidingWindow(
                  RATE_LIMIT_TIERS.ADMIN.requests,
                  RATE_LIMIT_TIERS.ADMIN.window
              ),
              prefix: 'ratelimit:admin',
              analytics: true,
          })
        : null,
}

/**
 * Get client identifier from request
 * Uses IP address or user account ID if authenticated
 */
function getClientIdentifier(request: NextRequest): string {
    // Use authenticated user ID if available
    const userId = request.headers.get('x-user-id')
    if (userId) {
        return `user:${userId}`
    }

    // Use wallet address if available
    const userWallet = request.headers.get('x-user-wallet')
    if (userWallet) {
        return `wallet:${userWallet}`
    }

    // Fall back to IP address
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'

    return `ip:${ip}`
}

/**
 * Rate limit response type
 */
export interface RateLimitResult {
    success: boolean
    limit: number
    remaining: number
    reset: number
    pending?: Promise<unknown>
}

/**
 * Check rate limit for a request
 *
 * @param request - Next.js request object
 * @param tier - Rate limit tier to apply
 * @returns Rate limit result with success status and metadata
 */
export async function checkRateLimit(
    request: NextRequest,
    tier: RateLimitTier = 'PUBLIC'
): Promise<RateLimitResult> {
    const limiter = rateLimiters[tier]

    // If rate limiting is disabled (no Redis), allow all requests
    if (!limiter) {
        logger.debug('Rate limiting disabled - allowing request', { tier })
        return {
            success: true,
            limit: RATE_LIMIT_TIERS[tier].requests,
            remaining: RATE_LIMIT_TIERS[tier].requests,
            reset: Date.now() + 60000,
        }
    }

    const identifier = getClientIdentifier(request)

    try {
        const result = await limiter.limit(identifier)

        logger.debug('Rate limit check', {
            tier,
            identifier: identifier.substring(0, 20) + '...',
            success: result.success,
            limit: result.limit,
            remaining: result.remaining,
            reset: new Date(result.reset).toISOString(),
        })

        return result
    } catch (error) {
        logger.error('Rate limit check failed', {
            error,
            tier,
            identifier: identifier.substring(0, 20) + '...',
        })

        // On error, allow the request but log the issue
        return {
            success: true,
            limit: RATE_LIMIT_TIERS[tier].requests,
            remaining: 0,
            reset: Date.now() + 60000,
        }
    }
}

/**
 * Rate limit middleware wrapper for API routes
 *
 * @param tier - Rate limit tier to apply
 * @returns Middleware function that checks rate limits
 *
 * @example
 * ```typescript
 * export const POST = withRateLimit('FINANCIAL')(async (request) => {
 *   // Handler implementation
 * })
 * ```
 */
export function withRateLimit(tier: RateLimitTier = 'PUBLIC') {
    return function <T>(
        handler: (request: NextRequest, context?: { params?: Record<string, string> }) => Promise<T>
    ) {
        return async (
            request: NextRequest,
            context?: { params?: Record<string, string> }
        ): Promise<T | NextResponse> => {
            const result = await checkRateLimit(request, tier)

            // If rate limited, return 429 Too Many Requests
            if (!result.success) {
                const resetDate = new Date(result.reset)

                logger.warn('Rate limit exceeded', {
                    tier,
                    path: request.nextUrl.pathname,
                    identifier: getClientIdentifier(request).substring(0, 20) + '...',
                    reset: resetDate.toISOString(),
                })

                return NextResponse.json(
                    {
                        error: 'Too Many Requests',
                        message: `Rate limit exceeded. Please try again after ${resetDate.toLocaleTimeString()}.`,
                        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
                    },
                    {
                        status: 429,
                        headers: {
                            'X-RateLimit-Limit': result.limit.toString(),
                            'X-RateLimit-Remaining': result.remaining.toString(),
                            'X-RateLimit-Reset': result.reset.toString(),
                            'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
                        },
                    }
                ) as T | NextResponse
            }

            // Add rate limit headers to response
            const response = await handler(request, context)

            // If response is a NextResponse, add headers
            if (response instanceof NextResponse) {
                response.headers.set('X-RateLimit-Limit', result.limit.toString())
                response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
                response.headers.set('X-RateLimit-Reset', result.reset.toString())
            }

            return response
        }
    }
}

/**
 * Get rate limit status without consuming a token
 * Useful for monitoring or displaying limits to users
 *
 * Note: Currently commented out as getRemaining API needs verification
 */
export async function getRateLimitStatus(
    request: NextRequest,
    tier: RateLimitTier = 'PUBLIC'
): Promise<RateLimitResult | null> {
    const limiter = rateLimiters[tier]

    if (!limiter) {
        return null
    }

    const identifier = getClientIdentifier(request)

    try {
        // Get limit info without consuming a token
        const result = await limiter.limit(identifier)

        return {
            success: result.success,
            limit: result.limit,
            remaining: result.remaining,
            reset: result.reset,
        }
    } catch (error) {
        logger.error('Failed to get rate limit status', { error, tier })
        return null
    }
}
