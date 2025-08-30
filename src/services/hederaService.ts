import {
    Client,
    TopicMessageSubmitTransaction,
    AccountId,
    PrivateKey,
    TopicId,
    TransferTransaction,
    ScheduleCreateTransaction,
    Hbar,
    AccountBalanceQuery,
    TokenId,
} from '@hashgraph/sdk'

export class HederaService {
    private client: Client
    private operatorId: AccountId
    private operatorKey: PrivateKey
    private topicId: TopicId

    constructor() {
        // Check if we are using real testnet
        const useRealTestnet = process.env.USE_REAL_TESTNET === 'true'

        if (!useRealTestnet) {
            console.log(
                '⚠️ Running in mock mode. Set USE_REAL_TESTNET=true for real transactions'
            )
        }

        // Configure credentials
        const operatorIdStr = process.env.OPERATOR_ID
        const operatorKeyStr = process.env.OPERATOR_KEY
        const topicIdStr = process.env.TOPIC_ID

        if (!operatorIdStr || !operatorKeyStr || !topicIdStr) {
            throw new Error(
                'Missing required Hedera credentials in environment variables'
            )
        }

        // Initialize Hedera client
        this.operatorId = AccountId.fromString(operatorIdStr)
        this.operatorKey = PrivateKey.fromString(operatorKeyStr)
        this.topicId = TopicId.fromString(topicIdStr)

        // Configure client for testnet
        this.client = Client.forTestnet()
        this.client.setOperator(this.operatorId, this.operatorKey)

        // Configure transaction limits
        this.client.setDefaultMaxTransactionFee(new Hbar(10))
        this.client.setDefaultMaxQueryPayment(new Hbar(5))

        console.log('✅ Hedera client initialized for testnet')
        console.log(`   Operator: ${this.operatorId.toString()}`)
        console.log(`   Topic: ${this.topicId.toString()}`)
    }

    /**
     * Publishes exchange rate information to Hedera Consensus Service
     */
    async publishRate(rate: number, totalUsd: number, husdSupply: number) {
        try {
            // Validations
            if (rate <= 0) {
                throw new Error('Rate must be positive')
            }

            if (totalUsd <= 0 || husdSupply <= 0) {
                throw new Error('totalUsd and husdSupply must be positive')
            }

            // Verify rate consistency
            const calculatedRate = totalUsd / husdSupply
            const tolerance = 0.001 // 0.1%
            if (Math.abs(calculatedRate - rate) / rate > tolerance) {
                throw new Error(
                    'Rate calculation is inconsistent with provided values'
                )
            }

            // Create message for HCS
            const message = JSON.stringify({
                rate,
                totalUsd,
                husdSupply,
                timestamp: new Date().toISOString(),
                operator: this.operatorId.toString(),
            })

            console.log('📝 Publishing rate to HCS:', {
                topicId: this.topicId.toString(),
                rate,
                totalUsd,
                husdSupply,
            })

            // Create and execute message transaction
            const submitMessage = new TopicMessageSubmitTransaction({
                topicId: this.topicId,
                message: message,
            })

            // Execute the transaction
            const submitResponse = await submitMessage.execute(this.client)

            // Get the receipt to confirm it was processed
            const receipt = await submitResponse.getReceipt(this.client)

            console.log('✅ Rate published successfully')
            console.log(
                `   Transaction ID: ${submitResponse.transactionId.toString()}`
            )
            console.log(
                `   Topic Sequence Number: ${receipt.topicSequenceNumber?.toString()}`
            )

            return {
                status: 'published',
                topicId: this.topicId.toString(),
                rate: rate,
                transactionId: submitResponse.transactionId.toString(),
                sequenceNumber: receipt.topicSequenceNumber?.toString(),
                timestamp: new Date().toISOString(),
            }
        } catch (error) {
            console.error('❌ Error publishing rate to HCS:', error)
            throw error
        }
    }

    /**
     * Gets the current exchange rate
     */
    async getCurrentRate(): Promise<number> {
        // For now returns a fixed value
        // In production this should query the latest message from the topic
        return 1.005
    }

    /**
     * Checks the balance of a token for an account
     */
    async checkBalance(accountId: string, tokenId: string): Promise<number> {
        try {
            const query = new AccountBalanceQuery().setAccountId(
                AccountId.fromString(accountId)
            )

            const balance = await query.execute(this.client)

            // Get specific token balance
            const tokenBalance = balance.tokens?.get(
                TokenId.fromString(tokenId)
            )

            if (!tokenBalance) {
                return 0
            }

            // Convert to number (assuming 6 decimals for USDC)
            return Number(tokenBalance.toString()) / 1_000_000
        } catch (error) {
            console.error('Error checking balance:', error)
            // If there's an error, assume no balance
            return 0
        }
    }

    /**
     * Creates a scheduled transaction for deposit
     */
    async scheduleDeposit(userId: string, amountUsdc: number) {
        try {
            const treasuryId = process.env.TREASURY_ID
            const emissionsId = process.env.EMISSIONS_ID
            const usdcTokenId = process.env.USDC_TOKEN_ID
            const husdTokenId = process.env.HUSD_TOKEN_ID

            if (!treasuryId || !emissionsId || !usdcTokenId || !husdTokenId) {
                throw new Error('Missing required token or account IDs')
            }

            // Calculate hUSD amount based on current rate
            const currentRate = await this.getCurrentRate()
            const husdAmount = amountUsdc / currentRate

            console.log('📋 Creating scheduled deposit transaction:', {
                user: userId,
                usdcAmount: amountUsdc,
                husdAmount: husdAmount.toFixed(2),
                rate: currentRate,
            })

            // Create the transfer transaction
            const transferTx = new TransferTransaction()
                .addTokenTransfer(
                    TokenId.fromString(usdcTokenId),
                    AccountId.fromString(userId),
                    -amountUsdc * 1_000_000 // Negative = outgoing
                )
                .addTokenTransfer(
                    TokenId.fromString(usdcTokenId),
                    AccountId.fromString(treasuryId),
                    amountUsdc * 1_000_000 // Positive = incoming
                )
                .addTokenTransfer(
                    TokenId.fromString(husdTokenId),
                    AccountId.fromString(emissionsId),
                    -Math.floor(husdAmount * 1_000_000) // Outgoing from emissions
                )
                .addTokenTransfer(
                    TokenId.fromString(husdTokenId),
                    AccountId.fromString(userId),
                    Math.floor(husdAmount * 1_000_000) // Incoming to user
                )

            // Create the scheduled transaction
            const scheduleTx = new ScheduleCreateTransaction()
                .setScheduledTransaction(transferTx)
                .setScheduleMemo(
                    `Deposit: ${amountUsdc} USDC for ${husdAmount.toFixed(
                        2
                    )} hUSD`
                )
                .setAdminKey(this.operatorKey)
                .setPayerAccountId(this.operatorId)

            // Execute the transaction
            const scheduleResponse = await scheduleTx.execute(this.client)
            const scheduleReceipt = await scheduleResponse.getReceipt(
                this.client
            )
            const scheduleId = scheduleReceipt.scheduleId

            console.log('✅ Scheduled transaction created')
            console.log(`   Schedule ID: ${scheduleId?.toString()}`)
            console.log(
                `   Transaction ID: ${scheduleResponse.transactionId.toString()}`
            )

            return {
                status: 'success',
                scheduleId: scheduleId?.toString() || 'unknown',
                husdAmount: Number(husdAmount.toFixed(2)),
                transactionId: scheduleResponse.transactionId.toString(),
                timestamp: new Date().toISOString(),
            }
        } catch (error) {
            console.error('❌ Error creating scheduled deposit:', error)
            throw error
        }
    }

    /**
     * Closes the Hedera client
     */
    close() {
        if (this.client) {
            this.client.close()
        }
    }
}
