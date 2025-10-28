/**
 * Endpoint para obtener un nonce de autenticación
 *
 * GET /api/auth/nonce?accountId=0.0.XXXX
 *
 * Devuelve un nonce único que el cliente debe firmar con su wallet
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { NonceService } from '@/services/nonceService'
import { isValidHederaAccountId } from '@/lib/hedera-auth'
import type { NonceResponse } from '@/types/auth'
import { logger } from '@/lib/logger'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<NonceResponse | { error: string }>
) {
    // Solo permitir GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { accountId } = req.query

        // Validate that accountId is present
        if (!accountId || typeof accountId !== 'string') {
            logger.warn('Missing or invalid accountId in nonce request')
            return res.status(400).json({ error: 'accountId is required' })
        }

        // Validate accountId format
        if (!isValidHederaAccountId(accountId)) {
            logger.warn('Invalid Hedera accountId format', { accountId })
            return res
                .status(400)
                .json({ error: 'Invalid Hedera accountId format' })
        }

        // Generate nonce
        const { nonce, message } = NonceService.generateNonce(accountId)

        logger.info('Nonce generated successfully', {
            accountId,
            nonceLength: nonce.length,
        })

        return res.status(200).json({ nonce, message })
    } catch (error) {
        logger.error('Error in nonce endpoint', {
            error: error instanceof Error ? error.message : String(error),
        })
        return res.status(500).json({ error: 'Internal server error' })
    }
}
