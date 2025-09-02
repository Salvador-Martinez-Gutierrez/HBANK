import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { WithdrawDialog } from './withdraw-dialog'
import { ArrowDownLeft, Wallet } from 'lucide-react'

interface WithdrawManagerProps {
    userAccountId?: string
    isConnected: boolean
    signer?: unknown
}

export function WithdrawManager({
    userAccountId,
    isConnected,
    signer,
}: WithdrawManagerProps) {
    const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false)

    if (!isConnected) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className='flex items-center space-x-2'>
                        <ArrowDownLeft className='h-5 w-5' />
                        <span>Withdraw USDC</span>
                    </CardTitle>
                    <CardDescription>
                        Convert your hUSD back to USDC with a 48-hour security
                        lock
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className='text-center py-8'>
                        <Wallet className='h-12 w-12 mx-auto mb-4 text-gray-400' />
                        <h3 className='text-lg font-semibold text-gray-700 mb-2'>
                            Connect Your Wallet
                        </h3>
                        <p className='text-gray-500 mb-4'>
                            Please connect your wallet to access withdrawal
                            features
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className='space-y-6'>
            {/* Withdraw Actions */}
            <Card>
                <CardHeader>
                    <CardTitle className='flex items-center space-x-2'>
                        <ArrowDownLeft className='h-5 w-5' />
                        <span>Withdraw USDC</span>
                    </CardTitle>
                    <CardDescription>
                        Convert your hUSD back to USDC. Withdrawals are
                        processed after a 48-hour security lock period.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className='flex flex-col sm:flex-row gap-4'>
                        <Button
                            onClick={() => setIsWithdrawDialogOpen(true)}
                            className='flex-1'
                            size='lg'
                        >
                            <ArrowDownLeft className='h-4 w-4 mr-2' />
                            Request Withdrawal
                        </Button>

                        <div className='flex-1 text-sm text-gray-600 space-y-1'>
                            <p className='font-medium'>How it works:</p>
                            <ul className='list-disc list-inside space-y-1 text-xs'>
                                <li>Your hUSD is locked for 48 hours</li>
                                <li>
                                    After the lock period, USDC is automatically
                                    transferred
                                </li>
                                <li>
                                    If treasury has insufficient funds, your
                                    hUSD is returned
                                </li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Withdraw Dialog */}
            <WithdrawDialog
                isOpen={isWithdrawDialogOpen}
                onClose={() => setIsWithdrawDialogOpen(false)}
                userAccountId={userAccountId}
                signer={signer}
            />
        </div>
    )
}
