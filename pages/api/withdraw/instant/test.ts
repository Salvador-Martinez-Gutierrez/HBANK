import { NextApiRequest, NextApiResponse } from 'next'
import { HederaService } from '../../../src/services/hederaService'
import { WithdrawService } from '../../../src/services/withdrawService'

interface InstantWithdrawRequest {
    userAccountId: string
    amountHUSD: number
    rate: number
    rateSequenceNumber: number
    requestType: 'instant'
}

interface InstantWithdrawResponse {
    success: boolean
    error?: string
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<InstantWithdrawResponse>
) {
    // MINIMAL TEST - solo logs básicos
    console.log('🚀 [TEST] Starting handler...')
    console.log('📋 [TEST] Method:', req.method)
    console.log('📋 [TEST] Body keys:', Object.keys(req.body || {}))

    if (req.method !== 'POST') {
        console.log('❌ [TEST] Method not allowed')
        return res.status(405).json({
            success: false,
            error: 'Method not allowed',
        })
    }

    try {
        console.log('🔍 [TEST] Parsing request body...')

        const {
            userAccountId,
            amountHUSD,
            rate,
            rateSequenceNumber,
            requestType,
        }: InstantWithdrawRequest = req.body

        console.log('⚡ [TEST] Data parsed successfully:', {
            userAccountId: userAccountId ? 'present' : 'missing',
            amountHUSD: amountHUSD ? 'present' : 'missing',
            rate: rate ? 'present' : 'missing',
            requestType: requestType ? 'present' : 'missing',
        })

        // Basic validation first
        if (requestType !== 'instant') {
            console.log('❌ [TEST] Invalid request type:', requestType)
            return res.status(400).json({
                success: false,
                error: 'Invalid request type. Expected "instant"',
            })
        }

        // Validate required fields
        if (!userAccountId || !amountHUSD || !rate || !rateSequenceNumber) {
            console.log('❌ [TEST] Missing fields:', {
                userAccountId: !!userAccountId,
                amountHUSD: !!amountHUSD,
                rate: !!rate,
                rateSequenceNumber: !!rateSequenceNumber,
            })
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
            })
        }

        console.log('🔍 [TEST] Creating services...')
        const withdrawService = new WithdrawService()
        console.log('✅ [TEST] WithdrawService created')

        const hederaService = new HederaService()
        console.log('✅ [TEST] HederaService created')

        // Test successful response
        return res.status(200).json({
            success: true,
        })
    } catch (error) {
        console.error('❌ [TEST] Unexpected error:', error)
        return res.status(500).json({
            success: false,
            error: `Internal server error: ${error}`,
        })
    }
}
