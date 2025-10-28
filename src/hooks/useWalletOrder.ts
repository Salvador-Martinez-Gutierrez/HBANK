'use client'

import { useState, useCallback, useEffect } from 'react'
import { logger } from '@/lib/logger'


const STORAGE_KEY = 'portfolio_wallet_order'

export function useWalletOrder(userId: string | null) {
    // Load order from localStorage on mount and when userId changes
    const [walletOrder, setWalletOrder] = useState<string[]>(() => {
        if (!userId) return []

        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
                const allOrders = JSON.parse(stored) as Record<string, string[]>
                return allOrders[userId] || []
            }
        } catch (error) {
            logger.error(
                'Failed to load wallet order from localStorage:',
                error
            )
        }
        return []
    })

    // Update order when userId changes
    useEffect(() => {
        if (!userId) {
            logger.info('🧹 Clearing wallet order (no userId)')
            // Use timeout to avoid synchronous setState
            setTimeout(() => {
                setWalletOrder([])
            }, 0)
            return
        }

        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
                const allOrders = JSON.parse(stored) as Record<string, string[]>
                const userOrder = allOrders[userId] || []
                // Use timeout to avoid synchronous setState
                setTimeout(() => {
                    setWalletOrder(prev => {
                        // Only update if order actually changed to avoid unnecessary re-renders
                        if (JSON.stringify(prev) !== JSON.stringify(userOrder)) {
                            return userOrder
                        }
                        return prev
                    })
                }, 0)
            }
        } catch (error) {
            logger.error(
                'Failed to load wallet order from localStorage:',
                error
            )
        }
    }, [userId])

    // Save order to localStorage
    const saveWalletOrder = useCallback(
        (walletIds: string[]) => {
            if (!userId) return

            try {
                const stored = localStorage.getItem(STORAGE_KEY)
                const allOrders = stored ? JSON.parse(stored) : {}
                allOrders[userId] = walletIds

                localStorage.setItem(STORAGE_KEY, JSON.stringify(allOrders))
                setWalletOrder(walletIds)
            } catch (error) {
                logger.error(
                    'Failed to save wallet order to localStorage:',
                    error
                )
            }
        },
        [userId]
    )

    // Get the sorted wallets based on saved order
    const sortWallets = useCallback(
        <T extends { id: string }>(wallets: T[]): T[] => {
            if (walletOrder.length === 0) {
                return wallets
            }

            // Create a map for quick lookup
            const orderMap = new Map(
                walletOrder.map((id, index) => [id, index])
            )

            return [...wallets].sort((a, b) => {
                const orderA = orderMap.get(a.id) ?? Infinity
                const orderB = orderMap.get(b.id) ?? Infinity
                return orderA - orderB
            })
        },
        [walletOrder]
    )

    return {
        walletOrder,
        saveWalletOrder,
        sortWallets,
    }
}
