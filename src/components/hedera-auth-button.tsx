/**
 * Botón de Login/Logout con Hedera Wallet Authentication
 * Integrado con el sistema de autenticación existente
 */

'use client'

import { useState } from 'react'
import { useAccountId, useWallet } from '@buidlerlabs/hashgraph-react-wallets'
import { Button } from '@/components/ui/button'
import { useHederaAuth } from '@/hooks/useHederaAuth'
import { useSignMessage } from '@/hooks/useSignMessage'
import { Loader2, LogIn, LogOut, ShieldCheck } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

export function HederaAuthButton() {
    const { isConnected } = useWallet()
    const { data: connectedAccountId } = useAccountId()
    const { signMessage, isReady } = useSignMessage()
    const { success, error: showError } = useToast()
    const [isAuthenticating, setIsAuthenticating] = useState(false)

    const { isAuthenticated, accountId, signIn, signOut } = useHederaAuth({
        currentWalletId: connectedAccountId,
    })

    const handleLogin = async () => {
        try {
            setIsAuthenticating(true)

            if (!isConnected || !connectedAccountId) {
                showError('Please connect your Hedera wallet first')
                return
            }

            if (!isReady) {
                showError('Please wait for your wallet to be fully connected')
                return
            }

            // Start the authentication process
            const result = await signIn(connectedAccountId, signMessage)

            if (result.success) {
                success(
                    `✅ Authentication successful! Logged in as ${connectedAccountId}`
                )
            } else {
                showError(
                    `❌ Authentication failed: ${
                        result.error || 'Please try again'
                    }`
                )
            }
        } catch (error) {
            showError(
                error instanceof Error ? error.message : 'Authentication error'
            )
        } finally {
            setIsAuthenticating(false)
        }
    }

    const handleLogout = async () => {
        try {
            setIsAuthenticating(true)

            const result = await signOut()

            if (result.success) {
                success('✅ Logged out successfully')
            }
        } catch {
            showError('Failed to logout')
        } finally {
            setIsAuthenticating(false)
        }
    }

    // Si no hay wallet conectada, no mostrar el botón
    if (!isConnected || !connectedAccountId) {
        return null
    }

    // Si está autenticado, mostrar botón de logout
    if (isAuthenticated && accountId) {
        return (
            <Button
                onClick={handleLogout}
                disabled={isAuthenticating}
                variant='outline'
                size='sm'
                className='gap-2'
            >
                {isAuthenticating ? (
                    <>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        Logging out...
                    </>
                ) : (
                    <>
                        <ShieldCheck className='h-4 w-4 text-green-600' />
                        Authenticated
                        <LogOut className='h-4 w-4 ml-2' />
                    </>
                )}
            </Button>
        )
    }

    // Si no está autenticado, mostrar botón de login
    return (
        <Button
            onClick={handleLogin}
            disabled={isAuthenticating || !isReady}
            size='sm'
            className='gap-2'
        >
            {isAuthenticating ? (
                <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Signing message...
                </>
            ) : (
                <>
                    <LogIn className='h-4 w-4' />
                    Sign to Authenticate
                </>
            )}
        </Button>
    )
}
