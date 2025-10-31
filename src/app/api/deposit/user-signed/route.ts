/**
 * Complete deposit with user signature
 *
 * POST /api/deposit/user-signed
 *
 * Processes the user's signature and completes the deposit transaction
 */

import { NextResponse } from 'next/server'
import { withRouteHandler } from '@/lib/app-router-handler'
import { withRateLimit } from '@/lib/rate-limit'
import { depositService } from '@/services/depositService'
import { depositUserSignedSchema } from '@/utils/validation/deposit'

export const POST = withRateLimit('FINANCIAL')(withRouteHandler(
    async ({ body, logger }): Promise<NextResponse> => {
        const payload = depositUserSignedSchema.parse(body)

        logger.info('Processing treasury signature', {
            scheduleId: payload.scheduleId,
        })

        const result = await depositService.completeTreasurySignature(payload)

        logger.info('Treasury signature result', {
            scheduleExecuted: result.executed,
        })

        return NextResponse.json({
            ...result,
            clientRequestId: payload.clientRequestId,
        })
    },
    {
        scope: 'api:deposit:user-signed',
    }
))
