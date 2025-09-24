import { useState, useEffect, useCallback, useMemo } from 'react'

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
    refreshTVL: () => Promise<void>
}

export function useTVL(): UseTVLReturn {
    const [tvlData, setTVLData] = useState<TVLData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchTVL = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            console.log('📊 Fetching TVL data...')
            const response = await fetch('/api/tvl')

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data: TVLData = await response.json()
            setTVLData(data)
            console.log('✅ TVL data updated:', data.tvl)
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Failed to fetch TVL'
            setError(errorMessage)
            console.error('❌ Error fetching TVL:', err)
        } finally {
            setLoading(false)
        }
    }, [])

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

    // Auto-fetch on mount
    useEffect(() => {
        fetchTVL()
    }, [fetchTVL])

    return {
        tvl: tvlData?.tvl || 0,
        formattedTVL,
        breakdown: tvlData?.breakdown || null,
        lastUpdated: tvlData?.lastUpdated || null,
        loading,
        error,
        refreshTVL: fetchTVL,
    }
}
