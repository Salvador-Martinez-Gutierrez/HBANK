'use client'

import { HCFTradingInterface } from './components/hcf-trading-interface'
import { HCFApyCard } from './components/hcf-apy-card'
import { HCFInfoCard } from './components/hcf-info-card'
import { HCFStatsCards } from './components/hcf-stats-cards'
import { HCFExplainer } from './components/hcf-explainer'
import { TestnetUsdcFaucet } from '../vault/components/testnet-usdc-faucet'

export default function HCFVaultPage() {
    // Mock data for HCF APY
    const apy = '13.33'

    return (
        <div className='h-full'>
            <div className='p-8'>
                {/* Stats Cards - Only visible on small screens, displayed on top */}
                <div className='md:hidden mb-6'>
                    <HCFStatsCards />
                </div>

                <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
                    {/* Main Trading Interface */}
                    <div className='md:col-span-2'>
                        <TestnetUsdcFaucet />
                        <HCFExplainer />
                        <HCFTradingInterface />
                    </div>

                    {/* Sidebar Information - Only visible on medium+ screens */}
                    <div className='hidden md:block space-y-6'>
                        <HCFApyCard apy={apy} />
                        <HCFInfoCard />
                    </div>
                </div>

                {/* ApyCard and InfoCard - Only visible on small screens, displayed below trading interface */}
                <div className='md:hidden mt-6 space-y-6'>
                    <HCFApyCard apy={apy} />
                    <HCFInfoCard />
                </div>
            </div>
        </div>
    )
}
