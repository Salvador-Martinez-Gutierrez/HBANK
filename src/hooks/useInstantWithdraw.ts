import { useState, useEffect } from 'react'
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

export function useInstantWithdraw(): UseInstantWithdrawReturn {
    const [maxInstantWithdrawable, setMaxInstantWithdrawable] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchMaxInstantWithdrawable = async () => {
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
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Unknown error'
            setError(errorMessage)
            console.error('Error fetching max instant withdrawable:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const refreshMaxAmount = async () => {
        await fetchMaxInstantWithdrawable()
    }

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
                return {
                    success: false,
                    error: data.error || 'Instant withdrawal failed',
                }
            }

            // Refresh max amount after successful withdrawal
            await fetchMaxInstantWithdrawable()

            return data
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Unknown error'
            return {
                success: false,
                error: errorMessage,
            }
        }
    }

    // Fetch max amount on mount
    useEffect(() => {
        fetchMaxInstantWithdrawable()
    }, [])

    return {
        maxInstantWithdrawable,
        isLoading,
        error,
        submitInstantWithdraw,
        calculateInstantWithdrawAmounts,
        refreshMaxAmount,
    }
}
