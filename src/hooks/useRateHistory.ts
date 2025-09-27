import { useState, useEffect, useCallback } from 'react'

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

export function useRateHistory(
    limit: number = 100,
    autoRefresh: boolean = true
): UseRateHistoryReturn {
    const [data, setData] = useState<RateHistoryPoint[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

    const fetchRateHistory = useCallback(
        async (showLoading = true) => {
            try {
                if (showLoading) setLoading(true)
                setError(null)

                const response = await fetch(`/api/rate-history?limit=${limit}`)
                const result = await response.json()

                if (!response.ok) {
                    throw new Error(
                        result.error || 'Failed to fetch rate history'
                    )
                }

                const formattedData = (result.data || []).map((point: any) => ({
                    ...point,
                    time: new Date(point.timestamp).getTime(),
                }))

                setData(formattedData)
                setLastUpdated(new Date())
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Unknown error occurred'
                )
                setData([])
            } finally {
                if (showLoading) setLoading(false)
            }
        },
        [limit]
    )

    // Auto-refresh every 30 seconds
    useEffect(() => {
        fetchRateHistory()

        if (autoRefresh) {
            const interval = setInterval(() => {
                fetchRateHistory(false) // Don't show loading on auto-refresh
            }, 30000)

            return () => clearInterval(interval)
        }
    }, [fetchRateHistory, autoRefresh])

    // Calculate current metrics - current is the LAST (most recent), previous is second to last
    const currentRate = data.length > 0 ? data[data.length - 1]?.rate || 0 : 0
    const previousRate =
        data.length > 1
            ? data[data.length - 2]?.rate || currentRate
            : currentRate
    const priceChange = currentRate - previousRate
    const priceChangePercent =
        previousRate !== 0 ? (priceChange / previousRate) * 100 : 0

    return {
        data,
        loading,
        error,
        refetch: () => fetchRateHistory(true),
        lastUpdated,
        currentRate,
        priceChange,
        priceChangePercent,
    }
}
