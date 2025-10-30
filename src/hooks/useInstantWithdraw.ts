import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { INSTANT_WITHDRAW_FEE } from '@/app/constants'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'

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
    refreshMaxAmount: () => void
}

async function fetchMaxInstantWithdrawable(): Promise<InstantWithdrawData> {
    const response = await fetch('/api/withdraw/instant/max')
    const data: InstantWithdrawData = await response.json()

    if (!response.ok) {
        throw new Error(
            data.error ?? 'Failed to fetch max instant withdrawable amount'
        )
    }

    logger.info(
        '🔄 [useInstantWithdraw] Max amount fetched:',
        data.maxInstantWithdrawable
    )
    return data
}

async function submitInstantWithdrawAPI(params: {
    userAccountId: string
    amountHUSD: number
    rate: number
    rateSequenceNumber: string
}): Promise<InstantWithdrawResponse> {
    logger.info('🚀 Making instant withdraw request:', params)

    const response = await fetch('/api/withdraw/instant', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ...params,
            requestType: 'instant',
        }),
    })

    const data: InstantWithdrawResponse = await response.json()

    if (!response.ok) {
        logger.error('❌ Instant withdraw failed:', data)
        throw new Error(data.error ?? 'Instant withdrawal failed')
    }

    logger.info('✅ Instant withdraw successful!')
    return data
}

export function useInstantWithdraw(): UseInstantWithdrawReturn {
    const queryClient = useQueryClient()

    // Query for max instant withdrawable amount
    const {
        data,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: queryKeys.instantWithdrawMax,
        queryFn: fetchMaxInstantWithdrawable,
        staleTime: 30 * 1000, // Fresh for 30 seconds
        refetchInterval: 60 * 1000, // Auto-refresh every 60 seconds
    })

    // Mutation for submitting instant withdraw
    const mutation = useMutation({
        mutationFn: submitInstantWithdrawAPI,
        onSuccess: () => {
            // Invalidate and refetch max amount after successful withdrawal
            void queryClient.invalidateQueries({ queryKey: queryKeys.instantWithdrawMax })
            // Also invalidate TVL as it will change
            void queryClient.invalidateQueries({ queryKey: queryKeys.tvl })
            // Invalidate history as there's a new transaction
            void queryClient.invalidateQueries({ queryKey: queryKeys.history() })
            void queryClient.invalidateQueries({ queryKey: queryKeys.withdrawals() })
        },
    })

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
            const result = await mutation.mutateAsync({
                userAccountId,
                amountHUSD,
                rate,
                rateSequenceNumber,
            })
            return result
        } catch (err) {
            logger.error('❌ Instant withdraw exception:', err)
            const errorMessage =
                err instanceof Error ? err.message : 'Unknown error'
            return {
                success: false,
                error: errorMessage,
            }
        }
    }

    return {
        maxInstantWithdrawable: data?.maxInstantWithdrawable ?? 0,
        isLoading: isLoading || mutation.isPending,
        error: error instanceof Error ? error.message : null,
        submitInstantWithdraw,
        calculateInstantWithdrawAmounts,
        refreshMaxAmount: () => void refetch(),
    }
}

// Export function to refresh from other components
export const refreshInstantWithdrawMax = () => {
    // This will be handled by query invalidation now
    logger.info('🌐 [useInstantWithdraw] Refresh triggered via query invalidation')
}
