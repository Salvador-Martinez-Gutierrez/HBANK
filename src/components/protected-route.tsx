/**
 * Componente de protección para páginas que requieren autenticación
 * Muestra un mensaje y botón de autenticación si el usuario no está autenticado
 */

'use client'

import { useAccountId, useWallet } from '@buidlerlabs/hashgraph-react-wallets'
import { useHederaAuth } from '@/hooks/useHederaAuth'
import { HederaAuthButton } from './hedera-auth-button'
import { ConnectWalletButton } from './connect-wallet-button'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from './ui/card'
import { Shield, Wallet, Lock } from 'lucide-react'
import { ReactNode } from 'react'

interface ProtectedRouteProps {
    children: ReactNode
    requireAuth?: boolean
    loadingComponent?: ReactNode
    unauthorizedComponent?: ReactNode
}

export function ProtectedRoute({
    children,
    requireAuth = true,
    loadingComponent,
    unauthorizedComponent,
}: ProtectedRouteProps) {
    const { isConnected } = useWallet()
    const { data: connectedAccountId } = useAccountId()
    const { isAuthenticated, loading } = useHederaAuth({
        currentWalletId: connectedAccountId,
    })

    // Si no requiere autenticación, mostrar directamente
    if (!requireAuth) {
        return <>{children}</>
    }

    // Mientras carga, mostrar loading
    if (loading) {
        if (loadingComponent) {
            return <>{loadingComponent}</>
        }

        return (
            <div className='flex items-center justify-center min-h-[60vh]'>
                <div className='text-center space-y-4'>
                    <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto'></div>
                    <p className='text-gray-600'>Checking authentication...</p>
                </div>
            </div>
        )
    }

    // Si no está conectado, mostrar mensaje de conexión
    if (!isConnected || !connectedAccountId) {
        return (
            <div className='flex items-center justify-center min-h-[60vh] p-4'>
                <Card className='max-w-md w-full'>
                    <CardHeader className='text-center'>
                        <div className='mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center'>
                            <Wallet className='w-6 h-6 text-blue-600' />
                        </div>
                        <CardTitle>Connect Your Wallet</CardTitle>
                        <CardDescription>
                            Please connect your Hedera wallet to access this
                            page
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='text-center'>
                        <ConnectWalletButton />
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Si está conectado pero no autenticado, mostrar mensaje de autenticación
    if (!isAuthenticated) {
        if (unauthorizedComponent) {
            return <>{unauthorizedComponent}</>
        }

        return (
            <div className='flex items-center justify-center min-h-[60vh] p-4'>
                <Card className='max-w-md w-full'>
                    <CardHeader className='text-center'>
                        <div className='mx-auto mb-4 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center'>
                            <Lock className='w-6 h-6 text-yellow-600' />
                        </div>
                        <CardTitle>Authentication Required</CardTitle>
                        <CardDescription>
                            Please sign a message with your wallet to access
                            your portfolio
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm'>
                            <div className='flex items-start gap-2'>
                                <Shield className='w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5' />
                                <div>
                                    <p className='font-semibold text-blue-900 mb-1'>
                                        Secure & Free
                                    </p>
                                    <ul className='text-blue-700 space-y-1'>
                                        <li>• No transaction fees</li>
                                        <li>• Off-chain signature</li>
                                        <li>• Your keys, your control</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className='text-center'>
                            <p className='text-sm text-gray-600 mb-4'>
                                Connected as:{' '}
                                <span className='font-mono'>
                                    {connectedAccountId}
                                </span>
                            </p>
                            <HederaAuthButton />
                        </div>

                        <p className='text-xs text-gray-500 text-center'>
                            By signing, you agree to authenticate your session.
                            This does not give us access to your funds or
                            execute any transactions.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Si está autenticado, mostrar el contenido protegido
    return <>{children}</>
}
