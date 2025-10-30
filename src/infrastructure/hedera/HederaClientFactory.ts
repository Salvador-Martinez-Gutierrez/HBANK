/**
 * Hedera Client Factory
 *
 * Centralized factory for creating and configuring Hedera clients.
 * Manages credentials and client configuration for different wallet types.
 */

import { injectable } from 'inversify'
import { Client, AccountId, PrivateKey, TopicId, Hbar } from '@hashgraph/sdk'
import { createScopedLogger } from '@/lib/logger'

const logger = createScopedLogger('hedera-client-factory')

/**
 * Wallet types supported by the system
 */
export type WalletType =
    | 'deposit'
    | 'instant-withdraw'
    | 'standard-withdraw'
    | 'treasury'
    | 'emissions'
    | 'rate-publisher'

/**
 * Wallet credentials
 */
export interface WalletCredentials {
    id: string
    key: string
}

/**
 * Hedera Client Factory
 *
 * Creates configured Hedera clients for various operations.
 * Manages environment-based configuration and credentials.
 */
@injectable()
export class HederaClientFactory {
    private readonly useRealTestnet: boolean
    private readonly operatorId: AccountId
    private readonly operatorKey: PrivateKey
    private readonly topicId: TopicId

    // Decimal multipliers
    public readonly HBAR_MULTIPLIER: number
    public readonly USDC_MULTIPLIER: number
    public readonly HUSD_MULTIPLIER: number

    constructor() {
        // Check environment mode
        this.useRealTestnet = process.env.USE_REAL_TESTNET === 'true'

        if (!this.useRealTestnet) {
            logger.warn(
                '⚠️ Running in mock mode. Set USE_REAL_TESTNET=true for real transactions'
            )
        }

        // Load operator credentials
        const operatorIdStr = process.env.OPERATOR_ID
        const operatorKeyStr = process.env.OPERATOR_KEY
        const topicIdStr = process.env.TOPIC_ID

        if (!operatorIdStr || !operatorKeyStr || !topicIdStr) {
            throw new Error(
                'Missing required Hedera credentials: OPERATOR_ID, OPERATOR_KEY, TOPIC_ID'
            )
        }

        this.operatorId = AccountId.fromString(operatorIdStr)
        this.operatorKey = PrivateKey.fromString(operatorKeyStr)
        this.topicId = TopicId.fromString(topicIdStr)

        // Initialize decimal multipliers
        this.HBAR_MULTIPLIER = Math.pow(10, parseInt(process.env.HBAR_DECIMALS ?? '8'))
        this.USDC_MULTIPLIER = Math.pow(10, parseInt(process.env.USDC_DECIMALS ?? '6'))
        this.HUSD_MULTIPLIER = Math.pow(10, parseInt(process.env.HUSD_DECIMALS ?? '3'))

        logger.info('✅ Hedera client factory initialized')
        logger.info(`   Operator: ${this.operatorId.toString()}`)
        logger.info(`   Topic: ${this.topicId.toString()}`)
        logger.info(`   Mode: ${this.useRealTestnet ? 'REAL TESTNET' : 'MOCK'}`)
    }

    /**
     * Creates the main operator client
     *
     * @returns Configured Hedera client with operator credentials
     */
    createMainClient(): Client {
        const client = Client.forTestnet()
        client.setOperator(this.operatorId, this.operatorKey)
        this.configureClientLimits(client)

        logger.debug('Created main operator client')
        return client
    }

    /**
     * Creates a client configured for a specific wallet
     *
     * @param walletId - Hedera account ID
     * @param walletKey - Private key for the wallet
     * @returns Configured client for the wallet
     */
    createClientForWallet(walletId: string, walletKey: string): Client {
        const client = Client.forTestnet()
        client.setOperator(AccountId.fromString(walletId), PrivateKey.fromString(walletKey))
        this.configureClientLimits(client)

        logger.debug('Created wallet client', { walletId })
        return client
    }

    /**
     * Creates a client for a specific wallet type
     *
     * @param walletType - Type of wallet to create client for
     * @returns Configured client for the wallet type
     */
    createClientForWalletType(walletType: WalletType): Client {
        const credentials = this.getWalletCredentials(walletType)
        return this.createClientForWallet(credentials.id, credentials.key)
    }

    /**
     * Gets wallet credentials for a specific wallet type
     *
     * @param walletType - Type of wallet
     * @returns Wallet credentials (ID and key)
     */
    getWalletCredentials(walletType: WalletType): WalletCredentials {
        switch (walletType) {
            case 'deposit':
                return {
                    id: this.getRequiredEnv('DEPOSIT_WALLET_ID'),
                    key: this.getRequiredEnv('DEPOSIT_WALLET_KEY'),
                }
            case 'instant-withdraw':
                return {
                    id: this.getRequiredEnv('INSTANT_WITHDRAW_WALLET_ID'),
                    key: this.getRequiredEnv('INSTANT_WITHDRAW_WALLET_KEY'),
                }
            case 'standard-withdraw':
                return {
                    id: this.getRequiredEnv('STANDARD_WITHDRAW_WALLET_ID'),
                    key: this.getRequiredEnv('STANDARD_WITHDRAW_WALLET_KEY'),
                }
            case 'treasury':
                return {
                    id: this.getRequiredEnv('TREASURY_ID'),
                    key: this.getRequiredEnv('TREASURY_KEY'),
                }
            case 'emissions':
                return {
                    id: this.getRequiredEnv('EMISSIONS_ID'),
                    key: this.getRequiredEnv('EMISSIONS_KEY'),
                }
            case 'rate-publisher':
                return {
                    id: this.getRequiredEnv('RATE_PUBLISHER_ID'),
                    key: this.getRequiredEnv('RATE_PUBLISHER_KEY'),
                }
            default:
                throw new Error(`Unknown wallet type: ${walletType}`)
        }
    }

    /**
     * Gets the operator account ID
     */
    getOperatorId(): AccountId {
        return this.operatorId
    }

    /**
     * Gets the operator private key
     */
    getOperatorKey(): PrivateKey {
        return this.operatorKey
    }

    /**
     * Gets the topic ID for consensus service
     */
    getTopicId(): TopicId {
        return this.topicId
    }

    /**
     * Checks if running in real testnet mode
     */
    isRealTestnet(): boolean {
        return this.useRealTestnet
    }

    /**
     * Configures transaction and query limits for a client
     *
     * @param client - Client to configure
     */
    private configureClientLimits(client: Client): void {
        client.setDefaultMaxTransactionFee(new Hbar(10))
        client.setDefaultMaxQueryPayment(new Hbar(5))
    }

    /**
     * Gets required environment variable or throws error
     *
     * @param key - Environment variable name
     * @returns Environment variable value
     */
    private getRequiredEnv(key: string): string {
        const value = process.env[key]
        if (!value) {
            throw new Error(`Missing required environment variable: ${key}`)
        }
        return value
    }
}
