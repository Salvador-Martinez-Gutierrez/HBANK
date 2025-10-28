/**
 * Deposit Service
 *
 * Handles deposit operations for converting USDC to hUSD on Hedera.
 * Manages the creation of scheduled transactions that transfer USDC from users
 * and mint hUSD tokens at a locked exchange rate. Implements a two-step signature
 * process where users sign first, then the treasury (emissions wallet) signs to execute.
 */

import {
    AccountBalanceQuery,
    AccountId,
    Hbar,
    PrivateKey,
    ScheduleCreateTransaction,
    ScheduleId,
    ScheduleInfoQuery,
    ScheduleSignTransaction,
    Timestamp,
    TokenId,
    TransferTransaction,
} from '@hashgraph/sdk'

import { serverEnv } from '@/config/serverEnv'
import {
    conflict,
    badRequest,
    notFound,
    gone,
    internalError,
    serviceUnavailable,
} from '@/lib/errors'
import { createScopedLogger, ScopedLogger } from '@/lib/logger'
import { getHederaClient } from '@/services/hederaClientFactory'
import { HederaRateService } from '@/services/hederaRateService'
import { createDepositMemo } from '@/utils/depositMemo'
import { fromTinyUnits, toTinyUnits } from '@/utils/hederaAmounts'
import {
    DepositInitPayload,
    DepositUserSignedPayload,
    RateRecord,
    isRateMatch,
} from '@/utils/validation/deposit'

const ONE_HOUR_IN_MS = 60 * 60 * 1000

export type InitializeDepositDeps = {
    rateService: HederaRateService
    getClient: typeof getHederaClient
    logger?: ScopedLogger
}

export class DepositService {
    private readonly rateService: HederaRateService
    private readonly getClient: typeof getHederaClient
    private readonly logger: ScopedLogger

    constructor(deps: InitializeDepositDeps) {
        this.rateService = deps.rateService
        this.getClient = deps.getClient
        this.logger = deps.logger ?? createScopedLogger('deposit-service')
    }

    /**
     * Fetch the latest exchange rate from Hedera
     *
     * @returns The most recent rate record from the HCS topic
     * @throws {ServiceUnavailableError} If no rate is available
     * @private
     */
    private async fetchLatestRate(): Promise<RateRecord> {
        const rate = await this.rateService.getLatestRate()
        if (!rate) {
            throw serviceUnavailable('No rate available from Hedera topic')
        }
        return rate
    }

    /**
     * Get the USDC token ID from environment configuration
     *
     * @returns USDC token ID for Hedera transactions
     * @private
     */
    private getUsdcTokenId() {
        return TokenId.fromString(serverEnv.tokens.usdc.tokenId)
    }

    /**
     * Get the hUSD token ID from environment configuration
     *
     * @returns hUSD token ID for Hedera transactions
     * @private
     */
    private getHusdTokenId() {
        return TokenId.fromString(serverEnv.tokens.husd.tokenId)
    }

    /**
     * Initialize a new deposit transaction
     *
     * Creates a scheduled transaction that will transfer USDC from the user to the deposit wallet
     * and transfer hUSD from the emissions wallet to the user at the current exchange rate.
     * The transaction requires signatures from both the user and the emissions wallet to execute.
     * Rate is validated to ensure it matches the latest published rate.
     *
     * @param payload - Deposit initialization data
     * @param payload.userAccountId - Hedera account ID of the depositor (e.g., "0.0.123456")
     * @param payload.amount - Amount of USDC to deposit
     * @param payload.expectedRate - Expected USDC/hUSD exchange rate
     * @param payload.rateSequenceNumber - Sequence number of the rate for validation
     * @param payload.rateTimestamp - Timestamp of the rate for validation
     * @returns Schedule details including schedule ID, amounts, rate, and transaction ID
     * @throws {ServiceUnavailableError} If deposits are disabled or no rate is available
     * @throws {ConflictError} If the submitted rate doesn't match the latest rate
     * @throws {BadRequestError} If user has insufficient USDC or emissions wallet has insufficient hUSD
     * @throws {InternalError} If schedule creation fails or amounts exceed safe integer range
     *
     * @example
     * ```typescript
     * const result = await depositService.initializeDeposit({
     *   userAccountId: '0.0.123456',
     *   amount: 100,
     *   expectedRate: 1.05,
     *   rateSequenceNumber: '42',
     *   rateTimestamp: '2024-01-01T12:00:00.000Z'
     * })
     * // Returns: {
     * //   success: true,
     * //   scheduleId: '0.0.789012',
     * //   amountHUSDC: 95.238,
     * //   rate: 1.05,
     * //   usdcAmount: 100,
     * //   ...
     * // }
     * ```
     */
    async initializeDeposit(payload: DepositInitPayload) {
        const scopedLogger = this.logger.child('initialize', {
            userAccountId: payload.userAccountId,
            rateSequenceNumber: payload.rateSequenceNumber,
        })

        scopedLogger.info('Starting deposit initialization')

        if (!serverEnv.useRealTestnet) {
            throw serviceUnavailable(
                'Deposits are disabled because USE_REAL_TESTNET=false'
            )
        }

        const latestRate = await this.fetchLatestRate()

        const submittedRate: RateRecord = {
            rate: payload.expectedRate,
            sequenceNumber: payload.rateSequenceNumber,
            timestamp: payload.rateTimestamp,
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

        const depositClient = this.getClient('deposit')

        const userAccountId = AccountId.fromString(payload.userAccountId)
        const depositAccountId = AccountId.fromString(
            serverEnv.operators.deposit.accountId
        )
        const emissionsAccountId = AccountId.fromString(
            serverEnv.operators.emissions.accountId
        )
        const usdcTokenId = this.getUsdcTokenId()
        const husdTokenId = this.getHusdTokenId()
        const depositPrivateKey = PrivateKey.fromString(
            serverEnv.operators.deposit.privateKey
        )

        const requiredUsdcTiny = toTinyUnits(
            payload.amount,
            serverEnv.decimals.usdc
        )
        const husdAmount = payload.amount / latestRate.rate
        const requiredHusdTiny = toTinyUnits(
            husdAmount,
            serverEnv.decimals.husd
        )

        scopedLogger.info('Checking token balances')

        const userBalance = await new AccountBalanceQuery()
            .setAccountId(userAccountId)
            .execute(depositClient)
        const userUsdcBalanceTiny = userBalance.tokens?.get(usdcTokenId)
            ? BigInt(userBalance.tokens.get(usdcTokenId)?.toString() ?? '0')
            : BigInt(0)

        if (userUsdcBalanceTiny < requiredUsdcTiny) {
            scopedLogger.warn('User has insufficient USDC balance', {
                requiredUsdc: Number(requiredUsdcTiny),
                availableUsdc: Number(userUsdcBalanceTiny),
            })
            throw badRequest('Insufficient USDC balance', {
                requiredTiny: requiredUsdcTiny.toString(),
                availableTiny: userUsdcBalanceTiny.toString(),
            })
        }

        const emissionsBalance = await new AccountBalanceQuery()
            .setAccountId(emissionsAccountId)
            .execute(depositClient)
        const emissionsHusdBalanceTiny = emissionsBalance.tokens?.get(
            husdTokenId
        )
            ? BigInt(emissionsBalance.tokens.get(husdTokenId)?.toString() ?? '0')
            : BigInt(0)

        if (emissionsHusdBalanceTiny < requiredHusdTiny) {
            scopedLogger.warn(
                'Emissions wallet has insufficient hUSD balance',
                {
                    requiredHusd: Number(requiredHusdTiny),
                    availableHusd: Number(emissionsHusdBalanceTiny),
                }
            )
            throw badRequest('Insufficient emissions wallet balance', {
                requiredTiny: requiredHusdTiny.toString(),
                availableTiny: emissionsHusdBalanceTiny.toString(),
            })
        }

        const memo = createDepositMemo({
            userAccountId: payload.userAccountId,
            husdAmount,
            rateSequenceNumber: latestRate.sequenceNumber,
        })

        scopedLogger.info('Creating transfer transaction', { memo })

        const toSafeNumber = (value: bigint, token: string) => {
            const asNumber = Number(value)
            if (!Number.isSafeInteger(asNumber) || BigInt(asNumber) !== value) {
                throw internalError(
                    `Token amount for ${token} exceeds safe integer range`
                )
            }
            return asNumber
        }

        const transferTransaction = new TransferTransaction()
            .addTokenTransfer(
                usdcTokenId,
                userAccountId,
                -toSafeNumber(requiredUsdcTiny, 'USDC')
            )
            .addTokenTransfer(
                usdcTokenId,
                depositAccountId,
                toSafeNumber(requiredUsdcTiny, 'USDC')
            )
            .addTokenTransfer(
                husdTokenId,
                emissionsAccountId,
                -toSafeNumber(requiredHusdTiny, 'HUSD')
            )
            .addTokenTransfer(
                husdTokenId,
                userAccountId,
                toSafeNumber(requiredHusdTiny, 'HUSD')
            )

        const scheduleTransaction = new ScheduleCreateTransaction()
            .setScheduledTransaction(transferTransaction)
            .setScheduleMemo(memo)
            .setAdminKey(depositPrivateKey.publicKey)
            .setPayerAccountId(depositAccountId)
            .setExpirationTime(
                Timestamp.fromDate(new Date(Date.now() + ONE_HOUR_IN_MS))
            )

        const scheduleResponse = await scheduleTransaction.execute(
            depositClient
        )
        const scheduleReceipt = await scheduleResponse.getReceipt(depositClient)
        const scheduleId = scheduleReceipt.scheduleId

        if (!scheduleId) {
            scopedLogger.error('Schedule ID missing from receipt', {
                receiptStatus: scheduleReceipt.status.toString(),
            })
            throw internalError('Failed to create scheduled transaction')
        }

        scopedLogger.info('Scheduled transaction created', {
            scheduleId: scheduleId.toString(),
            txId: scheduleResponse.transactionId.toString(),
        })

        return {
            success: true as const,
            scheduleId: scheduleId.toString(),
            amountHUSDC: fromTinyUnits(
                requiredHusdTiny,
                serverEnv.decimals.husd
            ),
            rate: latestRate.rate,
            rateSequenceNumber: latestRate.sequenceNumber,
            usdcAmount: payload.amount,
            timestamp: new Date().toISOString(),
            txId: scheduleResponse.transactionId.toString(),
        }
    }

    /**
     * Complete the deposit by adding the treasury (emissions wallet) signature
     *
     * After the user has signed the scheduled transaction, this method adds the emissions wallet
     * signature to execute the deposit. Validates that the schedule exists and hasn't been
     * executed or deleted. Once both signatures are present, the transaction executes automatically.
     *
     * @param payload - Payload containing the schedule ID to sign
     * @param payload.scheduleId - ID of the scheduled transaction (e.g., "0.0.789012")
     * @returns Execution status including whether the transaction was executed and transaction ID
     * @throws {ServiceUnavailableError} If deposits are disabled
     * @throws {NotFoundError} If the schedule ID is invalid or doesn't exist
     * @throws {GoneError} If the schedule was already deleted
     * @throws {ConflictError} If the schedule was already executed
     * @throws {InternalError} If the signature operation fails
     *
     * @example
     * ```typescript
     * const result = await depositService.completeTreasurySignature({
     *   scheduleId: '0.0.789012'
     * })
     * // Returns: {
     * //   success: true,
     * //   executed: true,
     * //   txId: '0.0.123456@1234567890.123456789',
     * //   scheduleId: '0.0.789012',
     * //   timestamp: '2024-01-01T12:00:00.000Z'
     * // }
     * ```
     */
    async completeTreasurySignature(payload: DepositUserSignedPayload) {
        const scopedLogger = this.logger.child('treasury-sign', {
            scheduleId: payload.scheduleId,
        })

        scopedLogger.info('Completing treasury signature')

        if (!serverEnv.useRealTestnet) {
            throw serviceUnavailable(
                'Deposits are disabled because USE_REAL_TESTNET=false'
            )
        }

        const emissionsClient = this.getClient('emissions')
        const scheduleId = ScheduleId.fromString(payload.scheduleId)

        const scheduleInfoQuery = new ScheduleInfoQuery()
            .setScheduleId(scheduleId)
            .setMaxQueryPayment(
                Hbar.fromTinybars(
                    Number(serverEnv.limits.maxQueryPaymentTinybars)
                )
            )

        let scheduleInfo
        try {
            scheduleInfo = await scheduleInfoQuery.execute(emissionsClient)
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Unknown error'
            if (message.includes('INVALID_SCHEDULE_ID')) {
                throw notFound('Schedule not found', {
                    scheduleId: payload.scheduleId,
                })
            }
            scopedLogger.error('Failed to query schedule info', { message })
            throw internalError('Unable to query schedule information')
        }

        if (scheduleInfo.executed) {
            scopedLogger.info('Schedule already executed')
            return {
                success: true as const,
                executed: true,
                scheduleId: payload.scheduleId,
                message: 'Transaction already executed',
            }
        }

        if (scheduleInfo.deleted) {
            scopedLogger.warn('Schedule was deleted')
            throw gone('Schedule was deleted', {
                scheduleId: payload.scheduleId,
            })
        }

        const signTransaction = new ScheduleSignTransaction()
            .setScheduleId(scheduleId)
            .setMaxTransactionFee(
                Hbar.fromTinybars(
                    Number(serverEnv.limits.maxScheduleSignFeeTinybars)
                )
            )

        try {
            const signResponse = await signTransaction.execute(emissionsClient)
            const signReceipt = await signResponse.getReceipt(emissionsClient)

            if (signReceipt.status.toString() !== 'SUCCESS') {
                scopedLogger.error('Treasury signature failed', {
                    status: signReceipt.status.toString(),
                })
                throw internalError(
                    `Emissions wallet signature failed with status: ${signReceipt.status.toString()}`
                )
            }

            const finalScheduleInfo = await new ScheduleInfoQuery()
                .setScheduleId(scheduleId)
                .setMaxQueryPayment(
                    Hbar.fromTinybars(
                        Number(serverEnv.limits.maxQueryPaymentTinybars)
                    )
                )
                .execute(emissionsClient)

            scopedLogger.info('Treasury signature completed', {
                executed: finalScheduleInfo.executed,
                txId: signResponse.transactionId?.toString(),
            })

            return {
                success: true as const,
                executed: finalScheduleInfo.executed ?? false,
                txId: signResponse.transactionId?.toString(),
                scheduleId: payload.scheduleId,
                timestamp: new Date().toISOString(),
            }
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Unknown error'
            if (message.includes('SCHEDULE_ALREADY_EXECUTED')) {
                throw conflict('Schedule already executed', {
                    scheduleId: payload.scheduleId,
                })
            }
            if (message.includes('SCHEDULE_ALREADY_DELETED')) {
                throw gone('Schedule was deleted', {
                    scheduleId: payload.scheduleId,
                })
            }
            scopedLogger.error(
                'Unexpected error completing treasury signature',
                { message }
            )
            throw internalError('Treasury signature failed')
        }
    }
}

const defaultDependencies: InitializeDepositDeps = {
    rateService: new HederaRateService(),
    getClient: getHederaClient,
    logger: createScopedLogger('deposit-service'),
}

export const depositService = new DepositService(defaultDependencies)
