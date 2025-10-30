/**
 * Next.js Instrumentation
 *
 * This file is automatically loaded by Next.js and runs before
 * any other code in the application. Used for Sentry initialization.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import * as Sentry from '@sentry/nextjs'

export async function register() {
    // Only initialize Sentry in Node.js runtime (server-side)
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import('../sentry.server.config')
    }

    // Only initialize Sentry in Edge runtime (middleware, edge functions)
    if (process.env.NEXT_RUNTIME === 'edge') {
        await import('../sentry.edge.config')
    }
}

/**
 * Instrument Next.js request errors
 * This hook is called for errors from nested React Server Components
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#errors-from-nested-react-server-components
 */
export async function onRequestError(
    err: unknown,
    request: {
        path: string
        method: string
        headers: Headers
    },
    context: {
        routerKind: 'Pages Router' | 'App Router'
        routePath: string
        routeType: 'render' | 'route' | 'action' | 'middleware'
        renderSource:
            | 'react-server-components'
            | 'react-server-components-payload'
            | 'server-rendering'
        revalidateReason?: 'on-demand' | 'stale'
        rollbackReason?: string
    }
) {
    // Convert Headers to a plain object
    const headersObject: Record<string, string> = {}
    request.headers.forEach((value, key) => {
        headersObject[key] = value
    })

    Sentry.captureRequestError(
        err,
        {
            path: request.path,
            method: request.method,
            headers: headersObject,
        },
        context
    )
}
