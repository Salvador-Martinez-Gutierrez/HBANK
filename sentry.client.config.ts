/**
 * Sentry Client Configuration
 *
 * This file configures Sentry for the browser/client-side.
 * Captures errors, performance data, and user feedback from the frontend.
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
    // Sentry DSN from environment variables
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Environment (development, staging, production)
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV,

    // Sample rate for error events (1.0 = 100%)
    // In production, you might want to lower this to reduce quota usage
    sampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 1.0,

    // Sample rate for performance monitoring (0.1 = 10%)
    // Lower rate in production to reduce performance overhead
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Capture Replay for Session Replay
    // This is a powerful debugging tool that shows what users did before an error
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Enable automatic instrumentation
    integrations: [
        // Capture user interactions (clicks, navigation)
        Sentry.browserTracingIntegration({
            // Configure which routes to trace
            tracingOrigins: ['localhost', /^https:\/\/.*\.vercel\.app$/],
        }),

        // Session Replay
        Sentry.replayIntegration({
            // Mask all text content for privacy
            maskAllText: true,
            // Block all media (images, videos) for privacy and bandwidth
            blockAllMedia: true,
        }),
    ],

    // Filter out known third-party errors
    ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        'canvas.contentDocument',
        // Random plugins/extensions
        'atomicFindClose',
        // Network errors
        'NetworkError',
        'Network request failed',
        // Wallet connection errors (expected user behavior)
        'User rejected',
        'User denied',
        'MetaMask',
    ],

    // Improve error context with breadcrumbs
    beforeBreadcrumb(breadcrumb) {
        // Filter out noisy breadcrumbs
        if (breadcrumb.category === 'console' && breadcrumb.level !== 'error') {
            return null
        }
        return breadcrumb
    },

    // Add custom context to all events
    beforeSend(event, hint) {
        // Don't send errors in development (optional)
        if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
            console.log('Sentry event (not sent in dev):', event)
            return null
        }

        // Add user context if available
        const user = event.user || {}
        event.user = {
            ...user,
            // Add custom user properties
            environment: process.env.NEXT_PUBLIC_ENVIRONMENT,
        }

        return event
    },

    // Debug mode (only in development)
    debug: process.env.NODE_ENV === 'development',
})
