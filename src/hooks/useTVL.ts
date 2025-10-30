import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'

interface TVLData {
    tvl: number
    breakdown: {
        instantWithdraw: number
        standardWithdraw: number
        deposits: number
    }
    lastUpdated: string
}

interface UseTVLReturn {
    tvl: number
    formattedTVL: string
    breakdown: TVLData['breakdown'] | null
    lastUpdated: string | null
    loading: boolean
    error: string | null
    refreshTVL: () => void
}

async function fetchTVL(): Promise<TVLData> {
    logger.info('📊 Fetching TVL data...')
    const response = await fetch('/api/tvl')

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: TVLData = await response.json()
    logger.info('✅ TVL data updated:', data.tvl)
    return data
}

export function useTVL(): UseTVLReturn {
    const { data: tvlData, isLoading, error, refetch } = useQuery({
        queryKey: queryKeys.tvl,
        queryFn: fetchTVL,
        staleTime: 30 * 1000, // Data is fresh for 30 seconds
        refetchInterval: 60 * 1000, // Auto-refetch every 60 seconds
    })

    // Memoized formatted TVL to avoid recalculations
    const formattedTVL = useMemo(() => {
        if (!tvlData) return '$0'

        const { tvl } = tvlData

        // Format large numbers nicely
        if (tvl >= 1_000_000) {
            return `$${(tvl / 1_000_000).toFixed(2)}M`
        } else if (tvl >= 1_000) {
            return `$${(tvl / 1_000).toFixed(1)}K`
        } else {
            return `$${tvl.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            })}`
        }
    }, [tvlData])

    return {
        tvl: tvlData?.tvl ?? 0,
        formattedTVL,
        breakdown: tvlData?.breakdown ?? null,
        lastUpdated: tvlData?.lastUpdated ?? null,
        loading: isLoading,
        error: error instanceof Error ? error.message : null,
        refreshTVL: () => void refetch(),
    }
}
