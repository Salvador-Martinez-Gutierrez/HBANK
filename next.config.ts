import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors. We keep strict rules for development.
        ignoreDuringBuilds: true,
    },
    typescript: {
        // Warning: This allows production builds to successfully complete even if
        // your project has TypeScript errors. Run `pnpm type-check` to see issues.
        ignoreBuildErrors: true,
    },
    webpack: (config, { isServer }) => {
        // Add polyfills for Node.js APIs in the browser
        if (!isServer) {
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
        }
        return config
    },
}

export default nextConfig
