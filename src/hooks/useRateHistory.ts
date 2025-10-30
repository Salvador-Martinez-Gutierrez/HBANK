import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

export interface RateHistoryPoint {
    rate: number
    timestamp: string
    sequenceNumber: string
    formattedTime: string
    time: number // Unix timestamp for easier chart handling
}

export interface UseRateHistoryReturn {
    data: RateHistoryPoint[]
    loading: boolean
    error: string | null
    refetch: () => void
    lastUpdated: Date | null
    currentRate: number
    priceChange: number
    priceChangePercent: number
}

interface RateHistoryResponse {
    data: Omit<RateHistoryPoint, 'time'>[]
    error?: string
}

async function fetchRateHistory(limit: number): Promise<RateHistoryPoint[]> {
    const response = await fetch(`/api/rate-history?limit=${limit}`)
    const result: RateHistoryResponse = await response.json()

    if (!response.ok) {
        throw new Error(result.error ?? 'Failed to fetch rate history')
    }

    // Format data with time property
    return (result.data ?? []).map((point) => ({
        ...point,
        time: new Date(point.timestamp).getTime(),
    }))
}

export function useRateHistory(
    limit: number = 100,
    autoRefresh: boolean = true
): UseRateHistoryReturn {
    const {
        data = [],
        isLoading,
        error,
        refetch,
        dataUpdatedAt,
    } = useQuery({
        queryKey: queryKeys.rateHistory(limit),
        queryFn: () => fetchRateHistory(limit),
        staleTime: 30 * 1000, // Fresh for 30 seconds
        refetchInterval: autoRefresh ? 30 * 1000 : false, // Auto-refresh every 30 seconds if enabled
    })

    // Memoized metrics calculation
    const metrics = useMemo(() => {
        // Current is the LAST (most recent), previous is second to last
        const currentRate = data.length > 0 ? data[data.length - 1]?.rate || 0 : 0
        const previousRate = data.length > 1 ? data[data.length - 2]?.rate || currentRate : currentRate
        const priceChange = currentRate - previousRate
        const priceChangePercent = previousRate !== 0 ? (priceChange / previousRate) * 100 : 0

        return {
            currentRate,
            priceChange,
            priceChangePercent,
        }
    }, [data])

    return {
        data,
        loading: isLoading,
        error: error instanceof Error ? error.message : null,
        refetch: () => void refetch(),
        lastUpdated: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
        currentRate: metrics.currentRate,
        priceChange: metrics.priceChange,
        priceChangePercent: metrics.priceChangePercent,
    }
}
