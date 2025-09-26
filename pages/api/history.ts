import { NextApiRequest, NextApiResponse } from 'next'
import { WithdrawService } from '@/services/withdrawService'
import { TOPICS, TOKENS } from '@/app/constants'

interface HistoryTransaction {
    timestamp: string
    type: 'deposit' | 'withdraw' | 'instant_withdraw'
    amountHUSD: number
    grossUSDC?: number
    fee?: number
    netUSDC?: number
    rate: number
    status: 'pending' | 'completed' | 'failed'
    txId: string
    failureReason?: string
}

interface HistoryResponse {
    success: boolean
    history?: HistoryTransaction[]
    error?: string
    hasMore?: boolean
    nextCursor?: string
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<HistoryResponse>
) {
    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed',
        })
    }

    try {
        const { user, limit = '20', cursor } = req.query

        if (!user || typeof user !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter: user (account ID)',
            })
        }

        const limitNum = parseInt(limit as string, 10)
        if (isNaN(limitNum) || limitNum <= 0 || limitNum > 50) {
            return res.status(400).json({
                success: false,
                error: 'Invalid limit parameter (must be 1-50)',
            })
        }

        console.log(`📚 Fetching history for user: ${user}, limit: ${limitNum}`)

        const withdrawService = new WithdrawService()
        const historyItems: HistoryTransaction[] = []

        // 1. Get withdrawals from the service
        try {
            const withdrawals = await withdrawService.getUserWithdrawals(user)
            console.log(
                `📊 Found ${withdrawals.length} withdrawals from WithdrawService`
            )

            // Convert withdrawals to history items
            for (const withdrawal of withdrawals) {
                console.log(
                    `🔄 Processing withdrawal: ${withdrawal.requestId}, status: ${withdrawal.status}, txId: ${withdrawal.txId}`
                )

                // Determine type based on unlockAt - instant withdrawals have unlockAt = requestedAt (no wait time)
                const requestTime = new Date(withdrawal.requestedAt).getTime()
                const unlockTime = new Date(withdrawal.unlockAt).getTime()
                const isInstant = unlockTime - requestTime < 60000 // Less than 1 minute difference

                const historyItem: HistoryTransaction = {
                    timestamp: withdrawal.requestedAt,
                    type: isInstant ? 'instant_withdraw' : 'withdraw',
                    amountHUSD: withdrawal.amountHUSD,
                    rate: withdrawal.rate,
                    status: withdrawal.status,
                    txId: withdrawal.txId || withdrawal.requestId,
                    failureReason: withdrawal.failureReason,
                }

                // For completed withdrawals, calculate USDC amounts
                if (withdrawal.status === 'completed') {
                    if (isInstant) {
                        // For instant withdrawals, we have fee information
                        const grossUSDC =
                            withdrawal.amountHUSD * withdrawal.rate
                        const fee = grossUSDC * 0.01 // 1% fee for instant withdrawals
                        historyItem.grossUSDC = grossUSDC
                        historyItem.fee = fee
                        historyItem.netUSDC = grossUSDC - fee
                    } else {
                        // For standard withdrawals, no fee
                        const usdcAmount =
                            withdrawal.amountHUSD * withdrawal.rate
                        historyItem.grossUSDC = usdcAmount
                        historyItem.netUSDC = usdcAmount
                        historyItem.fee = 0
                    }
                }

                historyItems.push(historyItem)
            }
        } catch (withdrawError) {
            console.warn('Failed to fetch withdrawals:', withdrawError)
            // Continue without withdrawals rather than failing entirely
        }

        // 2. Get user deposits from Mirror Node
        try {
            const deposits = await fetchUserDeposits(user, limitNum * 2) // Get more to account for filtering
            console.log(`📊 Adding ${deposits.length} deposits to history`)
            historyItems.push(...deposits)
        } catch (depositError) {
            console.warn(
                'Failed to fetch deposits from Mirror Node:',
                depositError
            )
            // Continue without deposits rather than failing entirely
        }

        // 3. Sort by timestamp (newest first)
        historyItems.sort(
            (a: HistoryTransaction, b: HistoryTransaction) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
        )

        // Log first few items to debug sorting
        console.log(`🕐 First 5 items after sorting:`)
        historyItems.slice(0, 5).forEach((item, i) => {
            console.log(`   ${i + 1}. ${item.type} - ${item.timestamp}`)
        })

        // 4. Apply pagination
        const startIndex = cursor ? parseInt(cursor as string, 10) : 0
        const endIndex = startIndex + limitNum
        const paginatedHistory = historyItems.slice(startIndex, endIndex)
        const hasMore = endIndex < historyItems.length

        // Log transaction types for debugging
        const typeCount = paginatedHistory.reduce((acc, item) => {
            acc[item.type] = (acc[item.type] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        console.log(
            `✅ Found ${historyItems.length} total history items, returning ${paginatedHistory.length}`
        )
        console.log(`📈 Transaction types: ${JSON.stringify(typeCount)}`)

        return res.status(200).json({
            success: true,
            history: paginatedHistory,
            hasMore,
            nextCursor: hasMore ? endIndex.toString() : undefined,
        })
    } catch (error) {
        console.error('❌ Error fetching user history:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        })
    }
}

/**
 * Fetches user deposits from Hedera Mirror Node
 */
async function fetchUserDeposits(
    userAccountId: string,
    limit: number
): Promise<HistoryTransaction[]> {
    const HUSD_TOKEN_ID = TOKENS.HUSD // hUSD token ID
    const TREASURY_ID = process.env.TREASURY_ID || '0.0.6887438' // Treasury account ID
    const mirrorNodeUrl = 'https://testnet.mirrornode.hedera.com'

    // Get token transfers where user received hUSD from treasury (deposits)
    const queryUrl = `${mirrorNodeUrl}/api/v1/transactions?account.id=${userAccountId}&transactiontype=cryptotransfer&order=desc&limit=${
        limit * 2
    }` // Get more to filter

    console.log(`🔍 Fetching deposits from Mirror Node: ${queryUrl}`)

    const response = await fetch(queryUrl)
    if (!response.ok) {
        throw new Error(`Mirror Node API error: ${response.status}`)
    }

    const data = await response.json()
    const transactions = data.transactions || []

    const deposits: HistoryTransaction[] = []

    console.log(
        `🔍 Processing ${transactions.length} transactions from Mirror Node`
    )

    for (const tx of transactions) {
        if (!tx.token_transfers || !Array.isArray(tx.token_transfers)) continue

        // Look for hUSD transfers from treasury to user (indicating a deposit)
        let userReceivedHUSD = 0
        let treasurySentHUSD = 0

        // Get decimals from environment
        const HUSD_MULTIPLIER = Math.pow(
            10,
            parseInt(process.env.HUSD_DECIMALS || '3')
        )

        for (const transfer of tx.token_transfers) {
            if (transfer.token_id === HUSD_TOKEN_ID) {
                if (transfer.account === userAccountId && transfer.amount > 0) {
                    userReceivedHUSD = transfer.amount / HUSD_MULTIPLIER // hUSD has 3 decimals
                } else if (
                    transfer.account === TREASURY_ID &&
                    transfer.amount < 0
                ) {
                    treasurySentHUSD =
                        Math.abs(transfer.amount) / HUSD_MULTIPLIER // hUSD has 3 decimals
                }
            }
        }

        // If user received hUSD from treasury, this is a deposit
        if (
            userReceivedHUSD > 0 &&
            treasurySentHUSD > 0 &&
            Math.abs(userReceivedHUSD - treasurySentHUSD) < 0.001
        ) {
            console.log(
                `💰 Found deposit: user received ${userReceivedHUSD} hUSD, treasury sent ${treasurySentHUSD} hUSD`
            )

            // Try to find the corresponding USDC transfer to calculate the rate
            let userSentUSDC = 0
            const USDC_TOKEN_ID = TOKENS.USDC // USDC token ID

            for (const transfer of tx.token_transfers) {
                if (
                    transfer.token_id === USDC_TOKEN_ID &&
                    transfer.account === userAccountId &&
                    transfer.amount < 0
                ) {
                    userSentUSDC = Math.abs(transfer.amount) / 1_000_000 // Convert from USDC decimals (6 decimals)
                    break
                }
            }

            // Calculate rate (USDC per hUSD)
            const rate =
                userSentUSDC > 0 ? userSentUSDC / userReceivedHUSD : 1.0

            // Convert consensus_timestamp to proper ISO format
            // Hedera consensus_timestamp format: "2024-01-15T10:30:45.123456789Z"
            let timestamp = tx.consensus_timestamp
            if (timestamp && !timestamp.includes('T')) {
                // If it's just a number (seconds), convert to ISO
                timestamp = new Date(parseFloat(timestamp) * 1000).toISOString()
            }

            console.log(
                `📅 Deposit timestamp: ${timestamp} (original: ${tx.consensus_timestamp})`
            )

            const deposit: HistoryTransaction = {
                timestamp: timestamp,
                type: 'deposit',
                amountHUSD: userReceivedHUSD,
                grossUSDC: userSentUSDC,
                netUSDC: userSentUSDC,
                fee: 0, // No fee for deposits
                rate,
                status: 'completed', // If it's on Mirror Node, it's completed
                txId: tx.transaction_id,
            }

            deposits.push(deposit)
        }
    }

    console.log(
        `✅ Found ${deposits.length} deposits for user ${userAccountId}`
    )
    return deposits
}

/**
 * Fetches instant withdrawals directly from the topic (COMMENTED OUT FOR NOW)
 */
/* 
async function getInstantWithdrawals(userAccountId: string): Promise<HistoryTransaction[]> {
    const TESTNET_MIRROR_NODE_ENDPOINT = 'https://testnet.mirrornode.hedera.com'
    const WITHDRAW_TOPIC_ID = TOPICS.WITHDRAW // Topic para withdrawals
    
    try {
        // Get messages from the last 30 days
        const url = `${TESTNET_MIRROR_NODE_ENDPOINT}/api/v1/topics/${WITHDRAW_TOPIC_ID}/messages?order=desc&limit=100`
        
        console.log(`⚡ Fetching instant withdrawals from topic: ${url}`)
        
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`Topic API error: ${response.status}`)
        }
        
        const data = await response.json()
        const instantWithdrawals: HistoryTransaction[] = []
        
        // Parse instant withdrawal results
        for (const msg of data.messages || []) {
            try {
                const decodedMessage = Buffer.from(msg.message, 'base64').toString('utf8')
                const parsedMessage = JSON.parse(decodedMessage)
                
                if (parsedMessage.type === 'instant_withdraw_result' && parsedMessage.user === userAccountId) {
                    // Calculate amounts based on the instant withdrawal
                    const grossUSDC = parsedMessage.amountHUSD * parsedMessage.rate
                    const fee = grossUSDC * 0.01 // 1% fee for instant withdrawals
                    
                    const historyItem: HistoryTransaction = {
                        timestamp: parsedMessage.timestamp || new Date().toISOString(),
                        type: 'instant_withdraw',
                        amountHUSD: parsedMessage.amountHUSD,
                        grossUSDC: grossUSDC,
                        fee: fee,
                        netUSDC: grossUSDC - fee,
                        rate: parsedMessage.rate,
                        status: parsedMessage.status,
                        txId: parsedMessage.txId || parsedMessage.requestId,
                        failureReason: parsedMessage.failureReason
                    }
                    
                    instantWithdrawals.push(historyItem)
                }
            } catch (parseError) {
                console.warn('Failed to parse instant withdrawal message:', parseError)
                continue
            }
        }
        
        console.log(`⚡ Found ${instantWithdrawals.length} instant withdrawals for user ${userAccountId}`)
        return instantWithdrawals
        
    } catch (error) {
        console.error('Error fetching instant withdrawals:', error)
        return []
    }
}
*/
