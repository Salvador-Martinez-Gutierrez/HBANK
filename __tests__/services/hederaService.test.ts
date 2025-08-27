import { HederaService } from '../../src/services/hederaService'

// Mock del SDK de Hedera
jest.mock('@hashgraph/sdk', () => ({
    Client: {
        forTestnet: jest.fn(() => ({
            setOperator: jest.fn(),
        })),
    },
    AccountBalanceQuery: jest.fn(),
    TopicMessageSubmitTransaction: jest.fn(),
    ScheduleCreateTransaction: jest.fn(),
    TransferTransaction: jest.fn(),
    TopicMessageQuery: jest.fn(),
    TokenId: {
        fromString: jest.fn(),
    },
    AccountId: {
        fromString: jest.fn(),
    },
    TopicId: {
        fromString: jest.fn(),
    },
    PrivateKey: {
        fromString: jest.fn(),
    },
    Hbar: {
        fromTinybars: jest.fn(),
    },
}))

describe('HederaService', () => {
    let hederaService: HederaService

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks()

        // Mock environment variables
        process.env.OPERATOR_ID = '0.0.12345'
        process.env.OPERATOR_KEY = 'mock-operator-key'
        process.env.TOPIC_ID = '0.0.67890'
        process.env.TREASURY_ID = '0.0.11111'
        process.env.EMISSIONS_ID = '0.0.22222'
        process.env.USDC_TOKEN_ID = '0.0.33333'
        process.env.HUSD_TOKEN_ID = '0.0.44444'

        hederaService = new HederaService()
    })

    afterEach(() => {
        // Clean up environment variables
        delete process.env.OPERATOR_ID
        delete process.env.OPERATOR_KEY
        delete process.env.TOPIC_ID
        delete process.env.TREASURY_ID
        delete process.env.EMISSIONS_ID
        delete process.env.USDC_TOKEN_ID
        delete process.env.HUSD_TOKEN_ID
    })

    describe('constructor', () => {
        it('should initialize correctly with environment variables', () => {
            expect(hederaService).toBeInstanceOf(HederaService)
        })

        it('should throw error if environment variables are missing', () => {
            delete process.env.OPERATOR_ID

            expect(() => new HederaService()).toThrow(
                'Missing required environment variables'
            )
        })
    })

    describe('scheduleDeposit', () => {
        it('should throw error for amount below minimum', async () => {
            await expect(
                hederaService.scheduleDeposit('0.0.12345', 5)
            ).rejects.toThrow('Minimum deposit is 10 USDC')
        })
    })

    describe('publishRate', () => {
        it('should throw error for negative rate', async () => {
            await expect(
                hederaService.publishRate(-1, 100000, 98500)
            ).rejects.toThrow('Rate must be positive')
        })

        it('should throw error for inconsistent rate calculation', async () => {
            // totalUsd / husdSupply = 100000 / 98500 ≈ 1.015, but we're passing 1.005
            await expect(
                hederaService.publishRate(1.005, 100000, 98500)
            ).rejects.toThrow('Rate calculation is inconsistent')
        })
    })

    describe('getCurrentRate', () => {
        it('should return default rate if no rate found', async () => {
            const rate = await hederaService.getCurrentRate()
            expect(rate).toBe(1.0) // Default rate
        })
    })
})
