/**
 * Endpoint para sincronizar TODAS las wallets de un usuario en batch
 * Requiere autenticación JWT
 * Optimizado para hacer UNA sola llamada a SaucerSwap y reutilizar datos
 */

import { NextResponse } from 'next/server'
import { withAuthRoute } from '@/lib/app-router-auth-middleware'
import { syncWalletTokens, getUserWallets } from '@/services/portfolioWalletService'
import { getAllSaucerSwapTokens } from '@/services/saucerSwapService'

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

            _logger.info('Starting batch sync for user', { userId, accountId })

            // 1. Pre-fetch tokens from SaucerSwap ONCE (will be cached for all wallets)
            _logger.info('Pre-loading SaucerSwap token data')
            const saucerSwapResult = await getAllSaucerSwapTokens()

            if (!saucerSwapResult.success) {
                _logger.warn('Failed to pre-load SaucerSwap data, continuing anyway')
            } else {
                _logger.info('SaucerSwap data loaded', {
                    tokenCount: saucerSwapResult.tokens?.length ?? 0,
                })
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

            _logger.info('Syncing wallets', { walletCount: wallets.length })

            // 3. Sync all wallets (they will all use the cached SaucerSwap data)
            const results = []
            for (const wallet of wallets) {
                const walletId = wallet.id as string
                const walletAddress = wallet.wallet_address as string

                _logger.info('Syncing wallet', { walletAddress })

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

            _logger.info('Batch sync completed', {
                successful: successCount,
                total: results.length,
            })

            return NextResponse.json({
                success: allSuccess,
                message: `Synced ${successCount}/${results.length} wallets`,
                results,
            })
        } catch (error) {
            _logger.error('Error in batch sync', {
                error: error instanceof Error ? error.message : String(error),
            })
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
