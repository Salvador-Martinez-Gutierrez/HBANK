import { useState, useEffect, useCallback } from 'react'

const SYNC_COOLDOWN_KEY = 'portfolio_sync_cooldown'
const COOLDOWN_DURATION = 60 * 60 * 1000 // 1 hour in milliseconds

interface SyncCooldownData {
    syncAll?: number // timestamp of last sync all
    wallets: Record<string, number> // walletId -> timestamp of last sync
}

export function useSyncCooldown() {
    const [cooldownData, setCooldownData] = useState<SyncCooldownData>({
        wallets: {},
    })

    // Load cooldown data from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(SYNC_COOLDOWN_KEY)
            if (stored) {
                const parsed = JSON.parse(stored)
                setCooldownData(parsed)
            }
        } catch (error) {
            console.error(
                'Error loading sync cooldown from localStorage:',
                error
            )
        }
    }, [])

    // Save to localStorage whenever cooldown data changes
    const saveToLocalStorage = useCallback((data: SyncCooldownData) => {
        try {
            localStorage.setItem(SYNC_COOLDOWN_KEY, JSON.stringify(data))
        } catch (error) {
            console.error('Error saving sync cooldown to localStorage:', error)
        }
    }, [])

    // Check if sync all is on cooldown
    const isSyncAllOnCooldown = useCallback(() => {
        if (!cooldownData.syncAll) return false
        const now = Date.now()
        return now - cooldownData.syncAll < COOLDOWN_DURATION
    }, [cooldownData.syncAll])

    // Check if a specific wallet is on cooldown
    const isWalletOnCooldown = useCallback(
        (walletId: string) => {
            const lastSync = cooldownData.wallets[walletId]
            if (!lastSync) return false
            const now = Date.now()
            return now - lastSync < COOLDOWN_DURATION
        },
        [cooldownData.wallets]
    )

    // Get remaining cooldown time for sync all (in milliseconds)
    const getSyncAllRemainingTime = useCallback(() => {
        if (!cooldownData.syncAll) return 0
        const now = Date.now()
        const elapsed = now - cooldownData.syncAll
        const remaining = COOLDOWN_DURATION - elapsed
        return remaining > 0 ? remaining : 0
    }, [cooldownData.syncAll])

    // Get remaining cooldown time for a wallet (in milliseconds)
    const getWalletRemainingTime = useCallback(
        (walletId: string) => {
            const lastSync = cooldownData.wallets[walletId]
            if (!lastSync) return 0
            const now = Date.now()
            const elapsed = now - lastSync
            const remaining = COOLDOWN_DURATION - elapsed
            return remaining > 0 ? remaining : 0
        },
        [cooldownData.wallets]
    )

    // Record sync all timestamp and all individual wallets
    const recordSyncAll = useCallback(
        (walletIds: string[]) => {
            const now = Date.now()
            const walletsTimestamps: Record<string, number> = {
                ...cooldownData.wallets,
            }

            // Set cooldown for all wallets
            walletIds.forEach((walletId) => {
                walletsTimestamps[walletId] = now
            })

            const newData = {
                syncAll: now,
                wallets: walletsTimestamps,
            }
            setCooldownData(newData)
            saveToLocalStorage(newData)
        },
        [cooldownData, saveToLocalStorage]
    )

    // Record wallet sync timestamp
    const recordWalletSync = useCallback(
        (walletId: string) => {
            const now = Date.now()
            const newData = {
                ...cooldownData,
                wallets: { ...cooldownData.wallets, [walletId]: now },
            }
            setCooldownData(newData)
            saveToLocalStorage(newData)
        },
        [cooldownData, saveToLocalStorage]
    )

    // Format remaining time as human-readable string
    const formatRemainingTime = useCallback((milliseconds: number) => {
        if (milliseconds <= 0) return ''

        const seconds = Math.floor(milliseconds / 1000)
        const minutes = Math.floor(seconds / 60)
        const hours = Math.floor(minutes / 60)

        const remainingMinutes = minutes % 60
        const remainingSeconds = seconds % 60

        if (hours > 0) {
            return `${hours}h ${remainingMinutes}m`
        } else if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`
        } else {
            return `${seconds}s`
        }
    }, [])

    return {
        isSyncAllOnCooldown,
        isWalletOnCooldown,
        getSyncAllRemainingTime,
        getWalletRemainingTime,
        recordSyncAll,
        recordWalletSync,
        formatRemainingTime,
    }
}
