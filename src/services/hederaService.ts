import { createScopedLogger } from '@/lib/logger'
import { serverEnv } from '@/config/serverEnv'

const logger = createScopedLogger('service:hederaService')

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
import { WithdrawRequest, WithdrawResult } from '@/types/withdrawal'

export class HederaService {
    private client: Client
    private operatorId: AccountId
    private operatorKey: PrivateKey
    private topicId: TopicId

    // Decimal constants from serverEnv
    private readonly HBAR_MULTIPLIER = Math.pow(10, serverEnv.decimals.hbar)
    private readonly USDC_MULTIPLIER = Math.pow(10, serverEnv.decimals.usdc)
    private readonly HUSD_MULTIPLIER = Math.pow(10, serverEnv.decimals.husd)

    constructor() {
        // Check if we are using real testnet
        if (!serverEnv.hedera.useRealTestnet) {
            logger.info(
                '⚠️ Running in mock mode. Set USE_REAL_TESTNET=true for real transactions'
            )
        }

        // Configure credentials (using legacy operator for backward compatibility)
        if (!serverEnv.operators.legacy) {
            throw new Error(
                'Missing required OPERATOR_ID and OPERATOR_KEY in environment variables'
            )
        }

        // Initialize Hedera client
        this.operatorId = AccountId.fromString(serverEnv.operators.legacy.accountId)
        this.operatorKey = PrivateKey.fromString(serverEnv.operators.legacy.privateKey)

        if (!serverEnv.topics.main) {
            throw new Error('Missing required TOPIC_ID in environment variables')
        }
        this.topicId = TopicId.fromString(serverEnv.topics.main)

        // Configure client based on network
        this.client = serverEnv.hedera.network === 'mainnet'
            ? Client.forMainnet()
            : Client.forTestnet()
        this.client.setOperator(this.operatorId, this.operatorKey)

        // Configure transaction limits
        this.client.setDefaultMaxTransactionFee(new Hbar(10))
        this.client.setDefaultMaxQueryPayment(new Hbar(5))

        logger.info(`✅ Hedera client initialized for ${serverEnv.hedera.network}`)
        logger.info(`   Operator: ${this.operatorId.toString()}`)
        logger.info(`   Topic: ${this.topicId.toString()}`)
    }

    /**
     * Creates a client configured for a specific wallet
     */
    private createClientForWallet(walletId: string, walletKey: string): Client {
        const client = serverEnv.hedera.network === 'mainnet'
            ? Client.forMainnet()
            : Client.forTestnet()
        client.setOperator(
            AccountId.fromString(walletId),
            PrivateKey.fromString(walletKey)
        )
        client.setDefaultMaxTransactionFee(new Hbar(10))
        client.setDefaultMaxQueryPayment(new Hbar(5))
        return client
    }

    /**
     * Gets the appropriate wallet credentials for different operations
     */
    private getWalletCredentials(
        walletType:
            | 'deposit'
            | 'instant-withdraw'
            | 'standard-withdraw'
            | 'treasury'
            | 'emissions'
            | 'rate-publisher'
    ) {
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
            // const calculatedRate = totalUsd / husdSupply
            // const tolerance = 0.001 // 0.1%
            // if (Math.abs(calculatedRate - rate) / rate > tolerance) {
            //     throw new Error(
            //         'Rate calculation is inconsistent with provided values '
            //     )
            // }

            // Create message for HCS
            const message = JSON.stringify({
                rate,
                totalUsd,
                husdSupply,
                timestamp: new Date().toISOString(),
                operator: this.operatorId.toString(),
            })

            logger.info('📝 Publishing rate to HCS:', {
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

            logger.info('✅ Rate published successfully')
            logger.info(
                `   Transaction ID: ${submitResponse.transactionId.toString()}`
            )
            logger.info(
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
            logger.error('❌ Error publishing rate to HCS:', error)
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

            // Convert to number using USDC decimals from environment
            return Number(tokenBalance.toString()) / this.USDC_MULTIPLIER
        } catch (error) {
            logger.error('Error checking balance:', error)
            // If there's an error, assume no balance
            return 0
        }
    }

    /**
     * Creates a scheduled transaction for deposit
     */
    async scheduleDeposit(userId: string, amountUsdc: number) {
        try {
            const depositWallet = this.getWalletCredentials('deposit')
            const emissionsWallet = this.getWalletCredentials('emissions')
            const usdcTokenId = serverEnv.tokens.usdc.tokenId
            const husdTokenId = serverEnv.tokens.husd.tokenId

            // Calculate hUSD amount based on current rate
            const currentRate = await this.getCurrentRate()
            const husdAmount = amountUsdc / currentRate

            logger.info('📋 Creating scheduled deposit transaction:', {
                user: userId,
                usdcAmount: amountUsdc,
                husdAmount: husdAmount.toFixed(2),
                rate: currentRate,
                depositWallet: depositWallet.id,
                emissionsWallet: emissionsWallet.id,
            })

            // Create the transfer transaction
            const transferTx = new TransferTransaction()
                .addTokenTransfer(
                    TokenId.fromString(usdcTokenId),
                    AccountId.fromString(userId),
                    -amountUsdc * this.USDC_MULTIPLIER // Negative = outgoing (USDC has 6 decimals)
                )
                .addTokenTransfer(
                    TokenId.fromString(usdcTokenId),
                    AccountId.fromString(depositWallet.id),
                    amountUsdc * this.USDC_MULTIPLIER // Positive = incoming to deposit wallet (USDC has 6 decimals)
                )
                .addTokenTransfer(
                    TokenId.fromString(husdTokenId),
                    AccountId.fromString(emissionsWallet.id),
                    -Math.floor(husdAmount * this.HUSD_MULTIPLIER) // Outgoing from emissions (hUSD has 3 decimals)
                )
                .addTokenTransfer(
                    TokenId.fromString(husdTokenId),
                    AccountId.fromString(userId),
                    Math.floor(husdAmount * this.HUSD_MULTIPLIER) // Incoming to user (hUSD has 3 decimals)
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

            logger.info('✅ Scheduled transaction created')
            logger.info(`   Schedule ID: ${scheduleId?.toString()}`)
            logger.info(
                `   Transaction ID: ${scheduleResponse.transactionId.toString()}`
            )

            return {
                status: 'success',
                scheduleId: scheduleId?.toString() ?? 'unknown',
                husdAmount: Number(husdAmount.toFixed(2)),
                transactionId: scheduleResponse.transactionId.toString(),
                timestamp: new Date().toISOString(),
            }
        } catch (error) {
            logger.error('❌ Error creating scheduled deposit:', error)
            throw error
        }
    }

    /**
     * Creates a scheduled HUSD transfer from user to treasury with unique memo
     * Returns the schedule ID that the user needs to sign
     */
    async createScheduledHUSDTransfer(
        user: string,
        amountHUSD: number
    ): Promise<string> {
        const treasuryWallet = this.getWalletCredentials('treasury')
        const husdTokenId = serverEnv.tokens.husd.tokenId

        if (!husdTokenId) {
            throw new Error('Missing required token ID')
        }

        logger.info('📋 Creating scheduled HUSD transfer:', {
            user,
            treasury: treasuryWallet.id,
            amount: amountHUSD,
        })

        try {
            // Create highly unique memo to avoid IDENTICAL_SCHEDULE_ALREADY_CREATED
            const timestamp = Date.now()
            const randomSuffix = Math.floor(Math.random() * 100000)
            const userSuffix = user.slice(-6) // Last 6 chars of account ID
            const uniqueMemo = `W-${timestamp}-${randomSuffix}-${userSuffix}: ${amountHUSD} HUSD`

            // Create the transfer transaction that will be scheduled
            const transferTx = new TransferTransaction()
                .addTokenTransfer(
                    TokenId.fromString(husdTokenId),
                    AccountId.fromString(user),
                    -Math.floor(amountHUSD * this.HUSD_MULTIPLIER) // Negative = outgoing from user (hUSD has 3 decimals)
                )
                .addTokenTransfer(
                    TokenId.fromString(husdTokenId),
                    AccountId.fromString(treasuryWallet.id),
                    Math.floor(amountHUSD * this.HUSD_MULTIPLIER) // Positive = incoming to treasury (hUSD has 3 decimals)
                )

            // Create the schedule transaction with unique memo
            const scheduleCreateTx = new ScheduleCreateTransaction()
                .setScheduledTransaction(transferTx)
                .setScheduleMemo(uniqueMemo)
                .setAdminKey(this.operatorKey) // Treasury can manage the schedule

            const scheduleResponse = await scheduleCreateTx.execute(this.client)
            const scheduleReceipt = await scheduleResponse.getReceipt(
                this.client
            )
            const scheduleId = scheduleReceipt.scheduleId

            if (!scheduleId) {
                throw new Error('Failed to create scheduled transaction')
            }

            logger.info('✅ Scheduled transaction created successfully')
            logger.info(`   Schedule ID: ${scheduleId.toString()}`)
            logger.info(`   Memo: ${uniqueMemo}`)
            logger.info(
                `   User must sign this schedule to execute the transfer`
            )

            return scheduleId.toString()
        } catch (error) {
            logger.error('❌ Error creating scheduled HUSD transfer:', error)
            throw error
        }
    }

    /**
     * Legacy method - now redirects to scheduled transaction
     * @deprecated Use createScheduledHUSDTransfer instead
     */
    async transferHUSDToTreasury(
        user: string,
        amountHUSD: number
    ): Promise<string> {
        // For now, return the schedule ID as the "transaction ID"
        return await this.createScheduledHUSDTransfer(user, amountHUSD)
    }

    /**
     * Executes USDC transfer from standard withdrawal wallet to user
     */
    async transferUSDCToUser(
        user: string,
        amountUSDC: number
    ): Promise<string> {
        try {
            const standardWithdrawWallet =
                this.getWalletCredentials('standard-withdraw')
            const usdcTokenId = serverEnv.tokens.usdc.tokenId

            if (!usdcTokenId) {
                throw new Error('Missing required token ID')
            }

            // Validate user parameter
            if (!user || typeof user !== 'string') {
                throw new Error(
                    `Invalid user parameter: ${user} (type: ${typeof user})`
                )
            }

            logger.info('💰 Transferring USDC to user:', {
                user,
                standardWithdrawWallet: standardWithdrawWallet.id,
                amount: amountUSDC,
            })

            // Create client with standard withdrawal wallet credentials
            const standardWithdrawClient = this.createClientForWallet(
                standardWithdrawWallet.id,
                standardWithdrawWallet.key
            )

            // Create the transfer transaction
            const transferTx = new TransferTransaction()
                .addTokenTransfer(
                    TokenId.fromString(usdcTokenId),
                    AccountId.fromString(standardWithdrawWallet.id),
                    -Math.floor(amountUSDC * 1_000_000) // Negative = outgoing from standard withdraw wallet
                )
                .addTokenTransfer(
                    TokenId.fromString(usdcTokenId),
                    AccountId.fromString(user),
                    Math.floor(amountUSDC * 1_000_000) // Positive = incoming to user
                )

            const transferResponse = await transferTx.execute(
                standardWithdrawClient
            )
            const receipt = await transferResponse.getReceipt(
                standardWithdrawClient
            )

            if (receipt.status.toString() !== 'SUCCESS') {
                throw new Error(
                    `Transfer failed with status: ${receipt.status}`
                )
            }

            logger.info('✅ USDC transferred to user successfully')
            logger.info(
                `   Transaction ID: ${transferResponse.transactionId.toString()}`
            )

            return transferResponse.transactionId.toString()
        } catch (error) {
            logger.error('❌ Error transferring USDC to user:', error)
            throw error
        }
    }

    /**
     * Publishes a withdrawal request to HCS
     */
    async publishWithdrawRequest(
        requestId: string,
        user: string,
        amountHUSD: number,
        rate: number,
        rateSequenceNumber: string,
        scheduleId: string
    ): Promise<string> {
        try {
            const withdrawTopicId = serverEnv.topics.withdraw

            if (!withdrawTopicId) {
                throw new Error('Missing WITHDRAW_TOPIC_ID')
            }

            const message: WithdrawRequest = {
                type: 'withdraw_request',
                requestId,
                user,
                amountHUSD,
                rate,
                rateSequenceNumber,
                scheduleId,
                requestedAt: new Date().toISOString(),
                unlockAt: new Date(
                    Date.now() + 48 * 60 * 60 * 1000
                ).toISOString(), // 48h from now
                status: 'pending',
            }

            const response = await new TopicMessageSubmitTransaction()
                .setTopicId(TopicId.fromString(withdrawTopicId))
                .setMessage(JSON.stringify(message))
                .execute(this.client)

            const receipt = await response.getReceipt(this.client)

            if (receipt.status.toString() !== 'SUCCESS') {
                throw new Error(
                    `Failed to publish withdrawal request: ${receipt.status}`
                )
            }

            logger.info('✅ Withdrawal request published to HCS')
            logger.info(`   Request ID: ${requestId}`)
            logger.info(`   Topic: ${withdrawTopicId}`)
            logger.info(`   Message: ${JSON.stringify(message, null, 2)}`)

            return response.transactionId.toString()
        } catch (error) {
            logger.error('❌ Error publishing withdrawal request:', error)
            throw error
        }
    }

    /**
     * Publishes a withdrawal result to HCS
     */
    async publishWithdrawResult(
        requestId: string,
        status: 'completed' | 'failed',
        txId?: string,
        error?: string
    ): Promise<string> {
        try {
            const withdrawTopicId = serverEnv.topics.withdraw

            if (!withdrawTopicId) {
                throw new Error('Missing WITHDRAW_TOPIC_ID')
            }

            const message: WithdrawResult = {
                type: 'withdraw_result',
                requestId,
                status,
                txId,
                failureReason: error,
                processedAt: new Date().toISOString(),
            }

            const response = await new TopicMessageSubmitTransaction()
                .setTopicId(TopicId.fromString(withdrawTopicId))
                .setMessage(JSON.stringify(message))
                .execute(this.client)

            const receipt = await response.getReceipt(this.client)

            if (receipt.status.toString() !== 'SUCCESS') {
                throw new Error(
                    `Failed to publish withdrawal result: ${receipt.status}`
                )
            }

            logger.info('✅ Withdrawal result published successfully')
            logger.info(`   Request ID: ${requestId}`)
            logger.info(`   Status: ${status}`)

            return response.transactionId.toString()
        } catch (error) {
            logger.error('❌ Error publishing withdrawal result:', error)
            throw error
        }
    }

    /**
     * Rollback HUSD tokens to user when withdrawal fails
     */
    async rollbackHUSDToUser(
        user: string,
        amountHUSD: number
    ): Promise<string> {
        try {
            const treasuryWallet = this.getWalletCredentials('treasury')
            const husdTokenId = serverEnv.tokens.husd.tokenId

            if (!husdTokenId) {
                throw new Error('Missing required token ID')
            }

            // Validate user parameter
            if (!user || typeof user !== 'string') {
                throw new Error(`Invalid user parameter: ${user}`)
            }

            logger.info('🔄 Rolling back HUSD to user:', {
                user,
                treasury: treasuryWallet.id,
                amount: amountHUSD,
            })

            // Create client with treasury wallet credentials
            const treasuryClient = this.createClientForWallet(
                treasuryWallet.id,
                treasuryWallet.key
            )

            // Create the transfer transaction to return HUSD to user
            const transferTx = new TransferTransaction()
                .addTokenTransfer(
                    TokenId.fromString(husdTokenId),
                    AccountId.fromString(treasuryWallet.id),
                    -Math.floor(amountHUSD * this.HUSD_MULTIPLIER) // Negative = outgoing from treasury (hUSD has 3 decimals)
                )
                .addTokenTransfer(
                    TokenId.fromString(husdTokenId),
                    AccountId.fromString(user),
                    Math.floor(amountHUSD * this.HUSD_MULTIPLIER) // Positive = incoming to user (hUSD has 3 decimals)
                )

            const transferResponse = await transferTx.execute(treasuryClient)
            const receipt = await transferResponse.getReceipt(treasuryClient)

            if (receipt.status.toString() !== 'SUCCESS') {
                throw new Error(
                    `Rollback failed with status: ${receipt.status}`
                )
            }

            logger.info('✅ HUSD rollback completed successfully')
            logger.info(
                `   Transaction ID: ${transferResponse.transactionId.toString()}`
            )

            return transferResponse.transactionId.toString()
        } catch (error) {
            logger.error('❌ Error rolling back HUSD to user:', error)
            throw error
        }
    }

    /**
     * Verifies if a Schedule Transaction has been executed by checking its status
     */
    async verifyScheduleTransactionExecuted(
        scheduleId: string
    ): Promise<boolean> {
        try {
            logger.info(`🔍 Verifying Schedule Transaction: ${scheduleId}`)

            // Query the Mirror Node for the schedule information
            const mirrorNodeUrl =
                serverEnv.hedera.mirrorNodeUrl
            const response = await fetch(
                `${mirrorNodeUrl}/api/v1/schedules/${scheduleId}`
            )

            if (!response.ok) {
                logger.info(
                    `❌ Schedule ${scheduleId} not found in Mirror Node`
                )
                return false
            }

            const scheduleData = await response.json()

            // Check if the schedule has been executed
            const isExecuted = scheduleData.executed_timestamp !== null

            logger.info(`📋 Schedule ${scheduleId} status:`, {
                executed: isExecuted,
                executed_timestamp: scheduleData.executed_timestamp,
                deleted: scheduleData.deleted,
            })

            return isExecuted
        } catch (error) {
            logger.error(
                `❌ Error verifying Schedule Transaction ${scheduleId}:`,
                error
            )
            return false
        }
    }

    /**
     * Verifies that HUSD tokens were transferred from user to treasury
     * Checks recent transactions involving the user and treasury accounts
     * Implements retry logic to account for Mirror Node synchronization delays
     */
    async verifyHUSDTransfer(
        userAccountId: string,
        treasuryId: string,
        expectedAmount: number,
        since: string
    ): Promise<boolean> {
        try {
            logger.info(
                `🔍 Verifying HUSD transfer from ${userAccountId} to ${treasuryId}`
            )
            logger.info(`   Expected amount: ${expectedAmount} HUSD`)
            logger.info(`   Since: ${since}`)

            const husdTokenId = serverEnv.tokens.husd.tokenId
            if (!husdTokenId) {
                throw new Error('Missing HUSD_TOKEN_ID')
            }

            logger.info(`   HUSD Token ID: ${husdTokenId}`)

            // Add some buffer time to the 'since' parameter to account for clock differences
            const sinceWithBuffer = new Date(
                new Date(since).getTime() - 60000
            ).toISOString() // 1 minute buffer
            logger.info(`   Since with buffer: ${sinceWithBuffer}`)

            // Retry logic: try multiple times with increasing delays
            // This accounts for Mirror Node synchronization delays
            const maxRetries = 8 // Increased from 5 to 8 attempts
            const retryDelays = [
                500, 1000, 2000, 3000, 5000, 8000, 12000, 15000,
            ] // Added more delays

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                logger.info(`🔄 Verification attempt ${attempt}/${maxRetries}`)

                const verified = await this.performHUSDTransferCheck(
                    userAccountId,
                    treasuryId,
                    expectedAmount,
                    sinceWithBuffer, // Use buffered timestamp
                    husdTokenId,
                    attempt
                )

                if (verified) {
                    logger.info(
                        `✅ HUSD transfer verified on attempt ${attempt}`
                    )
                    return true
                }

                // If not the last attempt, wait before retrying
                if (attempt < maxRetries) {
                    const delay = retryDelays[attempt - 1]
                    logger.info(
                        `⏳ Waiting ${delay}ms before retry (Mirror Node may need time to sync)...`
                    )
                    await new Promise((resolve) => setTimeout(resolve, delay))
                }
            }

            logger.info(
                `❌ HUSD transfer verification failed after ${maxRetries} attempts`
            )
            logger.info(
                `📋 Expected ${expectedAmount} HUSD from ${userAccountId} to ${treasuryId}`
            )
            logger.info(
                `⚠️ This might indicate a Mirror Node delay or the transaction was not executed properly`
            )
            logger.info(
                `💡 Check the Hedera Explorer for recent transactions involving account ${userAccountId}`
            )
            return false
        } catch (error) {
            logger.error(`❌ Error verifying HUSD transfer:`, error)
            return false
        }
    }

    /**
     * Performs a single HUSD transfer verification check
     * Private helper method for the retry logic
     */
    private async performHUSDTransferCheck(
        userAccountId: string,
        treasuryId: string,
        expectedAmount: number,
        since: string,
        husdTokenId: string,
        attempt: number
    ): Promise<boolean> {
        // Query Mirror Node for token transfers
        const mirrorNodeUrl = serverEnv.hedera.mirrorNodeUrl
        const sinceTimestamp = new Date(since).getTime() / 1000 // Convert to seconds

        const queryUrl = `${mirrorNodeUrl}/api/v1/transactions?account.id=${userAccountId}&timestamp=gte:${sinceTimestamp}&transactiontype=cryptotransfer&order=desc&limit=100` // Increased limit to 100
        logger.info(`🔍 Attempt ${attempt} - Querying Mirror Node:`, queryUrl)

        // Get transfers involving the user account since the withdrawal request
        const response = await fetch(queryUrl)

        if (!response.ok) {
            logger.info(
                `❌ Attempt ${attempt} - Failed to fetch transactions for ${userAccountId}: ${response.status} ${response.statusText}`
            )
            return false
        }

        const data = await response.json()
        const transactions = data.transactions ?? []

        logger.info(
            `📋 Attempt ${attempt} - Found ${transactions.length} transactions since ${since}`
        )

        // Look for a transaction where user sent HUSD to treasury
        for (const tx of transactions) {
            logger.info(
                `🔍 Checking transaction ${tx.transaction_id} (${tx.consensus_timestamp})`
            )

            if (tx.token_transfers) {
                logger.info(
                    `   Token transfers found: ${tx.token_transfers.length}`
                )

                for (const tokenTransfer of tx.token_transfers) {
                    logger.info(
                        `   Token ID: ${tokenTransfer.token_id} (looking for ${husdTokenId})`
                    )

                    if (tokenTransfer.token_id === husdTokenId) {
                        logger.info(`   ✅ Found HUSD token transfer!`)
                        logger.info(
                            `   Transfer details:`,
                            JSON.stringify(tokenTransfer, null, 2)
                        )

                        // Check if this is the transfer we're looking for
                        // The Mirror Node returns token_transfers as an array where each item has account and amount
                        const transferredAmount =
                            Math.abs(tokenTransfer.amount) /
                            this.HUSD_MULTIPLIER // Convert from tinybars (hUSD has 3 decimals)

                        // Check if this transfer is from user to treasury or treasury to user
                        const isUserSending =
                            tokenTransfer.account === userAccountId &&
                            tokenTransfer.amount < 0
                        const isTreasuryReceiving =
                            tokenTransfer.account === treasuryId &&
                            tokenTransfer.amount > 0

                        logger.info(
                            `   Transfer from account: ${tokenTransfer.account}`
                        )
                        logger.info(
                            `   Transfer amount: ${tokenTransfer.amount} (${transferredAmount} HUSD)`
                        )
                        logger.info(`   Is user sending: ${isUserSending}`)
                        logger.info(
                            `   Is treasury receiving: ${isTreasuryReceiving}`
                        )

                        // We need to find both the outgoing and incoming transfers in the same transaction
                        if (
                            isUserSending &&
                            Math.abs(transferredAmount - expectedAmount) < 0.001
                        ) {
                            // Check if there's also a corresponding incoming transfer to treasury in this transaction
                            const treasuryTransfer = tx.token_transfers.find(
                                (transfer: {
                                    token_id: string
                                    account: string
                                    amount: number
                                }) =>
                                    transfer.token_id === husdTokenId &&
                                    transfer.account === treasuryId &&
                                    transfer.amount > 0
                            )

                            if (treasuryTransfer) {
                                const treasuryAmount =
                                    treasuryTransfer.amount /
                                    this.HUSD_MULTIPLIER // Use consistent multiplier
                                logger.info(
                                    `📋 Attempt ${attempt} - Found complete HUSD transfer:`,
                                    {
                                        from: userAccountId,
                                        to: treasuryId,
                                        userAmount: -transferredAmount,
                                        treasuryAmount: treasuryAmount,
                                        expected: expectedAmount,
                                        transaction_id: tx.transaction_id,
                                        timestamp: tx.consensus_timestamp,
                                    }
                                )

                                if (
                                    Math.abs(treasuryAmount - expectedAmount) <
                                    0.001
                                ) {
                                    logger.info(
                                        `✅ Attempt ${attempt} - HUSD transfer verified: ${expectedAmount} HUSD`
                                    )
                                    return true
                                } else {
                                    logger.info(
                                        `❌ Attempt ${attempt} - Amount mismatch: treasury received ${treasuryAmount} vs expected ${expectedAmount}`
                                    )
                                }
                            } else {
                                logger.info(
                                    `❌ Attempt ${attempt} - No corresponding treasury transfer found`
                                )
                            }
                        }
                    }
                }
            } else {
                logger.info(`   No token_transfers in this transaction`)
            }
        }

        logger.info(`❌ Attempt ${attempt} - No matching HUSD transfer found`)
        return false
    }

    /**
     * Debug function to check if a specific transaction exists in Mirror Node
     */
    async checkTransactionInMirrorNode(txId: string): Promise<boolean> {
        try {
            const mirrorNodeUrl =
                serverEnv.hedera.mirrorNodeUrl
            const response = await fetch(
                `${mirrorNodeUrl}/api/v1/transactions/${txId}`
            )

            if (response.ok) {
                const txData = await response.json()
                logger.info(`🔍 Transaction ${txId} found in Mirror Node:`, {
                    status: txData.result,
                    timestamp: txData.consensus_timestamp,
                    transfers: txData.token_transfers?.length ?? 0,
                })
                return true
            } else {
                logger.info(
                    `❌ Transaction ${txId} not found in Mirror Node: ${response.status}`
                )
                return false
            }
        } catch (error) {
            logger.error(`❌ Error checking transaction ${txId}:`, error)
            return false
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
