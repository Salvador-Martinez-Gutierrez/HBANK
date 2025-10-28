'use client'

import { useEffect, useState } from 'react'

interface WalletInfo {
    id: string
    name: string
    description: string
    envKey: string
    balances: {
        hbar: number
        usdc: number
        husd: number
    }
    health: 'healthy' | 'warning' | 'critical'
}

interface WalletBalancesResponse {
    wallets: WalletInfo[]
    lastUpdated: string
}

export function useWalletBalances() {
    const [wallets, setWallets] = useState<WalletInfo[]>([])
    const [lastUpdated, setLastUpdated] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchWalletBalances = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/wallet-balances')
            
            if (!response.ok) {
                throw new Error('Failed to fetch wallet balances')
            }
            
            const data: WalletBalancesResponse = await response.json()
            setWallets(data.wallets)
            setLastUpdated(data.lastUpdated)
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void fetchWalletBalances()
    }, [])

    const refreshWalletBalances = () => fetchWalletBalances()

    // Helper function to get specific wallets
    const getWalletByName = (name: string) => {
        return wallets.find(wallet => wallet.name === name)
    }

    const getWithdrawalWallets = () => {
        return {
            instant: getWalletByName('Instant Withdrawal'),
            standard: getWalletByName('Standard Withdrawal')
        }
    }

    return {
        wallets,
        lastUpdated,
        loading,
        error,
        refreshWalletBalances,
        getWalletByName,
        getWithdrawalWallets
    }
}
