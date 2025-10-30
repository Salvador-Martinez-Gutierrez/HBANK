import { NextRequest, NextResponse } from 'next/server'
import { createScopedLogger } from '@/lib/logger'
import { container } from '@/core/di/container'
import { TYPES } from '@/core/di/types'
import { HederaBalanceService } from '@/infrastructure/hedera'
import { serverEnv } from '@/config/serverEnv'

const logger = createScopedLogger('api:tvl')

interface TVLResponse {
    tvl: number
    breakdown: {
        instantWithdraw: number
        standardWithdraw: number
        deposits: number
    }
    lastUpdated: string
}

export async function GET(_req: NextRequest): Promise<NextResponse> {
    try {
        logger.info('Calculating TVL from wallet balances')

        // Get HederaBalanceService from DI container
        const balanceService = container.get<HederaBalanceService>(TYPES.HederaBalanceService)
        const usdcTokenId = serverEnv.tokens.usdc.tokenId

        // Get USDC balances from the 3 wallets that hold USDC
        const [
            instantWithdrawBalance,
            standardWithdrawBalance,
            depositsBalance,
        ] = await Promise.all([
            // Instant withdraw wallet
            balanceService.checkBalance(
                serverEnv.operators.instantWithdraw.accountId,
                usdcTokenId
            ),
            // Standard withdraw wallet
            balanceService.checkBalance(
                serverEnv.operators.standardWithdraw?.accountId ?? '',
                usdcTokenId
            ),
            // Deposits wallet
            balanceService.checkBalance(
                serverEnv.operators.deposit.accountId,
                usdcTokenId
            ),
        ])

        const breakdown = {
            instantWithdraw: instantWithdrawBalance,
            standardWithdraw: standardWithdrawBalance,
            deposits: depositsBalance,
        }

        // Calculate total TVL
        const tvl =
            instantWithdrawBalance + standardWithdrawBalance + depositsBalance

        logger.info('TVL calculation complete', {
            instantWithdrawUSDC: instantWithdrawBalance,
            standardWithdrawUSDC: standardWithdrawBalance,
            depositsUSDC: depositsBalance,
            totalTVL: tvl,
        })

        return NextResponse.json({
            tvl,
            breakdown,
            lastUpdated: new Date().toISOString(),
        } as TVLResponse)
    } catch (error) {
        logger.error('Error calculating TVL', {
            error: error instanceof Error ? error.message : String(error),
        })
        return NextResponse.json(
            {
                error: 'Failed to calculate TVL',
            },
            { status: 500 }
        )
    }
}
