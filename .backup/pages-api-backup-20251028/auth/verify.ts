import type { NextApiRequest, NextApiResponse } from 'next'
import { NonceService } from '@/services/nonceService'
import {
    verifyHederaSignature,
    verifyHederaSignatureWithAccountId,
    isValidHederaAccountId,
} from '@/lib/hedera-auth'
import { createJWT } from '@/lib/jwt'
import type { VerifyRequest, AuthResponse } from '@/types/auth'
import { logger } from '@/lib/logger'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<AuthResponse>
) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed',
        })
    }

    try {
        const { accountId, nonce, signature, publicKey } =
            req.body as VerifyRequest

        if (!accountId || !nonce || !signature) {
            logger.warn('Missing required fields in verify request')
            return res.status(400).json({
                success: false,
                error: 'accountId, nonce, and signature are required',
            })
        }

        if (!isValidHederaAccountId(accountId)) {
            logger.warn('Invalid Hedera accountId format', { accountId })
            return res.status(400).json({
                success: false,
                error: 'Invalid Hedera accountId format',
            })
        }

        const nonceValidation = NonceService.validateNonce(nonce, accountId)
        if (!nonceValidation.valid || !nonceValidation.message) {
            logger.warn('Nonce validation failed', {
                accountId,
                error: nonceValidation.error,
            })
            return res.status(400).json({
                success: false,
                error: nonceValidation.error || 'Invalid nonce',
            })
        }

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
            return res.status(401).json({
                success: false,
                error: 'Invalid signature',
            })
        }

        NonceService.markAsUsed(nonce)

        const token = await createJWT(accountId)

        res.setHeader('Set-Cookie', [
            `hbank-auth-token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${
                24 * 60 * 60
            }`,
        ])

        logger.info('Authentication successful', { accountId })

        return res.status(200).json({
            success: true,
            accountId,
        })
    } catch (error) {
        logger.error('Error in verify endpoint', {
            error: error instanceof Error ? error.message : String(error),
        })
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        })
    }
}
