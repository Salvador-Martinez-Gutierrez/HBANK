import { useState, useEffect, useCallback } from 'react'

const COLLAPSED_WALLETS_KEY = 'portfolio_collapsed_wallets'

export function useWalletCollapse() {
    const [collapsedWallets, setCollapsedWallets] = useState<Set<string>>(
        new Set()
    )

    // Load collapsed state from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(COLLAPSED_WALLETS_KEY)
            if (stored) {
                const parsed = JSON.parse(stored)
                setCollapsedWallets(new Set(parsed))
            }
        } catch (error) {
            console.error(
                'Error loading collapsed wallets from localStorage:',
                error
            )
        }
    }, [])

    // Save to localStorage whenever collapsed state changes
    const saveToLocalStorage = useCallback((walletIds: Set<string>) => {
        try {
            localStorage.setItem(
                COLLAPSED_WALLETS_KEY,
                JSON.stringify(Array.from(walletIds))
            )
        } catch (error) {
            console.error(
                'Error saving collapsed wallets to localStorage:',
                error
            )
        }
    }, [])

    // Toggle a wallet's collapsed state
    const toggleWalletCollapsed = useCallback(
        (walletId: string) => {
            setCollapsedWallets((prev) => {
                const newSet = new Set(prev)
                if (newSet.has(walletId)) {
                    newSet.delete(walletId)
                } else {
                    newSet.add(walletId)
                }
                saveToLocalStorage(newSet)
                return newSet
            })
        },
        [saveToLocalStorage]
    )

    // Check if a wallet is collapsed
    const isWalletCollapsed = useCallback(
        (walletId: string) => {
            return collapsedWallets.has(walletId)
        },
        [collapsedWallets]
    )

    // Collapse a wallet
    const collapseWallet = useCallback(
        (walletId: string) => {
            setCollapsedWallets((prev) => {
                const newSet = new Set(prev)
                newSet.add(walletId)
                saveToLocalStorage(newSet)
                return newSet
            })
        },
        [saveToLocalStorage]
    )

    // Expand a wallet
    const expandWallet = useCallback(
        (walletId: string) => {
            setCollapsedWallets((prev) => {
                const newSet = new Set(prev)
                newSet.delete(walletId)
                saveToLocalStorage(newSet)
                return newSet
            })
        },
        [saveToLocalStorage]
    )

    // Collapse all wallets
    const collapseAll = useCallback(
        (walletIds: string[]) => {
            const newSet = new Set(walletIds)
            setCollapsedWallets(newSet)
            saveToLocalStorage(newSet)
        },
        [saveToLocalStorage]
    )

    // Expand all wallets
    const expandAll = useCallback(() => {
        setCollapsedWallets(new Set())
        saveToLocalStorage(new Set())
    }, [saveToLocalStorage])

    return {
        isWalletCollapsed,
        toggleWalletCollapsed,
        collapseWallet,
        expandWallet,
        collapseAll,
        expandAll,
    }
}
