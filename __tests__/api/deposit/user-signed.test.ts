import { createMocks } from 'node-mocks-http'
import handler from '../../../pages/api/deposit/user-signed'

// Mock Hedera SDK
const mockExecute = jest.fn()
const mockGetReceipt = jest.fn()
const mockScheduleId = '0.0.99999'
const mockTransactionId = '0.0.123456@1234567890.123456789'
const mockScheduleInfoExecute = jest.fn()

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
    ScheduleId: {
        fromString: jest.fn((id) => ({ toString: () => id })),
    },
    ScheduleInfoQuery: jest.fn(() => ({
        setScheduleId: jest.fn(() => ({
            execute: mockScheduleInfoExecute,
        })),
    })),
    ScheduleSignTransaction: jest.fn(() => ({
        setScheduleId: jest.fn(() => ({
            execute: mockExecute,
        })),
    })),
}))

describe('/api/deposit/user-signed', () => {
    beforeEach(() => {
        jest.clearAllMocks()

        // Setup environment variables
        process.env.DEPOSIT_WALLET_ID = '0.0.6510977'
        process.env.DEPOSIT_WALLET_KEY = 'mock-deposit-key'

        // Setup successful responses
        mockExecute.mockResolvedValue({
            transactionId: { toString: () => mockTransactionId },
            getReceipt: jest.fn(() =>
                Promise.resolve({
                    status: { toString: () => 'SUCCESS' },
                })
            ),
        })
    })

    it('should successfully complete atomic deposit with treasury signature', async () => {
        // Mock schedule info - not executed, not deleted
        mockScheduleInfoExecute.mockResolvedValueOnce({
            scheduleId: { toString: () => mockScheduleId },
            scheduleMemo: 'Test atomic deposit',
            adminKey: { toString: () => 'mock-admin-key' },
            executed: false,
            deleted: false,
        })

        // Mock final schedule info - now executed
        mockScheduleInfoExecute.mockResolvedValueOnce({
            scheduleId: { toString: () => mockScheduleId },
            executed: true,
            deleted: false,
        })

        const { req, res } = createMocks({
            method: 'POST',
            body: {
                scheduleId: mockScheduleId,
                clientRequestId: 'test-client-123',
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(200)
        const responseData = JSON.parse(res._getData())

        expect(responseData).toEqual({
            success: true,
            executed: true,
            txId: mockTransactionId,
            scheduleId: mockScheduleId,
            timestamp: expect.any(String),
            clientRequestId: 'test-client-123',
        })
    })

    it('should handle already executed schedule', async () => {
        // Mock schedule info - already executed
        mockScheduleInfoExecute.mockResolvedValue({
            scheduleId: { toString: () => mockScheduleId },
            executed: true,
            deleted: false,
        })

        const { req, res } = createMocks({
            method: 'POST',
            body: {
                scheduleId: mockScheduleId,
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(200)
        const responseData = JSON.parse(res._getData())

        expect(responseData).toEqual({
            success: true,
            executed: true,
            message: 'Transaction already executed',
            scheduleId: mockScheduleId,
        })
    })

    it('should handle deleted schedule', async () => {
        // Mock schedule info - deleted
        mockScheduleInfoExecute.mockResolvedValue({
            scheduleId: { toString: () => mockScheduleId },
            executed: false,
            deleted: true,
        })

        const { req, res } = createMocks({
            method: 'POST',
            body: {
                scheduleId: mockScheduleId,
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)
        const responseData = JSON.parse(res._getData())
        expect(responseData.error).toBe('Schedule was deleted')
    })

    it('should reject missing scheduleId', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                // missing scheduleId
                clientRequestId: 'test-client-123',
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)
        const responseData = JSON.parse(res._getData())
        expect(responseData.error).toBe('Missing required field: scheduleId')
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

    it('should handle treasury signature failure', async () => {
        // Mock schedule info - not executed, not deleted
        mockScheduleInfoExecute.mockResolvedValueOnce({
            scheduleId: { toString: () => mockScheduleId },
            executed: false,
            deleted: false,
        })

        // Mock failed treasury signature
        mockExecute.mockResolvedValue({
            transactionId: { toString: () => mockTransactionId },
            getReceipt: jest.fn(() =>
                Promise.resolve({
                    status: { toString: () => 'FAIL' },
                })
            ),
        })

        const { req, res } = createMocks({
            method: 'POST',
            body: {
                scheduleId: mockScheduleId,
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(500)
        const responseData = JSON.parse(res._getData())
        expect(responseData.error).toBe('Treasury signature failed')
        expect(responseData.message).toContain(
            'Treasury signature failed with status: FAIL'
        )
    })

    it('should handle invalid schedule ID error', async () => {
        // Mock Hedera error for invalid schedule ID
        mockScheduleInfoExecute.mockRejectedValue(
            new Error('INVALID_SCHEDULE_ID: Schedule does not exist')
        )

        const { req, res } = createMocks({
            method: 'POST',
            body: {
                scheduleId: 'invalid-schedule-id',
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(404)
        const responseData = JSON.parse(res._getData())
        expect(responseData.error).toBe('Schedule not found')
    })

    it('should handle schedule already executed error', async () => {
        // Mock Hedera error for already executed schedule
        mockScheduleInfoExecute.mockRejectedValue(
            new Error(
                'SCHEDULE_ALREADY_EXECUTED: Schedule has already been executed'
            )
        )

        const { req, res } = createMocks({
            method: 'POST',
            body: {
                scheduleId: mockScheduleId,
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(409)
        const responseData = JSON.parse(res._getData())
        expect(responseData.error).toBe('Schedule already executed')
    })

    it('should handle schedule deleted error', async () => {
        // Mock Hedera error for deleted schedule
        mockScheduleInfoExecute.mockRejectedValue(
            new Error('SCHEDULE_ALREADY_DELETED: Schedule has been deleted')
        )

        const { req, res } = createMocks({
            method: 'POST',
            body: {
                scheduleId: mockScheduleId,
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(410)
        const responseData = JSON.parse(res._getData())
        expect(responseData.error).toBe('Schedule was deleted')
    })
})
