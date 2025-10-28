import { NextRequest, NextResponse } from 'next/server'
import { WithdrawService } from '@/services/withdrawService'

export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const user = req.nextUrl.searchParams.get('user')

        if (!user) {
            return NextResponse.json(
                {
                    error: 'Missing required parameter: user',
                },
                { status: 400 }
            )
        }

        console.log('Fetching withdrawals for user:', user)

        const withdrawService = new WithdrawService()
        const withdrawals = await withdrawService.getUserWithdrawals(user)

        return NextResponse.json({
            success: true,
            withdrawals,
        })
    } catch (error) {
        console.error('❌ Error fetching user withdrawals:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
            },
            { status: 500 }
        )
    }
}
