/**
 * Get maximum instant withdrawable amount
 *
 * GET /api/withdraw/instant/max
 *
 * Returns the maximum amount that can be instantly withdrawn
 */

import { NextResponse } from 'next/server'
import { withRouteHandler } from '@/lib/app-router-handler'
import { instantWithdrawService } from '@/services/instantWithdrawService'

export const GET = withRouteHandler(
    async ({ logger }): Promise<NextResponse> => {
        const result = await instantWithdrawService.getMaxInstantWithdrawable()

        logger.info('Fetched instant withdraw max', {
            maxInstantWithdrawable: result.maxInstantWithdrawable,
        })

        return NextResponse.json(result)
    },
    {
        scope: 'api:withdraw:instant:max',
    }
)
