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
    }>
}

export function AddWalletDialog({ onAddWallet }: AddWalletDialogProps) {
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
                setOpen(false)
                setWalletAddress('')
                setLabel('')
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
                <Button>
                    <Plus className='w-4 h-4 mr-2' />
                    Add Wallet
                </Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-[425px]'>
                <DialogHeader>
                    <DialogTitle>Add Wallet to Portfolio</DialogTitle>
                    <DialogDescription>
                        Add another Hedera wallet to track in your portfolio.
                        You can track multiple wallets from mainnet.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className='grid gap-4 py-4'>
                        <div className='grid gap-2'>
                            <Label htmlFor='wallet-address'>
                                Wallet Address *
                            </Label>
                            <Input
                                id='wallet-address'
                                placeholder='0.0.12345'
                                value={walletAddress}
                                onChange={(e) =>
                                    setWalletAddress(e.target.value)
                                }
                                disabled={loading}
                            />
                            <p className='text-xs text-muted-foreground'>
                                Enter a Hedera mainnet account ID
                            </p>
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
                            <p className='text-xs text-muted-foreground'>
                                Give this wallet a friendly name
                            </p>
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
