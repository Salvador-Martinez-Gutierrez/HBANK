import type { NextApiRequest, NextApiResponse } from 'next'
import {
    registerOrGetUser,
    getSessionCredentials,
} from '@/services/portfolioAuthService'
import type { AuthPayload } from '@/types/portfolio'

/**
 * Verify Hedera signature
 * TODO: Implement proper signature verification for production
 */
// function verifyHederaSignature(
//     message: string,
//     signature: string,
//     publicKey: string
// ): boolean {
//     try {
//         // Create PublicKey from wallet address
//         // Note: In Hedera, we need the actual public key, not just the account ID
//         const messageBytes = Buffer.from(message, 'utf-8')
//         const signatureBytes = Buffer.from(signature, 'hex')
//
//         // TODO: Implement proper signature verification
//         console.warn('⚠️ Signature verification not fully implemented')
//
//         return true
//     } catch (error) {
//         console.error('Error verifying signature:', error)
//         return false
//     }
// }

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res
            .status(405)
            .json({ success: false, error: 'Method not allowed' })
    }

    try {
        const body: AuthPayload = req.body
        const { walletAddress, signature, message, timestamp } = body

        // Validate required fields
        if (!walletAddress || !signature || !message || !timestamp) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
            })
        }

        // Check timestamp (message should be signed within last 5 minutes)
        const now = Date.now()
        const fiveMinutes = 5 * 60 * 1000
        if (now - timestamp > fiveMinutes) {
            return res.status(401).json({
                success: false,
                error: 'Authentication expired',
            })
        }

        // Verify the message contains the wallet address and timestamp
        if (
            !message.includes(walletAddress) ||
            !message.includes(timestamp.toString())
        ) {
            return res.status(400).json({
                success: false,
                error: 'Invalid message format',
            })
        }

        // TODO: Verify signature (requires public key from wallet)
        // const isValid = verifyHederaSignature(message, signature, publicKey)
        // if (!isValid) {
        //     return res.status(401).json({
        //         success: false,
        //         error: 'Invalid signature'
        //     })
        // }

        // Register or get user
        const userResult = await registerOrGetUser(walletAddress)

        if (!userResult.success || !userResult.user) {
            return res.status(500).json({
                success: false,
                error: userResult.error || 'Failed to authenticate',
            })
        }

        // Get session credentials for client to use
        const credentialsResult = await getSessionCredentials(
            userResult.user.id,
            walletAddress
        )

        if (!credentialsResult.success || !credentialsResult.credentials) {
            console.error(
                '❌ Failed to generate credentials:',
                credentialsResult
            )
            return res.status(500).json({
                success: false,
                error: 'Failed to generate session credentials',
            })
        }

        console.log('✅ Returning credentials for:', {
            userId: userResult.user.id,
            walletAddress: userResult.user.wallet_address,
            email: credentialsResult.credentials.email,
            hasPassword: !!credentialsResult.credentials.password,
        })

        // Return credentials so client can create their own session
        return res.status(200).json({
            success: true,
            userId: userResult.user.id,
            walletAddress: userResult.user.wallet_address,
            credentials: credentialsResult.credentials, // Client will use these to sign in
        })
    } catch (error) {
        console.error('Authentication error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        })
    }
}
