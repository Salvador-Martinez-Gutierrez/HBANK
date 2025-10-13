import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@/types/portfolio'

export function usePortfolioAuth(currentWalletId?: string | null) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const previousWalletIdRef = useRef<string | null | undefined>(
        currentWalletId
    )

    // Detect wallet changes and clear session
    useEffect(() => {
        const previousWalletId = previousWalletIdRef.current

        // If wallet was disconnected (currentWalletId is now null/undefined)
        if (previousWalletId && !currentWalletId) {
            console.log('🚪 Wallet disconnected, clearing session...')

            // Clear the session immediately
            setUser(null)
            setIsAuthenticated(false)

            // Sign out from Supabase
            supabase.auth
                .signOut()
                .then(() => {
                    console.log('✅ Session cleared after wallet disconnect')
                })
                .catch((error) => {
                    console.error('❌ Error signing out:', error)
                })
        }
        // If wallet changed (and we had a previous wallet), sign out
        else if (
            previousWalletId &&
            currentWalletId &&
            previousWalletId !== currentWalletId
        ) {
            console.log(
                '🔄 Wallet changed from',
                previousWalletId,
                'to',
                currentWalletId
            )
            console.log('🚪 Signing out previous wallet session...')

            // Clear the session immediately
            setUser(null)
            setIsAuthenticated(false)

            // Sign out from Supabase
            supabase.auth
                .signOut()
                .then(() => {
                    console.log('✅ Previous session cleared')
                })
                .catch((error) => {
                    console.error('❌ Error signing out:', error)
                })
        }

        // Update the ref
        previousWalletIdRef.current = currentWalletId
    }, [currentWalletId])

    useEffect(() => {
        // Check current session
        checkUser()

        // Listen to auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                loadUser(session.user.email)
            } else {
                setUser(null)
                setIsAuthenticated(false)
            }
            setLoading(false)
        })

        return () => {
            subscription.unsubscribe()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function checkUser() {
        try {
            const {
                data: { user: authUser },
            } = await supabase.auth.getUser()

            if (authUser?.email) {
                await loadUser(authUser.email)
            } else {
                setUser(null)
                setIsAuthenticated(false)
            }
        } catch (error) {
            console.error('Error checking user:', error)
            setUser(null)
            setIsAuthenticated(false)
        } finally {
            setLoading(false)
        }
    }

    async function loadUser(email: string | undefined) {
        if (!email) return

        console.log('🔍 loadUser: Starting for email:', email)

        // Verify session before querying
        const { data: sessionCheck } = await supabase.auth.getSession()
        console.log('🔐 loadUser: Session check:', {
            hasSession: !!sessionCheck.session,
            userId: sessionCheck.session?.user?.id,
            email: sessionCheck.session?.user?.email,
        })

        // Convert email back to wallet address format
        const walletAddress = email
            .replace('wallet-', '')
            .replace('@hbank.app', '')
            .replace(/-/g, '.')

        console.log('🔍 loadUser: Querying for wallet:', walletAddress)

        // SECURITY CHECK: Verify that the session wallet matches the currently connected wallet
        if (currentWalletId && currentWalletId !== walletAddress) {
            console.warn('⚠️ MISMATCH: Session wallet !== Connected wallet')
            console.warn('Session wallet:', walletAddress)
            console.warn('Connected wallet:', currentWalletId)
            console.warn('🚪 Signing out stale session...')

            // Clear stale session
            setUser(null)
            setIsAuthenticated(false)
            await supabase.auth.signOut()
            return
        }

        try {
            // Use server-side endpoint to fetch user data (this will use session cookies)
            const response = await fetch(
                `/api/portfolio/fetch-user?walletAddress=${encodeURIComponent(
                    walletAddress
                )}`
            )
            const result = await response.json()

            if (!response.ok) {
                console.error('❌ loadUser: Server error:', {
                    status: response.status,
                    error: result.error,
                    details: result.details,
                    code: result.code,
                    hint: result.hint,
                    sessionUserId: result.sessionUserId,
                    sessionEmail: result.sessionEmail,
                })
                return
            }

            if (result.success && result.user) {
                console.log('✅ loadUser: Success, data:', result.user)
                console.log('✅ loadUser: Session info:', result.session)
                setUser(result.user)
                setIsAuthenticated(true)
            }
        } catch (error) {
            console.error('❌ loadUser: Fetch error:', error)
        }
    }

    async function signIn(
        walletAddress: string,
        signature: string,
        message: string,
        timestamp: number
    ) {
        try {
            setLoading(true)

            const response = await fetch('/api/portfolio/auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    walletAddress,
                    signature,
                    message,
                    timestamp,
                }),
            })

            const result = await response.json()
            console.log('🔑 Auth response:', result)

            if (result.success) {
                if (!result.credentials) {
                    console.error('❌ No credentials in response!')
                    return { success: false, error: 'No credentials returned' }
                }

                console.log('🔐 Signing in with credentials:', {
                    email: result.credentials.email,
                    passwordLength: result.credentials.password?.length,
                })

                // Sign in with the provided credentials to create client-side session
                const { data: signInData, error: signInError } =
                    await supabase.auth.signInWithPassword({
                        email: result.credentials.email,
                        password: result.credentials.password,
                    })

                if (signInError) {
                    console.error('❌ Error signing in:', signInError)
                    return {
                        success: false,
                        error: 'Failed to establish session',
                    }
                }

                console.log(
                    '✅ Signed in successfully, session:',
                    signInData.session?.access_token ? 'exists' : 'missing'
                )

                // Wait a bit for the session to be fully established
                await new Promise((resolve) => setTimeout(resolve, 100))

                // Verify session is active
                const { data: sessionData } = await supabase.auth.getSession()
                console.log(
                    '🔐 Current session:',
                    sessionData.session ? 'active' : 'none'
                )

                // Session is now established, load the user data
                await checkUser()
                console.log('👤 User state after checkUser:', {
                    user,
                    isAuthenticated,
                })

                return { success: true }
            } else {
                console.error('❌ Auth failed:', result.error)
                return { success: false, error: result.error }
            }
        } catch (error) {
            console.error('Sign in error:', error)
            return { success: false, error: 'Failed to sign in' }
        } finally {
            setLoading(false)
        }
    }

    async function signOut() {
        try {
            setLoading(true)
            const { error } = await supabase.auth.signOut()

            if (!error) {
                setUser(null)
                setIsAuthenticated(false)
                return { success: true }
            }

            return { success: false, error: error.message }
        } catch (error) {
            console.error('Sign out error:', error)
            return { success: false, error: 'Failed to sign out' }
        } finally {
            setLoading(false)
        }
    }

    return {
        user,
        loading,
        isAuthenticated,
        signIn,
        signOut,
    }
}
