/**
 * Rate Types
 *
 * Shared types for real-time rate management.
 */

export interface RateData {
    rate: number
    timestamp: string
    sequenceNumber: string
    lastUpdated: Date
}

export interface RateState {
    rateData: RateData | null
    isLoading: boolean
    error: string | null
    isConnected: boolean
}

export interface UseRealTimeRateReturn {
    rateData: RateData | null
    isLoading: boolean
    error: string | null
    refetch: () => Promise<void>
    isConnected: boolean
}
