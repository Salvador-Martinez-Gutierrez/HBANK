'use client'

import { TradingInterface } from './components/trading-interface'
import { ApyCard } from './components/apy-card'
import { InfoCard } from './components/info-card'
import { StatsCards } from './components/stats-cards'

export default function VaultPage() {
    // Mock data
    const apy = '13.33'

    return (
        <div className='h-full'>
            <div className='p-8'>
                {/* Stats Cards - Only visible on small screens, displayed on top */}
                <div className='md:hidden mb-6'>
                    <StatsCards />
                </div>

                <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
                    {/* Main Trading Interface */}
                    <div className='md:col-span-2'>
                        <TradingInterface />
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
