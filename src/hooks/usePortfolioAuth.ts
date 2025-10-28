/**
 * Hook de autenticación para Portfolio usando JWT seguro
 *
 * Flujo de autenticación:
 * 1. Cliente obtiene nonce de /api/auth/nonce
 * 2. Wallet firma el mensaje con el nonce
 * 3. Cliente envía firma a /api/auth/verify
 * 4. Backend verifica la firma y crea JWT en HttpOnly cookie
 * 5. Todas las peticiones subsecuentes usan el JWT de la cookie
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { logger } from '@/lib/logger'

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
            logger.info('🚪 Wallet disconnected, clearing session...')

            // Clear the session immediately
            setUser(null)
            setIsAuthenticated(false)

            // Sign out via API
            fetch('/api/auth/logout', { method: 'POST' })
                .then(() => {
                    logger.info('✅ Session cleared after wallet disconnect')
                })
                .catch((error: Error) => {
                    logger.error('❌ Error signing out:', error)
                })
        }
        // If wallet changed (and we had a previous wallet), sign out
        else if (
            previousWalletId &&
            currentWalletId &&
            previousWalletId !== currentWalletId
        ) {
            logger.info(
                '🔄 Wallet changed from',
                previousWalletId,
                'to',
                currentWalletId
            )
            logger.info('🚪 Signing out previous wallet session...')

            // Clear the session immediately
            setUser(null)
            setIsAuthenticated(false)

            // Sign out via API
            fetch('/api/auth/logout', { method: 'POST' })
                .then(() => {
                    logger.info('✅ Previous session cleared')
                })
                .catch((error: Error) => {
                    logger.error('❌ Error signing out:', error)
                })
        }

        // Update the ref
        previousWalletIdRef.current = currentWalletId
    }, [currentWalletId])

    const loadUser = useCallback(
        async (accountId: string) => {
            logger.info('🔍 loadUser: Starting for accountId:', accountId)

            // SECURITY CHECK: Verify that the session wallet matches the currently connected wallet
            if (currentWalletId && currentWalletId !== accountId) {
                logger.warn('⚠️ MISMATCH: Session wallet !== Connected wallet')
                logger.warn('Session wallet:', accountId)
                logger.warn('Connected wallet:', currentWalletId)
                logger.warn('🚪 Signing out stale session...')

                // Clear stale session
                setUser(null)
                setIsAuthenticated(false)
                setLoading(false)
                await fetch('/api/auth/logout', { method: 'POST' })
                return
            }

            try {
                // Fetch user data using JWT-authenticated endpoint
                const response = await fetch(
                    `/api/portfolio/fetch-user?accountId=${encodeURIComponent(
                        accountId
                    )}`
                )
                const result = await response.json()

                if (!response.ok) {
                    logger.error('❌ loadUser: Server error:', {
                        status: response.status,
                        error: result.error,
                    })

                    // If unauthorized, clear session
                    if (response.status === 401) {
                        setUser(null)
                        setIsAuthenticated(false)
                    }
                    return
                }

                if (result.success && result.user) {
                    logger.info('✅ loadUser: Success, data:', result.user)
                    setUser(result.user)
                    setIsAuthenticated(true)
                }
            } catch (error) {
                logger.error('❌ loadUser: Fetch error:', error)
            } finally {
                setLoading(false)
            }
        },
        [currentWalletId]
    )

    const checkUser = useCallback(async () => {
        try {
            // Check if we have a valid JWT session
            const response = await fetch('/api/auth/me')

            if (response.ok) {
                const data = await response.json()
                logger.info('✅ Valid session found for:', data.accountId)
                await loadUser(data.accountId)
            } else {
                setUser(null)
                setIsAuthenticated(false)
                setLoading(false)
            }
        } catch (error) {
            logger.error('Error checking user:', error)
            setUser(null)
            setIsAuthenticated(false)
            setLoading(false)
        }
    }, [loadUser])

    useEffect(() => {
        // Check current session on mount
        void checkUser()
    }, [checkUser])

    /**
     * Sign in using Hedera wallet signature
     *
     * @param accountId - Hedera account ID (e.g., "0.0.12345")
     * @param signature - Signature from wallet
     * @param nonce - Nonce from /api/auth/nonce
     */
    async function signIn(accountId: string, signature: string, nonce: string) {
        try {
            setLoading(true)

            logger.info('🔑 Verifying signature with backend...')

            // Verify signature and get JWT
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accountId,
                    nonce,
                    signature,
                }),
            })

            const result = await response.json()

            if (result.success) {
                logger.info('✅ Authentication successful')

                // JWT is now in HttpOnly cookie
                // Load user data
                await loadUser(accountId)

                return { success: true }
            } else {
                logger.error('❌ Auth failed:', result.error)
                return { success: false, error: result.error }
            }
        } catch (error) {
            logger.error('Sign in error:', error)
            return { success: false, error: 'Failed to sign in' }
        } finally {
            setLoading(false)
        }
    }

    async function signOut() {
        try {
            setLoading(true)

            const response = await fetch('/api/auth/logout', {
                method: 'POST',
            })

            if (response.ok) {
                setUser(null)
                setIsAuthenticated(false)
                logger.info('✅ Signed out successfully')
                return { success: true }
            }

            return { success: false, error: 'Failed to sign out' }
        } catch (error) {
            logger.error('Sign out error:', error)
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
