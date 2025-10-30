/**
 * Sentry Server Configuration
 *
 * This file configures Sentry for the Node.js server-side runtime.
 * Captures errors from API routes, server components, and server actions.
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
    // Sentry DSN from environment variables
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Environment (development, staging, production)
    environment: process.env.ENVIRONMENT || process.env.NODE_ENV,

    // Sample rate for error events (1.0 = 100%)
    sampleRate: 1.0,

    // Sample rate for performance monitoring (0.2 = 20%)
    // Higher rate on server since we have more control
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

    // Enable automatic instrumentation
    integrations: [
        // HTTP instrumentation
        Sentry.httpIntegration({
            tracing: {
                // Trace all outgoing HTTP requests
                shouldCreateSpanForRequest: (url) => {
                    // Don't trace health checks
                    return !url.includes('/health')
                },
            },
        }),

        // Prisma/Database instrumentation (if using Prisma)
        // Sentry.prismaIntegration(),
    ],

    // Filter out sensitive data
    beforeSend(event) {
        // Remove sensitive environment variables
        if (event.contexts?.runtime?.env) {
            const env = event.contexts.runtime.env as Record<string, unknown>
            delete env.DATABASE_URL
            delete env.PRIVATE_KEY
            delete env.OPERATOR_KEY
            delete env.SENTRY_DSN
            delete env.TELEGRAM_BOT_TOKEN
        }

        // Remove sensitive request data
        if (event.request?.headers) {
            delete event.request.headers.authorization
            delete event.request.headers.cookie
        }

        return event
    },

    // Add custom context to all events
    beforeSendTransaction(event) {
        // Add server-specific context
        event.contexts = event.contexts || {}
        event.contexts.server = {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
        }

        return event
    },

    // Debug mode (only in development)
    debug: process.env.NODE_ENV === 'development',

    // Set up error reporting for uncaught exceptions
    // This is automatically handled by Sentry SDK

    // Configure release tracking (for production deployments)
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,
})
