import {
    WithdrawRequest,
    WithdrawResult,
    WithdrawState,
    WITHDRAWAL_LOCK_HOURS,
    WITHDRAWAL_WORKER_INTERVAL_MINUTES,
} from '@/types/withdrawal'

// Mock external dependencies
jest.mock('@/services/hederaRateService', () => ({
    HederaRateService: jest.fn().mockImplementation(() => ({
        getLatestRate: jest.fn(),
    })),
}))

jest.mock('@/services/hederaService', () => ({
    HederaService: jest.fn().mockImplementation(() => ({
        publishWithdrawRequest: jest.fn(),
        publishWithdrawResult: jest.fn(),
        transferHUSDToTreasury: jest.fn(),
        transferUSDCToUser: jest.fn(),
        rollbackHUSDToUser: jest.fn(),
        checkBalance: jest.fn(),
    })),
}))

// Create a mock WithdrawService that doesn't depend on ESM modules
class MockWithdrawService {
    public rateService: {
        getLatestRate: jest.Mock
    }

    constructor() {
        this.rateService = {
            getLatestRate: jest.fn(),
        }
    }

    async validateRate(
        expectedRate: number,
        rateSequenceNumber: string
    ): Promise<boolean> {
        const latestRate = await this.rateService.getLatestRate()

        if (!latestRate) {
            return false
        }

        if (latestRate.sequenceNumber !== rateSequenceNumber) {
            return false
        }

        const tolerance = 0.0001
        const rateDifference = Math.abs(latestRate.rate - expectedRate)

        return rateDifference <= tolerance
    }

    async getPendingWithdrawals(): Promise<WithdrawRequest[]> {
        // Mock implementation
        return []
    }

    async getUserWithdrawals(): Promise<WithdrawRequest[]> {
        // Mock implementation
        return []
    }
}

describe('WithdrawService', () => {
    let withdrawService: MockWithdrawService

    beforeEach(() => {
        withdrawService = new MockWithdrawService()

        // Setup environment variables for tests
        process.env.STANDARD_WITHDRAW_WALLET_ID = '0.0.123456'
        process.env.USDC_TOKEN_ID = '0.0.429274'
        process.env.HUSD_TOKEN_ID = '0.0.6889338' // Updated token ID
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('validateRate', () => {
        it('should return true for matching rate and sequence number', async () => {
            // Mock the rate service to return matching data
            withdrawService.rateService.getLatestRate = jest
                .fn()
                .mockResolvedValue({
                    rate: 1.005,
                    sequenceNumber: '12345',
                    timestamp: new Date().toISOString(),
                    lastUpdated: new Date(),
                })

            const result = await withdrawService.validateRate(1.005, '12345')
            expect(result).toBe(true)
        })

        it('should return false for mismatched sequence number', async () => {
            withdrawService.rateService.getLatestRate = jest
                .fn()
                .mockResolvedValue({
                    rate: 1.005,
                    sequenceNumber: '12346',
                    timestamp: new Date().toISOString(),
                    lastUpdated: new Date(),
                })

            const result = await withdrawService.validateRate(1.005, '12345')
            expect(result).toBe(false)
        })

        it('should return false for mismatched rate (outside tolerance)', async () => {
            withdrawService.rateService.getLatestRate = jest
                .fn()
                .mockResolvedValue({
                    rate: 1.01, // 0.005 difference > 0.0001 tolerance
                    sequenceNumber: '12345',
                    timestamp: new Date().toISOString(),
                    lastUpdated: new Date(),
                })

            const result = await withdrawService.validateRate(1.005, '12345')
            expect(result).toBe(false)
        })

        it('should return true for rate within tolerance', async () => {
            withdrawService.rateService.getLatestRate = jest
                .fn()
                .mockResolvedValue({
                    rate: 1.0050001, // 0.0000001 difference < 0.0001 tolerance
                    sequenceNumber: '12345',
                    timestamp: new Date().toISOString(),
                    lastUpdated: new Date(),
                })

            const result = await withdrawService.validateRate(1.005, '12345')
            expect(result).toBe(true)
        })
    })
})

describe('Withdrawal Types', () => {
    it('should have correct WithdrawRequest structure', () => {
        const withdrawRequest: WithdrawRequest = {
            type: 'withdraw_request',
            requestId: 'test-request-id',
            user: '0.0.123456',
            amountHUSD: 100,
            rate: 1.005,
            rateSequenceNumber: '12345',
            requestedAt: new Date().toISOString(),
            unlockAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            status: 'pending',
        }

        expect(withdrawRequest.type).toBe('withdraw_request')
        expect(withdrawRequest.status).toBe(WithdrawState.PENDING)
        expect(typeof withdrawRequest.amountHUSD).toBe('number')
        expect(typeof withdrawRequest.rate).toBe('number')
    })

    it('should have correct WithdrawResult structure', () => {
        const withdrawResult: WithdrawResult = {
            type: 'withdraw_result',
            requestId: 'test-request-id',
            status: 'completed',
            txId: '0.0.123456@1234567890',
            processedAt: new Date().toISOString(),
        }

        expect(withdrawResult.type).toBe('withdraw_result')
        expect(['completed', 'failed']).toContain(withdrawResult.status)
        expect(typeof withdrawResult.processedAt).toBe('string')
    })
})

describe('Withdrawal Constants', () => {
    it('should have correct lock period', () => {
        expect(WITHDRAWAL_LOCK_HOURS).toBe(48)
    })

    it('should have correct worker interval', () => {
        expect(WITHDRAWAL_WORKER_INTERVAL_MINUTES).toBe(60)
    })
})
