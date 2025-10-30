'use client'

import React from 'react'
import { HWBridgeProvider } from '@buidlerlabs/hashgraph-react-wallets'
import {
    HWCConnector,
    HashpackConnector,
    KabilaConnector,
} from '@buidlerlabs/hashgraph-react-wallets/connectors'
import { HederaTestnet } from '@buidlerlabs/hashgraph-react-wallets/chains'
import { logger } from '@/lib/logger'


export function WalletProvider({ children }: { children: React.ReactNode }) {
    // Get projectId from environment variables
    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

    // IMPORTANTE: No usar fallback hardcodeado en producción
    if (!projectId) {
        logger.error('❌ NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set')
        throw new Error(
            'WalletConnect Project ID is required. Please set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in your environment variables.'
        )
    }

    logger.info(
        '🔍 Using WalletConnect Project ID:',
        projectId.substring(0, 8) + '...'
    )

    const getAppUrl = () => {
        if (typeof window !== 'undefined') {
            return window.location.origin
        }

        return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    }

    const appUrl = getAppUrl()
    logger.info('🌐 Using App URL:', appUrl)

    const metadata = {
        name: 'Hbank',
        description:
            'The Onchain Neobank to Grow Your Wealth.',
        icons: [`${appUrl}/hbabk-logo.png`],
        url: appUrl,
    }

    return (
        <HWBridgeProvider
            metadata={metadata}
            projectId={projectId}
            connectors={[HWCConnector, HashpackConnector, KabilaConnector]}
            chains={[HederaTestnet]}
        >
            {children}
        </HWBridgeProvider>
    )
}

export default WalletProvider
