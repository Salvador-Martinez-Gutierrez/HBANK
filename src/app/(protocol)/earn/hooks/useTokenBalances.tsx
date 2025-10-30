import { useQuery } from '@tanstack/react-query'
import { useWallet } from '@buidlerlabs/hashgraph-react-wallets'
import { useAccountId } from './useAccountID'
import { TOKENS } from '@/app/constants'
import { formatCurrency } from '@/lib/formatters'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'

interface TokenBalance {
    USDC: string
    hUSD: string
}

interface MirrorNodeToken {
    token_id: string
    balance: number
    decimals: number
}

interface MirrorNodeResponse {
    tokens: MirrorNodeToken[]
}

// Token IDs for USDC and hUSD on Hedera testnet
const TOKEN_IDS = {
    USDC: TOKENS.USDC, // USDC token ID on testnet (6 decimals)
    hUSD: TOKENS.HUSD, // hUSD token ID on testnet (3 decimals)
}

async function fetchTokenBalances(accountId: string): Promise<TokenBalance> {
    logger.info('🔍 [useTokenBalances] Starting fetch for accountId:', accountId)

    const mirrorNodeUrl = 'https://testnet.mirrornode.hedera.com'
    const url = `${mirrorNodeUrl}/api/v1/accounts/${accountId}/tokens`
    logger.info('🌐 [useTokenBalances] Fetching from:', url)

    const response = await fetch(url)
    logger.info('📡 [useTokenBalances] Response status:', response.status)

    if (!response.ok) {
        const responseText = await response.text()
        logger.warn('❌ [useTokenBalances] API request failed:', responseText)
        throw new Error(`Failed to fetch token balances: ${response.status}`)
    }

    const data: MirrorNodeResponse = await response.json()
    logger.info('📦 [useTokenBalances] Raw API response:', data)

    const tokenBalances: TokenBalance = {
        USDC: '0',
        hUSD: '0',
    }

    // Parse token balances from the response
    if (data.tokens && Array.isArray(data.tokens)) {
        logger.info(`📋 [useTokenBalances] Found ${data.tokens.length} tokens`)

        // Log all tokens for debugging
        data.tokens.forEach((token, index) => {
            logger.info(`  Token ${index + 1}:`, {
                token_id: token.token_id,
                balance: token.balance,
                decimals: token.decimals,
            })
        })

        for (const token of data.tokens) {
            // Check if this is USDC
            if (token.token_id === TOKEN_IDS.USDC) {
                const decimals = token.decimals
                const divisor = Math.pow(10, decimals)
                const balance = formatCurrency(token.balance / divisor, 6)
                logger.info(
                    `✅ [useTokenBalances] Found USDC: ${balance} (balance: ${token.balance}, decimals: ${decimals})`
                )
                tokenBalances.USDC = balance
            }
            // Check if this is hUSD
            else if (token.token_id === TOKEN_IDS.hUSD) {
                const decimals = token.decimals
                const divisor = Math.pow(10, decimals)
                const balance = formatCurrency(token.balance / divisor, 6)
                logger.info(
                    `✅ [useTokenBalances] Found hUSD: ${balance} (balance: ${token.balance}, decimals: ${decimals})`
                )
                tokenBalances.hUSD = balance
            }
        }

        // If no matching tokens found, log warning
        if (tokenBalances.USDC === '0' && tokenBalances.hUSD === '0') {
            logger.warn('⚠️ [useTokenBalances] No matching tokens found!')
            logger.warn('   Looking for USDC:', TOKEN_IDS.USDC)
            logger.warn('   Looking for hUSD:', TOKEN_IDS.hUSD)
        }
    } else {
        logger.warn('⚠️ [useTokenBalances] No tokens array in response')
    }

    logger.info('💰 [useTokenBalances] Final balances:', tokenBalances)
    logger.info('✨ [useTokenBalances] Fetch complete')

    return tokenBalances
}

export function useTokenBalances() {
    const { isConnected } = useWallet()
    const accountId = useAccountId()

    const {
        data: balances = { USDC: '0', hUSD: '0' },
        isLoading,
        refetch,
    } = useQuery({
        queryKey: queryKeys.tokenBalances(accountId),
        queryFn: () => fetchTokenBalances(accountId),
        enabled: isConnected && !!accountId,
        staleTime: 30 * 1000, // Fresh for 30 seconds
        refetchInterval: 60 * 1000, // Auto-refresh every 60 seconds
    })

    // Manual refresh function
    const refreshBalances = async () => {
        logger.info('🔄 [useTokenBalances] Manual refresh requested')
        logger.info('🔄 [useTokenBalances] Current isConnected:', isConnected)
        logger.info('🔄 [useTokenBalances] Current accountId:', accountId)

        if (isConnected && accountId) {
            await refetch()
        } else {
            logger.warn(
                '⚠️ [useTokenBalances] Cannot refresh: not connected or no accountId'
            )
        }
    }

    return { balances, loading: isLoading, refreshBalances }
}
