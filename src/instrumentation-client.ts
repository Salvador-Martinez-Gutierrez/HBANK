/**
 * Sentry Client Instrumentation
 *
 * This file configures Sentry for the browser/client-side.
 * Replaces the deprecated sentry.client.config.ts file.
 * Captures errors, performance data, and user feedback from the frontend.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client
 */

import * as Sentry from '@sentry/nextjs'

/**
 * Instrument router transitions for client-side navigation tracking
 * This is required for proper navigation instrumentation in Next.js App Router
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/features/instrumentation
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

export async function register() {
    Sentry.init({
        // Sentry DSN from environment variables
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

        // Environment (development, staging, production)
        environment:
            process.env.NEXT_PUBLIC_ENVIRONMENT ?? process.env.NODE_ENV,

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
            Sentry.browserTracingIntegration(),

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
            if (
                breadcrumb.category === 'console' &&
                breadcrumb.level !== 'error'
            ) {
                return null
            }
            return breadcrumb
        },

        // Add custom context to all events
        beforeSend(event) {
            // Don't send errors in development (optional)
            if (
                process.env.NODE_ENV === 'development' &&
                !process.env.NEXT_PUBLIC_SENTRY_DSN
            ) {
                // eslint-disable-next-line no-console
                console.log('Sentry event (not sent in dev):', event)
                return null
            }

            // Add user context if available
            const user = event.user ?? {}
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
}
