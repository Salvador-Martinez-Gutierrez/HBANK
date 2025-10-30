/**
 * Hedera Deposit Service
 *
 * Handles deposit operations including scheduled transactions for USDC deposits
 * and HUSD transfers to treasury for withdrawals.
 */

import { injectable, inject } from 'inversify'
import {
    TransferTransaction,
    ScheduleCreateTransaction,
    TokenId,
    AccountId,
} from '@hashgraph/sdk'
import { TYPES } from '@/core/di/types'
import { HederaClientFactory } from './HederaClientFactory'
import { HederaRateService } from './HederaRateService'
import { createScopedLogger } from '@/lib/logger'

const logger = createScopedLogger('hedera-deposit')

/**
 * Deposit schedule response
 */
export interface DepositScheduleResponse {
    status: 'success'
    scheduleId: string
    husdAmount: number
    transactionId: string
    timestamp: string
}

/**
 * Hedera Deposit Service
 *
 * Provides methods for creating scheduled deposit transactions on Hedera.
 * Handles both USDC deposits (user -> protocol) and HUSD transfers (user -> treasury).
 */
@injectable()
export class HederaDepositService {
    constructor(
        @inject(TYPES.HederaClientFactory) private clientFactory: HederaClientFactory,
        @inject(TYPES.HederaRateService) private rateService: HederaRateService
    ) {
        logger.info('Deposit service initialized')
    }

    /**
     * Create a scheduled deposit transaction
     *
     * Creates a multi-transfer scheduled transaction that:
     * 1. Transfers USDC from user to deposit wallet
     * 2. Transfers HUSD from emissions wallet to user
     *
     * The transaction requires signatures from:
     * - User (to send USDC)
     * - Emissions wallet (to send HUSD)
     * - Deposit wallet (to receive USDC)
     *
     * @param userId - User's Hedera account ID
     * @param amountUsdc - Amount of USDC to deposit
     * @returns Schedule response with schedule ID and HUSD amount
     *
     * @throws Error if token IDs are not configured
     * @throws Error if schedule creation fails
     *
     * @example
     * ```typescript
     * const result = await depositService.scheduleDeposit('0.0.12345', 100)
     * console.log(`Schedule created: ${result.scheduleId}`)
     * console.log(`User will receive: ${result.husdAmount} HUSD`)
     * ```
     */
    async scheduleDeposit(
        userId: string,
        amountUsdc: number
    ): Promise<DepositScheduleResponse> {
        try {
            const depositWallet = this.clientFactory.getWalletCredentials('deposit')
            const emissionsWallet = this.clientFactory.getWalletCredentials('emissions')
            const usdcTokenId = process.env.USDC_TOKEN_ID
            const husdTokenId = process.env.HUSD_TOKEN_ID

            if (!usdcTokenId || !husdTokenId) {
                throw new Error('Missing required token IDs')
            }

            // Calculate hUSD amount based on current rate
            const currentRate = await this.rateService.getCurrentRate()
            const husdAmount = amountUsdc / currentRate

            logger.info('Creating scheduled deposit transaction', {
                user: userId,
                usdcAmount: amountUsdc,
                husdAmount: husdAmount.toFixed(2),
                rate: currentRate,
                depositWallet: depositWallet.id,
                emissionsWallet: emissionsWallet.id,
            })

            const client = this.clientFactory.createMainClient()
            const operatorId = this.clientFactory.getOperatorId()
            const operatorKey = client.operatorPublicKey

            if (!operatorKey) {
                throw new Error('Operator key not found on client')
            }

            // Create the transfer transaction
            const transferTx = new TransferTransaction()
                .addTokenTransfer(
                    TokenId.fromString(usdcTokenId),
                    AccountId.fromString(userId),
                    -amountUsdc * this.clientFactory.USDC_MULTIPLIER // Negative = outgoing
                )
                .addTokenTransfer(
                    TokenId.fromString(usdcTokenId),
                    AccountId.fromString(depositWallet.id),
                    amountUsdc * this.clientFactory.USDC_MULTIPLIER // Positive = incoming
                )
                .addTokenTransfer(
                    TokenId.fromString(husdTokenId),
                    AccountId.fromString(emissionsWallet.id),
                    -Math.floor(husdAmount * this.clientFactory.HUSD_MULTIPLIER) // Outgoing
                )
                .addTokenTransfer(
                    TokenId.fromString(husdTokenId),
                    AccountId.fromString(userId),
                    Math.floor(husdAmount * this.clientFactory.HUSD_MULTIPLIER) // Incoming
                )

            // Create the scheduled transaction
            const scheduleTx = new ScheduleCreateTransaction()
                .setScheduledTransaction(transferTx)
                .setScheduleMemo(`Deposit: ${amountUsdc} USDC for ${husdAmount.toFixed(2)} hUSD`)
                .setAdminKey(operatorKey)
                .setPayerAccountId(operatorId)

            // Execute the transaction
            const scheduleResponse = await scheduleTx.execute(client)
            const scheduleReceipt = await scheduleResponse.getReceipt(client)
            const scheduleId = scheduleReceipt.scheduleId

            logger.info('Scheduled transaction created successfully', {
                scheduleId: scheduleId?.toString(),
                transactionId: scheduleResponse.transactionId.toString(),
            })

            return {
                status: 'success',
                scheduleId: scheduleId?.toString() ?? 'unknown',
                husdAmount: Number(husdAmount.toFixed(2)),
                transactionId: scheduleResponse.transactionId.toString(),
                timestamp: new Date().toISOString(),
            }
        } catch (error) {
            logger.error('Error creating scheduled deposit', { error, userId, amountUsdc })
            throw error
        }
    }

    /**
     * Create a scheduled HUSD transfer from user to treasury
     *
     * Used for withdrawal requests where the user sends HUSD to the treasury
     * in exchange for USDC. Creates a unique memo to avoid schedule collisions.
     *
     * The schedule requires the user's signature to execute.
     *
     * @param user - User's Hedera account ID
     * @param amountHUSD - Amount of HUSD to transfer
     * @returns Schedule ID that the user must sign
     *
     * @throws Error if HUSD token ID is not configured
     * @throws Error if schedule creation fails
     *
     * @example
     * ```typescript
     * const scheduleId = await depositService.createScheduledHUSDTransfer('0.0.12345', 100)
     * console.log(`User must sign schedule: ${scheduleId}`)
     * ```
     */
    async createScheduledHUSDTransfer(user: string, amountHUSD: number): Promise<string> {
        const treasuryWallet = this.clientFactory.getWalletCredentials('treasury')
        const husdTokenId = process.env.HUSD_TOKEN_ID

        if (!husdTokenId) {
            throw new Error('Missing required token ID')
        }

        logger.info('Creating scheduled HUSD transfer', {
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

            const client = this.clientFactory.createMainClient()
            const operatorKey = client.operatorPublicKey

            if (!operatorKey) {
                throw new Error('Operator key not found on client')
            }

            // Create the transfer transaction that will be scheduled
            const transferTx = new TransferTransaction()
                .addTokenTransfer(
                    TokenId.fromString(husdTokenId),
                    AccountId.fromString(user),
                    -Math.floor(amountHUSD * this.clientFactory.HUSD_MULTIPLIER) // Outgoing
                )
                .addTokenTransfer(
                    TokenId.fromString(husdTokenId),
                    AccountId.fromString(treasuryWallet.id),
                    Math.floor(amountHUSD * this.clientFactory.HUSD_MULTIPLIER) // Incoming
                )

            // Create the schedule transaction with unique memo
            const scheduleCreateTx = new ScheduleCreateTransaction()
                .setScheduledTransaction(transferTx)
                .setScheduleMemo(uniqueMemo)
                .setAdminKey(operatorKey) // Treasury can manage the schedule

            const scheduleResponse = await scheduleCreateTx.execute(client)
            const scheduleReceipt = await scheduleResponse.getReceipt(client)
            const scheduleId = scheduleReceipt.scheduleId

            if (!scheduleId) {
                throw new Error('Failed to create scheduled transaction')
            }

            logger.info('Scheduled transaction created successfully', {
                scheduleId: scheduleId.toString(),
                memo: uniqueMemo,
                note: 'User must sign this schedule to execute the transfer',
            })

            return scheduleId.toString()
        } catch (error) {
            logger.error('Error creating scheduled HUSD transfer', { error, user, amountHUSD })
            throw error
        }
    }

    /**
     * Legacy method - now redirects to scheduled transaction
     *
     * @deprecated Use createScheduledHUSDTransfer instead
     *
     * This method is kept for backward compatibility and delegates to
     * createScheduledHUSDTransfer.
     *
     * @param user - User's Hedera account ID
     * @param amountHUSD - Amount of HUSD to transfer
     * @returns Schedule ID (returned as "transaction ID" for compatibility)
     */
    async transferHUSDToTreasury(user: string, amountHUSD: number): Promise<string> {
        logger.debug('Using legacy transferHUSDToTreasury (redirecting to scheduled transfer)')
        return await this.createScheduledHUSDTransfer(user, amountHUSD)
    }
}
