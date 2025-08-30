import { createMocks } from 'node-mocks-http'
import handler from '../../pages/api/deposit'

// Mock for Hedera service
const mockCheckBalance = jest.fn()
const mockGetCurrentRate = jest.fn()
const mockScheduleDeposit = jest.fn()

jest.mock('../../src/services/hederaService', () => {
    return {
        HederaService: jest.fn().mockImplementation(() => ({
            checkBalance: mockCheckBalance,
            getCurrentRate: mockGetCurrentRate,
            scheduleDeposit: mockScheduleDeposit,
        })),
    }
})

describe('/api/deposit', () => {
    beforeEach(() => {
        jest.clearAllMocks()

        // Setup environment variables
        process.env.USDC_TOKEN_ID = '0.0.33333'
    })

    it('should successfully process deposit request', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                accountId: '0.0.12345',
                amountUsdc: 100,
            },
        })

        // Mock service responses
        mockCheckBalance.mockResolvedValue(150) // User has 150 USDC
        mockGetCurrentRate.mockResolvedValue(1.005)
        mockScheduleDeposit.mockResolvedValue({
            scheduleId: '0.0.99999',
            husdAmount: 99.5,
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(200)
        expect(JSON.parse(res._getData())).toEqual({
            status: 'success',
            scheduleId: '0.0.99999',
            husdAmount: 99.5,
        })

        expect(mockCheckBalance).toHaveBeenCalledWith('0.0.12345', '0.0.33333')
        expect(mockScheduleDeposit).toHaveBeenCalledWith('0.0.12345', 100)
    })

    it('should return 405 for non-POST requests', async () => {
        const { req, res } = createMocks({
            method: 'GET',
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(405)
        expect(JSON.parse(res._getData())).toEqual({
            error: 'Method not allowed',
        })
    })

    it('should return 400 for missing accountId', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                amountUsdc: 100,
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)
        expect(JSON.parse(res._getData())).toEqual({
            error: 'accountId and amountUsdc are required',
        })
    })

    it('should return 400 for amount below minimum', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                accountId: '0.0.12345',
                amountUsdc: 5,
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)
        expect(JSON.parse(res._getData())).toEqual({
            error: 'Minimum deposit is 10 USDC',
        })
    })

    it('should return 400 for insufficient balance', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                accountId: '0.0.12345',
                amountUsdc: 100,
            },
        })

        // Mock insufficient balance
        mockCheckBalance.mockResolvedValue(50) // User has only 50 USDC

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)
        expect(JSON.parse(res._getData())).toEqual({
            error: 'Insufficient USDC balance',
        })
    })

    it('should handle service errors gracefully', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                accountId: '0.0.12345',
                amountUsdc: 100,
            },
        })

        // Mock service error
        mockCheckBalance.mockRejectedValue(new Error('Network error'))

        await handler(req, res)

        expect(res._getStatusCode()).toBe(500)
        expect(JSON.parse(res._getData())).toEqual({
            error: 'Internal server error',
        })
    })
})
