/**
 * Hook para gestionar wallets del portfolio
 * Usa JWT authentication a través de endpoints API protegidos
 * + Realtime updates de precios de tokens (READ-ONLY, datos públicos)
 */

import { useState, useEffect, useCallback } from 'react'
import type { WalletWithTokens } from '@/types/portfolio'
import { MAX_WALLETS_PER_USER } from '@/constants/portfolio'
import {
    useTokenPriceRealtime,
    type TokenPriceUpdate,
} from './useTokenPriceRealtime'

export function usePortfolioWallets(userId: string | null) {
    const [wallets, setWallets] = useState<WalletWithTokens[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [lastPriceUpdate, setLastPriceUpdate] = useState<string | undefined>()

    // Clear wallets immediately when userId changes or becomes null
    useEffect(() => {
        if (!userId) {
            console.log('🧹 Clearing wallets data (no userId)')
            setWallets([])
            setError(null)
        }
    }, [userId])

    const fetchWallets = useCallback(async () => {
        if (!userId) {
            setWallets([])
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            setError(null)

            console.log('📡 Fetching wallets from API for userId:', userId)

            // Use API endpoint instead of direct Supabase query
            // JWT is automatically sent via HttpOnly cookie
            const response = await fetch('/api/portfolio/wallets')

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to fetch wallets')
            }

            const result = await response.json()

            if (result.success && result.wallets) {
                console.log(
                    '✅ Wallets fetched successfully:',
                    result.wallets.length
                )
                setWallets(result.wallets)
            } else {
                throw new Error('Invalid response from server')
            }
        } catch (err) {
            console.error('❌ Error fetching wallets:', err)
            setError(
                err instanceof Error ? err.message : 'Failed to load wallets'
            )
        } finally {
            setLoading(false)
        }
    }, [userId])

    useEffect(() => {
        fetchWallets()
    }, [fetchWallets])

    // 🔴 REALTIME: Actualizar precios de tokens automáticamente
    // SEGURIDAD: ✅ Solo lectura, datos públicos, no requiere auth
    const handlePriceUpdate = useCallback((update: TokenPriceUpdate) => {
        console.log('💰 Updating token price in wallets:', update.token_address)

        setWallets((currentWallets) => {
            // Crear una copia profunda para evitar mutaciones
            const updatedWallets = currentWallets.map((wallet) => ({
                ...wallet,
                wallet_tokens: (wallet.wallet_tokens || []).map((wt) => {
                    // Si este token coincide con el actualizado
                    if (
                        wt.tokens_registry?.token_address ===
                        update.token_address
                    ) {
                        return {
                            ...wt,
                            tokens_registry: {
                                ...wt.tokens_registry,
                                price_usd: update.price_usd,
                                last_price_update: update.last_price_update,
                            },
                        }
                    }
                    return wt
                }),
            }))

            return updatedWallets
        })

        // Actualizar timestamp para el indicador UI
        setLastPriceUpdate(new Date().toISOString())
    }, [])

    // Suscribirse a actualizaciones de precios solo si hay wallets
    useTokenPriceRealtime(handlePriceUpdate, wallets.length > 0)

    const addWallet = useCallback(
        async (walletAddress: string, label?: string) => {
            try {
                // Frontend validation: Check wallet limit before making API call
                if (wallets.length >= MAX_WALLETS_PER_USER) {
                    return {
                        success: false,
                        error: `Maximum ${MAX_WALLETS_PER_USER} wallets allowed per user`,
                    }
                }

                // Check for duplicates
                const isDuplicate = wallets.some(
                    (w) => w.wallet_address === walletAddress
                )
                if (isDuplicate) {
                    return {
                        success: false,
                        error: 'This wallet is already added to your portfolio',
                    }
                }

                const response = await fetch('/api/portfolio/wallets', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ walletAddress, label }),
                })

                const result = await response.json()

                if (result.success) {
                    await fetchWallets()
                    return { success: true, wallet: result.wallet }
                } else {
                    return { success: false, error: result.error }
                }
            } catch (error) {
                console.error('Error adding wallet:', error)
                return { success: false, error: 'Failed to add wallet' }
            }
        },
        [fetchWallets, wallets]
    )

    const updateWalletLabel = useCallback(
        async (walletId: string, label: string) => {
            try {
                const response = await fetch('/api/portfolio/wallets', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ walletId, label }),
                })

                const result = await response.json()

                if (result.success) {
                    await fetchWallets()
                    return { success: true }
                } else {
                    return { success: false, error: result.error }
                }
            } catch (error) {
                console.error('Error updating wallet:', error)
                return { success: false, error: 'Failed to update wallet' }
            }
        },
        [fetchWallets]
    )

    const deleteWallet = useCallback(
        async (walletId: string) => {
            try {
                const response = await fetch(
                    `/api/portfolio/wallets?walletId=${walletId}`,
                    {
                        method: 'DELETE',
                    }
                )

                const result = await response.json()

                if (result.success) {
                    await fetchWallets()
                    return { success: true }
                } else {
                    return { success: false, error: result.error }
                }
            } catch (error) {
                console.error('Error deleting wallet:', error)
                return { success: false, error: 'Failed to delete wallet' }
            }
        },
        [fetchWallets]
    )

    const syncTokens = useCallback(
        async (walletId: string, walletAddress: string) => {
            try {
                const response = await fetch('/api/portfolio/sync-tokens', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ walletId, walletAddress }),
                })

                const result = await response.json()

                if (result.success) {
                    await fetchWallets()
                    return { success: true }
                } else {
                    return { success: false, error: result.error }
                }
            } catch (error) {
                console.error('Error syncing tokens:', error)
                return { success: false, error: 'Failed to sync tokens' }
            }
        },
        [fetchWallets]
    )

    const calculateTotalValue = useCallback(() => {
        let total = 0

        for (const wallet of wallets) {
            for (const walletToken of wallet.wallet_tokens || []) {
                const balance = parseFloat(walletToken.balance || '0')
                const price = parseFloat(
                    walletToken.tokens_registry?.price_usd || '0'
                )
                const decimals = walletToken.tokens_registry?.decimals || 0
                const normalizedBalance = balance / Math.pow(10, decimals)
                total += normalizedBalance * price
            }
        }

        return total
    }, [wallets])

    return {
        wallets,
        loading,
        error,
        totalValue: calculateTotalValue(),
        canAddMoreWallets: wallets.length < MAX_WALLETS_PER_USER,
        walletsRemaining: MAX_WALLETS_PER_USER - wallets.length,
        addWallet,
        updateWalletLabel,
        deleteWallet,
        syncTokens,
        refetch: fetchWallets,
        lastPriceUpdate, // Para el indicador de realtime
    }
}
