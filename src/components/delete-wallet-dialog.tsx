'use client'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface DeleteWalletDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void
    walletLabel?: string
    walletAddress?: string
}

export function DeleteWalletDialog({
    open,
    onOpenChange,
    onConfirm,
    walletLabel,
    walletAddress,
}: DeleteWalletDialogProps) {
    const handleConfirm = () => {
        onConfirm()
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-[425px]'>
                <DialogHeader>
                    <div className='flex items-center gap-2'>
                        <AlertTriangle className='w-5 h-5 text-destructive' />
                        <DialogTitle>Remove Wallet</DialogTitle>
                    </div>
                    <DialogDescription className='space-y-2 pt-4'>
                        <p>
                            Are you sure you want to remove this wallet from
                            your portfolio?
                        </p>
                        {walletLabel && (
                            <p className='font-semibold text-foreground'>
                                {walletLabel}
                            </p>
                        )}
                        {walletAddress && (
                            <p className='font-mono text-sm text-muted-foreground'>
                                {walletAddress}
                            </p>
                        )}
                        <p className='text-destructive font-medium pt-2'>
                            This action cannot be undone.
                        </p>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className='gap-2'>
                    <Button
                        type='button'
                        variant='outline'
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type='button'
                        variant='destructive'
                        onClick={handleConfirm}
                    >
                        Remove Wallet
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
