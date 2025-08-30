import { NextApiRequest, NextApiResponse } from 'next'
import {
    Client,
    TransferTransaction,
    AccountId,
    PrivateKey,
} from '@hashgraph/sdk'

/**
 * POST /api/deposit
 *
 * Handles USDC deposits and schedules hUSD minting
 *
 * @param req - Request object containing accountId and amountUsdc
 * @param res - Response object
 *
 * @example
 * POST /api/deposit
 * {
 *   "accountId": "0.0.12345",
 *   "amountUsdc": 100
 * }
 *
 * @returns
 * {
 *   "status": "success",
 *   "scheduleId": "0.0.99999",
 *   "husdAmount": 99.5
 * }
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    console.log('=== DEPOSIT ENDPOINT CALLED ===')
    console.log('Method:', req.method)
    console.log('Body:', req.body)

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const {
            userAccountId,
            amount,
            depositTxId, // ID de la transacción ya ejecutada
        } = req.body

        // Validación de campos
        if (!userAccountId || !amount || !depositTxId) {
            console.error('Missing fields:', {
                userAccountId,
                amount,
                depositTxId,
            })
            return res.status(400).json({
                error: 'Missing required fields',
                details: {
                    userAccountId: !!userAccountId,
                    amount: !!amount,
                    depositTxId: !!depositTxId,
                },
            })
        }

        console.log('Processing deposit:', {
            user: userAccountId,
            amount: amount,
            depositTx: depositTxId,
        })

        // Configurar cliente Hedera
        const client = Client.forTestnet()
        const treasuryAccountId = AccountId.fromString(process.env.TREASURY_ID!)
        const operatorKey = PrivateKey.fromString(process.env.OPERATOR_KEY!)

        client.setOperator(treasuryAccountId, operatorKey)
        console.log(
            'Client configured for treasury:',
            treasuryAccountId.toString()
        )

        // Verificar el depósito en Mirror Node
        const mirrorTxId = depositTxId
            .replace('@', '-')
            .replace(/(\d+)\.(\d+)$/, '$1-$2')
        const mirrorUrl = `https://testnet.mirrornode.hedera.com/api/v1/transactions/${mirrorTxId}`
        console.log('Verifying deposit on mirror node:', mirrorUrl)

        let mirrorVerified = false
        for (let i = 0; i < 3; i++) {
            try {
                const mirrorResponse = await fetch(mirrorUrl)
                const mirrorData = await mirrorResponse.json()
                console.log('Mirror node response:', mirrorData)

                if (
                    mirrorData.transactions &&
                    Array.isArray(mirrorData.transactions) &&
                    mirrorData.transactions.length > 0 &&
                    mirrorData.transactions[0]?.result === 'SUCCESS'
                ) {
                    mirrorVerified = true
                    break
                }
            } catch (error) {
                // Ignorar error, reintentar
                console.warn('Mirror node retry failed:', error)
            }
            // Esperar 2 segundos antes de reintentar
            await new Promise((resolve) => setTimeout(resolve, 2000))
        }
        if (!mirrorVerified) {
            console.warn(
                'Mirror node verification could not confirm deposit. Continuing anyway.'
            )
        }

        const usdcDecimals = 6
        const husdDecimals = 8

        // amount recibido en unidades mínimas de USDC
        const amountInUSDC = Number(amount)

        // Convierte a unidades mínimas de hUSD (1:1 en valor)
        const amountToTransfer =
            amountInUSDC * 10 ** (husdDecimals - usdcDecimals)

        // Crear transferencia de hUSD
        const hUSDTransfer = new TransferTransaction()
            .addTokenTransfer(
                process.env.HUSD_TOKEN_ID!,
                treasuryAccountId,
                -amountToTransfer
            )
            .addTokenTransfer(
                process.env.HUSD_TOKEN_ID!,
                AccountId.fromString(userAccountId),
                amountToTransfer
            )
            .setTransactionMemo(`hUSD for deposit ${depositTxId}`)

        // Congelar y firmar
        const frozenTx = hUSDTransfer.freezeWith(client)
        const signedTx = await frozenTx.sign(operatorKey)

        console.log('Executing hUSD transfer...')

        // Ejecutar
        const response = await signedTx.execute(client)
        console.log(
            'Transaction submitted:',
            response.transactionId?.toString()
        )

        // Obtener recibo
        const receipt = await response.getReceipt(client)
        console.log('Receipt status:', receipt.status.toString())

        if (receipt.status.toString() !== 'SUCCESS') {
            throw new Error(`Transaction failed with status: ${receipt.status}`)
        }

        const result = {
            success: true,
            hUSDTxId: response.transactionId?.toString(),
            hUSDReceived: amountToTransfer,
            status: receipt.status.toString(),
        }

        console.log('=== DEPOSIT SUCCESSFUL ===', result)
        return res.status(200).json(result)
    } catch (error: unknown) {
        console.error('=== DEPOSIT ERROR ===')
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        const errorStack = error instanceof Error ? error.stack : undefined
        console.error('Error message:', errorMessage)
        console.error('Error stack:', errorStack)

        return res.status(500).json({
            error: 'Deposit failed',
            message: errorMessage,
            details:
                process.env.NODE_ENV === 'development'
                    ? errorStack
                    : undefined,
        })
    }
}
