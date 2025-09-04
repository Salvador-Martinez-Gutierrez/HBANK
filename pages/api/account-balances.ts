import { NextApiRequest, NextApiResponse } from 'next'

// Function to get the latest rate from the topic
async function getLatestRate(): Promise<number> {
    try {
        const topicId = process.env.TOPIC_ID || '0.0.6626120'
        const mirrorNodeUrl = 'https://testnet.mirrornode.hedera.com'
        const url = `${mirrorNodeUrl}/api/v1/topics/${topicId}/messages?limit=1&order=desc`

        console.log(
            '📡 [account-balances] Fetching latest rate from topic:',
            url
        )

        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(
                `Failed to fetch topic messages: ${response.status}`
            )
        }

        const data = await response.json()

        if (!data.messages || data.messages.length === 0) {
            console.warn(
                '⚠️ [account-balances] No messages found in topic, using default rate'
            )
            return 1.0 // Default rate if no messages
        }

        const latestMessage = data.messages[0]
        const messageContent = Buffer.from(
            latestMessage.message,
            'base64'
        ).toString('utf-8')

        console.log(
            '📨 [account-balances] Latest topic message:',
            messageContent
        )

        // Parse the rate from the message
        const rateData = JSON.parse(messageContent)
        const rate = parseFloat(rateData.rate)

        console.log('📊 [account-balances] Parsed rate:', rate)

        return rate || 1.0
    } catch (error) {
        console.error('❌ [account-balances] Error fetching rate:', error)
        return 1.0 // Default rate on error
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const accountId = (req.query.accountId as string) || ''
    if (!accountId) {
        return res.status(400).json({ error: 'accountId is required' })
    }

    try {
        console.log(
            '📡 [account-balances] Fetching balances for account:',
            accountId
        )

        // Get the latest rate from the topic first
        const latestRate = await getLatestRate()
        console.log('📊 [account-balances] Using rate:', latestRate)

        // Try Validation Cloud first, then fallback to standard mirror node
        let data
        let dataSource = 'validation-cloud'

        const apiKey = process.env.VALIDATION_CLOUD_API_KEY

        if (apiKey) {
            try {
                const baseUrl =
                    process.env.VALIDATION_CLOUD_BASE_URL ||
                    'https://testnet.hedera.validationcloud.io/v1'
                const url = `${baseUrl}/${apiKey}/api/v1/accounts/${accountId}`
                console.log(
                    '📡 [account-balances] Trying Validation Cloud:',
                    url
                )

                const response = await fetch(url)
                if (!response.ok) {
                    throw new Error(
                        `Validation Cloud error: ${response.status} ${response.statusText}`
                    )
                }

                data = await response.json()
                console.log(
                    '✅ [account-balances] Validation Cloud response:',
                    data
                )
            } catch (validationCloudError) {
                console.warn(
                    '⚠️ [account-balances] Validation Cloud failed:',
                    validationCloudError
                )
                // Fall through to standard mirror node
            }
        }

        // Fallback to standard Hedera mirror node
        if (!data) {
            dataSource = 'standard-mirror'
            const url = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`
            console.log(
                '📡 [account-balances] Trying standard mirror node:',
                url
            )

            const response = await fetch(url)
            if (!response.ok) {
                throw new Error(
                    `Standard mirror node error: ${response.status} ${response.statusText}`
                )
            }

            data = await response.json()
            console.log(
                '✅ [account-balances] Standard mirror node response:',
                data
            )
        }

        console.log(`📊 [account-balances] Using data source: ${dataSource}`)

        const tinybar = data?.balance?.balance ?? 0
        const hbar = (tinybar / 100000000).toFixed(2)

        let usdc = '0.00'
        let husd = '0.00'

        const TOKEN_IDS = {
            USDC: process.env.USDC_TOKEN_ID || '0.0.429274',
            hUSD: process.env.HUSD_TOKEN_ID || '0.0.6624255',
        } as const

        const DECIMALS_BY_TOKEN_ID: Record<string, number> = {
            [TOKEN_IDS.USDC]: 6,
            [TOKEN_IDS.hUSD]: 8,
        }

        console.log('🔍 [account-balances] Using token IDs:', TOKEN_IDS)

        let tokens = Array.isArray(data?.balance?.tokens)
            ? data.balance.tokens
            : Array.isArray(data?.tokens)
            ? data.tokens
            : []

        console.log(
            '🔍 [account-balances] Found tokens in account data:',
            tokens.length
        )

        // If no tokens found in account data, try the tokens endpoint
        if (tokens.length === 0 && dataSource === 'standard-mirror') {
            try {
                const tokensUrl = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}/tokens`
                console.log(
                    '📡 [account-balances] Fetching tokens separately:',
                    tokensUrl
                )

                const tokensResponse = await fetch(tokensUrl)
                if (tokensResponse.ok) {
                    const tokensData = await tokensResponse.json()
                    tokens = tokensData.tokens || []
                    console.log(
                        '🔍 [account-balances] Found tokens from tokens endpoint:',
                        tokens.length
                    )
                }
            } catch (tokensError) {
                console.warn(
                    '⚠️ [account-balances] Failed to fetch tokens separately:',
                    tokensError
                )
            }
        }

        console.log('🔍 [account-balances] Processing', tokens.length, 'tokens')

        for (const t of tokens) {
            console.log('🔍 [account-balances] Processing token:', {
                token_id: t.token_id,
                balance: t.balance,
                decimals: t.decimals,
            })

            if (t.token_id === TOKEN_IDS.USDC) {
                const decimals =
                    typeof t.decimals === 'number'
                        ? t.decimals
                        : DECIMALS_BY_TOKEN_ID[TOKEN_IDS.USDC]
                usdc = (t.balance / Math.pow(10, decimals)).toFixed(2)
                console.log('💰 [account-balances] USDC found:', usdc)
            }
            if (t.token_id === TOKEN_IDS.hUSD) {
                const decimals =
                    typeof t.decimals === 'number'
                        ? t.decimals
                        : DECIMALS_BY_TOKEN_ID[TOKEN_IDS.hUSD]
                husd = (t.balance / Math.pow(10, decimals)).toFixed(2)
                console.log('💰 [account-balances] hUSD found:', husd)
            }
        }

        const result = {
            hbar,
            usdc,
            husd,
            husdValueUsd: (parseFloat(husd) * latestRate).toFixed(2),
            rate: latestRate.toString(),
        }
        console.log('✅ [account-balances] Final result:', result)

        return res.status(200).json(result)
    } catch (err) {
        console.error('❌ [account-balances] Error:', err)

        // More specific error handling
        const errorMessage =
            err instanceof Error ? err.message : 'Unknown error'
        const errorDetails = {
            error: 'Failed to fetch account balances',
            details: errorMessage,
            accountId,
            timestamp: new Date().toISOString(),
        }

        console.error('❌ [account-balances] Error details:', errorDetails)
        return res.status(500).json(errorDetails)
    }
}
