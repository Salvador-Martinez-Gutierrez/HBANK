/**
 * Endpoint to verify authentication signature
 *
 * POST /api/auth/verify
 *
 * Verifies the signed nonce and creates an authentication session
 */

import { NextResponse } from 'next/server'
import { NonceService } from '@/services/nonceService'
import {
    verifyHederaSignature,
    verifyHederaSignatureWithAccountId,
    isValidHederaAccountId,
} from '@/lib/hedera-auth'
import { createJWT } from '@/lib/jwt'
import type { VerifyRequest, AuthResponse } from '@/types/auth'
import { withRouteHandler } from '@/lib/app-router-handler'

export const POST = withRouteHandler(
    async ({ body, logger }): Promise<NextResponse> => {
        const { accountId, nonce, signature, publicKey } =
            body as VerifyRequest

        // Validate required fields
        if (!accountId || !nonce || !signature) {
            logger.warn('Missing required fields in verify request')
            return NextResponse.json(
                {
                    success: false,
                    error: 'accountId, nonce, and signature are required',
                },
                { status: 400 }
            )
        }

        // Validate accountId format
        if (!isValidHederaAccountId(accountId)) {
            logger.warn('Invalid Hedera accountId format', { accountId })
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid Hedera accountId format',
                },
                { status: 400 }
            )
        }

        // Validate nonce
        const nonceValidation = NonceService.validateNonce(nonce, accountId)
        if (!nonceValidation.valid || !nonceValidation.message) {
            logger.warn('Nonce validation failed', {
                accountId,
                error: nonceValidation.error,
            })
            return NextResponse.json(
                {
                    success: false,
                    error: nonceValidation.error ?? 'Invalid nonce',
                },
                { status: 400 }
            )
        }

        // Verify signature
        let isValidSignature = false

        if (publicKey) {
            logger.info('Verifying signature with provided public key', {
                accountId,
            })
            isValidSignature = verifyHederaSignature(
                nonceValidation.message,
                signature,
                publicKey
            )
        } else {
            logger.info('Verifying signature with Mirror Node public key', {
                accountId,
            })
            isValidSignature = await verifyHederaSignatureWithAccountId(
                nonceValidation.message,
                signature,
                accountId
            )
        }

        if (!isValidSignature) {
            logger.warn('Invalid signature', { accountId })
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid signature',
                },
                { status: 401 }
            )
        }

        // Mark nonce as used
        NonceService.markAsUsed(nonce)

        // Create JWT
        const token = await createJWT(accountId)

        // Create response with Set-Cookie header
        const response: AuthResponse = {
            success: true,
            accountId,
        }

        const nextResponse = NextResponse.json(response)
        nextResponse.cookies.set('hbank-auth-token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            path: '/',
            maxAge: 24 * 60 * 60, // 24 hours
        })

        logger.info('Authentication successful', { accountId })

        return nextResponse
    },
    { scope: 'api:auth:verify' }
)
