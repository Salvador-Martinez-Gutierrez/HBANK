'use client'

import { TradingInterface } from './components/trading-interface'
import { ApyCard } from './components/apy-card'
import { InfoCard } from './components/info-card'
import { StatsCards } from './components/stats-cards'
import { TestnetUsdcFaucet } from './components/testnet-usdc-faucet'
import { Eye, TrendingUp } from 'lucide-react'
import Link from 'next/link'

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
                        <TestnetUsdcFaucet />
                        <TradingInterface />
                    </div>

                    {/* Sidebar Information - Only visible on medium+ screens */}
                    <div className='hidden md:block space-y-6'>
                        <ApyCard apy={apy} />
                        <InfoCard>
                            <strong>hUSD</strong> is a yield bearing token earning rewards, so it&apos;s dollar value is always higher than the base stablecoin. You are still getting the same dollar amount of the token when you mint.
                        </InfoCard>
                        
                        {/* Navigation Buttons */}
                        <div className='grid grid-cols-2 gap-2 lg:max-w-2/3'>
                            <Link
                                href='/earn/transparency'
                                className='flex flex-col items-center justify-center p-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-all duration-200 group'
                            >
                                <Eye className='h-5 w-5 mb-1.5 text-muted-foreground group-hover:text-foreground transition-colors' />
                                <span className='text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors'>
                                    Transparency
                                </span>
                            </Link>
                            <Link
                                href='/earn/performance'
                                className='flex flex-col items-center justify-center p-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-all duration-200 group'
                            >
                                <TrendingUp className='h-5 w-5 mb-1.5 text-muted-foreground group-hover:text-foreground transition-colors' />
                                <span className='text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors'>
                                    Performance
                                </span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* ApyCard and InfoCard - Only visible on small screens, displayed below trading interface */}
                <div className='md:hidden mt-6 space-y-6'>
                    <ApyCard apy={apy} />
                    <InfoCard>
                        <strong>hUSD</strong> is a yield bearing token earning rewards, so it&apos;s dollar value is always higher than the base stablecoin. You are still getting the same dollar amount of the token when you mint.
                    </InfoCard>
                    
                    {/* Navigation Buttons */}
                    <div className='grid grid-cols-2 gap-2'>
                        <Link
                            href='/earn/transparency'
                            className='flex flex-col items-center justify-center p-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-all duration-200 group'
                        >
                            <Eye className='h-5 w-5 mb-1.5 text-muted-foreground group-hover:text-foreground transition-colors' />
                            <span className='text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors'>
                                Transparency
                            </span>
                        </Link>
                        <Link
                            href='/earn/performance'
                            className='flex flex-col items-center justify-center p-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-all duration-200 group'
                        >
                            <TrendingUp className='h-5 w-5 mb-1.5 text-muted-foreground group-hover:text-foreground transition-colors' />
                            <span className='text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors'>
                                Performance
                            </span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
