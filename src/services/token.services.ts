'use client'

import { TOKENS } from '@/app/constants'
import { createScopedLogger } from '@/lib/logger'

const logger = createScopedLogger('service:token.services')


interface TokenRelationship {
    automatic_association: boolean
    balance: number
    created_timestamp: number
    freeze_status: 'FROZEN' | 'UNFROZEN'
    kyc_status: 'GRANTED' | 'REVOKED' | 'NOT_APPLICABLE'
    token_id: string
}

interface TokenRelationshipsResponse {
    tokens: TokenRelationship[]
    links?: {
        next?: string
    }
}

/**
 * Checks if an account has the hUSD token associated
 * @param accountId - The Hedera account ID (e.g., "0.0.123456")
 * @returns Promise<boolean> - True if token is associated, false otherwise
 */
export async function checkTokenAssociation(
    accountId: string
): Promise<boolean> {
    try {
        // Use the standard Hedera mirror node endpoint (same as useTokenBalances)
        const url = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}/tokens?token.id=${TOKENS.HUSD}`

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
        })

        if (!response.ok) {
            logger.error(
                `Failed to fetch token relationships: ${response.status} ${response.statusText}`
            )
            return false
        }

        const data: TokenRelationshipsResponse = await response.json()

        // Check if hUSD token is in the relationships
        const hasTokenAssociation = data.tokens.some(
            (token) => token.token_id === TOKENS.HUSD
        )

        return hasTokenAssociation
    } catch (error) {
        logger.error('Error checking token association:', error)
        return false
    }
}

interface NormalizedBalances {
    hbar: string
    usdc: string
    husd: string
    husdValueUsd: string
    rate: string
}

/**
 * Fetches HBAR, USDC and hUSD balances for a given account using the Validation Cloud Mirror Node
 */
export async function fetchAccountBalances(
    accountId: string
): Promise<NormalizedBalances> {
    if (!accountId) {
        return {
            hbar: '0.00',
            usdc: '0.00',
            husd: '0.00',
            husdValueUsd: '0.00',
            rate: '1',
        }
    }

    try {
        const url = `/api/account-balances?accountId=${encodeURIComponent(
            accountId
        )}`
        const res = await fetch(url)
        if (!res.ok) {
            return {
                hbar: '0.00',
                usdc: '0.00',
                husd: '0.00',
                husdValueUsd: '0.00',
                rate: '1',
            }
        }
        const data = await res.json()
        return data as NormalizedBalances
    } catch {
        return {
            hbar: '0',
            usdc: '0.00',
            husd: '0.00',
            husdValueUsd: '0.00',
            rate: '1',
        }
    }
}
