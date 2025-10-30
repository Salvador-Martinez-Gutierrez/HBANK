/**
 * Hook para gestionar wallets del portfolio
 * Usa JWT authentication a través de endpoints API protegidos
 * + Realtime updates de precios de tokens (READ-ONLY, datos públicos)
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { WalletWithTokens } from '@/types/portfolio'
import { MAX_WALLETS_PER_USER } from '@/constants/portfolio'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'
import {
    useTokenPriceRealtime,
    type TokenPriceUpdate,
} from './useTokenPriceRealtime'

interface WalletsResponse {
    success: boolean
    wallets: WalletWithTokens[]
    error?: string
}

interface MutationResponse {
    success: boolean
    wallet?: WalletWithTokens
    error?: string
    message?: string
    results?: unknown
}

async function fetchWallets(): Promise<WalletsResponse> {
    logger.info('📡 Fetching wallets from API')

    const response = await fetch('/api/portfolio/wallets')

    if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error ?? 'Failed to fetch wallets')
    }

    const result: WalletsResponse = await response.json()

    if (!result.success) {
        throw new Error('Invalid response from server')
    }

    logger.info('✅ Wallets fetched successfully:', result.wallets.length)
    return result
}

async function addWalletAPI(params: { walletAddress: string; label?: string }): Promise<MutationResponse> {
    const response = await fetch('/api/portfolio/wallets', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    })

    const result: MutationResponse = await response.json()

    if (!result.success) {
        throw new Error(result.error ?? 'Failed to add wallet')
    }

    return result
}

async function updateWalletLabelAPI(params: { walletId: string; label: string }): Promise<MutationResponse> {
    const response = await fetch('/api/portfolio/wallets', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    })

    const result: MutationResponse = await response.json()

    if (!result.success) {
        throw new Error(result.error ?? 'Failed to update wallet')
    }

    return result
}

async function deleteWalletAPI(walletId: string): Promise<MutationResponse> {
    const response = await fetch(
        `/api/portfolio/wallets?walletId=${walletId}`,
        {
            method: 'DELETE',
        }
    )

    const result: MutationResponse = await response.json()

    if (!result.success) {
        throw new Error(result.error ?? 'Failed to delete wallet')
    }

    return result
}

async function syncTokensAPI(params: { walletId: string; walletAddress: string }): Promise<MutationResponse> {
    const response = await fetch('/api/portfolio/sync-tokens', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    })

    const result: MutationResponse = await response.json()

    if (!result.success) {
        throw new Error(result.error ?? 'Failed to sync tokens')
    }

    return result
}

async function syncAllWalletsAPI(): Promise<MutationResponse> {
    logger.info('🚀 Starting optimized batch sync...')

    const response = await fetch('/api/portfolio/sync-all-wallets', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })

    const result: MutationResponse = await response.json()

    if (!result.success) {
        throw new Error(result.error ?? 'Failed to sync wallets')
    }

    return result
}

export function usePortfolioWallets(userId: string | null) {
    const queryClient = useQueryClient()
    const [lastPriceUpdate, setLastPriceUpdate] = useState<string | undefined>()

    // Query for fetching wallets
    const {
        data,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: queryKeys.portfolioWallets(userId ?? undefined),
        queryFn: fetchWallets,
        enabled: !!userId,
        staleTime: 30 * 1000, // Fresh for 30 seconds
    })

    const wallets = data?.wallets ?? []

    // Clear wallets immediately when userId changes or becomes null
    useEffect(() => {
        if (!userId) {
            logger.info('🧹 Clearing wallets data (no userId)')
        }
    }, [userId])

    // Mutations
    const addWalletMutation = useMutation({
        mutationFn: addWalletAPI,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.portfolioWallets(userId ?? undefined) })
        },
    })

    const updateWalletLabelMutation = useMutation({
        mutationFn: updateWalletLabelAPI,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.portfolioWallets(userId ?? undefined) })
        },
    })

    const deleteWalletMutation = useMutation({
        mutationFn: deleteWalletAPI,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.portfolioWallets(userId ?? undefined) })
        },
    })

    const syncTokensMutation = useMutation({
        mutationFn: syncTokensAPI,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.portfolioWallets(userId ?? undefined) })
        },
    })

    const syncAllWalletsMutation = useMutation({
        mutationFn: syncAllWalletsAPI,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.portfolioWallets(userId ?? undefined) })
        },
    })

    // REALTIME: Update token prices automatically
    // SECURITY: Read-only, public data, no auth required
    const handlePriceUpdate = useCallback((update: TokenPriceUpdate) => {
        logger.info('💰 Updating token price in wallets:', update.token_address)

        queryClient.setQueryData<WalletsResponse>(
            queryKeys.portfolioWallets(userId ?? undefined),
            (oldData) => {
                if (!oldData) return oldData

                let hasChanges = false

                // Update wallets with new prices
                const updatedWallets = oldData.wallets.map((wallet) => {
                    let walletChanged = false
                    const newWallet = { ...wallet }

                    // Update fungible tokens (wallet_tokens) - including HBAR
                    const updatedWalletTokens = (wallet.wallet_tokens ?? []).map(
                        (wt) => {
                            // If this token matches the updated one
                            if (
                                wt.tokens_registry?.token_address ===
                                update.token_address
                            ) {
                                walletChanged = true
                                const oldPrice = parseFloat(
                                    String(wt.tokens_registry.price_usd ?? '0')
                                )
                                const newPrice = parseFloat(update.price_usd)
                                logger.info(
                                    `  📊 ${
                                        wt.tokens_registry.token_symbol
                                    } price updated: $${oldPrice.toFixed(
                                        4
                                    )} → $${newPrice.toFixed(4)}`
                                )
                                return {
                                    ...wt,
                                    tokens_registry: {
                                        ...wt.tokens_registry,
                                        price_usd: parseFloat(update.price_usd),
                                        last_price_update: update.last_price_update,
                                    },
                                }
                            }
                            return wt
                        }
                    )

                    // Update LP tokens (liquidity_pool_tokens)
                    const updatedLpTokens = (
                        wallet.liquidity_pool_tokens ?? []
                    ).map((lpt) => {
                        // If this LP token matches the updated one
                        if (
                            lpt.tokens_registry?.token_address ===
                            update.token_address
                        ) {
                            walletChanged = true
                            const oldPrice = parseFloat(
                                String(lpt.tokens_registry.price_usd ?? '0')
                            )
                            const newPrice = parseFloat(update.price_usd)
                            logger.info(
                                `  📊 LP ${
                                    lpt.tokens_registry.token_symbol
                                } price updated: $${oldPrice.toFixed(
                                    4
                                )} → $${newPrice.toFixed(4)}`
                            )
                            return {
                                ...lpt,
                                tokens_registry: {
                                    ...lpt.tokens_registry,
                                    price_usd: parseFloat(update.price_usd),
                                    last_price_update: update.last_price_update,
                                },
                            }
                        }
                        return lpt
                    })

                    if (walletChanged) {
                        hasChanges = true
                        return {
                            ...newWallet,
                            wallet_tokens: updatedWalletTokens,
                            liquidity_pool_tokens: updatedLpTokens,
                        }
                    }

                    return wallet
                })

                // Only update if there were changes
                if (hasChanges) {
                    logger.info('✅ Portfolio balance recalculated with new prices')
                    return {
                        ...oldData,
                        wallets: updatedWallets,
                    }
                }

                return oldData
            }
        )

        // Update timestamp for UI indicator
        setLastPriceUpdate(new Date().toISOString())
    }, [queryClient, userId])

    // Subscribe to price updates only if there are wallets
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

                const result = await addWalletMutation.mutateAsync({ walletAddress, label })
                return { success: true, wallet: result.wallet }
            } catch (error) {
                logger.error('Error adding wallet:', error)
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to add wallet'
                }
            }
        },
        [wallets, addWalletMutation]
    )

    const updateWalletLabel = useCallback(
        async (walletId: string, label: string) => {
            try {
                await updateWalletLabelMutation.mutateAsync({ walletId, label })
                return { success: true }
            } catch (error) {
                logger.error('Error updating wallet:', error)
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to update wallet'
                }
            }
        },
        [updateWalletLabelMutation]
    )

    const deleteWallet = useCallback(
        async (walletId: string) => {
            try {
                await deleteWalletMutation.mutateAsync(walletId)
                return { success: true }
            } catch (error) {
                logger.error('Error deleting wallet:', error)
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to delete wallet'
                }
            }
        },
        [deleteWalletMutation]
    )

    const syncTokens = useCallback(
        async (walletId: string, walletAddress: string) => {
            try {
                await syncTokensMutation.mutateAsync({ walletId, walletAddress })
                return { success: true }
            } catch (error) {
                logger.error('Error syncing tokens:', error)
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to sync tokens'
                }
            }
        },
        [syncTokensMutation]
    )

    const syncAllWallets = useCallback(async () => {
        try {
            const result = await syncAllWalletsMutation.mutateAsync()
            return {
                success: true,
                message: result.message,
                results: result.results,
            }
        } catch (error) {
            logger.error('Error syncing all wallets:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to sync wallets'
            }
        }
    }, [syncAllWalletsMutation])

    const calculateTotalValue = useCallback(() => {
        let total = 0

        for (const wallet of wallets) {
            // Include all fungible tokens (including HBAR)
            for (const walletToken of wallet.wallet_tokens ?? []) {
                const balance = parseFloat(walletToken.balance ?? '0')
                const price =
                    typeof walletToken.tokens_registry?.price_usd === 'number'
                        ? walletToken.tokens_registry.price_usd
                        : parseFloat(
                              String(
                                  walletToken.tokens_registry?.price_usd ?? '0'
                              )
                          )
                const decimals = walletToken.tokens_registry?.decimals ?? 0
                const normalizedBalance = balance / Math.pow(10, decimals)
                total += normalizedBalance * price
            }

            // Include DeFi positions value
            for (const defiPosition of wallet.wallet_defi || []) {
                const valueUsd = parseFloat(defiPosition.value_usd || '0')
                total += valueUsd
            }
        }

        return total
    }, [wallets])

    const totalValue = useMemo(() => calculateTotalValue(), [calculateTotalValue])

    return {
        wallets,
        loading: isLoading,
        error: error instanceof Error ? error.message : null,
        totalValue,
        canAddMoreWallets: wallets.length < MAX_WALLETS_PER_USER,
        walletsRemaining: MAX_WALLETS_PER_USER - wallets.length,
        addWallet,
        updateWalletLabel,
        deleteWallet,
        syncTokens,
        syncAllWallets,
        refetch: () => void refetch(),
        lastPriceUpdate,
    }
}
