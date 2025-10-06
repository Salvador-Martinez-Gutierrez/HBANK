import {
    AccountBalanceQuery,
    AccountId,
    Client,
    TokenId,
    TopicId,
    TopicMessageSubmitTransaction,
    TransferTransaction,
} from '@hashgraph/sdk'

import { HEDERA_CONFIG, NUMERIC } from '@/app/backend-constants'
import { ensureTestnetAccess, serverEnv } from '@/config/serverEnv'
import {
    conflict,
    badRequest,
    internalError,
    serviceUnavailable,
} from '@/lib/errors'
import { createScopedLogger, ScopedLogger } from '@/lib/logger'
import { fromTinyUnits, toTinyUnits } from '@/utils/hederaAmounts'
import { isRateMatch, RateRecord } from '@/utils/validation/deposit'
import { InstantWithdrawPayload } from '@/utils/validation/withdraw'
import { getHederaClient } from './hederaClientFactory'
import { HederaRateService } from './hederaRateService'

const RATE_SCALE = BigInt(1000000)

const toScaledBigInt = (value: number, scale: number): bigint => {
    if (!Number.isFinite(value)) {
        throw badRequest('Value must be finite', { value })
    }
    const scaled = Math.round(value * Math.pow(10, scale))
    return BigInt(scaled)
}

const toSafeNumber = (value: bigint, token: string) => {
    const asNumber = Number(value)
    if (!Number.isSafeInteger(asNumber) || BigInt(asNumber) !== value) {
        throw internalError(
            `Token amount for ${token} exceeds safe integer range`
        )
    }
    return asNumber
}

type FetchFn = typeof fetch

type InstantWithdrawDeps = {
    rateService: HederaRateService
    getClient: typeof getHederaClient
    fetchFn?: FetchFn
    logger?: ScopedLogger
    retryAttempts?: number
    retryDelayMs?: number
}

export type InstantWithdrawResult = {
    txId: string
    grossUSDC: number
    feeUSDC: number
    netUSDC: number
    walletBalanceAfter: number
    topicTxId?: string
}

export class InstantWithdrawService {
    private readonly rateService: HederaRateService
    private readonly getClient: typeof getHederaClient
    private readonly fetchFn: FetchFn
    private readonly logger: ScopedLogger
    private readonly mirrorNodeUrl: string
    private readonly retryAttempts: number
    private readonly retryDelayMs: number

    constructor(deps: InstantWithdrawDeps) {
        this.rateService = deps.rateService
        this.getClient = deps.getClient
        this.fetchFn = deps.fetchFn ?? fetch
        this.logger =
            deps.logger ?? createScopedLogger('instant-withdraw-service')
        this.mirrorNodeUrl = HEDERA_CONFIG.mirrorNode
        this.retryAttempts = Math.max(
            1,
            deps.retryAttempts ?? serverEnv.instantWithdraw.retryAttempts
        )
        this.retryDelayMs = Math.max(
            0,
            deps.retryDelayMs ?? serverEnv.instantWithdraw.retryDelayMs
        )
    }

    async processInstantWithdrawal(
        payload: InstantWithdrawPayload
    ): Promise<InstantWithdrawResult> {
        ensureTestnetAccess()

        const scopedLogger = this.logger.child('process', {
            userAccountId: payload.userAccountId,
            rateSequenceNumber: payload.rateSequenceNumber,
        })

        scopedLogger.info('Processing instant withdrawal request')

        if (!serverEnv.withdrawTopicId) {
            scopedLogger.error('Withdraw topic ID is not configured')
            throw internalError('Withdraw topic ID missing')
        }

        const latestRate = await this.fetchLatestRate()
        const submittedRate: RateRecord = {
            rate: payload.rate,
            sequenceNumber: payload.rateSequenceNumber,
        }

        if (!isRateMatch(latestRate, submittedRate)) {
            scopedLogger.warn('Rate mismatch detected', {
                latestRate,
                submittedRate,
            })
            throw conflict('Rate has changed', {
                currentRate: latestRate,
                submittedRate,
            })
        }

        const husdDecimals = serverEnv.decimals.husd
        const usdcDecimals = serverEnv.decimals.usdc

        if (usdcDecimals < husdDecimals) {
            throw internalError(
                'USDC decimals must be greater than or equal to HUSD decimals'
            )
        }

        const amountHusdTiny = toTinyUnits(payload.amountHUSD, husdDecimals)
        const rateScaled = toScaledBigInt(payload.rate, 6)
        const grossUsdcTiny = this.calculateGrossUsdcTiny(
            amountHusdTiny,
            rateScaled,
            usdcDecimals,
            husdDecimals
        )
        const feeRateScaled = toScaledBigInt(NUMERIC.INSTANT_WITHDRAW_FEE, 6)
        const feeUsdcTiny = (grossUsdcTiny * feeRateScaled) / RATE_SCALE
        const netUsdcTiny = grossUsdcTiny - feeUsdcTiny

        const grossUSDC = fromTinyUnits(grossUsdcTiny, usdcDecimals)
        const feeUSDC = fromTinyUnits(feeUsdcTiny, usdcDecimals)
        const netUSDC = fromTinyUnits(netUsdcTiny, usdcDecimals)

        this.validateWithdrawalBounds(payload.amountHUSD, grossUSDC)

        const client = this.getClient('instantWithdraw')
        const instantWithdrawAccountId = AccountId.fromString(
            serverEnv.operators.instantWithdraw.accountId
        )
        const userAccountId = AccountId.fromString(payload.userAccountId)
        const usdcTokenId = TokenId.fromString(serverEnv.tokens.usdc.tokenId)

        const walletBalanceTiny = await this.fetchTokenBalance(
            client,
            instantWithdrawAccountId,
            usdcTokenId
        )

        if (walletBalanceTiny < netUsdcTiny) {
            scopedLogger.warn('Insufficient instant withdraw wallet balance', {
                requiredTiny: netUsdcTiny.toString(),
                availableTiny: walletBalanceTiny.toString(),
            })
            throw badRequest('Insufficient instant withdraw wallet balance', {
                availableUSDC: fromTinyUnits(walletBalanceTiny, usdcDecimals),
                requiredUSDC: netUSDC,
            })
        }

        const emissionsAccountId = AccountId.fromString(
            serverEnv.operators.emissions.accountId
        )
        const husdTokenId = TokenId.fromString(serverEnv.tokens.husd.tokenId)

        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
        const tenMinutesAgoIso = tenMinutesAgo.toISOString()
        const transferVerified = await this.verifyHusdTransfer({
            amountTiny: amountHusdTiny,
            fromAccount: userAccountId.toString(),
            toAccount: emissionsAccountId.toString(),
            tokenId: husdTokenId.toString(),
            since: tenMinutesAgo,
        })

        if (!transferVerified) {
            scopedLogger.warn('HUSD transfer verification failed', {
                userAccountId: payload.userAccountId,
                emissionsAccountId: emissionsAccountId.toString(),
                amountTiny: amountHusdTiny.toString(),
                since: tenMinutesAgoIso,
            })
            throw badRequest('HUSD transfer not found', {
                expectedAmount: payload.amountHUSD,
                userAccountId: payload.userAccountId,
                emissionsAccountId: emissionsAccountId.toString(),
            })
        }

        const transferTxId = await this.executeUsdcTransfer({
            client,
            tokenId: usdcTokenId,
            from: instantWithdrawAccountId,
            to: userAccountId,
            amountTiny: netUsdcTiny,
        })

        const topicTxId = await this.publishWithdrawRecord({
            client,
            payload,
            grossUSDC,
            feeUSDC,
            netUSDC,
            transferTxId,
        })

        const walletBalanceAfterTiny = walletBalanceTiny - netUsdcTiny
        const walletBalanceAfter = fromTinyUnits(
            walletBalanceAfterTiny,
            usdcDecimals
        )

        scopedLogger.info('Instant withdrawal completed', {
            transferTxId,
            topicTxId,
            netUSDC,
            walletBalanceAfter,
        })

        return {
            txId: transferTxId,
            grossUSDC,
            feeUSDC,
            netUSDC,
            walletBalanceAfter,
            topicTxId,
        }
    }

    async getMaxInstantWithdrawable(): Promise<{
        maxInstantWithdrawable: number
        treasuryBalance: number
    }> {
        ensureTestnetAccess()

        const client = this.getClient('instantWithdraw')
        const instantWithdrawAccountId = AccountId.fromString(
            serverEnv.operators.instantWithdraw.accountId
        )
        const usdcTokenId = TokenId.fromString(serverEnv.tokens.usdc.tokenId)
        const balanceTiny = await this.fetchTokenBalance(
            client,
            instantWithdrawAccountId,
            usdcTokenId
        )
        const balance = fromTinyUnits(balanceTiny, serverEnv.decimals.usdc)

        return {
            maxInstantWithdrawable: balance,
            treasuryBalance: balance,
        }
    }

    private async fetchLatestRate(): Promise<RateRecord> {
        const latestRate = await this.rateService.getLatestRate()
        if (!latestRate) {
            this.logger.error('No latest rate available from Hedera topic')
            throw serviceUnavailable('No rate available from Hedera topic')
        }
        return latestRate
    }

    private calculateGrossUsdcTiny(
        amountHusdTiny: bigint,
        rateScaled: bigint,
        usdcDecimals: number,
        husdDecimals: number
    ): bigint {
        const decimalsDelta = usdcDecimals - husdDecimals
        const multiplier =
            decimalsDelta >= 0 ? BigInt(10) ** BigInt(decimalsDelta) : BigInt(1)
        const divisor =
            decimalsDelta >= 0
                ? RATE_SCALE
                : RATE_SCALE * BigInt(10) ** BigInt(-decimalsDelta)
        return (amountHusdTiny * rateScaled * multiplier) / divisor
    }

    private async fetchTokenBalance(
        client: Client,
        accountId: AccountId,
        tokenId: TokenId
    ): Promise<bigint> {
        const query = new AccountBalanceQuery().setAccountId(accountId)
        const balance = await query.execute(client)
        const tokenBalance = balance.tokens?.get(tokenId)
        if (!tokenBalance) {
            return BigInt(0)
        }
        return BigInt(tokenBalance.toString())
    }

    protected async verifyHusdTransfer(params: {
        fromAccount: string
        toAccount: string
        tokenId: string
        amountTiny: bigint
        since: Date
    }): Promise<boolean> {
        const { fromAccount, toAccount, tokenId, amountTiny } = params
        const bufferedSince = new Date(params.since.getTime() - 60_000)
        const sinceTimestamp = this.formatMirrorNodeTimestamp(bufferedSince)
        const sinceIso = bufferedSince.toISOString()

        const headers: Record<string, string> = {}
        if (serverEnv.mirrorNodeApiKey) {
            headers['x-api-key'] = serverEnv.mirrorNodeApiKey
        }

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            const url = new URL(`${this.mirrorNodeUrl}/api/v1/transactions`)
            url.searchParams.append('account.id', toAccount)
            url.searchParams.append('account.id', fromAccount)
            url.searchParams.set('timestamp', `gte:${sinceTimestamp}`)
            url.searchParams.set('order', 'desc')
            url.searchParams.set('limit', '100')
            url.searchParams.set('transactiontype', 'CRYPTOTRANSFER')

            this.logger.debug('Verifying HUSD transfer via Mirror Node', {
                attempt,
                url: url.toString(),
                since: sinceIso,
            })

            const response = await this.fetchMirrorNodeTransactions(
                url,
                headers
            )
            if (!response) {
                return false
            }

            try {
                const data = (await response.json()) as {
                    transactions?: Array<{
                        consensus_timestamp?: string
                        token_transfers?: Array<{
                            token_id: string
                            account: string
                            amount: string | number
                        }>
                    }>
                }
                const transactions = data.transactions ?? []
                this.logger.debug('Mirror Node transactions received', {
                    attempt,
                    transactionCount: transactions.length,
                })

                if (
                    this.hasMatchingTransfer({
                        transactions,
                        tokenId,
                        fromAccount,
                        toAccount,
                        amountTiny,
                    })
                ) {
                    this.logger.info('HUSD transfer verified', {
                        attempt,
                        since: sinceIso,
                    })
                    return true
                }
            } catch (error) {
                this.logger.error('Failed to parse Mirror Node response', {
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Unknown error',
                    attempt,
                })
                if (attempt === this.retryAttempts) {
                    return false
                }
            }

            if (attempt < this.retryAttempts) {
                this.logger.info('HUSD transfer not yet visible, retrying', {
                    attempt,
                    retryDelayMs: this.getDelayForAttempt(attempt),
                })
                await this.sleep(this.getDelayForAttempt(attempt))
            }
        }

        this.logger.warn('HUSD transfer missing after all attempts', {
            attempts: this.retryAttempts,
            since: sinceIso,
        })
        return false
    }

    private async executeUsdcTransfer(params: {
        client: Client
        tokenId: TokenId
        from: AccountId
        to: AccountId
        amountTiny: bigint
    }): Promise<string> {
        const { client, tokenId, from, to, amountTiny } = params

        const amountNumber = toSafeNumber(amountTiny, 'USDC')

        const transferTx = new TransferTransaction()
            .addTokenTransfer(tokenId, from, -amountNumber)
            .addTokenTransfer(tokenId, to, amountNumber)
            .setTransactionMemo(
                `Instant withdraw: ${amountTiny.toString()} tiny HUSD -> ${amountNumber} tiny USDC`
            )

        const response = await transferTx.execute(client)
        const receipt = await response.getReceipt(client)

        if (receipt.status.toString() !== 'SUCCESS') {
            throw internalError(
                `USDC transfer failed with status: ${receipt.status.toString()}`
            )
        }

        return response.transactionId.toString()
    }

    private async publishWithdrawRecord(params: {
        client: Client
        payload: InstantWithdrawPayload
        grossUSDC: number
        feeUSDC: number
        netUSDC: number
        transferTxId: string
    }): Promise<string | undefined> {
        const { client, payload, grossUSDC, feeUSDC, netUSDC, transferTxId } =
            params

        const withdrawRecord = {
            type: 'instant_withdraw',
            userAccountId: payload.userAccountId,
            amountHUSD: payload.amountHUSD,
            grossUSDC,
            fee: feeUSDC,
            netUSDC,
            rate: payload.rate,
            rateSequenceNumber: payload.rateSequenceNumber,
            transferTxId,
            timestamp: new Date().toISOString(),
        }

        const topicId = serverEnv.withdrawTopicId
        if (!topicId) {
            return undefined
        }

        const topicTransaction = new TopicMessageSubmitTransaction()
            .setTopicId(TopicId.fromString(topicId))
            .setMessage(JSON.stringify(withdrawRecord))

        const response = await topicTransaction.execute(client)
        const receipt = await response.getReceipt(client)

        if (receipt.status.toString() !== 'SUCCESS') {
            this.logger.warn(
                'Withdraw record submission returned non-success status',
                {
                    status: receipt.status.toString(),
                }
            )
        }

        return response.transactionId.toString()
    }

    private validateWithdrawalBounds(amountHUSD: number, grossUSDC: number) {
        if (amountHUSD < NUMERIC.INSTANT_WITHDRAW_MIN) {
            throw badRequest('Amount below instant withdraw minimum', {
                minimum: NUMERIC.INSTANT_WITHDRAW_MIN,
            })
        }

        if (amountHUSD > NUMERIC.INSTANT_WITHDRAW_MAX) {
            throw badRequest('Amount exceeds instant withdraw maximum', {
                maximum: NUMERIC.INSTANT_WITHDRAW_MAX,
            })
        }

        if (grossUSDC <= 0) {
            throw badRequest('Gross USDC amount must be greater than zero')
        }
    }

    private formatMirrorNodeTimestamp(date: Date): string {
        const timeMs = date.getTime()
        if (Number.isNaN(timeMs)) {
            throw badRequest('Invalid timestamp supplied for Mirror Node query')
        }
        const seconds = Math.floor(timeMs / 1000)
        const milliseconds = timeMs - seconds * 1000
        const nanos = Math.floor(milliseconds * 1_000_000)
        return `${seconds}.${nanos.toString().padStart(9, '0')}`
    }

    private async fetchMirrorNodeTransactions(
        url: URL,
        headers: Record<string, string>
    ): Promise<Response | null> {
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await this.fetchFn(url.toString(), { headers })

                if (response.ok) {
                    if (attempt > 1) {
                        this.logger.info(
                            'Mirror Node transaction query succeeded after retry',
                            {
                                attempt,
                            }
                        )
                    }
                    return response
                }

                if (
                    !this.shouldRetryStatus(response.status) ||
                    attempt === this.retryAttempts
                ) {
                    this.logger.error('Mirror Node transaction query failed', {
                        status: response.status,
                        statusText: response.statusText,
                        attempt,
                    })
                    return null
                }

                this.logger.warn(
                    'Mirror Node transaction query failed, retrying',
                    {
                        attempt,
                        status: response.status,
                        statusText: response.statusText,
                    }
                )
            } catch (error) {
                if (attempt === this.retryAttempts) {
                    this.logger.error('Mirror Node transaction query error', {
                        attempt,
                        message:
                            error instanceof Error
                                ? error.message
                                : 'Unknown error',
                    })
                    return null
                }

                this.logger.warn(
                    'Mirror Node transaction query error, retrying',
                    {
                        attempt,
                        message:
                            error instanceof Error
                                ? error.message
                                : 'Unknown error',
                    }
                )
            }

            await this.sleep(this.getDelayForAttempt(attempt))
        }

        return null
    }

    private shouldRetryStatus(status: number): boolean {
        return (
            status === 408 || status === 429 || (status >= 500 && status < 600)
        )
    }

    private sleep(durationMs: number): Promise<void> {
        if (durationMs <= 0) {
            return Promise.resolve()
        }

        return new Promise((resolve) => {
            const timer = setTimeout(resolve, durationMs)
            if (
                typeof timer === 'object' &&
                typeof (timer as NodeJS.Timeout).unref === 'function'
            ) {
                ;(timer as NodeJS.Timeout).unref()
            }
        })
    }

    private getDelayForAttempt(attempt: number): number {
        if (this.retryDelayMs <= 0) {
            return 0
        }
        const exponent = Math.max(0, attempt - 1)
        return this.retryDelayMs * 2 ** exponent
    }

    private hasMatchingTransfer(params: {
        transactions: Array<{
            consensus_timestamp?: string
            token_transfers?: Array<{
                token_id: string
                account: string
                amount: string | number
            }>
        }>
        tokenId: string
        fromAccount: string
        toAccount: string
        amountTiny: bigint
    }): boolean {
        const { transactions, tokenId, fromAccount, toAccount, amountTiny } =
            params

        for (const transaction of transactions) {
            const transfers = transaction.token_transfers ?? []
            if (transfers.length === 0) continue

            const toEntry = transfers.find(
                (transfer) =>
                    transfer.token_id === tokenId &&
                    transfer.account === toAccount &&
                    BigInt(transfer.amount.toString()) === amountTiny
            )

            if (!toEntry) {
                continue
            }

            const fromEntry = transfers.find(
                (transfer) =>
                    transfer.token_id === tokenId &&
                    transfer.account === fromAccount &&
                    BigInt(transfer.amount.toString()) === -amountTiny
            )

            if (fromEntry) {
                return true
            }
        }

        return false
    }
}

const defaultDependencies: InstantWithdrawDeps = {
    rateService: new HederaRateService(),
    getClient: getHederaClient,
    logger: createScopedLogger('instant-withdraw-service'),
    retryAttempts: serverEnv.instantWithdraw.retryAttempts,
    retryDelayMs: serverEnv.instantWithdraw.retryDelayMs,
}

export const instantWithdrawService = new InstantWithdrawService(
    defaultDependencies
)
