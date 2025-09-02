import { HederaRateService } from './hederaRateService'
import {
    WithdrawRequest,
    WithdrawResult,
    WithdrawStatus,
} from '@/types/withdrawal'
import {
    WITHDRAW_TOPIC_ID,
    TESTNET_MIRROR_NODE_ENDPOINT,
} from '@/app/server-constants'

export class WithdrawService {
    public rateService: HederaRateService

    constructor() {
        this.rateService = new HederaRateService()
    }

    /**
     * Validates the rate against the latest published rate
     */
    async validateRate(
        expectedRate: number,
        rateSequenceNumber: string
    ): Promise<boolean> {
        try {
            const latestRate = await this.rateService.getLatestRate()

            if (!latestRate) {
                throw new Error('Could not fetch latest rate')
            }

            // Check if sequence number matches
            if (latestRate.sequenceNumber !== rateSequenceNumber) {
                console.log('Rate sequence number mismatch:', {
                    expected: rateSequenceNumber,
                    actual: latestRate.sequenceNumber,
                })
                return false
            }

            // Check if rate matches (with small tolerance for floating point precision)
            const tolerance = 0.0001
            const rateDifference = Math.abs(latestRate.rate - expectedRate)

            if (rateDifference > tolerance) {
                console.log('Rate value mismatch:', {
                    expected: expectedRate,
                    actual: latestRate.rate,
                    difference: rateDifference,
                })
                return false
            }

            return true
        } catch (error) {
            console.error('Error validating rate:', error)
            return false
        }
    }

    /**
     * Gets withdrawal messages from HCS topic
     */
    async getWithdrawMessages(
        startTimestamp?: string,
        startSequenceNumber?: string
    ): Promise<(WithdrawRequest | WithdrawResult)[]> {
        try {
            let url = `${TESTNET_MIRROR_NODE_ENDPOINT}/api/v1/topics/${WITHDRAW_TOPIC_ID}/messages`

            const params = new URLSearchParams()
            // For testing, let's get recent messages without timestamp filter
            if (startSequenceNumber) {
                params.append('sequencenumber', `gte:${startSequenceNumber}`)
            }
            params.append('order', 'desc') // Get most recent first
            params.append('limit', '100')

            if (params.toString()) {
                url += `?${params.toString()}`
            }

            console.log('Fetching withdrawal messages from:', url)

            const response = await fetch(url)
            if (!response.ok) {
                if (response.status === 404) {
                    console.log(
                        'Withdrawal topic not found or has no messages yet. This is normal for new setups.'
                    )
                    return []
                }
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = await response.json()
            console.log(
                `📋 Fetched ${
                    data.messages?.length || 0
                } raw messages from withdrawal topic`
            )

            const messages: (WithdrawRequest | WithdrawResult)[] = []

            for (const msg of data.messages || []) {
                try {
                    const decodedMessage = Buffer.from(
                        msg.message,
                        'base64'
                    ).toString('utf8')
                    const parsedMessage = JSON.parse(decodedMessage)

                    console.log('📝 Parsed message:', {
                        type: parsedMessage.type,
                        requestId: parsedMessage.requestId,
                        user: parsedMessage.user,
                        status: parsedMessage.status,
                    })

                    if (
                        parsedMessage.type === 'withdraw_request' ||
                        parsedMessage.type === 'withdraw_result'
                    ) {
                        messages.push(parsedMessage)
                    }
                } catch (parseError) {
                    console.warn('Failed to parse message:', parseError)
                    continue
                }
            }

            console.log(`✅ Found ${messages.length} valid withdrawal messages`)
            return messages
        } catch (error) {
            console.error('Error fetching withdrawal messages:', error)
            return []
        }
    }

    /**
     * Gets pending withdrawal requests that are ready to be processed (past unlock time)
     */
    async getPendingWithdrawals(): Promise<WithdrawRequest[]> {
        try {
            // Get messages from the last 49 hours to cover the 48h lock period plus buffer
            const startTime = new Date(
                Date.now() - 49 * 60 * 60 * 1000
            ).toISOString()
            const messages = await this.getWithdrawMessages(startTime)

            // Group messages by requestId to track status
            const requestMap = new Map<
                string,
                { request?: WithdrawRequest; result?: WithdrawResult }
            >()

            for (const message of messages) {
                if (message.type === 'withdraw_request') {
                    const existing = requestMap.get(message.requestId) || {}
                    requestMap.set(message.requestId, {
                        ...existing,
                        request: message,
                    })
                } else if (message.type === 'withdraw_result') {
                    const existing = requestMap.get(message.requestId) || {}
                    requestMap.set(message.requestId, {
                        ...existing,
                        result: message,
                    })
                }
            }

            // Filter for pending requests that are past unlock time
            const now = new Date()
            const pendingRequests: WithdrawRequest[] = []
            const skipLockPeriod =
                process.env.SKIP_WITHDRAW_LOCK_PERIOD === 'true'

            if (skipLockPeriod) {
                console.log(
                    '⚠️ TESTING MODE: Skipping 48h lock period for withdrawals'
                )
            }

            for (const [, { request, result }] of requestMap) {
                if (request && !result) {
                    // No result means still pending
                    const unlockTime = new Date(request.unlockAt)

                    // Skip lock period check if testing mode is enabled
                    if (skipLockPeriod || now >= unlockTime) {
                        pendingRequests.push(request)

                        if (skipLockPeriod) {
                            console.log(
                                `📋 Processing withdrawal ${request.requestId} (lock period skipped for testing)`
                            )
                        } else {
                            console.log(
                                `📋 Processing withdrawal ${request.requestId} (48h period completed)`
                            )
                        }
                    } else {
                        const timeRemaining =
                            unlockTime.getTime() - now.getTime()
                        const hoursRemaining = Math.ceil(
                            timeRemaining / (1000 * 60 * 60)
                        )
                        console.log(
                            `⏳ Withdrawal ${request.requestId} still locked for ${hoursRemaining} hours`
                        )
                    }
                }
            }

            return pendingRequests
        } catch (error) {
            console.error('Error getting pending withdrawals:', error)
            return []
        }
    }

    /**
     * Gets all withdrawal statuses for a user
     */
    async getUserWithdrawals(userAccountId: string): Promise<WithdrawStatus[]> {
        try {
            // Get messages from the last 30 days
            const startTime = new Date(
                Date.now() - 30 * 24 * 60 * 60 * 1000
            ).toISOString()
            const messages = await this.getWithdrawMessages(startTime)

            // Group messages by requestId and filter by user
            const userRequestMap = new Map<
                string,
                { request?: WithdrawRequest; result?: WithdrawResult }
            >()

            for (const message of messages) {
                if (
                    message.type === 'withdraw_request' &&
                    message.user === userAccountId
                ) {
                    const existing = userRequestMap.get(message.requestId) || {}
                    userRequestMap.set(message.requestId, {
                        ...existing,
                        request: message,
                    })
                } else if (message.type === 'withdraw_result') {
                    const existing = userRequestMap.get(message.requestId)
                    if (existing?.request?.user === userAccountId) {
                        userRequestMap.set(message.requestId, {
                            ...existing,
                            result: message,
                        })
                    }
                }
            }

            // Convert to WithdrawStatus array
            const withdrawals: WithdrawStatus[] = []

            for (const [requestId, { request, result }] of userRequestMap) {
                if (request) {
                    const status: WithdrawStatus = {
                        requestId,
                        user: request.user,
                        amountHUSD: request.amountHUSD,
                        rate: request.rate,
                        status: result?.status || 'pending',
                        requestedAt: request.requestedAt,
                        unlockAt: request.unlockAt,
                        ...(result?.txId && { txId: result.txId }),
                        ...(result?.failureReason && {
                            failureReason: result.failureReason,
                        }),
                        ...(result?.processedAt && {
                            processedAt: result.processedAt,
                        }),
                    }
                    withdrawals.push(status)
                }
            }

            // Sort by request time (newest first)
            withdrawals.sort(
                (a, b) =>
                    new Date(b.requestedAt).getTime() -
                    new Date(a.requestedAt).getTime()
            )

            return withdrawals
        } catch (error) {
            console.error('Error getting user withdrawals:', error)
            return []
        }
    }
}
