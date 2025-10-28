import { NextApiRequest, NextApiResponse } from 'next'
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

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<TVLResponse | { error: string }>
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

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

        res.status(200).json({
            tvl,
            breakdown,
            lastUpdated: new Date().toISOString(),
        })
    } catch (error) {
        console.error('❌ Error calculating TVL:', error)
        res.status(500).json({
            error: 'Failed to calculate TVL',
        })
    }
}
