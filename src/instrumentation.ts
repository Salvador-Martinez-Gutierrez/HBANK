/**
 * Next.js Instrumentation
 *
 * This file is automatically loaded by Next.js and runs before
 * any other code in the application. Used for Sentry initialization.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
    // Only initialize Sentry in Node.js runtime (server-side)
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import('./sentry.server.config')
    }

    // Only initialize Sentry in Edge runtime (middleware, edge functions)
    if (process.env.NEXT_RUNTIME === 'edge') {
        await import('./sentry.edge.config')
    }
}
