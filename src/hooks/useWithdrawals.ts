import { useState, useEffect, useCallback } from 'react'
import { WithdrawStatus } from '@/types/withdrawal'
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

export function useWithdrawals({
    userAccountId,
    enabled = true,
}: UseWithdrawalsProps): UseWithdrawalsReturn {
    const [withdrawals, setWithdrawals] = useState<WithdrawStatus[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Fetch user withdrawals from API
    const fetchWithdrawals = useCallback(async () => {
        if (!userAccountId || !enabled) {
            console.log(`🚫 useWithdrawals: Skipping fetch - userAccountId: ${userAccountId}, enabled: ${enabled}`)
            return
        }

        console.log(`🔄 useWithdrawals: Fetching withdrawals for user: ${userAccountId}`)
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch(
                `/api/user-withdrawals?user=${encodeURIComponent(
                    userAccountId
                )}`
            )

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = await response.json()

            if (data.success) {
                setWithdrawals(data.withdrawals)
            } else {
                throw new Error(data.error || 'Failed to fetch withdrawals')
            }
        } catch (err) {
            console.error('Error fetching withdrawals:', err)
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setIsLoading(false)
        }
    }, [userAccountId, enabled])

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
                    // Refresh withdrawals to show the new one
                    fetchWithdrawals()
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
        [userAccountId, fetchWithdrawals]
    )

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
                    console.log('📡 WebSocket connected for withdrawals')

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

                            console.log('📝 Parsed message:', {
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
                                console.log(
                                    '🔄 Received withdrawal update for our user, refreshing...'
                                )
                                fetchWithdrawals()
                            } else {
                                console.log(
                                    '⏭️ Message not for our user, ignoring...'
                                )
                            }
                        }
                    } catch (parseError) {
                        console.warn(
                            'Failed to parse WebSocket message:',
                            parseError
                        )
                    }
                }

                ws.onerror = (error) => {
                    console.error('WebSocket error:', error)
                }

                ws.onclose = () => {
                    console.log(
                        '📡 WebSocket disconnected, attempting to reconnect...'
                    )

                    // Reconnect after 5 seconds
                    reconnectTimeout = setTimeout(() => {
                        connectWebSocket()
                    }, 5000)
                }
            } catch (error) {
                console.error('Failed to connect WebSocket:', error)

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
    }, [enabled, userAccountId, fetchWithdrawals])

    // Initial fetch and periodic refresh
    useEffect(() => {
        if (enabled && userAccountId) {
            fetchWithdrawals()

            // Set up periodic refresh every 30 seconds as fallback
            const interval = setInterval(fetchWithdrawals, 30000)

            return () => clearInterval(interval)
        }
    }, [fetchWithdrawals, enabled, userAccountId])

    return {
        withdrawals,
        isLoading,
        error,
        refresh: fetchWithdrawals,
        submitWithdrawal,
    }
}
