'use client'

import CapitalAllocationCard from './components/capital-allocation-card'
import InstantRedemptionCard from './components/instant-redeption-card'
import ReportsCard from './components/reports-card'
import WalletTrackingCard from './components/wallet-tracking-card'
import { useWalletBalances } from './hooks/useWalletBalances'

export default function TransparencyPage() {
    const {
        wallets,
        lastUpdated,
        loading,
        error,
        refreshWalletBalances,
        getWithdrawalWallets,
    } = useWalletBalances()
    const withdrawalWallets = getWithdrawalWallets()

    return (
        <div className='h-full p-8'>
            <h1 className='text-3xl font-bold text-foreground'>Transparency</h1>
            <p className='text-muted-foreground mt-2'>
                View transparency data and reports for the hUSD token.
            </p>

            <div className='my-8'>
                <WalletTrackingCard
                    wallets={wallets}
                    lastUpdated={lastUpdated}
                    loading={loading}
                    error={error}
                    onRefresh={refreshWalletBalances}
                />

                <div className='mt-6 mb-8 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800'>
                    The information below displays mock data for demonstration
                    purposes only.
                </div>

                <div className='mt-8'>
                    <CapitalAllocationCard />
                </div>
                <div className='py-8 grid grid-cols-1 gap-6 lg:grid-cols-2'>
                    <ReportsCard />
                    <InstantRedemptionCard
                        instantWallet={withdrawalWallets.instant}
                        standardWallet={withdrawalWallets.standard}
                        loading={loading}
                    />
                </div>
            </div>
        </div>
    )
}
