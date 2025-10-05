'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import Image from 'next/image'
import { TrendingUp, Coins, ChevronDown, ChevronUp } from 'lucide-react'

export function HCFExplainer() {
    const [isExpanded, setIsExpanded] = useState(false)

    return (
        <Card className='py-0 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-purple-300 dark:border-purple-700 mb-6'>
            <CardContent className='p-6'>
                <div className='space-y-4'>
                    {/* Header - Always Visible */}
                    <div 
                        className='flex items-center justify-between cursor-pointer'
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <div className='flex items-center gap-3'>
                            <div className='p-2 bg-purple-500 rounded-lg'>
                                <Coins className='w-6 h-6 text-white' />
                            </div>
                            <div>
                                <h3 className='text-xl font-bold text-purple-900 dark:text-purple-100'>
                                    Hedera Community Fund (HCF)
                                </h3>
                                <p className='text-sm text-purple-700 dark:text-purple-300'>
                                    A new mechanism for onchain fundraising
                                </p>
                            </div>
                        </div>
                        <button 
                            className='p-2 hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full transition-colors'
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                            {isExpanded ? (
                                <ChevronUp className='w-5 h-5 text-purple-700 dark:text-purple-300' />
                            ) : (
                                <ChevronDown className='w-5 h-5 text-purple-700 dark:text-purple-300' />
                            )}
                        </button>
                    </div>

                    {/* Collapsible Content */}
                    {isExpanded && (
                        <>
                            {/* How it works section */}
                            <div className='bg-white/50 dark:bg-black/20 rounded-lg p-4 space-y-3'>
                        <h4 className='font-semibold text-purple-900 dark:text-purple-100 flex items-center gap-2'>
                            <TrendingUp className='w-4 h-4' />
                            How It Works
                        </h4>

                        {/* Step by step flow */}
                        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                            {/* Step 1 */}
                            <div className='flex flex-col items-center text-center space-y-2'>
                                <div className='w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg'>
                                    1
                                </div>
                                <div className='space-y-1'>
                                    <p className='text-sm text-muted-foreground'>
                                        Deposit USDC into the Vault
                                    </p>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className='flex flex-col items-center text-center space-y-2'>
                                <div className='w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg'>
                                    2
                                </div>
                                <div className='space-y-1'>
                                    <p className='text-sm text-muted-foreground'>
                                        Generated Yield buys pre-TGE tokens
                                    </p>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className='flex flex-col items-center text-center space-y-2'>
                                <div className='w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg'>
                                    3
                                </div>
                                <div className='space-y-1'>
                                    <p className='text-sm text-muted-foreground'>
                                        Claim your Pre-TGE Tokens 
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Current project highlight */}
                    <div className='bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 rounded-lg p-4 border-2 border-purple-300 dark:border-purple-600'>
                        <div className='space-y-4'>
                            <div className='flex items-center justify-between flex-wrap gap-3'>
                                <div className='flex items-center gap-3'>
                                    <Image
                                        src='/HB.png'
                                        alt='HB Token'
                                        width={40}
                                        height={40}
                                        className='rounded-full'
                                    />
                                    <div>
                                        <p className='text-sm font-semibold text-purple-900 dark:text-purple-100'>
                                            Current Project
                                        </p>
                                        <p className='text-lg font-bold text-purple-600 dark:text-purple-300'>
                                            $HB Token
                                        </p>
                                    </div>
                                </div>
                                <div className='text-right'>
                                    <p className='text-xs text-muted-foreground'>
                                        Your yield purchases
                                    </p>
                                    <p className='text-sm font-semibold text-purple-900 dark:text-purple-100'>
                                        Pre-TGE $HB Tokens
                                    </p>
                                </div>
                            </div>

                            {/* Token Sale Conditions */}
                            <div className='border-t border-purple-300 dark:border-purple-600 pt-3'>
                                <p className='text-xs font-semibold text-purple-900 dark:text-purple-100 mb-2'>
                                    Token Sale Conditions
                                </p>
                                <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                                    <div className='bg-white/50 dark:bg-black/30 rounded-lg p-2'>
                                        <p className='text-xs text-muted-foreground'>Total Supply</p>
                                        <p className='text-sm font-bold text-purple-900 dark:text-purple-100'>
                                            10,000,000
                                        </p>
                                    </div>
                                    <div className='bg-white/50 dark:bg-black/30 rounded-lg p-2'>
                                        <p className='text-xs text-muted-foreground'>Tokens for Sale</p>
                                        <p className='text-sm font-bold text-purple-900 dark:text-purple-100'>
                                            100,000
                                        </p>
                                    </div>
                                    <div className='bg-white/50 dark:bg-black/30 rounded-lg p-2'>
                                        <p className='text-xs text-muted-foreground'>Price per Token</p>
                                        <p className='text-sm font-bold text-purple-900 dark:text-purple-100'>
                                            $0.10
                                        </p>
                                    </div>
                                    <div className='bg-white/50 dark:bg-black/30 rounded-lg p-2'>
                                        <p className='text-xs text-muted-foreground'>FDV</p>
                                        <p className='text-sm font-bold text-purple-900 dark:text-purple-100'>
                                            $1,000,000
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
