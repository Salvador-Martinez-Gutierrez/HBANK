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
        // Verificar si estamos usando testnet real
        const useRealTestnet = process.env.USE_REAL_TESTNET === 'true'

        if (!useRealTestnet) {
            console.log(
                '⚠️ Running in mock mode. Set USE_REAL_TESTNET=true for real transactions'
            )
        }

        // Configurar credenciales
        const operatorIdStr = process.env.OPERATOR_ID
        const operatorKeyStr = process.env.OPERATOR_KEY
        const topicIdStr = process.env.TOPIC_ID

        if (!operatorIdStr || !operatorKeyStr || !topicIdStr) {
            throw new Error(
                'Missing required Hedera credentials in environment variables'
            )
        }

        // Inicializar cliente de Hedera
        this.operatorId = AccountId.fromString(operatorIdStr)
        this.operatorKey = PrivateKey.fromString(operatorKeyStr)
        this.topicId = TopicId.fromString(topicIdStr)

        // Configurar cliente para testnet
        this.client = Client.forTestnet()
        this.client.setOperator(this.operatorId, this.operatorKey)

        // Configurar límites de transacción
        this.client.setDefaultMaxTransactionFee(new Hbar(10))
        this.client.setDefaultMaxQueryPayment(new Hbar(5))

        console.log('✅ Hedera client initialized for testnet')
        console.log(`   Operator: ${this.operatorId.toString()}`)
        console.log(`   Topic: ${this.topicId.toString()}`)
    }

    /**
     * Publica información del exchange rate al Hedera Consensus Service
     */
    async publishRate(rate: number, totalUsd: number, husdSupply: number) {
        try {
            // Validaciones
            if (rate <= 0) {
                throw new Error('Rate must be positive')
            }

            if (totalUsd <= 0 || husdSupply <= 0) {
                throw new Error('totalUsd and husdSupply must be positive')
            }

            // Verificar consistencia del rate
            const calculatedRate = totalUsd / husdSupply
            const tolerance = 0.001 // 0.1%
            if (Math.abs(calculatedRate - rate) / rate > tolerance) {
                throw new Error(
                    'Rate calculation is inconsistent with provided values'
                )
            }

            // Crear mensaje para HCS
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

            // Crear y ejecutar la transacción de mensaje
            const submitMessage = new TopicMessageSubmitTransaction({
                topicId: this.topicId,
                message: message,
            })

            // Ejecutar la transacción
            const submitResponse = await submitMessage.execute(this.client)

            // Obtener el receipt para confirmar que se procesó
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
     * Obtiene el rate actual del exchange
     */
    async getCurrentRate(): Promise<number> {
        // Por ahora retorna un valor fijo
        // En producción esto debería consultar el último mensaje del topic
        return 1.005
    }

    /**
     * Verifica el balance de un token para una cuenta
     */
    async checkBalance(accountId: string, tokenId: string): Promise<number> {
        try {
            const query = new AccountBalanceQuery().setAccountId(
                AccountId.fromString(accountId)
            )

            const balance = await query.execute(this.client)

            // Obtener balance del token específico
            const tokenBalance = balance.tokens?.get(
                TokenId.fromString(tokenId)
            )

            if (!tokenBalance) {
                return 0
            }

            // Convertir a número (asumiendo 6 decimales para USDC)
            return Number(tokenBalance.toString()) / 1_000_000
        } catch (error) {
            console.error('Error checking balance:', error)
            // Si hay error, asumir que no hay balance
            return 0
        }
    }

    /**
     * Crea una transacción programada para depósito
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

            // Calcular cantidad de hUSD basado en el rate actual
            const currentRate = await this.getCurrentRate()
            const husdAmount = amountUsdc / currentRate

            console.log('📋 Creating scheduled deposit transaction:', {
                user: userId,
                usdcAmount: amountUsdc,
                husdAmount: husdAmount.toFixed(2),
                rate: currentRate,
            })

            // Crear la transacción de transferencia
            const transferTx = new TransferTransaction()
                .addTokenTransfer(
                    TokenId.fromString(usdcTokenId),
                    AccountId.fromString(userId),
                    -amountUsdc * 1_000_000 // Negativo = salida
                )
                .addTokenTransfer(
                    TokenId.fromString(usdcTokenId),
                    AccountId.fromString(treasuryId),
                    amountUsdc * 1_000_000 // Positivo = entrada
                )
                .addTokenTransfer(
                    TokenId.fromString(husdTokenId),
                    AccountId.fromString(emissionsId),
                    -Math.floor(husdAmount * 1_000_000) // Salida de emissions
                )
                .addTokenTransfer(
                    TokenId.fromString(husdTokenId),
                    AccountId.fromString(userId),
                    Math.floor(husdAmount * 1_000_000) // Entrada al usuario
                )

            // Crear la transacción programada
            const scheduleTx = new ScheduleCreateTransaction()
                .setScheduledTransaction(transferTx)
                .setScheduleMemo(
                    `Deposit: ${amountUsdc} USDC for ${husdAmount.toFixed(
                        2
                    )} hUSD`
                )
                .setAdminKey(this.operatorKey)
                .setPayerAccountId(this.operatorId)

            // Ejecutar la transacción
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
     * Cierra el cliente de Hedera
     */
    close() {
        if (this.client) {
            this.client.close()
        }
    }
}
