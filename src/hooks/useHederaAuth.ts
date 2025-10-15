/**
 * Hook para autenticación con Hedera Wallet (sin fees)
 *
 * Este hook reemplaza el sistema de autenticación con Supabase por uno basado en
 * firma de mensajes off-chain y JWT seguros.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { AuthResponse } from '@/types/auth'

interface UseHederaAuthOptions {
    currentWalletId?: string | null
    onAuthChange?: (accountId: string | null) => void
}

interface SignMessageFunction {
    (message: string): Promise<{ signature: string; publicKey?: string }>
}

export function useHederaAuth(options: UseHederaAuthOptions = {}) {
    const { currentWalletId, onAuthChange } = options

    const [accountId, setAccountId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const previousWalletIdRef = useRef<string | null | undefined>(
        currentWalletId
    )

    /**
     * Internal logout handler
     */
    const handleLogout = useCallback(async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' })
            setAccountId(null)
            setIsAuthenticated(false)
            onAuthChange?.(null)
        } catch (error) {
            console.error('Sign out error:', error)
        }
    }, [onAuthChange])

    /**
     * Check if user is authenticated by validating the JWT cookie
     */
    const checkAuthStatus = useCallback(async () => {
        try {
            setLoading(true)

            // Call a protected endpoint to verify the JWT
            const response = await fetch('/api/auth/me', {
                // Evitar caché para obtener estado actualizado
                cache: 'no-store',
                credentials: 'include',
            })

            if (response.ok) {
                const data = await response.json()
                setAccountId(data.accountId)
                setIsAuthenticated(true)
                onAuthChange?.(data.accountId)
            } else {
                setAccountId(null)
                setIsAuthenticated(false)
                onAuthChange?.(null)
            }
        } catch (error) {
            console.error('Error checking auth status:', error)
            setAccountId(null)
            setIsAuthenticated(false)
            onAuthChange?.(null)
        } finally {
            setLoading(false)
        }
    }, [onAuthChange])

    // Detect wallet changes and clear session
    useEffect(() => {
        const previousWalletId = previousWalletIdRef.current

        if (previousWalletId && !currentWalletId) {
            handleLogout()
        } else if (
            previousWalletId &&
            currentWalletId &&
            previousWalletId !== currentWalletId
        ) {
            handleLogout()
        }

        previousWalletIdRef.current = currentWalletId
    }, [currentWalletId, handleLogout])

    // Check authentication status ONLY on mount (not on every render)
    useEffect(() => {
        checkAuthStatus()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    /**
     * Sign in with Hedera Wallet
     *
     * @param walletAccountId - The Hedera account ID (e.g., "0.0.12345")
     * @param signMessageFn - Function to sign a message with the wallet
     * @returns Success status and error if any
     */
    const signIn = useCallback(
        async (
            walletAccountId: string,
            signMessageFn: SignMessageFunction
        ): Promise<{ success: boolean; error?: string }> => {
            try {
                setLoading(true)

                // Step 1: Request a nonce from the server
                const nonceResponse = await fetch(
                    `/api/auth/nonce?accountId=${encodeURIComponent(
                        walletAccountId
                    )}`
                )

                if (!nonceResponse.ok) {
                    const error = await nonceResponse.json()
                    return {
                        success: false,
                        error: error.error || 'Failed to get nonce',
                    }
                }

                const { nonce, message } = await nonceResponse.json()

                // Step 2: Sign the message with the wallet
                let signature: string
                let publicKey: string | undefined

                try {
                    const signResult = await signMessageFn(message)
                    signature = signResult.signature
                    publicKey = signResult.publicKey
                } catch (signError) {
                    console.error(
                        'User rejected signature or error:',
                        signError
                    )
                    return {
                        success: false,
                        error: 'Failed to sign message. Please try again.',
                    }
                }

                // Step 3: Verify the signature and get JWT
                const verifyResponse = await fetch('/api/auth/verify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        accountId: walletAccountId,
                        nonce,
                        signature,
                        publicKey,
                    }),
                })

                const verifyResult: AuthResponse = await verifyResponse.json()

                if (!verifyResponse.ok || !verifyResult.success) {
                    return {
                        success: false,
                        error: verifyResult.error || 'Verification failed',
                    }
                }

                // Step 4: Update state
                setAccountId(walletAccountId)
                setIsAuthenticated(true)
                onAuthChange?.(walletAccountId)

                return { success: true }
            } catch (error) {
                console.error('Sign in error:', error)
                return {
                    success: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : 'Unknown error',
                }
            } finally {
                setLoading(false)
            }
        },
        [onAuthChange]
    )

    /**
     * Sign out and clear session
     */
    const signOut = useCallback(async (): Promise<{
        success: boolean
        error?: string
    }> => {
        try {
            setLoading(true)

            const response = await fetch('/api/auth/logout', {
                method: 'POST',
            })

            if (!response.ok) {
                return { success: false, error: 'Failed to logout' }
            }

            setAccountId(null)
            setIsAuthenticated(false)
            onAuthChange?.(null)

            return { success: true }
        } catch (error) {
            console.error('Sign out error:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }
        } finally {
            setLoading(false)
        }
    }, [onAuthChange])

    return {
        accountId,
        loading,
        isAuthenticated,
        signIn,
        signOut,
        checkAuthStatus,
    }
}

/**
 * Helper function to sign a message with HashPack wallet
 *
 * Example usage:
 * ```typescript
 * const { signIn } = useHederaAuth({ currentWalletId })
 *
 * await signIn(accountId, async (message) => {
 *   const result = await signMessageWithHashPack(hashconnect, accountId, message)
 *   return result
 * })
 * ```
 */
export async function signMessageWithHashPack(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hashconnect: any,
    accountId: string,
    message: string
): Promise<{ signature: string; publicKey?: string }> {
    try {
        const result = await hashconnect.signMessage(accountId, message)

        return {
            signature: result.signature,
            publicKey: result.publicKey,
        }
    } catch (error) {
        console.error('Error signing with HashPack:', error)
        throw error
    }
}

/**
 * Helper function to sign a message with Blade wallet
 */
export async function signMessageWithBlade(
    accountId: string,
    message: string
): Promise<{ signature: string; publicKey?: string }> {
    try {
        // @ts-expect-error - Blade wallet injected
        if (!window.bladeWallet) {
            throw new Error('Blade wallet not found')
        }

        // @ts-expect-error - Blade wallet injected
        const result = await window.bladeWallet.sign(message, accountId)

        return {
            signature: result.signature,
            publicKey: result.publicKey,
        }
    } catch (error) {
        console.error('Error signing with Blade:', error)
        throw error
    }
}
