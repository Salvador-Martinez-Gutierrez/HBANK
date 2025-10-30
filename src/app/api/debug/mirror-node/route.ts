import { NextRequest, NextResponse } from 'next/server'
import { createScopedLogger } from '@/lib/logger'
import { serverEnv } from '@/config/serverEnv'

const logger = createScopedLogger('api:debug:mirror-node')

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

        const husdTokenId = serverEnv.tokens.husd.tokenId
        const treasuryId = serverEnv.operators.treasury?.accountId ?? ''

        logger.info('Debug Mirror Node Query', {
            userAccount: userAccountId,
            treasury: treasuryId,
            husdToken: husdTokenId,
            since,
        })

        // Query Mirror Node for token transfers
        const mirrorNodeUrl = serverEnv.hedera.mirrorNodeUrl
        const sinceTimestamp = new Date(since).getTime() / 1000

        const queryUrl = `${mirrorNodeUrl}/api/v1/transactions?account.id=${userAccountId}&timestamp=gte:${sinceTimestamp}&transactiontype=cryptotransfer&order=desc&limit=50`
        logger.info('Mirror Node URL', { queryUrl })

        const response = await fetch(queryUrl)

        if (!response.ok) {
            logger.error('Mirror Node API Error', {
                status: response.status,
                statusText: response.statusText,
            })
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
        const transactions = data.transactions ?? []

        logger.info('Found transactions', { count: transactions.length })

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
                    })) ?? [],
                hasHUSDTransfers:
                    tx.token_transfers?.some(
                        (tt: TokenTransfer) => tt.token_id === husdTokenId
                    ) ?? false,
            })),
        }

        // Look specifically for HUSD transfers
        const husdTransactions = transactions.filter((tx: Transaction) =>
            tx.token_transfers?.some(
                (tt: TokenTransfer) => tt.token_id === husdTokenId
            )
        )

        logger.info('HUSD transactions found', {
            count: husdTransactions.length,
        })

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
                    husd_transfers: husdTransfer?.transfers ?? [],
                }
            }),
            rawData: data,
        })
    } catch (error) {
        logger.error('Debug API Error', {
            error: error instanceof Error ? error.message : String(error),
        })
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
