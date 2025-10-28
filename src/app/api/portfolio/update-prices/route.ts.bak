import { NextRequest, NextResponse } from 'next/server'
import { updateAllTokenPrices } from '@/services/portfolioPriceService'

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        // Optional: Add API key validation for security
        const apiKey = req.headers.get('x-api-key')
        const expectedKey = process.env.CRON_API_KEY

        if (expectedKey && apiKey !== expectedKey) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Unauthorized',
                },
                { status: 401 }
            )
        }

        const result = await updateAllTokenPrices()

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error updating prices:', error)
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
            },
            { status: 500 }
        )
    }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        // Optional: Add API key validation for security
        const apiKey = req.headers.get('x-api-key')
        const expectedKey = process.env.CRON_API_KEY

        if (expectedKey && apiKey !== expectedKey) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Unauthorized',
                },
                { status: 401 }
            )
        }

        const result = await updateAllTokenPrices()

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error updating prices:', error)
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
            },
            { status: 500 }
        )
    }
}
