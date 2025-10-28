import { NextRequest, NextResponse } from 'next/server'
import { WithdrawService } from '@/services/withdrawService'
import { createScopedLogger } from '@/lib/logger'

const logger = createScopedLogger('api:user-withdrawals')

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

        logger.info('Fetching withdrawals for user', { user })

        const withdrawService = new WithdrawService()
        const withdrawals = await withdrawService.getUserWithdrawals(user)

        return NextResponse.json({
            success: true,
            withdrawals,
        })
    } catch (error) {
        logger.error('Error fetching user withdrawals', {
            error: error instanceof Error ? error.message : String(error),
        })
        return NextResponse.json(
            {
                error: 'Internal server error',
            },
            { status: 500 }
        )
    }
}
