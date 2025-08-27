import { useState } from 'react'
import { TransferTransaction, AccountId, Hbar } from '@hashgraph/sdk'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

export function DepositDialog({ open, onOpenChange, userAccountId, signer }) {
    const [amount, setAmount] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [step, setStep] = useState('')

    const handleDeposit = async () => {
        setLoading(true)
        setError('')

        try {
            // Validar cantidad
            const amountNum = Number(amount)
            if (isNaN(amountNum) || amountNum <= 0) {
                throw new Error('Cantidad inválida')
            }

            setStep('Creando transacción de depósito...')
            console.log('Creating deposit transaction for:', amountNum, 'USDC')

            // 1. Crear transacción de USDC
            const amountInTinybar = amountNum * 1_000_000 // USDC tiene 6 decimales

            const transaction = new TransferTransaction()
                .addTokenTransfer(
                    '0.0.429274', // USDC_TOKEN_ID
                    AccountId.fromString(userAccountId),
                    -amountInTinybar
                )
                .addTokenTransfer(
                    '0.0.429274',
                    AccountId.fromString('0.0.6510977'), // TREASURY_ID
                    amountInTinybar
                )
                .setTransactionMemo(`Deposit ${amount} USDC`)

            console.log('Transaction created, freezing with signer...')

            // 2. Congelar con el signer
            const frozenTx = await transaction.freezeWithSigner(signer)

            setStep('Esperando firma del usuario...')
            console.log('Requesting signature from wallet...')

            // 3. Usuario firma
            const signedTx = await frozenTx.signWithSigner(signer)

            setStep('Ejecutando transacción de depósito...')
            console.log('Executing deposit transaction...')

            // 4. Ejecutar
            const txResponse = await signedTx.executeWithSigner(signer)
            console.log(
                'Transaction executed:',
                txResponse.transactionId?.toString()
            )

            setStep('Obteniendo recibo...')

            // 5. Obtener recibo
            const receipt = await txResponse.getReceiptWithSigner(signer)
            console.log('Receipt:', receipt.status.toString())

            if (receipt.status.toString() !== 'SUCCESS') {
                throw new Error(`Transaction failed: ${receipt.status}`)
            }

            setStep('Solicitando hUSD...')
            console.log('Requesting hUSD from backend...')

            // 6. Solicitar hUSD al backend
            const response = await fetch('/api/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAccountId,
                    amount: amountInTinybar,
                    depositTxId: txResponse.transactionId?.toString(),
                    tokenType: 'USDC',
                }),
            })

            console.log('Backend response status:', response.status)

            if (!response.ok) {
                const errorData = await response.json()
                console.error('Backend error:', errorData)
                throw new Error(
                    errorData.message ||
                        errorData.error ||
                        'Error en el servidor'
                )
            }

            const result = await response.json()
            console.log('Success:', result)

            setStep('')
            alert(
                `¡Depósito exitoso!\nRecibiste ${
                    result.hUSDReceived / 1_000_000
                } hUSD\nTx ID: ${result.hUSDTxId}`
            )
            setAmount('')
            onOpenChange(false)
        } catch (error: any) {
            console.error('Deposit error:', error)
            setError(error.message || 'Error desconocido')
            setStep('')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Depositar USDC por hUSD</DialogTitle>
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
                        Recibirás: {amount || '0'} hUSD
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
                        {loading ? 'Procesando...' : 'Confirmar Depósito'}
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
