import { InstantWithdrawService } from '@/services/instantWithdrawService'
import type { ScopedLogger } from '@/lib/logger'
import type { HederaRateService } from '@/services/hederaRateService'
import type { Client } from '@hashgraph/sdk'

jest.mock('@/services/hederaRateService', () => ({
    HederaRateService: jest.fn().mockImplementation(() => ({
        getLatestRate: jest.fn(),
    })),
}))

const createLoggerStub = (): ScopedLogger => {
    const logger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        child: jest.fn(),
    } as unknown as ScopedLogger

    ;(logger.child as jest.Mock).mockReturnValue(logger)

    return logger
}

const createResponse = (status: number, body: unknown): Response => {
    const ok = status >= 200 && status < 300
    return {
        ok,
        status,
        statusText: ok ? 'OK' : 'Error',
        json: async () => body,
    } as Response
}

class TestInstantWithdrawService extends InstantWithdrawService {
    public async testVerifyHusdTransfer(params: {
        fromAccount: string
        toAccount: string
        tokenId: string
        amountTiny: bigint
        since: Date
    }): Promise<boolean> {
        return this.verifyHusdTransfer(params)
    }
}

describe('InstantWithdrawService', () => {
    const rateServiceStub = {
        getLatestRate: jest.fn(),
    } as unknown as HederaRateService

    type GetClientFn = (
        operator: 'deposit' | 'emissions' | 'instantWithdraw'
    ) => Client
    const getClientStub = jest.fn() as unknown as GetClientFn

    it('formats timestamp correctly for Mirror Node queries', async () => {
        const fetchMock = jest
            .fn()
            .mockResolvedValue(createResponse(200, { transactions: [] }))

        const service = new TestInstantWithdrawService({
            rateService: rateServiceStub,
            getClient: getClientStub,
            fetchFn: fetchMock,
            logger: createLoggerStub(),
            retryAttempts: 1,
            retryDelayMs: 1,
        })

        await service.testVerifyHusdTransfer({
            fromAccount: '0.0.123',
            toAccount: '0.0.456',
            tokenId: '0.0.789',
            amountTiny: BigInt(1000),
            since: new Date('2025-01-01T00:00:00.123Z'),
        })

        const url = new URL(fetchMock.mock.calls[0][0] as string)
        expect(url.searchParams.get('timestamp')).toBe(
            'gte:1735689540.123000000'
        )
        expect(url.searchParams.getAll('account.id')).toEqual([
            '0.0.456',
            '0.0.123',
        ])
        expect(url.searchParams.get('transactiontype')).toBe('CRYPTOTRANSFER')
    })

    it('retries Mirror Node queries on retryable errors', async () => {
        const transactionsPayload = {
            transactions: [
                {
                    token_transfers: [
                        {
                            token_id: '0.0.789',
                            account: '0.0.456',
                            amount: '1000',
                        },
                        {
                            token_id: '0.0.789',
                            account: '0.0.123',
                            amount: '-1000',
                        },
                    ],
                },
            ],
        }

        const fetchMock = jest
            .fn()
            .mockResolvedValueOnce(createResponse(502, {}))
            .mockResolvedValueOnce(createResponse(200, transactionsPayload))

        const service = new TestInstantWithdrawService({
            rateService: rateServiceStub,
            getClient: getClientStub,
            fetchFn: fetchMock,
            logger: createLoggerStub(),
            retryAttempts: 3,
            retryDelayMs: 1,
        })

        const result = await service.testVerifyHusdTransfer({
            fromAccount: '0.0.123',
            toAccount: '0.0.456',
            tokenId: '0.0.789',
            amountTiny: BigInt(1000),
            since: new Date('2025-01-01T00:00:00.000Z'),
        })

        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(result).toBe(true)
    })

    it('does not retry on client errors', async () => {
        const fetchMock = jest
            .fn()
            .mockResolvedValue(createResponse(400, { message: 'bad request' }))

        const service = new TestInstantWithdrawService({
            rateService: rateServiceStub,
            getClient: getClientStub,
            fetchFn: fetchMock,
            logger: createLoggerStub(),
        })

        const result = await service.testVerifyHusdTransfer({
            fromAccount: '0.0.123',
            toAccount: '0.0.456',
            tokenId: '0.0.789',
            amountTiny: BigInt(1000),
            since: new Date('2025-01-01T00:00:00.000Z'),
        })

        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(result).toBe(false)
    })

    it('retries when transfer is not yet visible and eventually succeeds', async () => {
        const emptyResponse = createResponse(200, { transactions: [] })
        const successResponse = createResponse(200, {
            transactions: [
                {
                    token_transfers: [
                        {
                            token_id: '0.0.789',
                            account: '0.0.456',
                            amount: '1000',
                        },
                        {
                            token_id: '0.0.789',
                            account: '0.0.123',
                            amount: '-1000',
                        },
                    ],
                },
            ],
        })

        const fetchMock = jest
            .fn()
            .mockResolvedValueOnce(emptyResponse)
            .mockResolvedValueOnce(emptyResponse)
            .mockResolvedValueOnce(successResponse)

        const service = new TestInstantWithdrawService({
            rateService: rateServiceStub,
            getClient: getClientStub,
            fetchFn: fetchMock,
            logger: createLoggerStub(),
            retryAttempts: 3,
            retryDelayMs: 1,
        })

        const result = await service.testVerifyHusdTransfer({
            fromAccount: '0.0.123',
            toAccount: '0.0.456',
            tokenId: '0.0.789',
            amountTiny: BigInt(1000),
            since: new Date('2025-01-01T00:00:00.000Z'),
        })

        expect(fetchMock).toHaveBeenCalledTimes(3)
        expect(result).toBe(true)
    })
})
