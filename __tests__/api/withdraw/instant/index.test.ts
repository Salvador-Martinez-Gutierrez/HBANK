import { createMocks } from 'node-mocks-http'

import handler from '../../../../pages/api/withdraw/instant'
import maxHandler from '../../../../pages/api/withdraw/instant/max'
import { conflict } from '../../../../src/lib/errors'
import { instantWithdrawService } from '../../../../src/services/instantWithdrawService'

jest.mock('../../../../src/services/instantWithdrawService', () => ({
    instantWithdrawService: {
        processInstantWithdrawal: jest.fn(),
        getMaxInstantWithdrawable: jest.fn(),
    },
}))

jest.mock('../../../../src/services/telegramService', () => {
    const sendWithdrawNotificationMock = jest.fn()
    return {
        TelegramService: jest.fn().mockImplementation(() => ({
            sendWithdrawNotification: sendWithdrawNotificationMock,
        })),
        sendWithdrawNotificationMock,
    }
})

const processInstantWithdrawalMock =
    instantWithdrawService.processInstantWithdrawal as jest.Mock
const getMaxInstantWithdrawableMock =
    instantWithdrawService.getMaxInstantWithdrawable as jest.Mock
const { sendWithdrawNotificationMock } = jest.requireMock(
    '../../../../src/services/telegramService'
) as {
    sendWithdrawNotificationMock: jest.Mock
}

describe('/api/withdraw/instant', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('responds with withdrawal data when service succeeds', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                userAccountId: '0.0.12345',
                amountHUSD: 100.5,
                rate: 1.01,
                rateSequenceNumber: '123',
                requestType: 'instant',
            },
        })

        const mockResult = {
            txId: '0.0.123-abc',
            grossUSDC: 101.505,
            feeUSDC: 0.507525,
            netUSDC: 100.997475,
            walletBalanceAfter: 1000,
            topicTxId: '0.0.999-topic',
        }

        processInstantWithdrawalMock.mockResolvedValueOnce(mockResult)

        await handler(req, res)

        expect(res._getStatusCode()).toBe(200)
        expect(JSON.parse(res._getData())).toEqual({
            success: true,
            txId: mockResult.txId,
            grossUSDC: mockResult.grossUSDC,
            fee: mockResult.feeUSDC,
            netUSDC: mockResult.netUSDC,
        })

        expect(processInstantWithdrawalMock).toHaveBeenCalledWith({
            userAccountId: '0.0.12345',
            amountHUSD: 100.5,
            rate: 1.01,
            rateSequenceNumber: '123',
            requestType: 'instant',
        })

        expect(sendWithdrawNotificationMock).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'instant',
                userAccountId: '0.0.12345',
                amountHUSD: 100.5,
                amountUSDC: mockResult.grossUSDC,
                fee: mockResult.feeUSDC,
                walletBalanceAfter: mockResult.walletBalanceAfter,
            })
        )
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
                userAccountId: 'invalid',
                amountHUSD: 100.5,
                rate: 1.01,
                rateSequenceNumber: '123',
                requestType: 'instant',
            },
        })

        await handler(req, res)

        const body = JSON.parse(res._getData())
        expect(res._getStatusCode()).toBe(422)
        expect(body.error).toBe('Validation failed')
        expect(body.details.fieldErrors.userAccountId).toBeDefined()
    })

    it('propagates domain errors from the service', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                userAccountId: '0.0.12345',
                amountHUSD: 100.5,
                rate: 1.01,
                rateSequenceNumber: '123',
                requestType: 'instant',
            },
        })

        processInstantWithdrawalMock.mockRejectedValueOnce(
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
                amountHUSD: 100.5,
                rate: 1.01,
                rateSequenceNumber: '123',
                requestType: 'instant',
            },
        })

        processInstantWithdrawalMock.mockRejectedValueOnce(new Error('boom'))

        await handler(req, res)

        expect(res._getStatusCode()).toBe(500)
        expect(JSON.parse(res._getData())).toEqual({
            error: 'Unexpected server error',
        })
    })
})

describe('/api/withdraw/instant/max', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('returns max withdrawable amounts when service succeeds', async () => {
        const { req, res } = createMocks({ method: 'GET' })

        const mockResult = {
            maxInstantWithdrawable: 500,
            treasuryBalance: 500,
        }

        getMaxInstantWithdrawableMock.mockResolvedValueOnce(mockResult)

        await maxHandler(req, res)

        expect(res._getStatusCode()).toBe(200)
        expect(JSON.parse(res._getData())).toEqual(mockResult)
        expect(getMaxInstantWithdrawableMock).toHaveBeenCalledTimes(1)
    })

    it('rejects unsupported HTTP methods', async () => {
        const { req, res } = createMocks({ method: 'POST' })

        await maxHandler(req, res)

        expect(res._getStatusCode()).toBe(405)
        expect(JSON.parse(res._getData())).toEqual({
            error: 'Method not allowed',
            allowedMethods: ['GET'],
        })
    })
})
