'use client'

import { ThemeToggle } from '@/components/theme-toggle'
import { MobileSidebar } from './mobile-sidebar'
import { SessionActionButtons } from './session-action-buttons'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { useTVL } from '@/hooks/useTVL'

export function MainNav() {
    const { formattedTVL, loading: tvlLoading } = useTVL()

    // Static APY data (this one doesn't need to be dynamic)
    const METRICS_DATA = [
        {
            label: 'Total TVL',
            value: tvlLoading ? 'Loading...' : formattedTVL,
            tooltip:
                'Total Value Locked represents the total amount of USDC deposited into the protocol and backing hUSD tokens.',
        },
        {
            label: 'hUSD APY',
            value: '13.33%',
            tooltip:
                'Annual Percentage Yield earned by hUSD holders through USDC deployments in bluechip DeFi protocols. Currently hardcoded at 13.33%.',
        },
    ]

    return (
        <nav className='sticky top-0 z-50 w-full border-b border-blue-500 bg-background'>
            <div className='container flex h-18 md:h-20 max-w-screen-2xl items-center justify-between px-8'>
                {/* Left side - TVL and APY values (desktop only) */}
                <div className='hidden md:flex items-center space-x-6'>
                    {METRICS_DATA.map((metric, index) => (
                        <div key={index} className='flex flex-col'>
                            <div className='flex items-center gap-2'>
                                <span className='text-md font-bold text-muted-foreground'>
                                    {metric.label}
                                </span>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button className='inline-flex items-center justify-center w-5 h-5 rounded-full border border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-foreground transition-colors'>
                                            <span className='text-xs font-medium'>
                                                i
                                            </span>
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        className='max-w-sm p-3 bg-neutral-900 text-white border-neutral-200 [&>svg]:bg-neutral-900 [&>svg]:fill-neutral-900'
                                        side='top'
                                    >
                                        <p>{metric.tooltip}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
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
