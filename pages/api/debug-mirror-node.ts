import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { userAccountId, since } = req.query

        if (!userAccountId || !since) {
            return res.status(400).json({
                error: 'Missing parameters',
                required: ['userAccountId', 'since'],
            })
        }

        const husdTokenId = process.env.HUSD_TOKEN_ID
        const treasuryId = process.env.HEDERA_ACCOUNT_ID

        console.log(`🔍 Debug Mirror Node Query:`)
        console.log(`   User Account: ${userAccountId}`)
        console.log(`   Treasury: ${treasuryId}`)
        console.log(`   HUSD Token: ${husdTokenId}`)
        console.log(`   Since: ${since}`)

        // Query Mirror Node for token transfers
        const mirrorNodeUrl =
            process.env.TESTNET_MIRROR_NODE_ENDPOINT ||
            'https://testnet.mirrornode.hedera.com'
        const sinceTimestamp = new Date(since as string).getTime() / 1000

        const queryUrl = `${mirrorNodeUrl}/api/v1/transactions?account.id=${userAccountId}&timestamp=gte:${sinceTimestamp}&transactiontype=cryptotransfer&order=desc&limit=50`
        console.log(`🔍 Mirror Node URL:`, queryUrl)

        const response = await fetch(queryUrl)

        if (!response.ok) {
            console.log(
                `❌ Mirror Node API Error: ${response.status} ${response.statusText}`
            )
            return res.status(500).json({
                error: 'Mirror Node API error',
                status: response.status,
                statusText: response.statusText,
                url: queryUrl,
            })
        }

        const data = await response.json()
        const transactions = data.transactions || []

        console.log(`📋 Found ${transactions.length} transactions`)

        // Process and analyze transactions
        const analysis = {
            totalTransactions: transactions.length,
            queryUrl,
            parameters: {
                userAccountId,
                treasuryId,
                husdTokenId,
                since,
                sinceTimestamp,
            },
            transactions: transactions.map((tx: any) => ({
                transaction_id: tx.transaction_id,
                consensus_timestamp: tx.consensus_timestamp,
                result: tx.result,
                name: tx.name,
                token_transfers:
                    tx.token_transfers?.map((tt: any) => ({
                        token_id: tt.token_id,
                        transfers: tt.transfers,
                    })) || [],
                hasHUSDTransfers:
                    tx.token_transfers?.some(
                        (tt: any) => tt.token_id === husdTokenId
                    ) || false,
            })),
        }

        // Look specifically for HUSD transfers
        const husdTransactions = transactions.filter((tx: any) =>
            tx.token_transfers?.some((tt: any) => tt.token_id === husdTokenId)
        )

        console.log(`📋 HUSD transactions found: ${husdTransactions.length}`)

        res.status(200).json({
            success: true,
            analysis,
            husdTransactions: husdTransactions.map((tx: any) => {
                const husdTransfer = tx.token_transfers.find(
                    (tt: any) => tt.token_id === husdTokenId
                )
                return {
                    transaction_id: tx.transaction_id,
                    consensus_timestamp: tx.consensus_timestamp,
                    husd_transfers: husdTransfer?.transfers || [],
                }
            }),
            rawData: data,
        })
    } catch (error) {
        console.error('❌ Debug API Error:', error)
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        })
    }
}
