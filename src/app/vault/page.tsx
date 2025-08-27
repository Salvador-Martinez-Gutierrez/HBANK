'use client'

import { TradingInterface } from './components/trading-interface'
import { ApyCard } from './components/apy-card'
import { InfoCard } from './components/info-card'
import { StatsCards } from './components/stats-cards'
import { useWallet } from '@buidlerlabs/hashgraph-react-wallets'
import { useAccountId } from './hooks/useAccountID'

export default function VaultPage() {
    const { isConnected } = useWallet()
    const accountId = useAccountId() // Usar el hook personalizado

    // Mock exchange rate and data
    const exchangeRate = 1.0 // Changed to 1:1 exchange rate
    const apy = '13.33'

    return (
        <div className='h-full'>
            <div className='p-8'>
                {/* Stats Cards - Only visible on small screens, displayed on top */}
                <div className='md:hidden mb-6'>
                    <StatsCards />
                </div>

                {isConnected && accountId ? (
                    <div className='mb-4'>
                        <p className='text-sm text-muted-foreground'>
                            Cuenta conectada: {accountId}
                        </p>
                    </div>
                ) : isConnected ? (
                    <p className='text-sm text-muted-foreground mb-4'>
                        Obteniendo información de la cuenta...
                    </p>
                ) : (
                    <p className='text-sm text-muted-foreground mb-4'>
                        Por favor, conecta tu wallet para depositar
                    </p>
                )}

                <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
                    {/* Main Trading Interface */}
                    <div className='md:col-span-2'>
                        <TradingInterface exchangeRate={exchangeRate} />
                    </div>

                    {/* Sidebar Information - Only visible on medium+ screens */}
                    <div className='hidden md:block space-y-6'>
                        <ApyCard apy={apy} />
                        <InfoCard />
                    </div>
                </div>
            </div>
        </div>
    )
}
