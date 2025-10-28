import { useState, useCallback, useEffect } from 'react'

interface HistoryTransaction {
    timestamp: string
    type: 'deposit' | 'withdraw' | 'instant_withdraw'
    amountHUSD: number
    grossUSDC?: number
    fee?: number
    netUSDC?: number
    rate: number
    status: 'pending' | 'completed' | 'failed'
    txId: string
    failureReason?: string
}

interface HistoryResponse {
    success: boolean
    history?: HistoryTransaction[]
    error?: string
    hasMore?: boolean
    nextCursor?: string
}

interface UseHistoryProps {
    userAccountId?: string
    enabled?: boolean
    limit?: number
}

interface UseHistoryReturn {
    history: HistoryTransaction[]
    isLoading: boolean
    error: string | null
    hasMore: boolean
    refresh: () => Promise<void>
    loadMore: () => Promise<void>
    isRefreshDisabled: boolean
    refreshTimeRemaining: number
}

export function useHistory({
    userAccountId,
    enabled = true,
    limit = 20,
}: UseHistoryProps): UseHistoryReturn {
    const [history, setHistory] = useState<HistoryTransaction[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [hasMore, setHasMore] = useState(false)
    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)
    const [isRefreshDisabled, setIsRefreshDisabled] = useState(false)
    const [refreshTimeRemaining, setRefreshTimeRemaining] = useState(0)

    // Fetch history data
    const fetchHistory = useCallback(
        async (cursor?: string, append = false) => {
            if (!userAccountId || !enabled) {
                console.log(`🚫 useHistory: Skipping fetch - userAccountId: ${userAccountId}, enabled: ${enabled}`)
                return
            }

            console.log(`🔄 useHistory: Fetching history for user: ${userAccountId}`)
            setIsLoading(true)
            setError(null)

            try {
                const params = new URLSearchParams({
                    user: userAccountId,
                    limit: limit.toString(),
                })

                if (cursor) {
                    params.append('cursor', cursor)
                }

                const response = await fetch(`/api/history?${params.toString()}`)

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }

                const data: HistoryResponse = await response.json()

                if (data.success && data.history) {
                    if (append) {
                        setHistory(prev => [...prev, ...data.history!])
                    } else {
                        setHistory(data.history)
                    }
                    setHasMore(data.hasMore || false)
                    setNextCursor(data.nextCursor)
                } else {
                    throw new Error(data.error || 'Failed to fetch history')
                }
            } catch (err) {
                console.error('Error fetching history:', err)
                setError(err instanceof Error ? err.message : 'Unknown error')
            } finally {
                setIsLoading(false)
            }
        },
        [userAccountId, enabled, limit]
    )

    // Refresh history (with cooldown)
    const refresh = useCallback(async () => {
        if (isRefreshDisabled) return

        await fetchHistory()

        // Disable refresh for 30 seconds
        setIsRefreshDisabled(true)
        setRefreshTimeRemaining(30)

        const timer = setInterval(() => {
            setRefreshTimeRemaining(prev => {
                if (prev <= 1) {
                    setIsRefreshDisabled(false)
                    clearInterval(timer)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }, [fetchHistory, isRefreshDisabled])

    // Load more history
    const loadMore = useCallback(async () => {
        if (!hasMore || !nextCursor || isLoading) return
        await fetchHistory(nextCursor, true)
    }, [fetchHistory, hasMore, nextCursor, isLoading])

    // Initial fetch when component mounts or userAccountId changes
    useEffect(() => {
        if (enabled && userAccountId) {
            fetchHistory()
        }
    }, [fetchHistory, enabled, userAccountId])

    return {
        history,
        isLoading,
        error,
        hasMore,
        refresh,
        loadMore,
        isRefreshDisabled,
        refreshTimeRemaining,
    }
}
