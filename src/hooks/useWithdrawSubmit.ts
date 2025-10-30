import { useMutation, useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'

interface UseWithdrawSubmitProps {
    userAccountId?: string
}

interface UseWithdrawSubmitReturn {
    submitWithdrawal: (
        amountHUSD: number,
        rate: number,
        rateSequenceNumber: string
    ) => Promise<{
        success: boolean
        requestId?: string
        scheduleId?: string
        error?: string
    }>
}

interface SubmitWithdrawalParams {
    userAccountId: string
    amountHUSD: number
    rate: number
    rateSequenceNumber: string
}

interface SubmitWithdrawalResponse {
    success: boolean
    requestId?: string
    transferTxId?: string
    scheduleId?: string
    error?: string
}

async function submitWithdrawalAPI(params: SubmitWithdrawalParams): Promise<SubmitWithdrawalResponse> {
    const response = await fetch('/api/withdraw', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    })

    const data: SubmitWithdrawalResponse = await response.json()

    if (!response.ok || !data.success) {
        throw new Error(data.error ?? 'Failed to submit withdrawal')
    }

    return data
}

export function useWithdrawSubmit({
    userAccountId,
}: UseWithdrawSubmitProps): UseWithdrawSubmitReturn {
    const queryClient = useQueryClient()

    // Mutation for submitting withdrawal
    const mutation = useMutation({
        mutationFn: submitWithdrawalAPI,
        onSuccess: () => {
            // Invalidate and refetch withdrawals
            void queryClient.invalidateQueries({ queryKey: queryKeys.withdrawals(userAccountId) })
            // Invalidate history as there's a new transaction
            void queryClient.invalidateQueries({ queryKey: queryKeys.history(userAccountId) })
            // Invalidate TVL as it will change
            void queryClient.invalidateQueries({ queryKey: queryKeys.tvl })
        },
    })

    const submitWithdrawal = async (
        amountHUSD: number,
        rate: number,
        rateSequenceNumber: string
    ): Promise<{
        success: boolean
        requestId?: string
        scheduleId?: string
        error?: string
    }> => {
        if (!userAccountId) {
            return { success: false, error: 'User account ID is required' }
        }

        try {
            const result = await mutation.mutateAsync({
                userAccountId,
                amountHUSD,
                rate,
                rateSequenceNumber,
            })

            return {
                success: true,
                requestId: result.requestId,
                scheduleId: result.transferTxId ?? result.scheduleId,
            }
        } catch (err) {
            logger.error('Error submitting withdrawal:', err)
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Unknown error',
            }
        }
    }

    return {
        submitWithdrawal,
    }
}
