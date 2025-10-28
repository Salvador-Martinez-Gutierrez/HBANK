/**
 * Endpoint para gestionar wallets del usuario
 * Requiere autenticación JWT
 */

import { NextResponse } from 'next/server'
import { withAuthRoute } from '@/lib/app-router-auth-middleware'
import { syncOrCreateUser } from '@/services/portfolioUserService'
import {
    getUserWallets,
    addWallet,
    updateWalletLabel,
    deleteWallet,
} from '@/services/portfolioWalletService'

export const GET = withAuthRoute(
    async ({ req: _req, user, logger: _logger }): Promise<NextResponse> => {
        try {
            const accountId = user.accountId

            // Ensure user exists in database
            const userResult = await syncOrCreateUser(accountId)

            if (!userResult.success || !userResult.userId) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Failed to sync user data',
                    },
                    { status: 500 }
                )
            }

            const userId = userResult.userId

            const wallets = await getUserWallets(userId)
            return NextResponse.json({
                success: true,
                wallets,
            })
        } catch (error) {
            console.error('Error in wallets API:', error)
            return NextResponse.json(
                {
                    success: false,
                    error: 'Internal server error',
                },
                { status: 500 }
            )
        }
    },
    { scope: 'api:portfolio:wallets:get' }
)

export const POST = withAuthRoute(
    async ({ req: _req, body, user, logger: _logger }): Promise<NextResponse> => {
        try {
            const accountId = user.accountId

            // Ensure user exists in database
            const userResult = await syncOrCreateUser(accountId)

            if (!userResult.success || !userResult.userId) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Failed to sync user data',
                    },
                    { status: 500 }
                )
            }

            const userId = userResult.userId

            const { walletAddress, label } = body as {
                walletAddress?: string
                label?: string
            }

            if (!walletAddress) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Wallet address is required',
                    },
                    { status: 400 }
                )
            }

            const result = await addWallet(userId, walletAddress, label)

            if (!result.success) {
                return NextResponse.json(
                    {
                        success: false,
                        error: result.error,
                    },
                    { status: 400 }
                )
            }

            return NextResponse.json({
                success: true,
                wallet: result.wallet,
            })
        } catch (error) {
            console.error('Error in wallets API:', error)
            return NextResponse.json(
                {
                    success: false,
                    error: 'Internal server error',
                },
                { status: 500 }
            )
        }
    },
    { scope: 'api:portfolio:wallets:post' }
)

export const PATCH = withAuthRoute(
    async ({ req: _req, body, user: _user, logger: _logger }): Promise<NextResponse> => {
        try {
            const { walletId, label } = body as {
                walletId?: string
                label?: string
            }

            if (!walletId || !label) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Wallet ID and label are required',
                    },
                    { status: 400 }
                )
            }

            const result = await updateWalletLabel(walletId, label)

            if (!result.success) {
                return NextResponse.json(
                    {
                        success: false,
                        error: result.error,
                    },
                    { status: 400 }
                )
            }

            return NextResponse.json({
                success: true,
            })
        } catch (error) {
            console.error('Error in wallets API:', error)
            return NextResponse.json(
                {
                    success: false,
                    error: 'Internal server error',
                },
                { status: 500 }
            )
        }
    },
    { scope: 'api:portfolio:wallets:patch' }
)

export const DELETE = withAuthRoute(
    async ({ req, user: _user, logger: _logger }): Promise<NextResponse> => {
        try {
            const walletId = req.nextUrl.searchParams.get('walletId')

            if (!walletId) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Wallet ID is required',
                    },
                    { status: 400 }
                )
            }

            const result = await deleteWallet(walletId)

            if (!result.success) {
                return NextResponse.json(
                    {
                        success: false,
                        error: result.error,
                    },
                    { status: 400 }
                )
            }

            return NextResponse.json({
                success: true,
            })
        } catch (error) {
            console.error('Error in wallets API:', error)
            return NextResponse.json(
                {
                    success: false,
                    error: 'Internal server error',
                },
                { status: 500 }
            )
        }
    },
    { scope: 'api:portfolio:wallets:delete' }
)
