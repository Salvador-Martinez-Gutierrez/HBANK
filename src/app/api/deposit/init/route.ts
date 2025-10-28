/**
 * Initialize deposit transaction
 *
 * POST /api/deposit/init
 *
 * Creates a scheduled deposit transaction that will transfer USDC
 * from the user's account to the protocol's deposit wallet
 */

import { NextResponse } from 'next/server'
import { withRouteHandler } from '@/lib/app-router-handler'
import { depositService } from '@/services/depositService'
import { depositInitSchema } from '@/utils/validation/deposit'

export const POST = withRouteHandler(
    async ({ body, logger }): Promise<NextResponse> => {
        const payload = depositInitSchema.parse(body)

        logger.info('Payload validated', {
            rateSequenceNumber: payload.rateSequenceNumber,
            userAccountIdSuffix: payload.userAccountId.slice(-6),
        })

        const result = await depositService.initializeDeposit(payload)
        logger.info('Deposit initialization completed', {
            scheduleId: result.scheduleId,
        })

        return NextResponse.json(result)
    },
    {
        scope: 'api:deposit:init',
    }
)
