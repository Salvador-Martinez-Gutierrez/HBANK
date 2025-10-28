import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const body = await req.json()
        const { userId, walletAddress } = body

        if (!userId || !walletAddress) {
            return NextResponse.json(
                { error: 'Missing userId or walletAddress' },
                { status: 400 }
            )
        }

        // Use service role to bypass RLS
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // 1. Check auth.users
        const { data: authUser, error: authError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single()

        // 2. Check public.users
        const { data: publicUser, error: publicError } = await supabase
            .from('users')
            .select('*')
            .eq('wallet_address', walletAddress)
            .single()

        // Set the JWT manually
        const { data: session } = await supabase.auth.admin.createUser({
            email: `wallet-${walletAddress.replace(/\./g, '-')}@hbank.app`,
            password: 'temp-password',
            email_confirm: true,
            user_metadata: { wallet_address: walletAddress },
        })

        return NextResponse.json({
            authUser,
            authError: authError?.message,
            publicUser,
            publicError: publicError?.message,
            session: session.user?.id,
        })
    } catch (error: unknown) {
        console.error('Debug auth error:', error)
        const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
