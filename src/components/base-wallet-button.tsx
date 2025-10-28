'use client'

import { Button } from '@/components/ui/button'
import { useWallet } from '@buidlerlabs/hashgraph-react-wallets'
import {
    HashpackConnector,
    HWCConnector,
    KabilaConnector,
} from '@buidlerlabs/hashgraph-react-wallets/connectors'
import Image, { StaticImageData } from 'next/image'
import { useState } from 'react'
import { logger } from '@/lib/logger'


export interface WalletConfig {
    id: string
    name: string
    icon: string | StaticImageData
    iconSize: { width: number; height: number }
    connector:
        | typeof HashpackConnector
        | typeof KabilaConnector
        | typeof HWCConnector
    mobileSupported: boolean
}

export interface WalletButtonProps {
    onWalletSelect?: () => void
    onWalletConnected?: () => void
    config: WalletConfig
}

const BaseWalletButton = ({
    config,
    onWalletSelect,
    onWalletConnected,
}: WalletButtonProps) => {
    const { connect } = useWallet(config.connector)
    const [isConnecting, setIsConnecting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleConnect = async () => {
        try {
            setIsConnecting(true)
            setError(null)
            onWalletSelect?.()

            // Verify if it is WalletConnect and there is projectId
            if (config.id === 'walletconnect') {
                const projectId =
                    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
                if (!projectId) {
                    throw new Error('WalletConnect Project ID not configured')
                }
            }

            await connect()
            onWalletConnected?.()
        } catch (error: unknown) {
            logger.error(`Failed to connect with ${config.name}:`, error)
            const errorMessage =
                error instanceof Error ? error.message : 'Connection failed'
            setError(errorMessage)

            // Show specific message for WalletConnect
            if (
                config.id === 'walletconnect' &&
                errorMessage.includes('Subscribing')
            ) {
                setError(
                    'WalletConnect connection failed. Please check your internet connection and try again.'
                )
            }
        } finally {
            setIsConnecting(false)
        }
    }

    return (
        <div className='flex flex-col items-center gap-2'>
            <Button
                onClick={() => void handleConnect()}
                disabled={isConnecting}
                className='bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 w-24 h-24 flex flex-col items-center justify-center gap-2 rounded-xl transition-all duration-200'
            >
                {isConnecting ? (
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-white'></div>
                ) : (
                    <Image
                        src={config.icon}
                        alt={`${config.name} Wallet`}
                        width={48}
                        height={48}
                    />
                )}
            </Button>

            {isConnecting && (
                <p className='text-xs text-gray-400'>Connecting...</p>
            )}

            {error && (
                <p className='text-xs text-red-400 text-center max-w-24 break-words'>
                    {error}
                </p>
            )}
        </div>
    )
}

export default BaseWalletButton
