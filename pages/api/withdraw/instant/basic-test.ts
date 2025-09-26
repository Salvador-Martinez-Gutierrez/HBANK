import { NextApiRequest, NextApiResponse } from 'next'
import { HederaService } from '../../../../src/services/hederaService'
import { WithdrawService } from '../../../../src/services/withdrawService'

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
    data?: any
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<InstantWithdrawResponse>
) {
    console.log('🚀 [BASIC TEST] Starting handler...')
    console.log('📋 [BASIC TEST] Method:', req.method)
    console.log('📋 [BASIC TEST] Headers:', req.headers['content-type'])
    console.log('📋 [BASIC TEST] Body:', req.body)

    if (req.method !== 'POST') {
        console.log('❌ [BASIC TEST] Method not allowed')
        return res.status(405).json({
            success: false,
            error: 'Method not allowed',
        })
    }

    try {
        console.log('🔍 [BASIC TEST] Processing request...')

        const body = req.body
        console.log('📋 [BASIC TEST] Body type:', typeof body)
        console.log('📋 [BASIC TEST] Body content:', JSON.stringify(body))

        console.log('🔍 [BASIC TEST] Testing HederaService import...')
        const hederaService = new HederaService()
        console.log('✅ [BASIC TEST] HederaService created successfully')

        console.log('🔍 [BASIC TEST] Testing WithdrawService import...')
        const withdrawService = new WithdrawService()
        console.log('✅ [BASIC TEST] WithdrawService created successfully')

        // Test successful response
        console.log('✅ [BASIC TEST] Sending success response')
        return res.status(200).json({
            success: true,
            data: {
                message:
                    '🎉 BOTH SERVICES WORK! Problem was wallet connectors import',
                receivedBody: body,
                timestamp: new Date().toISOString(),
            },
        })
    } catch (error) {
        console.error('❌ [BASIC TEST] Unexpected error:', error)
        return res.status(500).json({
            success: false,
            error: `Error: ${error}`,
        })
    }
}
