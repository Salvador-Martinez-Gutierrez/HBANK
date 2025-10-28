/**
 * Real-Time Rate Hook (Refactored)
 *
 * Custom hook for real-time exchange rate updates from Hedera Mirror Node.
 * Uses a singleton RateManager to share state across all hook instances.
 *
 * Refactored from 456 lines to ~40 lines by extracting RateManager.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import RateManager from '@/lib/rate/RateManager'
import type { RateState, UseRealTimeRateReturn } from '@/lib/rate/rateTypes'

export type { RateData, UseRealTimeRateReturn } from '@/lib/rate/rateTypes'

/**
 * Hook for accessing real-time exchange rate data
 *
 * Features:
 * - Singleton pattern - shares one connection across all instances
 * - Adaptive polling - adjusts interval based on rate limits
 * - Auto cleanup - stops polling when no subscribers
 * - Error handling - exponential backoff on failures
 *
 * @returns Rate data, loading state, errors, and refetch function
 *
 * @example
 * ```tsx
 * function RateDisplay() {
 *   const { rateData, isLoading, error, refetch } = useRealTimeRate()
 *
 *   if (isLoading) return <div>Loading...</div>
 *   if (error) return <div>Error: {error}</div>
 *
 *   return <div>Rate: {rateData?.rate}</div>
 * }
 * ```
 */
export function useRealTimeRate(): UseRealTimeRateReturn {
    const [state, setState] = useState<RateState>({
        rateData: null,
        isLoading: true,
        error: null,
        isConnected: false,
    })

    const managerRef = useRef<RateManager>()

    useEffect(() => {
        managerRef.current = RateManager.getInstance()

        const unsubscribe = managerRef.current.subscribe((newState) => {
            setState(newState)
        })

        return unsubscribe
    }, [])

    const refetch = useCallback(async () => {
        if (managerRef.current) {
            await managerRef.current.refetch()
        }
    }, [])

    return {
        ...state,
        refetch,
    }
}
