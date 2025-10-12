import type { NextApiRequest, NextApiResponse } from 'next'
import { getCurrentUser } from '@/services/portfolioAuthService'
import {
    getUserWallets,
    addWallet,
    updateWalletLabel,
    deleteWallet,
} from '@/services/portfolioWalletService'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    try {
        // Pass req to getCurrentUser so it can read cookies
        const userResult = await getCurrentUser(req)

        if (!userResult.success || !userResult.user) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated',
            })
        }

        switch (req.method) {
            case 'GET': {
                const wallets = await getUserWallets(userResult.user.id)
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

                const result = await addWallet(
                    userResult.user.id,
                    walletAddress,
                    label
                )

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
