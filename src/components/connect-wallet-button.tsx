'use client'

import { useMemo, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ConnectWalletDialog } from '@/components/connect-wallet-dialog'
import { useWallet } from '@buidlerlabs/hashgraph-react-wallets'
import { Wallet } from 'lucide-react'

interface ConnectWalletButtonProps {
    className?: string
    size?: 'default' | 'sm' | 'lg' | 'icon'
    variant?: 'default' | 'full-width'
}

export function ConnectWalletButton({
    className,
    size = 'lg',
    variant = 'default',
}: ConnectWalletButtonProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const { isLoading, isConnected } = useWallet()

    // Close dialog when wallet connects
    useEffect(() => {
        if (isConnected && isDialogOpen) {
            setIsDialogOpen(false)
        }
    }, [isConnected, isDialogOpen, isLoading])

    const buttonName = useMemo(() => {
        if (isLoading) return 'Loading...'
        return 'Connect Wallet'
    }, [isLoading])

    const baseStyles = 'bg-blue-500 hover:bg-blue-600 text-white text-md'
    const variantStyles = variant === 'full-width' ? 'w-full h-14' : ''

    const combinedClassName = `${baseStyles} ${variantStyles} ${
        className || ''
    }`.trim()

    return (
        <>
            <Button
                className={combinedClassName}
                size={size}
                onClick={() => setIsDialogOpen(true)}
            >
                <span className='flex items-center gap-x-2 px-4'>
                    <Wallet size={24} />
                    {buttonName}
                </span>
            </Button>
            {isDialogOpen && (
                <ConnectWalletDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                />
            )}
        </>
    )
}
