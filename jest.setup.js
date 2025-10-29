// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.NEXT_PUBLIC_HEDERA_NETWORK = 'testnet'
process.env.NEXT_PUBLIC_HEDERA_MIRROR_NODE_URL = 'https://testnet.mirrornode.hedera.com'

// Suppress console errors/warnings in tests unless explicitly testing them
global.console = {
    ...console,
    error: jest.fn(),
    warn: jest.fn(),
}

// Mock uuid to avoid ESM transformation issues
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-uuid-123'),
}))
