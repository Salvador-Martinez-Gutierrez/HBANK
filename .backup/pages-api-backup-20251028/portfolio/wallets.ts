/**
 * Endpoint para gestionar wallets del usuario
 * Requiere autenticación JWT
 */

import type { NextApiResponse } from 'next'
import { type AuthenticatedRequest, withAuth } from '@/lib/auth-middleware'
import { syncOrCreateUser } from '@/services/portfolioUserService'
import {
    getUserWallets,
    addWallet,
    updateWalletLabel,
    deleteWallet,
} from '@/services/portfolioWalletService'

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    try {
        const accountId = req.user.accountId

        // Ensure user exists in database
        const userResult = await syncOrCreateUser(accountId)

        if (!userResult.success || !userResult.userId) {
            return res.status(500).json({
                success: false,
                error: 'Failed to sync user data',
            })
        }

        const userId = userResult.userId

        switch (req.method) {
            case 'GET': {
                const wallets = await getUserWallets(userId)
                return res.status(200).json({
                    success: true,
                    wallets,
                })
            }

            case 'POST': {
                const { walletAddress, label } = req.body

                if (!walletAddress) {
                    return res.status(400).json({
                        success: false,
                        error: 'Wallet address is required',
                    })
                }

                const result = await addWallet(userId, walletAddress, label)

                if (!result.success) {
                    return res.status(400).json({
                        success: false,
                        error: result.error,
                    })
                }

                return res.status(200).json({
                    success: true,
                    wallet: result.wallet,
                })
            }

            case 'PATCH': {
                const { walletId, label } = req.body

                if (!walletId || !label) {
                    return res.status(400).json({
                        success: false,
                        error: 'Wallet ID and label are required',
                    })
                }

                const result = await updateWalletLabel(walletId, label)

                if (!result.success) {
                    return res.status(400).json({
                        success: false,
                        error: result.error,
                    })
                }

                return res.status(200).json({
                    success: true,
                })
            }

            case 'DELETE': {
                const { walletId } = req.query

                if (!walletId || typeof walletId !== 'string') {
                    return res.status(400).json({
                        success: false,
                        error: 'Wallet ID is required',
                    })
                }

                const result = await deleteWallet(walletId)

                if (!result.success) {
                    return res.status(400).json({
                        success: false,
                        error: result.error,
                    })
                }

                return res.status(200).json({
                    success: true,
                })
            }

            default:
                return res.status(405).json({
                    success: false,
                    error: 'Method not allowed',
                })
        }
    } catch (error) {
        console.error('Error in wallets API:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        })
    }
}

export default withAuth(handler)
