import { NextApiRequest, NextApiResponse } from 'next'
import { HederaService } from '@/services/hederaService'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        console.log('📊 Getting maximum instant withdrawable amount...')

        const instantWithdrawWalletId = process.env.INSTANT_WITHDRAW_WALLET_ID
        const usdcTokenId = process.env.USDC_TOKEN_ID

        if (!instantWithdrawWalletId || !usdcTokenId) {
            console.error('❌ Missing required environment variables')
            return res.status(500).json({
                error: 'Server configuration error',
            })
        }

        const hederaService = new HederaService()

        // Get instant withdraw wallet USDC balance
        const instantWithdrawUSDCBalance = await hederaService.checkBalance(
            instantWithdrawWalletId,
            usdcTokenId
        )

        console.log(`💰 Instant Withdraw Wallet USDC balance: ${instantWithdrawUSDCBalance}`)

        // The maximum instant withdrawable is the current instant withdraw wallet balance
        // This ensures we never allow instant withdrawals beyond what we can immediately fulfill
        const maxInstantWithdrawable = instantWithdrawUSDCBalance

        console.log(
            `✅ Maximum instant withdrawable: ${maxInstantWithdrawable} USDC`
        )

        return res.status(200).json({
            maxInstantWithdrawable,
            treasuryBalance: instantWithdrawUSDCBalance,
        })
    } catch (error) {
        console.error('❌ Error getting max instant withdrawable:', error)
        return res.status(500).json({
            error: 'Failed to get maximum instant withdrawable amount',
            details: error instanceof Error ? error.message : 'Unknown error',
        })
    }
}
