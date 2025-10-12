import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
}

// Browser client with cookie storage
// This MUST only be used in client-side code (pages, components, hooks)
// For API routes, use createServerClient from portfolioAuthService
export const supabase = createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
)

export default supabase
