'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

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

async function fetchWalletBalances(): Promise<WalletBalancesResponse> {
    const response = await fetch('/api/wallet-balances')

    if (!response.ok) {
        throw new Error('Failed to fetch wallet balances')
    }

    return response.json()
}

export function useWalletBalances() {
    const {
        data,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: queryKeys.walletBalances(),
        queryFn: fetchWalletBalances,
        staleTime: 30 * 1000, // Fresh for 30 seconds
        refetchInterval: 60 * 1000, // Auto-refresh every 60 seconds
    })

    const wallets = data?.wallets ?? []
    const lastUpdated = data?.lastUpdated ?? ''

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
        loading: isLoading,
        error: error instanceof Error ? error.message : null,
        refreshWalletBalances: () => void refetch(),
        getWalletByName,
        getWithdrawalWallets
    }
}
