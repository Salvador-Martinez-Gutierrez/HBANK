/**
 * Endpoint to get an authentication nonce
 *
 * GET /api/auth/nonce?accountId=0.0.XXXX
 *
 * Returns a unique nonce that the client must sign with their wallet
 */

import { NextResponse } from 'next/server'
import { NonceService } from '@/services/nonceService'
import { isValidHederaAccountId } from '@/lib/hedera-auth'
import type { NonceResponse } from '@/types/auth'
import { withRouteHandler } from '@/lib/app-router-handler'
import { withRateLimit } from '@/lib/rate-limit'

export const GET = withRateLimit('AUTH')(withRouteHandler(
    async ({ req, logger }): Promise<NextResponse> => {
        const { searchParams } = req.nextUrl
        const accountId = searchParams.get('accountId')

        // Validate that accountId is present
        if (!accountId) {
            logger.warn('Missing accountId in nonce request')
            return NextResponse.json(
                { error: 'accountId is required' },
                { status: 400 }
            )
        }

        // Validate accountId format
        if (!isValidHederaAccountId(accountId)) {
            logger.warn('Invalid Hedera accountId format', { accountId })
            return NextResponse.json(
                { error: 'Invalid Hedera accountId format' },
                { status: 400 }
            )
        }

        // Generate nonce
        const { nonce, message } = NonceService.generateNonce(accountId)

        logger.info('Nonce generated successfully', {
            accountId,
            nonceLength: nonce.length,
        })

        const response: NonceResponse = { nonce, message }
        return NextResponse.json(response)
    },
    { scope: 'api:auth:nonce' }
))
