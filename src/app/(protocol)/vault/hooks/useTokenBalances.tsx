import { useEffect, useState, useCallback } from 'react'
import { useWallet } from '@buidlerlabs/hashgraph-react-wallets'
import { useAccountId } from './useAccountID'

interface TokenBalance {
    USDC: string
    hUSD: string
}

// Token IDs for USDC and hUSD on Hedera testnet
// These should be configured in environment variables in production
const TOKEN_IDS = {
    USDC: '0.0.429274', // USDC token ID on testnet (6 decimals)
    hUSD: '0.0.6624255', // hUSD token ID on testnet (8 decimals)
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
        console.log('🔍 [useTokenBalances] Starting fetch...')
        console.log('🔍 [useTokenBalances] isConnected:', isConnected)
        console.log('🔍 [useTokenBalances] accountId:', accountId)

        if (!isConnected || !accountId) {
            console.log(
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
            console.log('🌐 [useTokenBalances] Fetching from:', url)

            const response = await fetch(url)
            console.log(
                '📡 [useTokenBalances] Response status:',
                response.status
            )

            if (response.ok) {
                const data = await response.json()
                console.log('📦 [useTokenBalances] Raw API response:', data)

                const tokenBalances: TokenBalance = {
                    USDC: '0',
                    hUSD: '0',
                }

                // Parse token balances from the response
                if (data.tokens && Array.isArray(data.tokens)) {
                    console.log(
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
                            console.log(`  Token ${index + 1}:`, {
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
                            const balance = (token.balance / divisor).toFixed(2)
                            console.log(
                                `✅ [useTokenBalances] Found USDC: ${balance} (balance: ${token.balance}, decimals: ${decimals})`
                            )
                            tokenBalances.USDC = balance
                        }
                        // Check if this is hUSD
                        else if (token.token_id === TOKEN_IDS.hUSD) {
                            const decimals = token.decimals
                            const divisor = Math.pow(10, decimals)
                            const balance = (token.balance / divisor).toFixed(2)
                            console.log(
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
                        console.warn(
                            '⚠️ [useTokenBalances] No matching tokens found!'
                        )
                        console.warn('   Looking for USDC:', TOKEN_IDS.USDC)
                        console.warn('   Looking for hUSD:', TOKEN_IDS.hUSD)
                    }
                } else {
                    console.warn(
                        '⚠️ [useTokenBalances] No tokens array in response'
                    )
                }

                console.log(
                    '💰 [useTokenBalances] Final balances:',
                    tokenBalances
                )
                console.log(
                    '📊 [useTokenBalances] USDC balance updated to:',
                    tokenBalances.USDC
                )
                console.log(
                    '📊 [useTokenBalances] hUSD balance updated to:',
                    tokenBalances.hUSD
                )

                // Log previous vs new balances for comparison
                console.log('🔄 [useTokenBalances] Balance comparison:')
                console.log(
                    '   Previous USDC:',
                    balances.USDC,
                    '→ New USDC:',
                    tokenBalances.USDC
                )
                console.log(
                    '   Previous hUSD:',
                    balances.hUSD,
                    '→ New hUSD:',
                    tokenBalances.hUSD
                )

                setBalances(tokenBalances)
                console.log('✅ [useTokenBalances] State updated successfully')
            } else {
                // If API fails, use mock data for demonstration
                console.warn(
                    `❌ [useTokenBalances] API request failed with status: ${response.status}`
                )
                const responseText = await response.text()
                console.warn('   Response:', responseText)
            }
        } catch (error) {
            console.error(
                '❌ [useTokenBalances] Error fetching token balances:',
                error
            )
        } finally {
            setLoading(false)
            console.log('✨ [useTokenBalances] Fetch complete')
        }
    }, [isConnected, accountId])

    // Refresh function that can be called externally
    const refreshBalances = useCallback(async () => {
        console.log('🔄 [useTokenBalances] Manual refresh requested')
        console.log('🔄 [useTokenBalances] Current isConnected:', isConnected)
        console.log('🔄 [useTokenBalances] Current accountId:', accountId)

        // Force a fresh fetch regardless of current state
        if (isConnected && accountId) {
            await fetchBalances()
        } else {
            console.warn(
                '⚠️ [useTokenBalances] Cannot refresh: not connected or no accountId'
            )
        }
    }, [fetchBalances, isConnected, accountId])

    useEffect(() => {
        fetchBalances()
    }, [fetchBalances])

    return { balances, loading, refreshBalances }
}
