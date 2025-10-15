/**
 * Script para probar la conexión Realtime de Supabase
 *
 * Uso:
 *   npx tsx scripts/test-realtime.ts
 *
 * Luego, en otra terminal o en Supabase SQL Editor:
 *   UPDATE tokens_registry SET price_usd = '0.999' WHERE token_address = '0.0.731861';
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials')
    console.error(
        'Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set'
    )
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('🔴 Connecting to Supabase Realtime...')
console.log('📡 URL:', supabaseUrl)
console.log('---')
console.log('Waiting for token price updates...')
console.log('To test, run this SQL in Supabase:')
console.log(
    "  UPDATE tokens_registry SET price_usd = '0.999', last_price_update = NOW() WHERE token_address = '0.0.731861';"
)
console.log('---')

const channel = supabase
    .channel('test-token-prices')
    .on(
        'postgres_changes',
        {
            event: 'UPDATE',
            schema: 'public',
            table: 'tokens_registry',
        },
        (payload) => {
            console.log('\n✅ RECEIVED UPDATE!')
            console.log('📦 Payload:', JSON.stringify(payload, null, 2))
            console.log('---')
        }
    )
    .subscribe((status) => {
        console.log(`📡 Subscription status: ${status}`)

        if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to token price updates!')
            console.log(
                'Now modify a token price in Supabase to see the update here...'
            )
        } else if (status === 'CHANNEL_ERROR') {
            console.error(
                '❌ Failed to subscribe. Check your Supabase configuration.'
            )
            process.exit(1)
        }
    })

// Keep script running
process.on('SIGINT', () => {
    console.log('\n\n🛑 Unsubscribing...')
    channel.unsubscribe()
    process.exit(0)
})
