import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { WithdrawStatus } from '@/types/withdrawal'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'
import {
    WITHDRAW_TOPIC_ID,
    TESTNET_MIRROR_NODE_ENDPOINT,
} from '@/app/constants'

interface UseWithdrawalsProps {
    userAccountId?: string
    enabled?: boolean
}

interface UseWithdrawalsReturn {
    withdrawals: WithdrawStatus[]
    isLoading: boolean
    error: string | null
    refresh: () => void
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

interface WithdrawalsResponse {
    success: boolean
    withdrawals: WithdrawStatus[]
    error?: string
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

async function fetchWithdrawals(userAccountId: string): Promise<WithdrawalsResponse> {
    logger.info(`🔄 useWithdrawals: Fetching withdrawals for user: ${userAccountId}`)

    const response = await fetch(
        `/api/user-withdrawals?user=${encodeURIComponent(userAccountId)}`
    )

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: WithdrawalsResponse = await response.json()

    if (!data.success) {
        throw new Error(data.error ?? 'Failed to fetch withdrawals')
    }

    return data
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

export function useWithdrawals({
    userAccountId,
    enabled = true,
}: UseWithdrawalsProps): UseWithdrawalsReturn {
    const queryClient = useQueryClient()

    // Query for fetching withdrawals
    const {
        data,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: queryKeys.withdrawals(userAccountId),
        queryFn: () => fetchWithdrawals(userAccountId!),
        enabled: enabled && !!userAccountId,
        staleTime: 30 * 1000, // Fresh for 30 seconds
        refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    })

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

    // WebSocket connection for real-time updates
    useEffect(() => {
        if (!enabled || !userAccountId) return

        let ws: WebSocket | null = null
        let reconnectTimeout: NodeJS.Timeout

        const connectWebSocket = () => {
            try {
                // Connect to Hedera Mirror Node WebSocket
                const wsUrl = TESTNET_MIRROR_NODE_ENDPOINT.replace(
                    'https://',
                    'wss://'
                ).replace('http://', 'ws://')
                ws = new WebSocket(`${wsUrl}/subscribe`)

                ws.onopen = () => {
                    logger.info('📡 WebSocket connected for withdrawals')

                    // Subscribe to withdrawal topic
                    const subscribeMessage = {
                        type: 'subscribe',
                        topic: WITHDRAW_TOPIC_ID,
                    }
                    ws?.send(JSON.stringify(subscribeMessage))
                }

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data)

                        // Check if this message is related to our user
                        if (data.message) {
                            const decodedMessage = Buffer.from(
                                data.message,
                                'base64'
                            ).toString('utf8')
                            const withdrawMessage = JSON.parse(decodedMessage)

                            logger.info('📝 Parsed message:', {
                                type: withdrawMessage.type,
                                requestId: withdrawMessage.requestId,
                                user: withdrawMessage.user,
                                status: withdrawMessage.status
                            })

                            // If this is a message for our user, refresh the withdrawals
                            if (
                                (withdrawMessage.type === 'withdraw_request' &&
                                    withdrawMessage.user === userAccountId) ||
                                (withdrawMessage.type === 'withdraw_result' &&
                                    withdrawMessage.user === userAccountId)
                            ) {
                                logger.info(
                                    '🔄 Received withdrawal update for our user, refreshing...'
                                )
                                void queryClient.invalidateQueries({
                                    queryKey: queryKeys.withdrawals(userAccountId)
                                })
                            } else {
                                logger.info(
                                    '⏭️ Message not for our user, ignoring...'
                                )
                            }
                        }
                    } catch (parseError) {
                        logger.warn(
                            'Failed to parse WebSocket message:',
                            parseError
                        )
                    }
                }

                ws.onerror = (error) => {
                    logger.error('WebSocket error:', error)
                }

                ws.onclose = () => {
                    logger.info(
                        '📡 WebSocket disconnected, attempting to reconnect...'
                    )

                    // Reconnect after 5 seconds
                    reconnectTimeout = setTimeout(() => {
                        connectWebSocket()
                    }, 5000)
                }
            } catch (error) {
                logger.error('Failed to connect WebSocket:', error)

                // Fallback to polling if WebSocket fails
                reconnectTimeout = setTimeout(() => {
                    connectWebSocket()
                }, 10000)
            }
        }

        // Start WebSocket connection
        connectWebSocket()

        // Cleanup function
        return () => {
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout)
            }
            if (ws) {
                ws.close()
            }
        }
    }, [enabled, userAccountId, queryClient])

    return {
        withdrawals: data?.withdrawals ?? [],
        isLoading: isLoading || mutation.isPending,
        error: error instanceof Error ? error.message : null,
        refresh: () => void refetch(),
        submitWithdrawal,
    }
}
