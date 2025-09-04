import { HederaService } from '../../src/services/hederaService'

// Mock for Hedera SDK
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
        process.env.TREASURY_KEY = 'mock-treasury-key'
        process.env.EMISSIONS_ID = '0.0.22222'
        process.env.EMISSIONS_KEY = 'mock-emissions-key'
        process.env.DEPOSIT_WALLET_ID = '0.0.33333'
        process.env.DEPOSIT_WALLET_KEY = 'mock-deposit-key'
        process.env.INSTANT_WITHDRAW_WALLET_ID = '0.0.44444'
        process.env.INSTANT_WITHDRAW_WALLET_KEY = 'mock-instant-withdraw-key'
        process.env.STANDARD_WITHDRAW_WALLET_ID = '0.0.55555'
        process.env.STANDARD_WITHDRAW_WALLET_KEY = 'mock-standard-withdraw-key'
        process.env.RATE_PUBLISHER_ID = '0.0.66666'
        process.env.RATE_PUBLISHER_KEY = 'mock-rate-publisher-key'
        process.env.USDC_TOKEN_ID = '0.0.77777'
        process.env.HUSD_TOKEN_ID = '0.0.88888'

        hederaService = new HederaService()
    })

    afterEach(() => {
        // Clean up environment variables
        delete process.env.OPERATOR_ID
        delete process.env.OPERATOR_KEY
        delete process.env.TOPIC_ID
        delete process.env.TREASURY_ID
        delete process.env.TREASURY_KEY
        delete process.env.EMISSIONS_ID
        delete process.env.EMISSIONS_KEY
        delete process.env.DEPOSIT_WALLET_ID
        delete process.env.DEPOSIT_WALLET_KEY
        delete process.env.INSTANT_WITHDRAW_WALLET_ID
        delete process.env.INSTANT_WITHDRAW_WALLET_KEY
        delete process.env.STANDARD_WITHDRAW_WALLET_ID
        delete process.env.STANDARD_WITHDRAW_WALLET_KEY
        delete process.env.RATE_PUBLISHER_ID
        delete process.env.RATE_PUBLISHER_KEY
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
