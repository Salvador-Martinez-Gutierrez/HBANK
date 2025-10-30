import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
    typescript: {
        ignoreBuildErrors: true,
    },
    webpack: (config, { isServer }) => {
        // Add polyfills for Node.js APIs in the browser
        if (!isServer) {
            /* eslint-disable @typescript-eslint/no-require-imports */
            config.resolve.fallback = {
                ...config.resolve.fallback,
                buffer: require.resolve('buffer'),
                crypto: require.resolve('crypto-browserify'),
                stream: require.resolve('stream-browserify'),
                path: require.resolve('path-browserify'),
                fs: false,
                net: false,
                tls: false,
            }
            /* eslint-enable @typescript-eslint/no-require-imports */
        }
        return config
    },
    // Note: instrumentation.ts is now enabled by default in Next.js 15
    // No need for experimental.instrumentationHook
}

// Sentry webpack plugin options
const sentryWebpackPluginOptions = {
    // Only upload source maps in production
    silent: true,
    // Suppress all logs except errors
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    // Auth token for uploading source maps
    authToken: process.env.SENTRY_AUTH_TOKEN,
}

// Wrap config with Sentry
export default withSentryConfig(nextConfig, sentryWebpackPluginOptions)
