import type { NextConfig } from 'next'

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
}

export default nextConfig
