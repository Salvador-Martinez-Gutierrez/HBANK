'use client'

import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { TokenInput } from './token-input'
import { SwapButton } from './swap-button'
import { TransactionDetails } from './transaction-details'
import { ConnectWalletButton } from '@/components/connect-wallet-button'
import { MintActionButton } from './mint-action-button'
import { RedeemActionButton } from './redeem-action-button'
import { RealTimeRateDisplay } from '@/components/real-time-rate-display'
import { HistoryCards } from '@/components/history-cards'
import { useWallet, useAccountId } from '@buidlerlabs/hashgraph-react-wallets'
import { useTokenBalances } from '../hooks/useTokenBalances'
import { useRealTimeRate } from '@/hooks/useRealTimeRate'
import { useInstantWithdraw } from '@/hooks/useInstantWithdraw'
import { INSTANT_WITHDRAW_FEE } from '@/app/constants'

export function TradingInterface() {
    // State management
    const [activeTab, setActiveTab] = useState<'mint' | 'redeem' | 'history'>(
        'mint'
    )
    const [fromAmount, setFromAmount] = useState('')
    const [toAmount, setToAmount] = useState('')
    const [redeemType, setRedeemType] = useState<'instant' | 'standard'>(
        'instant'
    )
    const [isPopoverOpen, setIsPopoverOpen] = useState(false)
    const { isConnected } = useWallet()
    const { data: accountId } = useAccountId()
    const {
        balances,
        loading: balancesLoading,
        refreshBalances,
    } = useTokenBalances()

    // Real-time rate hook
    const { rateData } = useRealTimeRate()

    // Instant withdrawal hook for checking limits
    const { maxInstantWithdrawable, isLoading: isLoadingMaxAmount } =
        useInstantWithdraw()

    // Token configuration based on active tab
    const fromToken = activeTab === 'mint' ? 'USDC' : 'hUSD'
    const toToken = activeTab === 'mint' ? 'hUSD' : 'USDC'
    const fromIcon = activeTab === 'mint' ? '/usdc.svg' : '/usdc.svg|grey'
    const toIcon = activeTab === 'mint' ? '/usdc.svg|grey' : '/usdc.svg'

    // Event handlers
    const handleSwap = () => {
        setActiveTab(activeTab === 'mint' ? 'redeem' : 'mint')
        setFromAmount(toAmount)
        setToAmount(fromAmount)
    }

    const handleFromAmountChange = (value: string) => {
        setFromAmount(value)
        if (value && !isNaN(parseFloat(value)) && rateData) {
            let calculatedTo: number
            if (activeTab === 'mint') {
                // USDC to hUSD: divide by rate
                calculatedTo = parseFloat(value) / rateData.rate
            } else {
                // hUSD to USDC: multiply by rate
                calculatedTo = parseFloat(value) * rateData.rate

                // For instant withdrawals, check if calculated USDC exceeds max instant limit
                if (
                    redeemType === 'instant' &&
                    calculatedTo > maxInstantWithdrawable
                ) {
                    // Calculate max hUSD based on instant withdrawal limit
                    const maxHUSD = maxInstantWithdrawable / rateData.rate
                    setFromAmount(maxHUSD.toFixed(6))
                    calculatedTo = maxInstantWithdrawable
                }
            }
            setToAmount(calculatedTo.toFixed(6))
        } else {
            setToAmount('')
        }
    }

    const handleInputClear = () => {
        setFromAmount('')
        setToAmount('')
    }

    // Handlers for redeem type selection
    const handleRedeemTypeSelect = (type: 'instant' | 'standard') => {
        setRedeemType(type)
        setIsPopoverOpen(false) // Close the popover after selection
    }

    // TODO: This should be fetched from an API endpoint
    const getUsdValue = (amount: string) => {
        return amount ? `$${(parseFloat(amount) * 1.0).toFixed(4)}` : '$0.0000'
    }

    const renderTabContent = () => (
        <div className='space-y-4'>
            {/* Token Inputs - Responsive Layout */}
            <div className='flex flex-col lg:flex-row lg:items-center gap-4'>
                {/* From Token */}
                <div className='flex-1'>
                    <TokenInput
                        label='You Pay'
                        value={fromAmount}
                        onChange={handleFromAmountChange}
                        tokenSymbol={fromToken}
                        tokenIcon={fromIcon}
                        usdValue={getUsdValue(fromAmount)}
                        balance={balances[fromToken as keyof typeof balances]}
                        showBalance={isConnected}
                        isLoadingBalance={balancesLoading}
                    />
                </div>

                {/* Swap Arrow */}
                <div className='flex justify-center lg:flex-shrink-0'>
                    <SwapButton onClick={handleSwap} />
                </div>

                {/* To Token */}
                <div className='flex-1'>
                    <TokenInput
                        label='You Get'
                        value={toAmount}
                        readOnly
                        tokenSymbol={toToken}
                        tokenIcon={toIcon}
                        usdValue={getUsdValue(toAmount)}
                        balance={balances[toToken as keyof typeof balances]}
                        showBalance={isConnected}
                        isLoadingBalance={balancesLoading}
                    />
                </div>
            </div>

            {/* Instant withdrawal limit warning */}
            {activeTab === 'redeem' && redeemType === 'instant' && rateData && (
                <div className='bg-blue-50 border border-blue-200 p-3 rounded-lg'>
                    <div className='text-sm text-blue-800'>
                        <strong>Instant Withdrawal Limit:</strong> Maximum{' '}
                        {maxInstantWithdrawable.toFixed(6)} USDC (
                        {(maxInstantWithdrawable / rateData.rate).toFixed(6)}{' '}
                        hUSD at current rate)
                    </div>
                    {isLoadingMaxAmount && (
                        <div className='text-xs text-blue-600 mt-1'>
                            Checking treasury balance...
                        </div>
                    )}
                </div>
            )}

            {/* Tab-specific action button */}
            {activeTab === 'mint' ? (
                <MintActionButton
                    fromAmount={fromAmount}
                    toAmount={toAmount}
                    usdcBalance={balances.USDC}
                    onBalanceRefresh={refreshBalances}
                    onInputClear={handleInputClear}
                    rateData={rateData}
                />
            ) : activeTab === 'redeem' ? (
                <RedeemActionButton
                    fromAmount={fromAmount}
                    hUSDBalance={parseFloat(balances.hUSD) || 0}
                    onBalanceRefresh={refreshBalances}
                    onInputClear={handleInputClear}
                    rateData={rateData || undefined}
                    redeemType={redeemType}
                />
            ) : (
                /* For history tab, show connect wallet for now */
                <ConnectWalletButton variant='full-width' />
            )}

            {/* Real-time Rate Display */}
            <RealTimeRateDisplay showDetails={true} />

            {/* Transaction Details */}
            <TransactionDetails exchangeRate={rateData?.rate || 1.0} />
        </div>
    )

    return (
        <Card className='bg-card/80 backdrop-blur-sm border-border/50'>
            <CardHeader>
                <div className='flex items-center justify-between'>
                    <Tabs
                        defaultValue='mint'
                        value={activeTab}
                        onValueChange={(value) =>
                            setActiveTab(value as 'mint' | 'redeem' | 'history')
                        }
                    >
                        <TabsList>
                            <TabsTrigger
                                value='mint'
                                className='data-[state=active]:bg-blue-500 data-[state=active]:text-white dark:data-[state=active]:bg-blue-500 dark:data-[state=active]:text-white'
                            >
                                Mint
                            </TabsTrigger>
                            <TabsTrigger
                                value='redeem'
                                className='data-[state=active]:bg-blue-500 data-[state=active]:text-white dark:data-[state=active]:bg-blue-500 dark:data-[state=active]:text-white'
                            >
                                Redeem
                            </TabsTrigger>
                            <TabsTrigger
                                value='history'
                                className='data-[state=active]:bg-blue-500 data-[state=active]:text-white dark:data-[state=active]:bg-blue-500 dark:data-[state=active]:text-white'
                            >
                                History
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Transaction Type Selector - Only for Redeem Tab */}
                    {activeTab === 'redeem' && (
                        <div className='flex items-center'>
                            <Popover
                                open={isPopoverOpen}
                                onOpenChange={setIsPopoverOpen}
                            >
                                <PopoverTrigger asChild>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        className='p-2 gap-1 h-10'
                                    >
                                        {redeemType === 'instant' ? (
                                            <svg
                                                className='w-4 h-4'
                                                fill='currentColor'
                                                viewBox='0 0 20 20'
                                            >
                                                <path
                                                    fillRule='evenodd'
                                                    d='M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z'
                                                    clipRule='evenodd'
                                                />
                                            </svg>
                                        ) : (
                                            <svg
                                                className='w-4 h-4'
                                                fill='currentColor'
                                                viewBox='0 0 20 20'
                                            >
                                                <path
                                                    fillRule='evenodd'
                                                    d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z'
                                                    clipRule='evenodd'
                                                />
                                            </svg>
                                        )}
                                        <svg
                                            className='w-4 h-4'
                                            fill='currentColor'
                                            viewBox='0 0 20 20'
                                        >
                                            <path
                                                fillRule='evenodd'
                                                d='M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z'
                                                clipRule='evenodd'
                                            />
                                        </svg>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className='w-80 p-0'
                                    align='end'
                                >
                                    <div className='p-4'>
                                        <h3 className='text-lg font-semibold mb-4'>
                                            Transaction Type
                                        </h3>
                                        <div className='space-y-2'>
                                            {/* Instant Option */}
                                            <Button
                                                variant={
                                                    redeemType === 'instant'
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                onClick={() =>
                                                    handleRedeemTypeSelect(
                                                        'instant'
                                                    )
                                                }
                                                className={`w-full p-4 h-auto justify-start ${
                                                    redeemType === 'instant'
                                                        ? 'border-blue-500 bg-blue-500 text-white hover:bg-blue-600'
                                                        : 'border-border hover:border-blue-300'
                                                }`}
                                            >
                                                <div className='flex items-center space-x-3 w-full'>
                                                    <div className='flex items-center justify-center w-6 h-6'>
                                                        <svg
                                                            className='w-5 h-5 text-current'
                                                            fill='currentColor'
                                                            viewBox='0 0 20 20'
                                                        >
                                                            <path
                                                                fillRule='evenodd'
                                                                d='M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z'
                                                                clipRule='evenodd'
                                                            />
                                                        </svg>
                                                    </div>
                                                    <div className='flex-1'>
                                                        <div className='flex items-center justify-between'>
                                                            <span className='font-medium'>
                                                                Instant
                                                            </span>
                                                            <span className='text-sm opacity-75'>
                                                                (
                                                                {(
                                                                    INSTANT_WITHDRAW_FEE *
                                                                    100
                                                                ).toFixed(1)}
                                                                % fee)
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Button>

                                            {/* Standard Option */}
                                            <Button
                                                variant={
                                                    redeemType === 'standard'
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                onClick={() =>
                                                    handleRedeemTypeSelect(
                                                        'standard'
                                                    )
                                                }
                                                className={`w-full p-4 h-auto justify-start ${
                                                    redeemType === 'standard'
                                                        ? 'border-blue-500 bg-blue-500 text-white hover:bg-blue-600'
                                                        : 'border-border hover:border-blue-300'
                                                }`}
                                            >
                                                <div className='flex items-center space-x-3 w-full'>
                                                    <div className='flex items-center justify-center w-6 h-6'>
                                                        <svg
                                                            className='w-5 h-5 text-current'
                                                            fill='currentColor'
                                                            viewBox='0 0 20 20'
                                                        >
                                                            <path
                                                                fillRule='evenodd'
                                                                d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z'
                                                                clipRule='evenodd'
                                                            />
                                                        </svg>
                                                    </div>
                                                    <div className='flex-1'>
                                                        <div className='flex items-center justify-between'>
                                                            <span className='font-medium'>
                                                                Standard
                                                            </span>
                                                            <span className='text-sm opacity-75'>
                                                                (7 business
                                                                days)
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Button>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}
                </div>

                <div className='mt-6'>
                    <div className='space-y-4'>
                        {activeTab === 'mint' && renderTabContent()}
                        {activeTab === 'redeem' && renderTabContent()}
                        {activeTab === 'history' && (
                            <HistoryCards userAccountId={accountId} />
                        )}
                    </div>
                </div>
            </CardHeader>
        </Card>
    )
}
