import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { serverEnv } from '@/config/serverEnv'

// This module should ONLY be imported in server-side code (API routes, server components)
// Never import this in client components

const supabaseUrl = serverEnv.supabase?.url
const supabaseServiceKey = serverEnv.supabase?.serviceRoleKey

if (!supabaseUrl || !supabaseServiceKey) {
    // Only throw error on server side (where these vars should exist)
    if (typeof window === 'undefined') {
        throw new Error(
            'Missing Supabase service role credentials. ' +
                'Make sure SUPABASE_SERVICE_ROLE_KEY is set in your environment variables. ' +
                'This module should only be used server-side.'
        )
    }
    // On client side, create a dummy client that will never be used
    throw new Error('supabase-admin cannot be used on the client side')
}

// Admin client with service role key - bypasses RLS
export const supabaseAdmin = createClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
)

export default supabaseAdmin
