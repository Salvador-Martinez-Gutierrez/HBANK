'use client'

import { WithdrawManager } from '@/components/withdraw-manager'
import { useWallet } from '@buidlerlabs/hashgraph-react-wallets'
import { useAccountId } from '@/app/(protocol)/vault/hooks/useAccountID'

export default function WithdrawPage() {
    const { isConnected, signer } = useWallet()
    const accountId = useAccountId()

    return (
        <div className='container mx-auto px-4 py-8'>
            <div className='max-w-4xl mx-auto'>
                <div className='mb-8'>
                    <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                        Withdraw USDC
                    </h1>
                    <p className='text-gray-600'>
                        Convert your hUSD back to USDC with secure 48-hour
                        processing
                    </p>
                </div>

                <WithdrawManager
                    userAccountId={accountId}
                    isConnected={isConnected}
                    signer={signer}
                />
            </div>
        </div>
    )
}
