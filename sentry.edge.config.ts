/**
 * Sentry Edge Configuration
 *
 * This file configures Sentry for the Edge runtime.
 * Used for middleware and Edge API routes.
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
    // Sentry DSN from environment variables
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Environment (development, staging, production)
    environment: process.env.ENVIRONMENT || process.env.NODE_ENV,

    // Sample rate for error events (1.0 = 100%)
    sampleRate: 1.0,

    // Sample rate for performance monitoring (0.1 = 10%)
    // Lower rate for edge since it runs more frequently
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Debug mode (only in development)
    debug: process.env.NODE_ENV === 'development',

    // Configure release tracking
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,
})
