import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { WalletWithTokens } from '@/types/portfolio'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export function usePortfolioWallets(userId: string | null) {
    const [wallets, setWallets] = useState<WalletWithTokens[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

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

            const { data, error: fetchError } = await supabase
                .from('wallets')
                .select(
                    `
                    *,
                    wallet_tokens (
                        *,
                        tokens_registry (*)
                    ),
                    nfts (*)
                `
                )
                .eq('user_id', userId)
                .order('is_primary', { ascending: false })
                .order('created_at', { ascending: true })

            if (fetchError) {
                throw fetchError
            }

            setWallets((data as WalletWithTokens[]) || [])
        } catch (err) {
            console.error('Error fetching wallets:', err)
            setError('Failed to load wallets')
        } finally {
            setLoading(false)
        }
    }, [userId])

    useEffect(() => {
        fetchWallets()
    }, [fetchWallets])

    // Subscribe to wallet changes
    useEffect(() => {
        if (!userId) return

        const channel = supabase
            .channel('wallets-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'wallets',
                    filter: `user_id=eq.${userId}`,
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (payload: RealtimePostgresChangesPayload<any>) => {
                    console.log('Wallet change detected:', payload)
                    fetchWallets()
                }
            )
            .subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [userId, fetchWallets])

    // Subscribe to token changes for all wallets
    useEffect(() => {
        if (!userId || wallets.length === 0) return

        const walletIds = wallets.map((w) => w.id)

        const channel = supabase
            .channel('tokens-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tokens',
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (payload: RealtimePostgresChangesPayload<any>) => {
                    // Check if the change affects any of our wallets
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const newRecord = payload.new as any
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const oldRecord = payload.old as any
                    const affectedWalletId =
                        newRecord?.wallet_id || oldRecord?.wallet_id
                    if (walletIds.includes(affectedWalletId)) {
                        console.log('Token change detected:', payload)
                        fetchWallets()
                    }
                }
            )
            .subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [userId, wallets, fetchWallets])

    const addWallet = useCallback(
        async (walletAddress: string, label?: string) => {
            try {
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
        [fetchWallets]
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
        addWallet,
        updateWalletLabel,
        deleteWallet,
        syncTokens,
        refetch: fetchWallets,
    }
}
