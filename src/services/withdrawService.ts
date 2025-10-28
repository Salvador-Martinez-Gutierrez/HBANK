/**
 * Withdraw Service
 *
 * Manages withdrawal operations for converting hUSD back to USDC.
 * Handles fetching withdrawal requests and results from the Hedera Consensus Service (HCS) topic,
 * tracking withdrawal status, and validating exchange rates. Supports both standard withdrawals
 * (with 48-hour lock period) and instant withdrawals.
 */

import { HederaRateService } from './hederaRateService'
import {
    WithdrawRequest,
    WithdrawResult,
    WithdrawStatus,
} from '@/types/withdrawal'
import { createScopedLogger } from '@/lib/logger'

const logger = createScopedLogger('service:withdrawService')

import {
    WITHDRAW_TOPIC_ID,
    TESTNET_MIRROR_NODE_ENDPOINT,
} from '@/app/backend-constants'

export class WithdrawService {
    public rateService: HederaRateService

    constructor() {
        this.rateService = new HederaRateService()
    }

    /**
     * Validate the exchange rate against the latest published rate
     *
     * Verifies that the provided rate matches the current rate published on the HCS topic
     * by comparing both the sequence number and rate value (with tolerance for floating point precision).
     *
     * @param expectedRate - Expected USDC/hUSD exchange rate
     * @param rateSequenceNumber - Sequence number of the expected rate
     * @returns True if the rate is valid and matches the latest published rate, false otherwise
     *
     * @example
     * ```typescript
     * const isValid = await withdrawService.validateRate(1.05, '42')
     * if (!isValid) {
     *   console.log('Rate has changed, please refresh')
     * }
     * ```
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
                return false
            }

            // Check if rate matches (with small tolerance for floating point precision)
            const tolerance = 0.0001
            const rateDifference = Math.abs(latestRate.rate - expectedRate)

            if (rateDifference > tolerance) {
                return false
            }

            return true
        } catch (error) {
            logger.error('Error validating rate:', error)
            return false
        }
    }

    /**
     * Fetch withdrawal messages from the Hedera Consensus Service topic
     *
     * Retrieves and parses withdrawal requests and results published to the HCS topic.
     * Handles both old and new message formats for backward compatibility.
     * Messages are fetched from the Hedera Mirror Node API.
     *
     * @param startTimestamp - Optional ISO timestamp to filter messages from (not currently used)
     * @param startSequenceNumber - Optional sequence number to filter messages from
     * @returns Array of parsed withdrawal requests and results
     *
     * @example
     * ```typescript
     * const messages = await withdrawService.getWithdrawMessages()
     * const requests = messages.filter(m => m.type === 'withdraw_request')
     * const results = messages.filter(m => m.type === 'withdraw_result')
     * ```
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

            logger.info('Fetching withdrawal messages from:', url)

            const response = await fetch(url)
            if (!response.ok) {
                if (response.status === 404) {
                    logger.info(
                        'Withdrawal topic not found or has no messages yet. This is normal for new setups.'
                    )
                    return []
                }
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = await response.json()
            logger.info(
                `📋 Fetched ${
                    data.messages?.length ?? 0
                } raw messages from withdrawal topic`
            )

            const messages: (WithdrawRequest | WithdrawResult)[] = []

            for (const msg of data.messages ?? []) {
                try {
                    // Check if message exists and is not empty
                    if (!msg.message) {
                        logger.info(
                            '⚠️ Skipping message without message content'
                        )
                        continue
                    }

                    const decodedMessage = Buffer.from(
                        msg.message,
                        'base64'
                    ).toString('utf8')
                    const parsedMessage = JSON.parse(decodedMessage)

                    logger.info('📝 Parsed message:', {
                        type: parsedMessage.type,
                        requestId: parsedMessage.requestId,
                        user: parsedMessage.user,
                        status: parsedMessage.status,
                        payload: parsedMessage.payload
                            ? 'has payload'
                            : 'no payload',
                    })

                    // Handle different message formats
                    let processedMessage = parsedMessage

                    // Check if it's the old format with payload
                    if (parsedMessage.payload) {
                        if (parsedMessage.type === 'withdraw_result') {
                            // Convert old format to new format
                            processedMessage = {
                                type: 'withdraw_result',
                                requestId:
                                    parsedMessage.payload.requestId ??
                                    parsedMessage.requestId,
                                status: parsedMessage.payload.success
                                    ? 'completed'
                                    : 'failed',
                                txId: parsedMessage.payload.txId,
                                failureReason: parsedMessage.payload.success
                                    ? undefined
                                    : parsedMessage.payload.reason,
                                processedAt: new Date().toISOString(),
                            }
                        }
                    }

                    if (
                        processedMessage.type === 'withdraw_request' ||
                        processedMessage.type === 'withdraw_result'
                    ) {
                        messages.push(processedMessage)
                    }
                } catch (parseError) {
                    logger.warn('Failed to parse message:', parseError)
                    continue
                }
            }

            logger.info(`✅ Found ${messages.length} valid withdrawal messages`)
            return messages
        } catch (error) {
            logger.error('Error fetching withdrawal messages:', error)
            return []
        }
    }

    /**
     * Get pending withdrawal requests ready for processing
     *
     * Fetches withdrawal requests that have passed their 48-hour lock period and are ready
     * to be executed. Filters out requests that already have results (completed or failed).
     * Can skip the lock period in testing mode via SKIP_WITHDRAW_LOCK_PERIOD environment variable.
     *
     * @returns Array of withdrawal requests that are ready to be processed
     *
     * @example
     * ```typescript
     * const pending = await withdrawService.getPendingWithdrawals()
     * for (const request of pending) {
     *   console.log(`Processing withdrawal ${request.requestId} for ${request.amountHUSD} hUSD`)
     *   // Process the withdrawal...
     * }
     * ```
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
                    const existing = requestMap.get(message.requestId) ?? {}
                    requestMap.set(message.requestId, {
                        ...existing,
                        request: message,
                    })
                } else if (message.type === 'withdraw_result') {
                    const existing = requestMap.get(message.requestId) ?? {}
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
                logger.info(
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
                            logger.info(
                                `📋 Processing withdrawal ${request.requestId} (lock period skipped for testing)`
                            )
                        } else {
                            logger.info(
                                `📋 Processing withdrawal ${request.requestId} (48h period completed)`
                            )
                        }
                    } else {
                        const timeRemaining =
                            unlockTime.getTime() - now.getTime()
                        const hoursRemaining = Math.ceil(
                            timeRemaining / (1000 * 60 * 60)
                        )
                        logger.info(
                            `⏳ Withdrawal ${request.requestId} still locked for ${hoursRemaining} hours`
                        )
                    }
                }
            }

            return pendingRequests
        } catch (error) {
            logger.error('Error getting pending withdrawals:', error)
            return []
        }
    }

    /**
     * Get all withdrawal statuses for a specific user
     *
     * Fetches all withdrawal requests and their results for a given user from the last 30 days.
     * Combines requests with their corresponding results to provide a complete status history.
     * Results are sorted by request time with newest first.
     *
     * @param userAccountId - Hedera account ID of the user (e.g., "0.0.123456")
     * @returns Array of withdrawal statuses including pending, completed, and failed withdrawals
     *
     * @example
     * ```typescript
     * const withdrawals = await withdrawService.getUserWithdrawals('0.0.123456')
     * withdrawals.forEach(w => {
     *   console.log(`${w.requestId}: ${w.status} - ${w.amountHUSD} hUSD`)
     *   if (w.status === 'pending') {
     *     console.log(`Unlocks at: ${w.unlockAt}`)
     *   }
     * })
     * ```
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

            // First pass: identify all withdraw_request messages for this user
            const userRequestIds = new Set<string>()
            for (const message of messages) {
                if (
                    message.type === 'withdraw_request' &&
                    message.user === userAccountId
                ) {
                    userRequestIds.add(message.requestId)
                    userRequestMap.set(message.requestId, {
                        request: message,
                    })
                }
            }

            // Second pass: add withdraw_result messages for user's requests
            for (const message of messages) {
                if (
                    message.type === 'withdraw_result' &&
                    userRequestIds.has(message.requestId)
                ) {
                    const existing = userRequestMap.get(message.requestId) ?? {}
                    userRequestMap.set(message.requestId, {
                        ...existing,
                        result: message,
                    })
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
                        status: result?.status ?? 'pending',
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
            logger.error('Error getting user withdrawals:', error)
            return []
        }
    }
}
