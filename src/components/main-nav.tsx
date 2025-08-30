'use client'

import { ThemeToggle } from '@/components/theme-toggle'
import { MobileSidebar } from './mobile-sidebar'
// import { ConnectWalletButton } from '@/components/connect-wallet-button' // Eliminar si no se usa
import { SessionActionButtons } from './session-action-buttons'

// TODO: These values should be fetched from an API endpoint
const METRICS_DATA = [
    { label: 'Total TVL', value: '$11,222,333' },
    { label: 'hUSD APY', value: '13.33%' },
]

export function MainNav() {
    return (
        <nav className='sticky top-0 z-50 w-full border-b border-blue-500 bg-background'>
            <div className='container flex h-18 md:h-20 max-w-screen-2xl items-center justify-between px-8'>
                {/* Left side - TVL and APY values (desktop only) */}
                <div className='hidden md:flex items-center space-x-6'>
                    {METRICS_DATA.map((metric, index) => (
                        <div key={index} className='flex flex-col'>
                            <span className='text-md font-bold text-muted-foreground'>
                                {metric.label}
                            </span>
                            <span className='font-semibold text-blue-500'>
                                {metric.value}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Mobile menu button */}
                <div className='flex items-start md:hidden'>
                    <MobileSidebar />
                </div>

                {/* Spacer for mobile layout */}
                <div className='flex-1 md:hidden' />

                {/* Right side actions */}
                <div className='flex items-center space-x-2'>
                    <SessionActionButtons />
                    <ThemeToggle />
                </div>
            </div>
        </nav>
    )
}
