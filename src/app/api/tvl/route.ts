import { NextRequest, NextResponse } from 'next/server'
import { HederaService } from '@/services/hederaService'
import { createScopedLogger } from '@/lib/logger'

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

        const hederaService = new HederaService()
        const usdcTokenId = process.env.USDC_TOKEN_ID ?? ''

        // Get USDC balances from the 3 wallets that hold USDC
        const [
            instantWithdrawBalance,
            standardWithdrawBalance,
            depositsBalance,
        ] = await Promise.all([
            // Instant withdraw wallet
            hederaService.checkBalance(
                process.env.INSTANT_WITHDRAW_WALLET_ID ?? '',
                usdcTokenId
            ),
            // Standard withdraw wallet
            hederaService.checkBalance(
                process.env.STANDARD_WITHDRAW_WALLET_ID ?? '',
                usdcTokenId
            ),
            // Deposits wallet
            hederaService.checkBalance(
                process.env.DEPOSIT_WALLET_ID ?? '',
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
