/**
 * Endpoint para sincronizar tokens de una wallet
 * Requiere autenticación JWT
 */

import { NextResponse } from 'next/server'
import { withAuthRoute } from '@/lib/app-router-auth-middleware'
import { syncWalletTokens } from '@/services/portfolioWalletService'

export const POST = withAuthRoute(
    async ({ req: _req, body, logger: _logger }): Promise<NextResponse> => {
        try {
            // User is authenticated via JWT middleware

            const { walletId, walletAddress } = body as {
                walletId?: string
                walletAddress?: string
            }

            if (!walletId || !walletAddress) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Wallet ID and address are required',
                    },
                    { status: 400 }
                )
            }

            // Sync tokens from Hedera
            const syncResult = await syncWalletTokens(walletId, walletAddress)

            if (!syncResult.success) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Failed to sync tokens',
                    },
                    { status: 500 }
                )
            }

            return NextResponse.json({
                success: true,
                message: 'Tokens synced successfully',
            })
        } catch (error) {
            console.error('Error syncing tokens:', error)
            return NextResponse.json(
                {
                    success: false,
                    error: 'Internal server error',
                },
                { status: 500 }
            )
        }
    },
    { scope: 'api:portfolio:sync-tokens' }
)
