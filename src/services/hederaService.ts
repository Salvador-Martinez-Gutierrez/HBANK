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

    // Decimal constants from environment
    private readonly HBAR_MULTIPLIER = Math.pow(
        10,
        parseInt(process.env.HBAR_DECIMALS || '8')
    )
    private readonly USDC_MULTIPLIER = Math.pow(
        10,
        parseInt(process.env.USDC_DECIMALS || '6')
    )
    private readonly HUSD_MULTIPLIER = Math.pow(
        10,
        parseInt(process.env.HUSD_DECIMALS || '3')
    )

    constructor() {
        // Check if we are using real testnet
        const useRealTestnet = process.env.USE_REAL_TESTNET === 'true'

        if (!useRealTestnet) {
            console.log(
                '⚠️ Running in mock mode. Set USE_REAL_TESTNET=true for real transactions'
            )
        }

        // Configure credentials (using legacy operator for backward compatibility)
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
     * Creates a client configured for a specific wallet
     */
    private createClientForWallet(walletId: string, walletKey: string): Client {
        const client = Client.forTestnet()
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
                    id: process.env.DEPOSIT_WALLET_ID!,
                    key: process.env.DEPOSIT_WALLET_KEY!,
                }
            case 'instant-withdraw':
                return {
                    id: process.env.INSTANT_WITHDRAW_WALLET_ID!,
                    key: process.env.INSTANT_WITHDRAW_WALLET_KEY!,
                }
            case 'standard-withdraw':
                return {
                    id: process.env.STANDARD_WITHDRAW_WALLET_ID!,
                    key: process.env.STANDARD_WITHDRAW_WALLET_KEY!,
                }
            case 'treasury':
                return {
                    id: process.env.TREASURY_ID!,
                    key: process.env.TREASURY_KEY!,
                }
            case 'emissions':
                return {
                    id: process.env.EMISSIONS_ID!,
                    key: process.env.EMISSIONS_KEY!,
                }
            case 'rate-publisher':
                return {
                    id: process.env.RATE_PUBLISHER_ID!,
                    key: process.env.RATE_PUBLISHER_KEY!,
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

            // Convert to number using USDC decimals from environment
            return Number(tokenBalance.toString()) / this.USDC_MULTIPLIER
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
            const depositWallet = this.getWalletCredentials('deposit')
            const emissionsWallet = this.getWalletCredentials('emissions')
            const usdcTokenId = process.env.USDC_TOKEN_ID
            const husdTokenId = process.env.HUSD_TOKEN_ID

            if (!usdcTokenId || !husdTokenId) {
                throw new Error('Missing required token IDs')
            }

            // Calculate hUSD amount based on current rate
            const currentRate = await this.getCurrentRate()
            const husdAmount = amountUsdc / currentRate

            console.log('📋 Creating scheduled deposit transaction:', {
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
     * Creates a scheduled HUSD transfer from user to treasury with unique memo
     * Returns the schedule ID that the user needs to sign
     */
    async createScheduledHUSDTransfer(
        user: string,
        amountHUSD: number
    ): Promise<string> {
        const treasuryWallet = this.getWalletCredentials('treasury')
        const husdTokenId = process.env.HUSD_TOKEN_ID

        if (!husdTokenId) {
            throw new Error('Missing required token ID')
        }

        console.log('📋 Creating scheduled HUSD transfer:', {
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

            console.log('✅ Scheduled transaction created successfully')
            console.log(`   Schedule ID: ${scheduleId.toString()}`)
            console.log(`   Memo: ${uniqueMemo}`)
            console.log(
                `   User must sign this schedule to execute the transfer`
            )

            return scheduleId.toString()
        } catch (error) {
            console.error('❌ Error creating scheduled HUSD transfer:', error)
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
            const usdcTokenId = process.env.USDC_TOKEN_ID

            if (!usdcTokenId) {
                throw new Error('Missing required token ID')
            }

            // Validate user parameter
            if (!user || typeof user !== 'string') {
                throw new Error(
                    `Invalid user parameter: ${user} (type: ${typeof user})`
                )
            }

            console.log('💰 Transferring USDC to user:', {
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

            console.log('✅ USDC transferred to user successfully')
            console.log(
                `   Transaction ID: ${transferResponse.transactionId.toString()}`
            )

            return transferResponse.transactionId.toString()
        } catch (error) {
            console.error('❌ Error transferring USDC to user:', error)
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
            const withdrawTopicId = process.env.WITHDRAW_TOPIC_ID

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

            console.log('✅ Withdrawal request published to HCS')
            console.log(`   Request ID: ${requestId}`)
            console.log(`   Topic: ${withdrawTopicId}`)
            console.log(`   Message: ${JSON.stringify(message, null, 2)}`)

            return response.transactionId.toString()
        } catch (error) {
            console.error('❌ Error publishing withdrawal request:', error)
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
            const withdrawTopicId = process.env.WITHDRAW_TOPIC_ID

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

            console.log('✅ Withdrawal result published successfully')
            console.log(`   Request ID: ${requestId}`)
            console.log(`   Status: ${status}`)

            return response.transactionId.toString()
        } catch (error) {
            console.error('❌ Error publishing withdrawal result:', error)
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
            const husdTokenId = process.env.HUSD_TOKEN_ID

            if (!husdTokenId) {
                throw new Error('Missing required token ID')
            }

            // Validate user parameter
            if (!user || typeof user !== 'string') {
                throw new Error(`Invalid user parameter: ${user}`)
            }

            console.log('🔄 Rolling back HUSD to user:', {
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

            console.log('✅ HUSD rollback completed successfully')
            console.log(
                `   Transaction ID: ${transferResponse.transactionId.toString()}`
            )

            return transferResponse.transactionId.toString()
        } catch (error) {
            console.error('❌ Error rolling back HUSD to user:', error)
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
            console.log(`🔍 Verifying Schedule Transaction: ${scheduleId}`)

            // Query the Mirror Node for the schedule information
            const mirrorNodeUrl =
                process.env.TESTNET_MIRROR_NODE_ENDPOINT ||
                'https://testnet.mirrornode.hedera.com'
            const response = await fetch(
                `${mirrorNodeUrl}/api/v1/schedules/${scheduleId}`
            )

            if (!response.ok) {
                console.log(
                    `❌ Schedule ${scheduleId} not found in Mirror Node`
                )
                return false
            }

            const scheduleData = await response.json()

            // Check if the schedule has been executed
            const isExecuted = scheduleData.executed_timestamp !== null

            console.log(`📋 Schedule ${scheduleId} status:`, {
                executed: isExecuted,
                executed_timestamp: scheduleData.executed_timestamp,
                deleted: scheduleData.deleted,
            })

            return isExecuted
        } catch (error) {
            console.error(
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
            console.log(
                `🔍 Verifying HUSD transfer from ${userAccountId} to ${treasuryId}`
            )
            console.log(`   Expected amount: ${expectedAmount} HUSD`)
            console.log(`   Since: ${since}`)

            const husdTokenId = process.env.HUSD_TOKEN_ID
            if (!husdTokenId) {
                throw new Error('Missing HUSD_TOKEN_ID')
            }

            console.log(`   HUSD Token ID: ${husdTokenId}`)

            // Retry logic: try multiple times with increasing delays
            // This accounts for Mirror Node synchronization delays
            const maxRetries = 5
            const retryDelays = [500, 1000, 2000, 3000, 5000] // milliseconds

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                console.log(`🔄 Verification attempt ${attempt}/${maxRetries}`)

                const verified = await this.performHUSDTransferCheck(
                    userAccountId,
                    treasuryId,
                    expectedAmount,
                    since,
                    husdTokenId,
                    attempt
                )

                if (verified) {
                    console.log(
                        `✅ HUSD transfer verified on attempt ${attempt}`
                    )
                    return true
                }

                // If not the last attempt, wait before retrying
                if (attempt < maxRetries) {
                    const delay = retryDelays[attempt - 1]
                    console.log(
                        `⏳ Waiting ${delay}ms before retry (Mirror Node may need time to sync)...`
                    )
                    await new Promise((resolve) => setTimeout(resolve, delay))
                }
            }

            console.log(
                `❌ HUSD transfer verification failed after ${maxRetries} attempts`
            )
            console.log(
                `📋 Expected ${expectedAmount} HUSD from ${userAccountId} to ${treasuryId}`
            )
            return false
        } catch (error) {
            console.error(`❌ Error verifying HUSD transfer:`, error)
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
        const mirrorNodeUrl =
            process.env.TESTNET_MIRROR_NODE_ENDPOINT ||
            'https://testnet.mirrornode.hedera.com'
        const sinceTimestamp = new Date(since).getTime() / 1000 // Convert to seconds

        const queryUrl = `${mirrorNodeUrl}/api/v1/transactions?account.id=${userAccountId}&timestamp=gte:${sinceTimestamp}&transactiontype=cryptotransfer&order=desc&limit=50`
        console.log(`🔍 Attempt ${attempt} - Querying Mirror Node:`, queryUrl)

        // Get transfers involving the user account since the withdrawal request
        const response = await fetch(queryUrl)

        if (!response.ok) {
            console.log(
                `❌ Attempt ${attempt} - Failed to fetch transactions for ${userAccountId}: ${response.status} ${response.statusText}`
            )
            return false
        }

        const data = await response.json()
        const transactions = data.transactions || []

        console.log(
            `📋 Attempt ${attempt} - Found ${transactions.length} transactions since ${since}`
        )

        // Look for a transaction where user sent HUSD to treasury
        for (const tx of transactions) {
            console.log(
                `🔍 Checking transaction ${tx.transaction_id} (${tx.consensus_timestamp})`
            )

            if (tx.token_transfers) {
                console.log(
                    `   Token transfers found: ${tx.token_transfers.length}`
                )

                for (const tokenTransfer of tx.token_transfers) {
                    console.log(
                        `   Token ID: ${tokenTransfer.token_id} (looking for ${husdTokenId})`
                    )

                    if (tokenTransfer.token_id === husdTokenId) {
                        console.log(`   ✅ Found HUSD token transfer!`)
                        console.log(
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

                        console.log(
                            `   Transfer from account: ${tokenTransfer.account}`
                        )
                        console.log(
                            `   Transfer amount: ${tokenTransfer.amount} (${transferredAmount} HUSD)`
                        )
                        console.log(`   Is user sending: ${isUserSending}`)
                        console.log(
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
                                    treasuryTransfer.amount / 1_000 // FIXED: HUSD uses 3 decimals, not 8
                                console.log(
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
                                    console.log(
                                        `✅ Attempt ${attempt} - HUSD transfer verified: ${expectedAmount} HUSD`
                                    )
                                    return true
                                } else {
                                    console.log(
                                        `❌ Attempt ${attempt} - Amount mismatch: treasury received ${treasuryAmount} vs expected ${expectedAmount}`
                                    )
                                }
                            } else {
                                console.log(
                                    `❌ Attempt ${attempt} - No corresponding treasury transfer found`
                                )
                            }
                        }
                    }
                }
            } else {
                console.log(`   No token_transfers in this transaction`)
            }
        }

        console.log(`❌ Attempt ${attempt} - No matching HUSD transfer found`)
        return false
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
