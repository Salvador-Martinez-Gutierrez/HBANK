/**
 * Endpoint para sincronizar TODAS las wallets de un usuario en batch
 * Requiere autenticación JWT
 * Optimizado para hacer UNA sola llamada a SaucerSwap y reutilizar datos
 */

import { NextResponse } from 'next/server'
import { withAuthRoute } from '@/lib/app-router-auth-middleware'
import { syncWalletTokens } from '@/services/portfolioWalletService'
import { getAllSaucerSwapTokens } from '@/services/saucerSwapService'
import { getUserWallets } from '@/services/portfolioWalletService'

export const POST = withAuthRoute(
    async ({ req: _req, user, logger: _logger }): Promise<NextResponse> => {
        try {
            const accountId = user.accountId

            // Ensure user exists in database
            const { syncOrCreateUser } = await import(
                '@/services/portfolioUserService'
            )
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

            console.log(
                `🔄 Starting batch sync for user ${userId} (${accountId})`
            )

            // 1. Pre-fetch tokens from SaucerSwap ONCE (will be cached for all wallets)
            console.log('📡 Pre-loading SaucerSwap token data...')
            const saucerSwapResult = await getAllSaucerSwapTokens()

            if (!saucerSwapResult.success) {
                console.warn(
                    '⚠️ Failed to pre-load SaucerSwap data, continuing anyway...'
                )
            } else {
                console.log(
                    `✅ SaucerSwap data loaded (${
                        saucerSwapResult.tokens?.length || 0
                    } tokens)`
                )
            }

            // 2. Get all user wallets
            const wallets = await getUserWallets(userId)

            if (!wallets || wallets.length === 0) {
                return NextResponse.json({
                    success: true,
                    message: 'No wallets to sync',
                    results: [],
                })
            }

            console.log(`📊 Syncing ${wallets.length} wallets...`)

            // 3. Sync all wallets (they will all use the cached SaucerSwap data)
            const results = []
            for (const wallet of wallets) {
                const walletId = wallet.id as string
                const walletAddress = wallet.wallet_address as string

                console.log(`🔄 Syncing wallet ${walletAddress}...`)

                const syncResult = await syncWalletTokens(
                    walletId,
                    walletAddress
                )
                results.push({
                    walletId,
                    walletAddress,
                    success: syncResult.success,
                    error: syncResult.error,
                })

                // Small delay to avoid overwhelming Hedera API
                // (SaucerSwap is already cached, so this is just for Hedera)
                if (wallet !== wallets[wallets.length - 1]) {
                    await new Promise((resolve) => setTimeout(resolve, 300))
                }
            }

            const allSuccess = results.every((r) => r.success)
            const successCount = results.filter((r) => r.success).length

            console.log(
                `✅ Batch sync completed: ${successCount}/${results.length} successful`
            )

            return NextResponse.json({
                success: allSuccess,
                message: `Synced ${successCount}/${results.length} wallets`,
                results,
            })
        } catch (error) {
            console.error('Error in batch sync:', error)
            return NextResponse.json(
                {
                    success: false,
                    error: 'Internal server error',
                },
                { status: 500 }
            )
        }
    },
    { scope: 'api:portfolio:sync-all-wallets' }
)
