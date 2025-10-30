import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'

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

async function fetchHistory(
    userAccountId: string,
    limit: number,
    cursor?: string
): Promise<HistoryResponse> {
    logger.info(`🔄 useHistory: Fetching history for user: ${userAccountId}`)

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

    if (!data.success) {
        throw new Error(data.error ?? 'Failed to fetch history')
    }

    return data
}

export function useHistory({
    userAccountId,
    enabled = true,
    limit = 20,
}: UseHistoryProps): UseHistoryReturn {
    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)
    const [allHistory, setAllHistory] = useState<HistoryTransaction[]>([])
    const [hasMore, setHasMore] = useState(false)
    const [isRefreshDisabled, setIsRefreshDisabled] = useState(false)
    const [refreshTimeRemaining, setRefreshTimeRemaining] = useState(0)

    // Query for initial/refresh history fetch
    const {
        data,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: queryKeys.history(userAccountId),
        queryFn: () => fetchHistory(userAccountId!, limit),
        enabled: enabled && !!userAccountId,
        staleTime: 30 * 1000, // Fresh for 30 seconds
        onSuccess: (data) => {
            if (data.success && data.history) {
                setAllHistory(data.history)
                setHasMore(data.hasMore ?? false)
                setNextCursor(data.nextCursor)
            }
        },
    })

    // Refresh history (with cooldown)
    const refresh = useCallback(async () => {
        if (isRefreshDisabled) return

        await refetch()

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

        return () => clearInterval(timer)
    }, [refetch, isRefreshDisabled])

    // Load more history
    const loadMore = useCallback(async () => {
        if (!hasMore || !nextCursor || isLoading || !userAccountId) return

        try {
            const moreData = await fetchHistory(userAccountId, limit, nextCursor)

            if (moreData.success && moreData.history) {
                setAllHistory(prev => [...prev, ...moreData.history!])
                setHasMore(moreData.hasMore ?? false)
                setNextCursor(moreData.nextCursor)
            }
        } catch (err) {
            logger.error('Error loading more history:', err)
        }
    }, [hasMore, nextCursor, isLoading, userAccountId, limit])

    return {
        history: allHistory.length > 0 ? allHistory : (data?.history ?? []),
        isLoading,
        error: error instanceof Error ? error.message : null,
        hasMore,
        refresh: () => void refresh(),
        loadMore: () => void loadMore(),
        isRefreshDisabled,
        refreshTimeRemaining,
    }
}
