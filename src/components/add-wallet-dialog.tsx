'use client'

import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'

interface AddWalletDialogProps {
    onAddWallet: (
        walletAddress: string,
        label?: string
    ) => Promise<{
        success: boolean
        error?: string
        wallet?: { id: string; wallet_address: string }
    }>
    canAddMore?: boolean
    walletsRemaining?: number
    onSyncWallet?: (
        walletId: string,
        walletAddress: string
    ) => void | Promise<void>
}

export function AddWalletDialog({
    onAddWallet,
    canAddMore = true,
    walletsRemaining = 5,
    onSyncWallet,
}: AddWalletDialogProps) {
    const [open, setOpen] = useState(false)
    const [walletAddress, setWalletAddress] = useState('')
    const [label, setLabel] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!walletAddress) {
            toast.error('Please enter a wallet address')
            return
        }

        // Validate Hedera account ID format (0.0.xxxxx)
        const hederaAccountRegex = /^0\.0\.\d+$/
        if (!hederaAccountRegex.test(walletAddress)) {
            toast.error('Invalid Hedera account ID format (e.g., 0.0.12345)')
            return
        }

        setLoading(true)
        try {
            const result = await onAddWallet(
                walletAddress,
                label || `Wallet ${walletAddress}`
            )

            if (result.success) {
                toast.success('Wallet added successfully!')
                setOpen(false) // Close modal first
                setWalletAddress('')
                setLabel('')

                // Sync the newly added wallet
                if (onSyncWallet && result.wallet) {
                    onSyncWallet(result.wallet.id, result.wallet.wallet_address)
                }
            } else {
                toast.error(result.error || 'Failed to add wallet')
            }
        } catch (error) {
            console.error('Error adding wallet:', error)
            toast.error('Failed to add wallet')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button disabled={!canAddMore}>
                    <Plus className='w-4 h-4' />
                    Add Wallet
                </Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-[425px]'>
                <DialogHeader>
                    <DialogTitle>Add Wallet to Portfolio</DialogTitle>
                    <DialogDescription>
                        {canAddMore
                            ? `You can add ${walletsRemaining} more wallet${
                                  walletsRemaining !== 1 ? 's' : ''
                              } (max 5 total).`
                            : 'You have reached the maximum of 5 wallets per account.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className='grid gap-4 py-4 mb-4'>
                        <div className='grid gap-2'>
                            <Label htmlFor='wallet-address'>Account ID *</Label>
                            <Input
                                id='wallet-address'
                                placeholder='0.0.12345'
                                value={walletAddress}
                                onChange={(e) =>
                                    setWalletAddress(e.target.value)
                                }
                                disabled={loading}
                            />
                        </div>
                        <div className='grid gap-2'>
                            <Label htmlFor='label'>Label (Optional)</Label>
                            <Input
                                id='label'
                                placeholder='My Trading Wallet'
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type='button'
                            variant='outline'
                            onClick={() => setOpen(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type='submit' disabled={loading}>
                            {loading ? 'Adding...' : 'Add Wallet'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
