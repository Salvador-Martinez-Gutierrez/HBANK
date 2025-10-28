import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { userId, walletAddress } = req.body

    if (!userId || !walletAddress) {
        return res
            .status(400)
            .json({ error: 'Missing userId or walletAddress' })
    }

    try {
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

        return res.status(200).json({
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
        return res.status(500).json({ error: errorMessage })
    }
}
