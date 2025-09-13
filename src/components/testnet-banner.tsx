'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Network } from 'lucide-react'

export function TestnetBanner() {
    return (
        <Alert className='border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/10 dark:text-amber-200 mb-0 rounded-none border-x-0 border-t-0'>
            <div className='flex items-center justify-center gap-2 py-1'>
                <Network className='h-4 w-4' />
                <AlertDescription className='text-center font-medium'>
                    This protocol currently operates on the Hedera Testnet
                    only. Do not use real funds.
                </AlertDescription>
            </div>
        </Alert>
    )
}
