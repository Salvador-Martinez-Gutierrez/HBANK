/**
 * Ejemplo completo de uso del sistema de autenticación con Hedera Wallet
 *
 * Este componente muestra cómo integrar la autenticación en una aplicación Next.js
 */

'use client'

import { useState } from 'react'
import { useHederaAuth, signMessageWithHashPack } from '@/hooks/useHederaAuth'
import { useWallet } from '@buidlerlabs/hashgraph-react-wallets'

export function AuthExample() {
    // Ajusta según tu implementación de wallet
    const wallet = useWallet()
    const walletAny = wallet as unknown as {
        hashconnect?: unknown
        connectedAccountId?: string
        accountId?: string
    }
    const hashconnect = walletAny.hashconnect
    const connectedAccountId =
        walletAny.connectedAccountId || walletAny.accountId || null
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const {
        accountId,
        isAuthenticated,
        loading: authLoading,
        signIn,
        signOut,
    } = useHederaAuth({
        currentWalletId: connectedAccountId,
        onAuthChange: (accountId) => {
            console.log(
                '🔐 Auth state changed:',
                accountId ? 'Authenticated' : 'Not authenticated'
            )
        },
    })

    const handleLogin = async () => {
        try {
            setLoading(true)
            setError(null)

            if (!connectedAccountId) {
                setError('Please connect your wallet first')
                return
            }

            if (!hashconnect) {
                setError('HashConnect not initialized')
                return
            }

            console.log('🔐 Starting login process...')

            const result = await signIn(
                connectedAccountId || '',
                async (message) => {
                    console.log('✍️ Requesting signature from wallet...')
                    return await signMessageWithHashPack(
                        hashconnect,
                        connectedAccountId || '',
                        message
                    )
                }
            )

            if (result.success) {
                console.log('✅ Login successful!')
            } else {
                setError(result.error || 'Login failed')
            }
        } catch (err) {
            console.error('❌ Login error:', err)
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        try {
            setLoading(true)
            setError(null)

            const result = await signOut()

            if (result.success) {
                console.log('✅ Logout successful!')
            } else {
                setError(result.error || 'Logout failed')
            }
        } catch (err) {
            console.error('❌ Logout error:', err)
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }

    const testProtectedEndpoint = async () => {
        try {
            const response = await fetch('/api/protected-example')
            const data = await response.json()

            if (response.ok) {
                alert(`Success: ${JSON.stringify(data, null, 2)}`)
            } else {
                alert(`Error: ${data.error}`)
            }
        } catch (err) {
            alert(
                `Error: ${err instanceof Error ? err.message : 'Unknown error'}`
            )
        }
    }

    if (authLoading) {
        return (
            <div className='flex items-center justify-center p-8'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900'></div>
                <span className='ml-2'>Checking authentication...</span>
            </div>
        )
    }

    return (
        <div className='max-w-2xl mx-auto p-6 space-y-6'>
            <div className='bg-white rounded-lg shadow-md p-6'>
                <h2 className='text-2xl font-bold mb-4'>
                    🔐 Hedera Wallet Authentication
                </h2>

                {error && (
                    <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4'>
                        <strong>Error:</strong> {error}
                    </div>
                )}

                {!connectedAccountId ? (
                    <div className='bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded'>
                        <strong>Note:</strong> Connect your wallet first to use
                        authentication
                    </div>
                ) : (
                    <div className='space-y-4'>
                        <div className='bg-gray-100 p-4 rounded'>
                            <p className='text-sm text-gray-600'>
                                Wallet Connected:
                            </p>
                            <p className='font-mono'>{connectedAccountId}</p>
                        </div>

                        {isAuthenticated ? (
                            <div className='space-y-4'>
                                <div className='bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded'>
                                    <strong>✅ Authenticated</strong>
                                    <p className='mt-1'>
                                        Account ID:{' '}
                                        <span className='font-mono'>
                                            {accountId}
                                        </span>
                                    </p>
                                </div>

                                <div className='flex gap-2'>
                                    <button
                                        onClick={handleLogout}
                                        disabled={loading}
                                        className='px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50'
                                    >
                                        {loading ? 'Logging out...' : 'Logout'}
                                    </button>

                                    <button
                                        onClick={testProtectedEndpoint}
                                        className='px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
                                    >
                                        Test Protected Endpoint
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className='space-y-4'>
                                <div className='bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded'>
                                    <strong>ℹ️ Not Authenticated</strong>
                                    <p className='mt-1'>
                                        Click the button below to sign a message
                                        and authenticate
                                    </p>
                                </div>

                                <button
                                    onClick={handleLogin}
                                    disabled={loading}
                                    className='w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50'
                                >
                                    {loading
                                        ? 'Authenticating...'
                                        : 'Login with Hedera Wallet'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className='bg-gray-100 rounded-lg p-6'>
                <h3 className='text-lg font-semibold mb-2'>ℹ️ How it works</h3>
                <ol className='list-decimal list-inside space-y-2 text-sm'>
                    <li>Click &ldquo;Login with Hedera Wallet&rdquo;</li>
                    <li>Your wallet will ask you to sign a message</li>
                    <li>The signature is verified on the server (no fees!)</li>
                    <li>You receive a secure JWT token in a cookie</li>
                    <li>All future requests are automatically authenticated</li>
                </ol>
            </div>

            <div className='bg-gray-100 rounded-lg p-6'>
                <h3 className='text-lg font-semibold mb-2'>
                    🔒 Security Features
                </h3>
                <ul className='list-disc list-inside space-y-1 text-sm'>
                    <li>No transaction fees (off-chain signing)</li>
                    <li>One-time nonces (expire in 5 minutes)</li>
                    <li>HttpOnly cookies (protected from XSS)</li>
                    <li>JWT tokens (expire in 7 days)</li>
                    <li>Automatic logout on wallet disconnect</li>
                </ul>
            </div>
        </div>
    )
}

/**
 * Ejemplo de endpoint protegido
 * Archivo: pages/api/protected-example.ts
 */
/*
import { withAuth, type AuthenticatedRequest } from '@/lib/auth-middleware'
import type { NextApiResponse } from 'next'

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    // El usuario está autenticado, req.user.accountId está disponible
    const accountId = req.user.accountId

    // Tu lógica aquí...
    const data = {
        message: 'This is a protected endpoint',
        accountId,
        timestamp: new Date().toISOString(),
    }

    return res.status(200).json(data)
}

export default withAuth(handler)
*/
