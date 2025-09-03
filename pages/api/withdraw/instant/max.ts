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

        const treasuryId = process.env.TREASURY_ID
        const usdcTokenId = process.env.USDC_TOKEN_ID

        if (!treasuryId || !usdcTokenId) {
            console.error('❌ Missing required environment variables')
            return res.status(500).json({
                error: 'Server configuration error',
            })
        }

        const hederaService = new HederaService()

        // Get treasury USDC balance
        const treasuryUSDCBalance = await hederaService.checkBalance(
            treasuryId,
            usdcTokenId
        )

        console.log(`💰 Treasury USDC balance: ${treasuryUSDCBalance}`)

        // The maximum instant withdrawable is the current treasury balance
        // This ensures we never allow instant withdrawals beyond what we can immediately fulfill
        const maxInstantWithdrawable = treasuryUSDCBalance

        console.log(
            `✅ Maximum instant withdrawable: ${maxInstantWithdrawable} USDC`
        )

        return res.status(200).json({
            maxInstantWithdrawable,
            treasuryBalance: treasuryUSDCBalance,
        })
    } catch (error) {
        console.error('❌ Error getting max instant withdrawable:', error)
        return res.status(500).json({
            error: 'Failed to get maximum instant withdrawable amount',
            details: error instanceof Error ? error.message : 'Unknown error',
        })
    }
}
