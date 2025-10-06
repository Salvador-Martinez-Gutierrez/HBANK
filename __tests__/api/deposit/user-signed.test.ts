import { createMocks } from 'node-mocks-http'

import handler from '../../../pages/api/deposit/user-signed'
import { conflict, gone, notFound } from '../../../src/lib/errors'
import { depositService } from '../../../src/services/depositService'

jest.mock('../../../src/services/depositService', () => ({
    depositService: {
        completeTreasurySignature: jest.fn(),
    },
}))

const completeTreasurySignatureMock =
    depositService.completeTreasurySignature as jest.Mock

describe('/api/deposit/user-signed', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('returns treasury signature result', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                scheduleId: '0.0.9999',
                clientRequestId: 'client-1',
            },
        })

        const mockResult = {
            success: true,
            executed: true,
            txId: 'tx-id',
            scheduleId: '0.0.9999',
            timestamp: new Date().toISOString(),
        }

        completeTreasurySignatureMock.mockResolvedValueOnce(mockResult)

        await handler(req, res)

        expect(res._getStatusCode()).toBe(200)
        expect(JSON.parse(res._getData())).toEqual({
            ...mockResult,
            clientRequestId: 'client-1',
        })
        expect(completeTreasurySignatureMock).toHaveBeenCalledWith({
            scheduleId: '0.0.9999',
            clientRequestId: 'client-1',
        })
    })

    it('rejects unsupported HTTP methods', async () => {
        const { req, res } = createMocks({ method: 'GET' })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(405)
        expect(JSON.parse(res._getData())).toEqual({
            error: 'Method not allowed',
            allowedMethods: ['POST'],
        })
    })

    it('returns 422 for invalid schedule IDs', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                scheduleId: 'invalid-id',
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(422)
        const body = JSON.parse(res._getData())
        expect(body.error).toBe('Validation failed')
    })

    it('maps not found errors', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                scheduleId: '0.0.8888',
            },
        })

        completeTreasurySignatureMock.mockRejectedValueOnce(
            notFound('Schedule missing', { scheduleId: '0.0.8888' })
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(404)
        expect(JSON.parse(res._getData())).toEqual({
            error: 'Schedule missing',
            details: { scheduleId: '0.0.8888' },
        })
    })

    it('maps conflict errors', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                scheduleId: '0.0.8888',
            },
        })

        completeTreasurySignatureMock.mockRejectedValueOnce(
            conflict('Schedule already executed')
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(409)
        expect(JSON.parse(res._getData())).toEqual({
            error: 'Schedule already executed',
        })
    })

    it('maps gone errors', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                scheduleId: '0.0.8888',
            },
        })

        completeTreasurySignatureMock.mockRejectedValueOnce(
            gone('Schedule deleted')
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(410)
        expect(JSON.parse(res._getData())).toEqual({
            error: 'Schedule deleted',
        })
    })

    it('masks unexpected errors', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                scheduleId: '0.0.8888',
            },
        })

        completeTreasurySignatureMock.mockRejectedValueOnce(new Error('boom'))

        await handler(req, res)

        expect(res._getStatusCode()).toBe(500)
        expect(JSON.parse(res._getData())).toEqual({
            error: 'Unexpected server error',
        })
    })
})
