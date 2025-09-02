import { useCallback } from 'react'

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

export function useWithdrawSubmit({
    userAccountId,
}: UseWithdrawSubmitProps): UseWithdrawSubmitReturn {
    // Submit new withdrawal
    const submitWithdrawal = useCallback(
        async (
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
                const response = await fetch('/api/withdraw', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userAccountId,
                        amountHUSD,
                        rate,
                        rateSequenceNumber,
                    }),
                })

                const data = await response.json()

                if (response.ok && data.success) {
                    return {
                        success: true,
                        requestId: data.requestId,
                        scheduleId: data.transferTxId || data.scheduleId,
                    }
                } else {
                    return {
                        success: false,
                        error: data.error || 'Failed to submit withdrawal',
                    }
                }
            } catch (err) {
                console.error('Error submitting withdrawal:', err)
                return {
                    success: false,
                    error: err instanceof Error ? err.message : 'Unknown error',
                }
            }
        },
        [userAccountId]
    )

    return {
        submitWithdrawal,
    }
}
