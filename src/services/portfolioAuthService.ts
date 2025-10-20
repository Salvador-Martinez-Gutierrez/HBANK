/* eslint-disable @typescript-eslint/no-explicit-any */
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

            // Check if user exists in our database table (use maybeSingle to handle duplicates)
            const { data: existingDbUser } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('id', existingAuthUser.id)
                .maybeSingle()

            if (existingDbUser) {
                console.log(
                    'User found in database:',
                    (existingDbUser as { id: string }).id
                )
                return { success: true, user: existingDbUser }
            } else {
                // Auth user exists but not in our database, create record using upsert
                console.log(
                    'Auth user exists, creating database record:',
                    existingAuthUser.id
                )
                const { data: newDbUser, error: insertError } = await (
                    supabaseAdmin.from('users').upsert as any
                )(
                    {
                        id: existingAuthUser.id,
                        wallet_address: walletAddress,
                    },
                    { onConflict: 'id' }
                )
                    .select()
                    .maybeSingle()

                if (insertError) {
                    console.error(
                        'Error creating database record:',
                        insertError
                    )
                    // Return minimal user info even if DB upsert fails
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

                return {
                    success: true,
                    user: newDbUser || {
                        id: existingAuthUser.id,
                        wallet_address: walletAddress,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                }
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

        // Insert user into our database table using upsert to handle potential duplicates
        const { data: newUser, error: insertError } = await (
            supabaseAdmin.from('users').upsert as any
        )(
            { id: userId, wallet_address: walletAddress },
            {
                onConflict: 'id',
            }
        )
            .select()
            .maybeSingle()

        if (insertError) {
            console.error(
                'Error inserting new user into database:',
                insertError
            )
            // Return minimal user info even if DB upsert fails
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

        return {
            success: true,
            user: newUser || {
                id: userId,
                wallet_address: walletAddress,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
        }
    } catch (error) {
        console.error('Error in registerOrGetUser:', error)
        return { success: false, error: 'Database error' }
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
export async function getCurrentUser(req?: { headers?: { cookie?: string } }) {
    try {
        // If called from API route, we need to create a server client that reads cookies
        let authUser = null

        if (req) {
            // Server-side: Create client that can read cookies from request
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { createServerClient } = require('@supabase/ssr') as {
                createServerClient: (
                    url: string,
                    key: string,
                    options: unknown
                ) => {
                    auth: {
                        getUser: () => Promise<{ data: { user: unknown } }>
                    }
                }
            }

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
            } = await serverClient.auth.getUser()

            authUser = user as { id: string; email?: string } | null
        } else {
            // Client-side
            const {
                data: { user },
            } = await supabase.auth.getUser()

            authUser = user
        }

        if (!authUser) {
            console.log('No auth user found')
            return { success: false, user: null }
        }

        const typedAuthUser = authUser as { id: string; email?: string }
        console.log('Auth user found:', typedAuthUser.email)

        // Extract wallet address from email
        const walletAddress = typedAuthUser.email
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

            const { data: newUser, error: insertError } = await (
                supabaseAdmin.from('users').upsert as any
            )(
                {
                    id: authUser.id,
                    wallet_address: walletAddress,
                },
                { onConflict: 'id' }
            )
                .select()
                .maybeSingle()

            if (insertError) {
                console.error('Error creating user record:', insertError)
                // Return minimal user info even if upsert fails
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

            return {
                success: true,
                user: newUser || {
                    id: authUser.id,
                    wallet_address: walletAddress,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
            }
        }

        console.log('Database user found:', (dbUser as { id: string }).id)
        return { success: true, user: dbUser }
    } catch (error) {
        console.error('Error getting current user:', error)
        return { success: false, user: null }
    }
}
