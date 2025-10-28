import { NextRequest, NextResponse } from 'next/server'
import { TOKENS, RATES_TOPIC_ID } from '@/app/backend-constants'

import { createScopedLogger } from '@/lib/logger'

const logger = createScopedLogger('api:account-balances')
// Function to get the latest rate from the topic
async function getLatestRate(): Promise<number> {
    try {
        const topicId = process.env.TOPIC_ID ?? RATES_TOPIC_ID
        const mirrorNodeUrl = 'https://testnet.mirrornode.hedera.com'
        const url = `${mirrorNodeUrl}/api/v1/topics/${topicId}/messages?limit=1&order=desc`

        logger.info(
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
            logger.warn(
                '⚠️ [account-balances] No messages found in topic, using default rate'
            )
            return 1.0 // Default rate if no messages
        }

        const latestMessage = data.messages[0]
        const messageContent = Buffer.from(
            latestMessage.message,
            'base64'
        ).toString('utf-8')

        logger.info(
            '📨 [account-balances] Latest topic message:',
            messageContent
        )

        // Parse the rate from the message
        const rateData = JSON.parse(messageContent)
        const rate = parseFloat(rateData.rate)

        logger.info('📊 [account-balances] Parsed rate:', rate)

        return rate ?? 1.0
    } catch (error) {
        logger.error('❌ [account-balances] Error fetching rate:', error)
        return 1.0 // Default rate on error
    }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    const accountId = req.nextUrl.searchParams.get('accountId') ?? ''
    if (!accountId) {
        return NextResponse.json(
            { error: 'accountId is required' },
            { status: 400 }
        )
    }

    try {
        logger.info(
            '📡 [account-balances] Fetching balances for account:',
            accountId
        )

        // Get the latest rate from the topic first
        const latestRate = await getLatestRate()
        logger.info('📊 [account-balances] Using rate:', latestRate)

        // Try Validation Cloud first, then fallback to standard mirror node
        let data
        let dataSource = 'validation-cloud'

        const apiKey = process.env.VALIDATION_CLOUD_API_KEY

        if (apiKey) {
            try {
                const baseUrl =
                    process.env.VALIDATION_CLOUD_BASE_URL ??
                    'https://testnet.hedera.validationcloud.io/v1'
                const url = `${baseUrl}/${apiKey}/api/v1/accounts/${accountId}`
                logger.info(
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
                logger.info(
                    '✅ [account-balances] Validation Cloud response:',
                    data
                )
            } catch (validationCloudError) {
                logger.warn(
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
            logger.info(
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
            logger.info(
                '✅ [account-balances] Standard mirror node response:',
                data
            )
        }

        logger.info(`📊 [account-balances] Using data source: ${dataSource}`)

        const tinybar = data?.balance?.balance ?? 0
        const HBAR_MULTIPLIER = Math.pow(
            10,
            parseInt(process.env.HBAR_DECIMALS ?? '8')
        )
        // Use higher precision for HBAR as well for consistency
        const hbarBalance = tinybar / HBAR_MULTIPLIER
        const hbar = hbarBalance.toFixed(6).replace(/\.?0+$/, '')

        let usdc = '0.00'
        let husd = '0.00'

        const TOKEN_IDS = {
            USDC: process.env.USDC_TOKEN_ID ?? TOKENS.usdc,
            hUSD: process.env.HUSD_TOKEN_ID ?? TOKENS.husd,
        } as const

        const DECIMALS_BY_TOKEN_ID: Record<string, number> = {
            [TOKEN_IDS.USDC]: 6,
            [TOKEN_IDS.hUSD]: 3, // Updated to 3 decimals
        }

        logger.info('🔍 [account-balances] Using token IDs:', TOKEN_IDS)

        let tokens = Array.isArray(data?.balance?.tokens)
            ? data.balance.tokens
            : Array.isArray(data?.tokens)
            ? data.tokens
            : []

        logger.info(
            '🔍 [account-balances] Found tokens in account data:',
            tokens.length
        )

        // If no tokens found in account data, try the tokens endpoint
        if (tokens.length === 0 && dataSource === 'standard-mirror') {
            try {
                const tokensUrl = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}/tokens`
                logger.info(
                    '📡 [account-balances] Fetching tokens separately:',
                    tokensUrl
                )

                const tokensResponse = await fetch(tokensUrl)
                if (tokensResponse.ok) {
                    const tokensData = await tokensResponse.json()
                    tokens = tokensData.tokens ?? []
                    logger.info(
                        '🔍 [account-balances] Found tokens from tokens endpoint:',
                        tokens.length
                    )
                }
            } catch (tokensError) {
                logger.warn(
                    '⚠️ [account-balances] Failed to fetch tokens separately:',
                    tokensError
                )
            }
        }

        logger.info('🔍 [account-balances] Processing', tokens.length, 'tokens')

        for (const t of tokens) {
            logger.info('🔍 [account-balances] Processing token:', {
                token_id: t.token_id,
                balance: t.balance,
                decimals: t.decimals,
            })

            if (t.token_id === TOKEN_IDS.USDC) {
                const decimals =
                    typeof t.decimals === 'number'
                        ? t.decimals
                        : DECIMALS_BY_TOKEN_ID[TOKEN_IDS.USDC]
                // Use higher precision to avoid rounding issues
                const balance = t.balance / Math.pow(10, decimals)
                usdc = balance.toFixed(6).replace(/\.?0+$/, '')
                logger.info('💰 [account-balances] USDC found:', usdc)
            }
            if (t.token_id === TOKEN_IDS.hUSD) {
                const decimals =
                    typeof t.decimals === 'number'
                        ? t.decimals
                        : DECIMALS_BY_TOKEN_ID[TOKEN_IDS.hUSD]
                // Use higher precision to avoid rounding issues
                const balance = t.balance / Math.pow(10, decimals)
                husd = balance.toFixed(6).replace(/\.?0+$/, '')
                logger.info('💰 [account-balances] hUSD found:', husd)
            }
        }

        const result = {
            hbar,
            usdc,
            husd,
            husdValueUsd: (parseFloat(husd) * latestRate)
                .toFixed(6)
                .replace(/\.?0+$/, ''),
            rate: latestRate.toString(),
        }
        logger.info('✅ [account-balances] Final result:', result)

        return NextResponse.json(result)
    } catch (err) {
        logger.error('❌ [account-balances] Error:', err)

        // More specific error handling
        const errorMessage =
            err instanceof Error ? err.message : 'Unknown error'
        const errorDetails = {
            error: 'Failed to fetch account balances',
            details: errorMessage,
            accountId,
            timestamp: new Date().toISOString(),
        }

        logger.error('❌ [account-balances] Error details:', errorDetails)
        return NextResponse.json(errorDetails, { status: 500 })
    }
}
