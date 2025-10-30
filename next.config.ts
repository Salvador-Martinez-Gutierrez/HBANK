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
export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "habnk",

  project: "hbank-4c",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true
});