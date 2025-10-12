/**
 * Server-side Portfolio Authentication Service
 * ⚠️ WARNING: This file imports supabase-admin and should ONLY be used in API routes (server-side)
 * For client-side auth utilities, use portfolioAuthClient.ts instead
 */

import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { AuthPayload, AuthResponse } from '@/types/portfolio'

/**
 * Verify the signature and authenticate the user
 * This function should be called from an API route for security
 */
export async function verifyAndAuthenticate(
    payload: AuthPayload
): Promise<AuthResponse> {
    try {
        // Check timestamp (message should be signed within last 5 minutes)
        const now = Date.now()
        const fiveMinutes = 5 * 60 * 1000
        if (now - payload.timestamp > fiveMinutes) {
            return { success: false, error: 'Authentication expired' }
        }

        // TODO: Verify signature using Hedera SDK
        // For now, we'll skip signature verification in client-side
        // This MUST be done in the API route

        return { success: true }
    } catch (error) {
        console.error('Authentication error:', error)
        return { success: false, error: 'Authentication failed' }
    }
}

/**
 * Register or get existing user by wallet address
 * This function should be called from the API route with proper credentials
 */
export async function registerOrGetUser(walletAddress: string) {
    try {
        // Convert wallet address to valid email format (replace dots with dashes)
        const emailSafeAddress = walletAddress.replace(/\./g, '-')
        const email = `wallet-${emailSafeAddress}@hbank.app`
        const password = `hbank_${walletAddress}_portal`

        // First, check if auth user already exists by email
        const { data: existingAuthUsers } =
            await supabaseAdmin.auth.admin.listUsers()
        const existingAuthUser = existingAuthUsers.users.find(
            (u) => u.email === email
        )

        if (existingAuthUser) {
            console.log('Auth user already exists:', existingAuthUser.id)

            // Check if user exists in our database table
            const { data: existingDbUser } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('id', existingAuthUser.id)
                .single()

            if (existingDbUser) {
                console.log('User found in database:', existingDbUser.id)
                return { success: true, user: existingDbUser }
            } else {
                // Auth user exists but not in our database, create record
                console.log(
                    'Auth user exists, creating database record:',
                    existingAuthUser.id
                )
                const { data: newDbUser, error: insertError } =
                    await supabaseAdmin
                        .from('users')
                        .insert({
                            id: existingAuthUser.id,
                            wallet_address: walletAddress,
                        })
                        .select()
                        .single()

                if (insertError) {
                    console.error(
                        'Error creating database record:',
                        insertError
                    )
                    // Return minimal user info even if DB insert fails
                    return {
                        success: true,
                        user: {
                            id: existingAuthUser.id,
                            wallet_address: walletAddress,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        },
                    }
                }

                // Create primary wallet
                await createPrimaryWallet(newDbUser.id, walletAddress)

                return { success: true, user: newDbUser }
            }
        }

        // User doesn't exist in auth, create new user using ADMIN client (auto-confirms email)
        console.log('Creating new auth user:', email)
        const { data: signUpData, error: signUpError } =
            await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true, // Auto-confirm the email (no email verification needed for wallet auth)
                user_metadata: {
                    wallet_address: walletAddress,
                },
            })

        if (signUpError) {
            console.error('Error during user creation:', signUpError)
            return { success: false, error: 'Failed to register user' }
        }

        const userId = signUpData.user.id
        console.log(
            'Auth user created successfully with auto-confirmed email:',
            userId
        )

        // Insert user into our database table
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({ id: userId, wallet_address: walletAddress })
            .select()
            .single()

        if (insertError) {
            console.error(
                'Error inserting new user into database:',
                insertError
            )
            // Return minimal user info even if DB insert fails
            return {
                success: true,
                user: {
                    id: userId,
                    wallet_address: walletAddress,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
            }
        }

        // Create primary wallet
        await createPrimaryWallet(newUser.id, walletAddress)

        return { success: true, user: newUser }
    } catch (error) {
        console.error('Error in registerOrGetUser:', error)
        return { success: false, error: 'Database error' }
    }
}

/**
 * Helper function to create primary wallet
 */
async function createPrimaryWallet(userId: string, walletAddress: string) {
    const { error } = await supabaseAdmin.from('wallets').insert({
        user_id: userId,
        wallet_address: walletAddress,
        label: 'Primary Wallet',
        is_primary: true,
    })

    if (error) {
        console.error('Error creating primary wallet:', error)
    }
}

/**
 * Generate session credentials for the client
 * Returns credentials so the client can call signInWithPassword on their end
 */
export async function getSessionCredentials(
    userId: string,
    walletAddress: string
) {
    try {
        // Convert wallet address to valid email format (replace dots with dashes)
        const emailSafeAddress = walletAddress.replace(/\./g, '-')
        const email = `wallet-${emailSafeAddress}@hbank.app`
        const password = `hbank_${walletAddress}_portal`

        return {
            success: true,
            credentials: {
                email,
                password,
            },
        }
    } catch (error) {
        console.error('Error generating session credentials:', error)
        return { success: false, error: 'Failed to generate credentials' }
    }
}

/**
 * Sign out the current user
 */
export async function signOut() {
    try {
        const { error } = await supabase.auth.signOut()
        if (error) {
            console.error('Error signing out:', error)
            return { success: false, error: 'Failed to sign out' }
        }
        return { success: true }
    } catch (error) {
        console.error('Error in signOut:', error)
        return { success: false, error: 'Sign out error' }
    }
}

/**
 * Get current authenticated user from API route (server-side)
 * For use in API routes - reads session from request cookies
 */
export async function getCurrentUser(req?: any) {
    try {
        // If called from API route, we need to create a server client that reads cookies
        let authUser = null

        if (req) {
            // Server-side: Create client that can read cookies from request
            const { createServerClient } = require('@supabase/ssr')

            const serverClient = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                {
                    cookies: {
                        getAll() {
                            // Parse cookies from request
                            const cookieString = req.headers?.cookie || ''
                            console.log('🍪 Raw cookie string:', cookieString)

                            if (!cookieString) {
                                console.log('⚠️ No cookies found in request')
                                return []
                            }

                            const cookies = cookieString
                                .split(';')
                                .map((c: string) => {
                                    const [name, ...rest] = c.trim().split('=')
                                    return { name, value: rest.join('=') }
                                })
                                .filter(
                                    (c: { name: string; value: string }) =>
                                        c.name && c.value
                                )

                            console.log(
                                '🍪 Parsed cookies:',
                                cookies.map(
                                    (c: { name: string; value: string }) =>
                                        c.name
                                )
                            )
                            return cookies
                        },
                        setAll() {
                            // No-op for reading - we only need to read cookies in API routes
                        },
                    },
                }
            )

            const {
                data: { user },
                error,
            } = await serverClient.auth.getUser()
            if (error) {
                console.error('Error getting user from server:', error)
                return { success: false, user: null }
            }
            authUser = user
        } else {
            // Client-side
            const {
                data: { user },
                error,
            } = await supabase.auth.getUser()
            if (error) {
                console.error('Error getting user from client:', error)
                return { success: false, user: null }
            }
            authUser = user
        }

        if (!authUser) {
            console.log('No auth user found')
            return { success: false, user: null }
        }

        console.log('Auth user found:', authUser.email)

        // Extract wallet address from email
        const walletAddress = authUser.email
            ?.replace('wallet-', '')
            .replace('@hbank.app', '')
            .replace(/-/g, '.')

        if (!walletAddress) {
            console.log('Could not extract wallet address from email')
            return { success: false, user: null }
        }

        console.log(
            'Looking up user in database:',
            walletAddress,
            'ID:',
            authUser.id
        )

        // Get user from our database using auth user's ID
        // Use supabaseAdmin to bypass RLS policies in server-side API routes
        const { data: dbUser, error: dbError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle()

        if (dbError) {
            console.error('Error fetching user from database:', dbError)
            return { success: false, user: null }
        }

        // If user doesn't exist in database, create it
        if (!dbUser) {
            console.log(
                'User not found in database, creating record for:',
                authUser.id
            )

            const { data: newUser, error: insertError } = await supabaseAdmin
                .from('users')
                .insert({
                    id: authUser.id,
                    wallet_address: walletAddress,
                })
                .select()
                .single()

            if (insertError) {
                console.error('Error creating user record:', insertError)
                // Return minimal user info even if insert fails
                return {
                    success: true,
                    user: {
                        id: authUser.id,
                        wallet_address: walletAddress,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                }
            }

            console.log('User record created successfully:', newUser)

            // Create primary wallet
            await createPrimaryWallet(newUser.id, walletAddress)

            return { success: true, user: newUser }
        }

        console.log('Database user found:', dbUser.id)
        return { success: true, user: dbUser }
    } catch (error) {
        console.error('Error getting current user:', error)
        return { success: false, user: null }
    }
}
