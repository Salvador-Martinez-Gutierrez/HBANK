/**
 * Instant withdrawal endpoint
 *
 * POST /api/withdraw/instant
 *
 * Processes instant withdrawals with fees
 */

import { NextResponse } from 'next/server'
import { withRouteHandler } from '@/lib/app-router-handler'
import { withRateLimit } from '@/lib/rate-limit'
import { instantWithdrawService } from '@/services/instantWithdrawService'
import { TelegramService } from '@/services/telegramService'
import { instantWithdrawSchema } from '@/utils/validation/withdraw'

const telegramService = new TelegramService()

export const POST = withRateLimit('FINANCIAL')(withRouteHandler(
    async ({ body, logger }): Promise<NextResponse> => {
        const payload = instantWithdrawSchema.parse(body)

        logger.info('Instant withdraw payload validated', {
            userAccountIdSuffix: payload.userAccountId.slice(-6),
            rateSequenceNumber: payload.rateSequenceNumber,
        })

        const result = await instantWithdrawService.processInstantWithdrawal(
            payload
        )

        logger.info('Instant withdraw completed', {
            transferTxId: result.txId,
            topicTxId: result.topicTxId,
            walletBalanceAfter: result.walletBalanceAfter,
        })

        try {
            await telegramService.sendWithdrawNotification({
                type: 'instant',
                userAccountId: payload.userAccountId,
                amountHUSD: payload.amountHUSD,
                amountUSDC: result.grossUSDC,
                rate: payload.rate,
                txId: result.txId,
                fee: result.feeUSDC,
                timestamp: new Date().toISOString(),
                walletBalanceAfter: result.walletBalanceAfter,
            })
        } catch (error) {
            logger.warn('Telegram notification failed', {
                message: error instanceof Error ? error.message : 'Unknown',
            })
        }

        return NextResponse.json({
            success: true,
            txId: result.txId,
            grossUSDC: result.grossUSDC,
            fee: result.feeUSDC,
            netUSDC: result.netUSDC,
        })
    },
    {
        scope: 'api:withdraw:instant',
    }
))
