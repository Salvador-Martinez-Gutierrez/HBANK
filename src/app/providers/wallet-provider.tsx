'use client'

import React from 'react'
import { HWBridgeProvider } from '@buidlerlabs/hashgraph-react-wallets'
import {
    HWCConnector,
    HashpackConnector,
    KabilaConnector,
} from '@buidlerlabs/hashgraph-react-wallets/connectors'
import { HederaTestnet } from '@buidlerlabs/hashgraph-react-wallets/chains'

export function WalletProvider({ children }: { children: React.ReactNode }) {
    // Obtener el projectId de las variables de entorno
    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

    if (!projectId) {
        console.error('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set')
        // Usar el ID hardcodeado como fallback para desarrollo
        console.warn('Using fallback projectId for development')
    }

    // Usar tu dominio de Vercel o localhost para desarrollo
    const getAppUrl = () => {
        if (typeof window !== 'undefined') {
            return window.location.origin
        }
        // Para producción, usar tu dominio de Vercel
        return process.env.NEXT_PUBLIC_APP_URL || 'https://tu-app.vercel.app'
    }

    const metadata = {
        name: 'Valora Protocol',
        description:
            'Valora Protocol streamlines the emission of Liquid Yield Tokens.',
        icons: [`${getAppUrl()}/valora_logo_no_bg.png`],
        url: getAppUrl(),
    }

    return (
        <HWBridgeProvider
            metadata={metadata}
            projectId={projectId || 'eb3e42580d8e325d52e2edd599b9c567'}
            connectors={[HWCConnector, HashpackConnector, KabilaConnector]}
            chains={[HederaTestnet]}
        >
            {children}
        </HWBridgeProvider>
    )
}

export default WalletProvider
