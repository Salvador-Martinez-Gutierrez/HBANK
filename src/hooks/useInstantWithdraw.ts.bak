import { useState, useEffect, useCallback } from 'react'
import { INSTANT_WITHDRAW_FEE } from '@/app/constants'

interface InstantWithdrawData {
    maxInstantWithdrawable: number
    treasuryBalance: number
    error?: string
}

interface InstantWithdrawResponse {
    success: boolean
    txId?: string
    grossUSDC?: number
    fee?: number
    netUSDC?: number
    error?: string
}

interface UseInstantWithdrawReturn {
    maxInstantWithdrawable: number
    isLoading: boolean
    error: string | null
    submitInstantWithdraw: (
        userAccountId: string,
        amountHUSD: number,
        rate: number,
        rateSequenceNumber: string
    ) => Promise<InstantWithdrawResponse>
    calculateInstantWithdrawAmounts: (
        amountHUSD: number,
        rate: number
    ) => {
        grossUSDC: number
        fee: number
        netUSDC: number
    }
    refreshMaxAmount: () => Promise<void>
}

// Simple global state for forcing refresh
let globalRefreshTimestamp = Date.now()
const refreshCallbacks = new Set<() => void>()

const triggerGlobalRefresh = () => {
    globalRefreshTimestamp = Date.now()
    console.log(
        '🌐 [useInstantWithdraw] Triggering global refresh, notifying',
        refreshCallbacks.size,
        'instances'
    )
    refreshCallbacks.forEach((callback) => callback())
}

// Export the trigger function for use by other components if needed
export const refreshInstantWithdrawMax = () => {
    triggerGlobalRefresh()
}

export function useInstantWithdraw(): UseInstantWithdrawReturn {
    const [maxInstantWithdrawable, setMaxInstantWithdrawable] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lastRefresh, setLastRefresh] = useState(Date.now())

    const fetchMaxInstantWithdrawable = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/withdraw/instant/max')
            const data: InstantWithdrawData = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        'Failed to fetch max instant withdrawable amount'
                )
            }

            setMaxInstantWithdrawable(data.maxInstantWithdrawable)
            console.log(
                '🔄 [useInstantWithdraw] Max amount updated to:',
                data.maxInstantWithdrawable
            )
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Unknown error'
            setError(errorMessage)
            console.error('Error fetching max instant withdrawable:', err)
        } finally {
            setIsLoading(false)
        }
    }, [])

    const refreshMaxAmount = useCallback(async () => {
        await fetchMaxInstantWithdrawable()
    }, [fetchMaxInstantWithdrawable])

    const calculateInstantWithdrawAmounts = (
        amountHUSD: number,
        rate: number
    ) => {
        const grossUSDC = amountHUSD * rate
        const fee = grossUSDC * INSTANT_WITHDRAW_FEE
        const netUSDC = grossUSDC - fee

        return {
            grossUSDC,
            fee,
            netUSDC,
        }
    }

    const submitInstantWithdraw = async (
        userAccountId: string,
        amountHUSD: number,
        rate: number,
        rateSequenceNumber: string
    ): Promise<InstantWithdrawResponse> => {
        console.log('🚀 Making instant withdraw request:', {
            userAccountId,
            amountHUSD,
        })

        try {
            const response = await fetch('/api/withdraw/instant', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userAccountId,
                    amountHUSD,
                    rate,
                    rateSequenceNumber,
                    requestType: 'instant',
                }),
            })

            const data: InstantWithdrawResponse = await response.json()

            if (!response.ok) {
                console.error('❌ Instant withdraw failed:', data)
                return {
                    success: false,
                    error: data.error || 'Instant withdrawal failed',
                }
            }

            console.log('✅ Instant withdraw successful!')

            // Refresh max amount after successful withdrawal and trigger global refresh
            await fetchMaxInstantWithdrawable()
            triggerGlobalRefresh()

            return data
        } catch (err) {
            console.error('❌ Instant withdraw exception:', err)
            const errorMessage =
                err instanceof Error ? err.message : 'Unknown error'
            return {
                success: false,
                error: errorMessage,
            }
        }
    }

    // Subscribe to global refresh updates
    useEffect(() => {
        const handleRefresh = () => {
            setLastRefresh(Date.now())
        }

        refreshCallbacks.add(handleRefresh)
        return () => {
            refreshCallbacks.delete(handleRefresh)
        }
    }, [])

    // Refresh when global refresh is triggered
    useEffect(() => {
        if (lastRefresh < globalRefreshTimestamp) {
            console.log(
                '🔄 [useInstantWithdraw] Global refresh triggered, updating max amount...'
            )
            fetchMaxInstantWithdrawable()
        }
    }, [lastRefresh, fetchMaxInstantWithdrawable])

    // Fetch max amount on mount
    useEffect(() => {
        fetchMaxInstantWithdrawable()
    }, [fetchMaxInstantWithdrawable])

    return {
        maxInstantWithdrawable,
        isLoading,
        error,
        submitInstantWithdraw,
        calculateInstantWithdrawAmounts,
        refreshMaxAmount,
    }
}
