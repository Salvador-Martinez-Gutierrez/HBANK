'use client'

/**
 * Global Error Handler
 *
 * This component catches React rendering errors in the App Router
 * and reports them to Sentry. It also provides a fallback UI.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#react-render-errors-in-app-router
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling#handling-errors-in-root-layouts
 */

import * as Sentry from '@sentry/nextjs'
import NextError from 'next/error'
import { useEffect } from 'react'

interface GlobalErrorProps {
    error: Error & { digest?: string }
    reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
    useEffect(() => {
        // Report the error to Sentry
        Sentry.captureException(error)
    }, [error])

    return (
        <html>
            <body>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <h1>Something went wrong!</h1>
                    <p>We&apos;ve been notified and are looking into it.</p>
                    {error.digest && (
                        <p style={{ fontSize: '0.875rem', color: '#666' }}>
                            Error ID: {error.digest}
                        </p>
                    )}
                    <button
                        onClick={reset}
                        style={{
                            marginTop: '20px',
                            padding: '10px 20px',
                            fontSize: '16px',
                            cursor: 'pointer',
                            backgroundColor: '#0070f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                        }}
                    >
                        Try again
                    </button>
                </div>
                {/* This renders the default Next.js error page */}
                <NextError statusCode={undefined as unknown as number} />
            </body>
        </html>
    )
}
