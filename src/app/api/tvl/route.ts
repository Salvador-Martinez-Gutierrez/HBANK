import { NextRequest, NextResponse } from 'next/server'
import { HederaService } from '@/services/hederaService'

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
        console.log('📊 Calculating TVL from wallet balances...')

        const hederaService = new HederaService()
        const usdcTokenId = process.env.USDC_TOKEN_ID!

        // Get USDC balances from the 3 wallets that hold USDC
        const [
            instantWithdrawBalance,
            standardWithdrawBalance,
            depositsBalance,
        ] = await Promise.all([
            // Instant withdraw wallet
            hederaService.checkBalance(
                process.env.INSTANT_WITHDRAW_WALLET_ID!,
                usdcTokenId
            ),
            // Standard withdraw wallet
            hederaService.checkBalance(
                process.env.STANDARD_WITHDRAW_WALLET_ID!,
                usdcTokenId
            ),
            // Deposits wallet
            hederaService.checkBalance(
                process.env.DEPOSIT_WALLET_ID!,
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

        console.log('💰 TVL Calculation:', {
            'Instant Withdraw USDC': instantWithdrawBalance,
            'Standard Withdraw USDC': standardWithdrawBalance,
            'Deposits USDC': depositsBalance,
            'Total TVL': tvl,
        })

        return NextResponse.json({
            tvl,
            breakdown,
            lastUpdated: new Date().toISOString(),
        } as TVLResponse)
    } catch (error) {
        console.error('❌ Error calculating TVL:', error)
        return NextResponse.json(
            {
                error: 'Failed to calculate TVL',
            },
            { status: 500 }
        )
    }
}
