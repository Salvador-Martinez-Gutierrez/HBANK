import { createMocks } from 'node-mocks-http'
import handler from '../../pages/api/publish-rate'

// Mock del servicio de Hedera
const mockPublishRate = jest.fn()

jest.mock('../../src/services/hederaService', () => {
    return {
        HederaService: jest.fn().mockImplementation(() => ({
            publishRate: mockPublishRate,
        })),
    }
})

describe('/api/publish-rate', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should successfully publish rate', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                rate: 1.005,
                totalUsd: 100000,
                husdSupply: 99502.49, // This should match the rate calculation
            },
        })

        // Mock service response
        mockPublishRate.mockResolvedValue({
            topicId: '0.0.67890',
            rate: 1.005,
            transactionId: 'mock-transaction-id',
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(200)
        expect(JSON.parse(res._getData())).toEqual({
            status: 'published',
            topicId: '0.0.67890',
            rate: 1.005,
        })

        expect(mockPublishRate).toHaveBeenCalledWith(1.005, 100000, 99502.49)
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

    it('should return 400 for missing rate', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                totalUsd: 100000,
                husdSupply: 99502.49,
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)
        expect(JSON.parse(res._getData())).toEqual({
            error: 'rate, totalUsd, and husdSupply are required',
        })
    })

    it('should return 400 for negative rate', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                rate: -1.005,
                totalUsd: 100000,
                husdSupply: 99502.49,
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)
        expect(JSON.parse(res._getData())).toEqual({
            error: 'Rate must be positive',
        })
    })

    it('should return 400 for inconsistent rate calculation', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                rate: 1.005,
                totalUsd: 100000,
                husdSupply: 98500, // This would give rate = 1.015, not 1.005
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)
        expect(JSON.parse(res._getData())).toEqual({
            error: 'Rate calculation is inconsistent with provided values',
        })
    })

    it('should handle service errors gracefully', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                rate: 1.005,
                totalUsd: 100000,
                husdSupply: 99502.49,
            },
        })

        // Mock service error
        mockPublishRate.mockRejectedValue(new Error('HCS submission failed'))

        await handler(req, res)

        expect(res._getStatusCode()).toBe(500)
        expect(JSON.parse(res._getData())).toEqual({
            error: 'Internal server error',
        })
    })
})
