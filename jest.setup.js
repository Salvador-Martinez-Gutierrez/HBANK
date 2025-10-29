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

// Mock Hedera SDK globally to avoid TextEncoder issues
jest.mock('@hashgraph/sdk', () => {
    const mockAccountId = {
        fromString: jest.fn((str) => ({ toString: () => str, shard: 0, realm: 0, num: parseInt(str.split('.').pop()) })),
    }

    const mockClient = {
        forTestnet: jest.fn(() => ({
            setOperator: jest.fn(),
            close: jest.fn(),
        })),
        forMainnet: jest.fn(() => ({
            setOperator: jest.fn(),
            close: jest.fn(),
        })),
    }

    const mockPrivateKey = {
        generateED25519: jest.fn(() => ({
            publicKey: { toString: () => 'mock-public-key' },
            toString: () => 'mock-private-key',
        })),
        fromString: jest.fn((str) => ({
            publicKey: { toString: () => 'mock-public-key' },
            toString: () => str,
        })),
    }

    return {
        Client: mockClient,
        AccountId: mockAccountId,
        PrivateKey: mockPrivateKey,
        PublicKey: {
            fromString: jest.fn((str) => ({ toString: () => str })),
        },
        TokenId: {
            fromString: jest.fn((str) => ({ toString: () => str })),
        },
    }
})
