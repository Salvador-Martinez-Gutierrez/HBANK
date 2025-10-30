/**
 * Hedera Client Factory
 *
 * Centralized factory for creating and configuring Hedera clients.
 * Manages credentials and client configuration for different wallet types.
 */

import { injectable } from 'inversify'
import { Client, AccountId, PrivateKey, TopicId, Hbar } from '@hashgraph/sdk'
import { createScopedLogger } from '@/lib/logger'
import { serverEnv } from '@/config/serverEnv'

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
        this.useRealTestnet = serverEnv.hedera.useRealTestnet

        if (!this.useRealTestnet) {
            logger.warn(
                '⚠️ Running in mock mode. Set USE_REAL_TESTNET=true for real transactions'
            )
        }

        // Load operator credentials
        if (!serverEnv.operators.legacy) {
            throw new Error(
                'Missing required Hedera credentials: OPERATOR_ID, OPERATOR_KEY'
            )
        }

        this.operatorId = AccountId.fromString(serverEnv.operators.legacy.accountId)
        this.operatorKey = PrivateKey.fromString(serverEnv.operators.legacy.privateKey)

        if (!serverEnv.topics.main) {
            throw new Error('Missing required TOPIC_ID')
        }
        this.topicId = TopicId.fromString(serverEnv.topics.main)

        // Initialize decimal multipliers
        this.HBAR_MULTIPLIER = Math.pow(10, serverEnv.decimals.hbar)
        this.USDC_MULTIPLIER = Math.pow(10, serverEnv.decimals.usdc)
        this.HUSD_MULTIPLIER = Math.pow(10, serverEnv.decimals.husd)

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
                    id: serverEnv.operators.deposit.accountId,
                    key: serverEnv.operators.deposit.privateKey,
                }
            case 'instant-withdraw':
                return {
                    id: serverEnv.operators.instantWithdraw.accountId,
                    key: serverEnv.operators.instantWithdraw.privateKey,
                }
            case 'standard-withdraw':
                if (!serverEnv.operators.standardWithdraw) {
                    throw new Error('STANDARD_WITHDRAW_WALLET credentials not configured')
                }
                return {
                    id: serverEnv.operators.standardWithdraw.accountId,
                    key: serverEnv.operators.standardWithdraw.privateKey,
                }
            case 'treasury':
                if (!serverEnv.operators.treasury) {
                    throw new Error('TREASURY credentials not configured')
                }
                return {
                    id: serverEnv.operators.treasury.accountId,
                    key: serverEnv.operators.treasury.privateKey,
                }
            case 'emissions':
                return {
                    id: serverEnv.operators.emissions.accountId,
                    key: serverEnv.operators.emissions.privateKey,
                }
            case 'rate-publisher':
                if (!serverEnv.operators.ratePublisher) {
                    throw new Error('RATE_PUBLISHER credentials not configured')
                }
                return {
                    id: serverEnv.operators.ratePublisher.accountId,
                    key: serverEnv.operators.ratePublisher.privateKey,
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

}
