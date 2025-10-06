import { createMocks } from 'node-mocks-http'

import handler from '../../../pages/api/deposit/init'
import { conflict } from '../../../src/lib/errors'
import { depositService } from '../../../src/services/depositService'

jest.mock('../../../src/services/depositService', () => ({
    depositService: {
        initializeDeposit: jest.fn(),
    },
}))

const initializeDepositMock = depositService.initializeDeposit as jest.Mock

describe('/api/deposit/init', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('responds with deposit data when service succeeds', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                userAccountId: '0.0.12345',
                amount: 100.5,
                expectedRate: 1.01,
                rateSequenceNumber: '123',
            },
        })

        const mockResult = {
            success: true,
            scheduleId: '0.0.9999',
            amountHUSDC: 99.5,
            rate: 1.01,
            rateSequenceNumber: '123',
            usdcAmount: 100.5,
            timestamp: new Date().toISOString(),
            txId: 'tx-id',
        }

        initializeDepositMock.mockResolvedValueOnce(mockResult)

        await handler(req, res)

        expect(res._getStatusCode()).toBe(200)
        expect(JSON.parse(res._getData())).toEqual(mockResult)
        expect(initializeDepositMock).toHaveBeenCalledWith({
            userAccountId: '0.0.12345',
            amount: 100.5,
            expectedRate: 1.01,
            rateSequenceNumber: '123',
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

    it('returns 422 for validation errors', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                userAccountId: 'invalid-account',
                amount: 100,
                expectedRate: 1.01,
                rateSequenceNumber: '123',
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(422)
        const body = JSON.parse(res._getData())
        expect(body.error).toBe('Validation failed')
        expect(body.details.fieldErrors.userAccountId).toBeDefined()
    })

    it('propagates domain errors from the service', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                userAccountId: '0.0.12345',
                amount: 100.5,
                expectedRate: 1.01,
                rateSequenceNumber: '123',
            },
        })

        initializeDepositMock.mockRejectedValueOnce(
            conflict('Rate changed', { sequence: '999' })
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(409)
        expect(JSON.parse(res._getData())).toEqual({
            error: 'Rate changed',
            details: { sequence: '999' },
        })
    })

    it('masks unexpected errors', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                userAccountId: '0.0.12345',
                amount: 100.5,
                expectedRate: 1.01,
                rateSequenceNumber: '123',
            },
        })

        initializeDepositMock.mockRejectedValueOnce(new Error('boom'))

        await handler(req, res)

        expect(res._getStatusCode()).toBe(500)
        expect(JSON.parse(res._getData())).toEqual({
            error: 'Unexpected server error',
        })
    })
})
