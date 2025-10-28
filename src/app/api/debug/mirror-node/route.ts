import { NextRequest, NextResponse } from 'next/server'

interface TokenTransfer {
    token_id: string
    transfers: Array<{
        account: string
        amount: number
    }>
}

interface Transaction {
    transaction_id: string
    consensus_timestamp: string
    result: string
    name: string
    token_transfers?: TokenTransfer[]
}

interface MirrorNodeResponse {
    transactions: Transaction[]
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const userAccountId = req.nextUrl.searchParams.get('userAccountId')
        const since = req.nextUrl.searchParams.get('since')

        if (!userAccountId || !since) {
            return NextResponse.json(
                {
                    error: 'Missing parameters',
                    required: ['userAccountId', 'since'],
                },
                { status: 400 }
            )
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
        const sinceTimestamp = new Date(since).getTime() / 1000

        const queryUrl = `${mirrorNodeUrl}/api/v1/transactions?account.id=${userAccountId}&timestamp=gte:${sinceTimestamp}&transactiontype=cryptotransfer&order=desc&limit=50`
        console.log(`🔍 Mirror Node URL:`, queryUrl)

        const response = await fetch(queryUrl)

        if (!response.ok) {
            console.log(
                `❌ Mirror Node API Error: ${response.status} ${response.statusText}`
            )
            return NextResponse.json(
                {
                    error: 'Mirror Node API error',
                    status: response.status,
                    statusText: response.statusText,
                    url: queryUrl,
                },
                { status: 500 }
            )
        }

        const data = (await response.json()) as MirrorNodeResponse
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
            transactions: transactions.map((tx: Transaction) => ({
                transaction_id: tx.transaction_id,
                consensus_timestamp: tx.consensus_timestamp,
                result: tx.result,
                name: tx.name,
                token_transfers:
                    tx.token_transfers?.map((tt: TokenTransfer) => ({
                        token_id: tt.token_id,
                        transfers: tt.transfers,
                    })) || [],
                hasHUSDTransfers:
                    tx.token_transfers?.some(
                        (tt: TokenTransfer) => tt.token_id === husdTokenId
                    ) || false,
            })),
        }

        // Look specifically for HUSD transfers
        const husdTransactions = transactions.filter((tx: Transaction) =>
            tx.token_transfers?.some(
                (tt: TokenTransfer) => tt.token_id === husdTokenId
            )
        )

        console.log(`📋 HUSD transactions found: ${husdTransactions.length}`)

        return NextResponse.json({
            success: true,
            analysis,
            husdTransactions: husdTransactions.map((tx: Transaction) => {
                const husdTransfer = tx.token_transfers?.find(
                    (tt: TokenTransfer) => tt.token_id === husdTokenId
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
        return NextResponse.json(
            {
                error: 'Internal server error',
                message:
                    error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
