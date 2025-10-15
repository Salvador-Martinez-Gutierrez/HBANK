/**
 * Endpoint para verificar la firma y generar JWT de sesión
 *
 * POST /api/auth/verify
 * Body: { accountId, nonce, signature, publicKey? }
 *
 * Verifica la firma del mensaje y devuelve un JWT en una cookie segura
 */

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
    // Solo permitir POST
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed',
        })
    }

    try {
        const { accountId, nonce, signature, publicKey } =
            req.body as VerifyRequest

        // Validar campos requeridos
        if (!accountId || !nonce || !signature) {
            logger.warn('Missing required fields in verify request')
            return res.status(400).json({
                success: false,
                error: 'accountId, nonce, and signature are required',
            })
        }

        // Validar formato de accountId
        if (!isValidHederaAccountId(accountId)) {
            logger.warn('Invalid Hedera accountId format', { accountId })
            return res.status(400).json({
                success: false,
                error: 'Invalid Hedera accountId format',
            })
        }

        // Validar el nonce
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

        // Verificar la firma
        let isValidSignature = false

        if (publicKey) {
            // Si el cliente envió la public key, usarla directamente
            logger.info('Verifying signature with provided public key', {
                accountId,
            })
            isValidSignature = verifyHederaSignature(
                nonceValidation.message,
                signature,
                publicKey
            )
        } else {
            // Si no, consultar el Mirror Node
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

        // Marcar el nonce como usado
        NonceService.markAsUsed(nonce)

        // Crear JWT
        const token = await createJWT(accountId)

        // Configurar cookie segura
        res.setHeader('Set-Cookie', [
            `hbank-auth-token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${
                7 * 24 * 60 * 60
            }`, // 7 días
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
