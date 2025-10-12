import type { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { walletAddress } = req.query

    if (!walletAddress || typeof walletAddress !== 'string') {
        return res.status(400).json({ error: 'Missing walletAddress' })
    }

    try {
        // Create server client that reads cookies from the request
        const supabase = createServerClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get: (name) => {
                        return req.cookies[name]
                    },
                    set: (name, value, options) => {
                        res.setHeader(
                            'Set-Cookie',
                            `${name}=${value}; Path=/; ${
                                options?.maxAge
                                    ? `Max-Age=${options.maxAge}`
                                    : ''
                            }`
                        )
                    },
                    remove: (name) => {
                        res.setHeader(
                            'Set-Cookie',
                            `${name}=; Path=/; Max-Age=0`
                        )
                    },
                },
            }
        )

        // Authenticate user using getUser() instead of getSession() for security
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return res.status(401).json({
                error: 'Not authenticated',
                authError: authError?.message,
                hasUser: !!user,
            })
        }

        // Verify the user is requesting their own data
        const userWalletFromMeta = user.user_metadata?.wallet_address
        if (userWalletFromMeta !== walletAddress) {
            return res.status(403).json({
                error: 'Unauthorized',
                message: 'You can only fetch your own wallet data',
            })
        }

        // Try to query the users table using the authenticated user's ID
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()

        if (error) {
            return res.status(403).json({
                error: 'Failed to fetch user',
                details: error.message,
                code: error.code,
                hint: error.hint,
                userId: user.id,
                userEmail: user.email,
                requestedWallet: walletAddress,
            })
        }

        return res.status(200).json({
            success: true,
            user: data,
            auth: {
                userId: user.id,
                email: user.email,
                walletFromMeta: userWalletFromMeta,
            },
        })
    } catch (error: any) {
        console.error('Server-side user fetch error:', error)
        return res.status(500).json({ error: error.message })
    }
}
