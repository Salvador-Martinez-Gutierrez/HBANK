import { useState } from 'react'
import { ScheduleSignTransaction, ScheduleId, Signer } from '@hashgraph/sdk'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

interface DepositDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    userAccountId: string
    signer: unknown
}

function isValidSigner(signer: unknown): signer is Signer {
    return (
        signer !== null &&
        signer !== undefined &&
        typeof signer === 'object' &&
        'sign' in signer
    )
}

export function DepositDialog({
    open,
    onOpenChange,
    userAccountId,
    signer,
}: DepositDialogProps) {
    const [amount, setAmount] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [step, setStep] = useState('')

    const handleDeposit = async () => {
        setLoading(true)
        setError('')

        try {
            // Validate amount
            const amountNum = Number(amount)
            if (isNaN(amountNum) || amountNum <= 0) {
                throw new Error('Invalid amount')
            }

            console.log('Starting atomic deposit for:', amountNum, 'USDC')

            // Step 1: Initialize deposit (backend creates ScheduleCreateTransaction)
            setStep('Initializing atomic deposit...')

            const initResponse = await fetch('/api/deposit/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAccountId,
                    amount: amountNum,
                }),
            })

            console.log('Init response status:', initResponse.status)

            if (!initResponse.ok) {
                const errorData = await initResponse.json()
                console.error('Init error:', errorData)
                throw new Error(
                    errorData.message ||
                        errorData.error ||
                        'Error initializing deposit'
                )
            }

            const initResult = await initResponse.json()
            console.log('Init success:', initResult)

            const { scheduleId, amountHUSDC } = initResult

            // Step 2: User signs the schedule
            setStep('Requesting signature from wallet...')
            console.log('Requesting schedule signature for:', scheduleId)

            // Validate signer before use
            if (!isValidSigner(signer)) {
                throw new Error('Invalid signer: wallet not properly connected')
            }

            // Create ScheduleSignTransaction for user to sign
            const scheduleSignTx = new ScheduleSignTransaction().setScheduleId(
                ScheduleId.fromString(scheduleId)
            )

            // Freeze with signer
            const frozenScheduleTx = await scheduleSignTx.freezeWithSigner(
                signer
            )

            // User signs the schedule
            const signedScheduleTx = await frozenScheduleTx.signWithSigner(
                signer
            )

            // Execute the user's signature
            const userSignResponse = await signedScheduleTx.executeWithSigner(
                signer
            )
            console.log(
                'User signature executed:',
                userSignResponse.transactionId?.toString()
            )

            // Get receipt to confirm user signature
            const userSignReceipt = await userSignResponse.getReceiptWithSigner(
                signer
            )
            console.log(
                'User signature receipt:',
                userSignReceipt.status.toString()
            )

            if (userSignReceipt.status.toString() !== 'SUCCESS') {
                throw new Error(
                    `User signature failed: ${userSignReceipt.status}`
                )
            }

            // Step 3: Notify backend that user has signed
            setStep('Completing atomic transaction...')
            console.log('Notifying backend of user signature...')

            const completeResponse = await fetch('/api/deposit/user-signed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scheduleId,
                    clientRequestId: userSignResponse.transactionId?.toString(),
                }),
            })

            console.log('Complete response status:', completeResponse.status)

            if (!completeResponse.ok) {
                const errorData = await completeResponse.json()
                console.error('Complete error:', errorData)
                throw new Error(
                    errorData.message ||
                        errorData.error ||
                        'Error completing deposit'
                )
            }

            const completeResult = await completeResponse.json()
            console.log('Complete success:', completeResult)

            setStep('')
            alert(
                `¡Depósito atómico exitoso!\n` +
                    `Enviaste: ${amountNum} USDC\n` +
                    `Recibiste: ${amountHUSDC} HUSDC\n` +
                    `Schedule ID: ${scheduleId}\n` +
                    `Tx ID: ${completeResult.txId}`
            )
            setAmount('')
            onOpenChange(false)
        } catch (error: unknown) {
            console.error('Deposit error:', error)
            const errorMessage =
                error instanceof Error ? error.message : 'Error desconocido'
            setError(errorMessage)
            setStep('')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Depósito Atómico USDC ↔ HUSDC</DialogTitle>
                </DialogHeader>
                <div className='space-y-4'>
                    <Input
                        type='number'
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder='Cantidad de USDC'
                        step='0.01'
                        min='0.01'
                    />

                    <div className='text-sm text-muted-foreground'>
                        Recibirás: {amount || '0'} HUSDC (intercambio atómico
                        1:1)
                    </div>

                    {step && (
                        <div>
                            <h1>{step}</h1>
                        </div>
                    )}

                    {error && (
                        <div>
                            <h1>{error}</h1>
                        </div>
                    )}

                    <Button
                        onClick={handleDeposit}
                        disabled={loading || !amount}
                        className='w-full'
                    >
                        {loading
                            ? 'Procesando transacción atómica...'
                            : 'Ejecutar Depósito Atómico'}
                    </Button>

                    <div className='text-xs text-muted-foreground'>
                        Cuenta Treasury: 0.0.6510977
                        <br />
                        Tu cuenta: {userAccountId}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
