import { createMocks } from 'node-mocks-http'
import handler from '../../../pages/api/deposit/init'

// Mock Hedera SDK
const mockExecute = jest.fn()
const mockGetReceipt = jest.fn()
const mockScheduleId = '0.0.99999'
const mockTransactionId = '0.0.123456@1234567890.123456789'
const mockAccountBalanceQueryExecute = jest.fn()

jest.mock('@hashgraph/sdk', () => ({
    Client: {
        forTestnet: jest.fn(() => ({
            setOperator: jest.fn(),
        })),
    },
    AccountId: {
        fromString: jest.fn((id) => ({ toString: () => id })),
    },
    PrivateKey: {
        fromString: jest.fn(() => ({
            publicKey: { toString: () => 'mock-public-key' },
        })),
    },
    TokenId: {
        fromString: jest.fn((id) => id), // Return the token ID for Map.get()
    },
    AccountBalanceQuery: jest.fn(() => ({
        setAccountId: jest.fn(() => ({
            execute: mockAccountBalanceQueryExecute,
        })),
    })),
    TransferTransaction: jest.fn(() => ({
        addTokenTransfer: jest.fn(function () {
            return this
        }),
        setTransactionMemo: jest.fn(function () {
            return this
        }),
    })),
    ScheduleCreateTransaction: jest.fn(() => ({
        setScheduledTransaction: jest.fn(function () {
            return this
        }),
        setScheduleMemo: jest.fn(function () {
            return this
        }),
        setAdminKey: jest.fn(function () {
            return this
        }),
        setPayerAccountId: jest.fn(function () {
            return this
        }),
        execute: mockExecute,
    })),
}))

// Mock the deposit rate module
jest.mock('../../../src/lib/deposit-rate', () => ({
    calculateHUSDCAmount: jest.fn((amount) => amount * 1.0), // 1:1 rate
    getCurrentRateConfig: jest.fn(() => Promise.resolve({ baseRate: 1.0 })),
}))

describe('/api/deposit/init', () => {
    beforeEach(() => {
        jest.clearAllMocks()

        // Setup environment variables
        process.env.TREASURY_ID = '0.0.6510977'
        process.env.OPERATOR_KEY = 'mock-operator-key'
        process.env.USDC_TOKEN_ID = '0.0.429274'
        process.env.HUSD_TOKEN_ID = '0.0.429275'

        // Setup successful responses
        mockExecute.mockResolvedValue({
            transactionId: { toString: () => mockTransactionId },
            getReceipt: jest.fn(() =>
                Promise.resolve({
                    scheduleId: { toString: () => mockScheduleId },
                })
            ),
        })

        // Setup default balance responses (1000 USDC, 1000 HUSDC)
        mockAccountBalanceQueryExecute.mockResolvedValue({
            tokens: new Map([
                ['0.0.429274', BigInt(1000_000_000)], // 1000 USDC (6 decimals)
                ['0.0.429275', BigInt(1000_00_000_000)], // 1000 HUSDC (8 decimals)
            ]),
        })
    })

    it('should successfully initialize atomic deposit', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                userAccountId: '0.0.12345',
                amount: 100.5,
                expectedRate: 1.0,
                rateSequenceNumber: 'test-sequence-123',
                rateTimestamp: new Date().toISOString(),
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(200)
        const responseData = JSON.parse(res._getData())

        expect(responseData).toEqual({
            success: true,
            scheduleId: mockScheduleId,
            amountHUSDC: 100.5,
            rate: 1.0,
            usdcAmount: 100.5,
            timestamp: expect.any(String),
            txId: mockTransactionId,
        })
    })

    it('should reject invalid amounts', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                userAccountId: '0.0.12345',
                amount: -10,
                expectedRate: 1.0,
                rateSequenceNumber: 'test-sequence-123',
                rateTimestamp: new Date().toISOString(),
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)
        const responseData = JSON.parse(res._getData())
        expect(responseData.error).toBe('Invalid amount')
    })

    it('should reject missing fields', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                userAccountId: '0.0.12345',
                // missing amount
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)
        const responseData = JSON.parse(res._getData())
        expect(responseData.error).toBe('Missing required fields')
    })

    it('should reject non-POST methods', async () => {
        const { req, res } = createMocks({
            method: 'GET',
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(405)
        const responseData = JSON.parse(res._getData())
        expect(responseData.error).toBe('Method not allowed')
    })

    it('should handle insufficient user balance', async () => {
        // Mock insufficient user balance
        mockAccountBalanceQueryExecute.mockResolvedValueOnce({
            tokens: new Map([
                ['0.0.429274', BigInt(50_000_000)], // Only 50 USDC
            ]),
        })

        const { req, res } = createMocks({
            method: 'POST',
            body: {
                userAccountId: '0.0.12345',
                amount: 100.5,
                expectedRate: 1.0,
                rateSequenceNumber: 'test-sequence-123',
                rateTimestamp: new Date().toISOString(),
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)
        const responseData = JSON.parse(res._getData())
        expect(responseData.error).toBe('Insufficient USDC balance')
        expect(responseData.required).toBe(100.5)
        expect(responseData.available).toBe(50)
    })

    it('should handle insufficient treasury balance', async () => {
        // Mock sufficient user balance (first call)
        mockAccountBalanceQueryExecute.mockResolvedValueOnce({
            tokens: new Map([
                ['0.0.429274', BigInt(1000_000_000)], // 1000 USDC
            ]),
        })

        // Mock insufficient treasury balance (second call)
        mockAccountBalanceQueryExecute.mockResolvedValueOnce({
            tokens: new Map([
                ['0.0.429275', BigInt(50_00_000_000)], // Only 50 HUSDC (8 decimals)
            ]),
        })

        const { req, res } = createMocks({
            method: 'POST',
            body: {
                userAccountId: '0.0.12345',
                amount: 100.5,
                expectedRate: 1.0,
                rateSequenceNumber: 'test-sequence-123',
                rateTimestamp: new Date().toISOString(),
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)
        const responseData = JSON.parse(res._getData())
        expect(responseData.error).toBe('Insufficient treasury HUSDC balance')
        expect(responseData.required).toBe(100.5)
        expect(responseData.available).toBe(50)
    })
})
