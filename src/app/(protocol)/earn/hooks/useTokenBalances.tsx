import { useEffect, useState, useCallback } from 'react'
import { useWallet } from '@buidlerlabs/hashgraph-react-wallets'
import { useAccountId } from './useAccountID'
import { TOKENS } from '@/app/constants'
import { formatCurrency } from '@/lib/formatters'
import { logger } from '@/lib/logger'


interface TokenBalance {
    USDC: string
    hUSD: string
}

// Token IDs for USDC and hUSD on Hedera testnet
// These should be configured in environment variables in production
const TOKEN_IDS = {
    USDC: TOKENS.USDC, // USDC token ID on testnet (6 decimals)
    hUSD: TOKENS.HUSD, // hUSD token ID on testnet (3 decimals)
}

export function useTokenBalances() {
    const [balances, setBalances] = useState<TokenBalance>({
        USDC: '0',
        hUSD: '0',
    })
    const [loading, setLoading] = useState(false)
    const { isConnected } = useWallet()
    const accountId = useAccountId()

    const fetchBalances = useCallback(async () => {
        logger.info('🔍 [useTokenBalances] Starting fetch...')
        logger.info('🔍 [useTokenBalances] isConnected:', isConnected)
        logger.info('🔍 [useTokenBalances] accountId:', accountId)

        if (!isConnected || !accountId) {
            logger.info(
                '⚠️ [useTokenBalances] Not connected or no accountId, resetting balances'
            )
            setBalances({
                USDC: '0',
                hUSD: '0',
            })
            return
        }

        setLoading(true)
        try {
            // Fetch token balances from Hedera mirror node
            const mirrorNodeUrl = 'https://testnet.mirrornode.hedera.com'
            const url = `${mirrorNodeUrl}/api/v1/accounts/${accountId}/tokens`
            logger.info('🌐 [useTokenBalances] Fetching from:', url)

            const response = await fetch(url)
            logger.info(
                '📡 [useTokenBalances] Response status:',
                response.status
            )

            if (response.ok) {
                const data = await response.json()
                logger.info('📦 [useTokenBalances] Raw API response:', data)

                const tokenBalances: TokenBalance = {
                    USDC: '0',
                    hUSD: '0',
                }

                // Parse token balances from the response
                if (data.tokens && Array.isArray(data.tokens)) {
                    logger.info(
                        `📋 [useTokenBalances] Found ${data.tokens.length} tokens`
                    )

                    // Log all tokens for debugging
                    data.tokens.forEach(
                        (
                            token: {
                                token_id: string
                                balance: number
                                decimals: number
                            },
                            index: number
                        ) => {
                            logger.info(`  Token ${index + 1}:`, {
                                token_id: token.token_id,
                                balance: token.balance,
                                decimals: token.decimals,
                            })
                        }
                    )

                    for (const token of data.tokens) {
                        // Check if this is USDC
                        if (token.token_id === TOKEN_IDS.USDC) {
                            const decimals = token.decimals
                            const divisor = Math.pow(10, decimals)
                            const balance = formatCurrency(
                                token.balance / divisor,
                                6
                            )
                            logger.info(
                                `✅ [useTokenBalances] Found USDC: ${balance} (balance: ${token.balance}, decimals: ${decimals})`
                            )
                            tokenBalances.USDC = balance
                        }
                        // Check if this is hUSD
                        else if (token.token_id === TOKEN_IDS.hUSD) {
                            const decimals = token.decimals
                            const divisor = Math.pow(10, decimals)
                            const balance = formatCurrency(
                                token.balance / divisor,
                                6
                            )
                            logger.info(
                                `✅ [useTokenBalances] Found hUSD: ${balance} (balance: ${token.balance}, decimals: ${decimals})`
                            )
                            tokenBalances.hUSD = balance
                        }
                    }

                    // If no matching tokens found, log warning
                    if (
                        tokenBalances.USDC === '0' &&
                        tokenBalances.hUSD === '0'
                    ) {
                        logger.warn(
                            '⚠️ [useTokenBalances] No matching tokens found!'
                        )
                        logger.warn('   Looking for USDC:', TOKEN_IDS.USDC)
                        logger.warn('   Looking for hUSD:', TOKEN_IDS.hUSD)
                    }
                } else {
                    logger.warn(
                        '⚠️ [useTokenBalances] No tokens array in response'
                    )
                }

                logger.info(
                    '💰 [useTokenBalances] Final balances:',
                    tokenBalances
                )
                logger.info(
                    '📊 [useTokenBalances] USDC balance updated to:',
                    tokenBalances.USDC
                )
                logger.info(
                    '📊 [useTokenBalances] hUSD balance updated to:',
                    tokenBalances.hUSD
                )

                // Log previous vs new balances for comparison
                logger.info('🔄 [useTokenBalances] Balance comparison:')
                logger.info(
                    '   Previous USDC:',
                    balances.USDC,
                    '→ New USDC:',
                    tokenBalances.USDC
                )
                logger.info(
                    '   Previous hUSD:',
                    balances.hUSD,
                    '→ New hUSD:',
                    tokenBalances.hUSD
                )

                setBalances(tokenBalances)
                logger.info('✅ [useTokenBalances] State updated successfully')
            } else {
                // If API fails, use mock data for demonstration
                logger.warn(
                    `❌ [useTokenBalances] API request failed with status: ${response.status}`
                )
                const responseText = await response.text()
                logger.warn('   Response:', responseText)
            }
        } catch (error) {
            logger.error(
                '❌ [useTokenBalances] Error fetching token balances:',
                error
            )
        } finally {
            setLoading(false)
            logger.info('✨ [useTokenBalances] Fetch complete')
        }
    }, [isConnected, accountId, balances.USDC, balances.hUSD])

    // Refresh function that can be called externally
    const refreshBalances = useCallback(async () => {
        logger.info('🔄 [useTokenBalances] Manual refresh requested')
        logger.info('🔄 [useTokenBalances] Current isConnected:', isConnected)
        logger.info('🔄 [useTokenBalances] Current accountId:', accountId)

        // Force a fresh fetch regardless of current state
        if (isConnected && accountId) {
            await fetchBalances()
        } else {
            logger.warn(
                '⚠️ [useTokenBalances] Cannot refresh: not connected or no accountId'
            )
        }
    }, [fetchBalances, isConnected, accountId])

    useEffect(() => {
        void fetchBalances()
    }, [fetchBalances])

    return { balances, loading, refreshBalances }
}
