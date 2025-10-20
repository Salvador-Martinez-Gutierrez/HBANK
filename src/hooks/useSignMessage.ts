/**
 * Hook para firma de mensajes con Hedera Wallet
 * Compatible con @buidlerlabs/hashgraph-react-wallets
 */

import { useWallet, useAccountId } from '@buidlerlabs/hashgraph-react-wallets'
import { useCallback } from 'react'

interface SignResult {
    signature: string
    publicKey?: string
}

/**
 * Hook para firmar mensajes con la wallet conectada
 *
 * Este hook detecta automáticamente el tipo de wallet (HashPack, Blade, etc.)
 * y usa el método de firma apropiado.
 */
export function useSignMessage() {
    const wallet = useWallet()
    const { data: connectedAccountId } = useAccountId()

    const signMessage = useCallback(
        async (message: string): Promise<SignResult> => {
            try {
                if (!wallet.isConnected) {
                    throw new Error('Wallet is not connected')
                }

                if (!connectedAccountId) {
                    throw new Error('No account ID found')
                }

                let resultSignature: string = ''
                let resultPublicKey: string | undefined

                // Detectar el tipo de wallet y usar el método apropiado
                const walletAny = wallet as unknown as {
                    walletType?: string
                    connector?: {
                        hashconnect?: {
                            signMessage?: (
                                accountId: string,
                                message: string
                            ) => Promise<{
                                signature?: string
                                signatureMap?: {
                                    sigPair?: Array<{ ed25519?: string }>
                                }
                                publicKey?: string
                            }>
                        }
                    }
                    hashconnect?: {
                        signMessage?: (
                            accountId: string,
                            message: string
                        ) => Promise<{
                            signature?: string
                            signatureMap?: {
                                sigPair?: Array<{ ed25519?: string }>
                            }
                            publicKey?: string
                        }>
                    }
                }
                const walletType: string =
                    walletAny.walletType?.toLowerCase() || ''

                if (walletType.includes('hashpack')) {
                    // HashPack wallet
                    // HashPack usa hashconnect
                    const hashconnect =
                        walletAny.connector?.hashconnect ||
                        walletAny.hashconnect

                    if (!hashconnect || !hashconnect.signMessage) {
                        throw new Error(
                            'HashPack connector not available or does not support message signing'
                        )
                    }

                    const result = await hashconnect.signMessage(
                        connectedAccountId,
                        message
                    )
                    resultSignature =
                        result.signatureMap?.sigPair?.[0]?.ed25519 ||
                        result.signature ||
                        ''
                    resultPublicKey = result.publicKey
                } else if (walletType.includes('blade')) {
                    // Blade wallet
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (!(window as any).bladeWallet) {
                        throw new Error('Blade wallet not found')
                    }

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const result = await (window as any).bladeWallet.sign(
                        message,
                        connectedAccountId
                    )
                    resultSignature = result.signature || ''
                    resultPublicKey = result.publicKey
                } else {
                    // Wallet genérico - intentar con el signer
                    const signer = wallet.signer
                    if (!signer) {
                        throw new Error(
                            'Signer not available. Your wallet may not support message signing.'
                        )
                    }

                    // Intentar el método sign estándar del SDK de Hedera
                    const messageBytes = new Uint8Array(
                        Buffer.from(message, 'utf-8')
                    )

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (typeof (signer as any).sign === 'function') {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const signResult = await (signer as any).sign([
                            messageBytes,
                        ])

                        // Manejar diferentes formatos de respuesta
                        let signatureBytes: Uint8Array | null = null

                        if (Array.isArray(signResult)) {
                            // Si es un array, tomar el primer elemento
                            const firstElement = signResult[0]

                            if (firstElement instanceof Uint8Array) {
                                signatureBytes = firstElement
                            } else if (
                                firstElement &&
                                typeof firstElement === 'object'
                            ) {
                                // Puede ser un objeto con propiedades signature o bytes
                                if (firstElement.signature) {
                                    signatureBytes = firstElement.signature

                                    // También intentar obtener la public key si está disponible
                                    if (firstElement.publicKey) {
                                        try {
                                            // La public key puede ser un objeto que necesita toString()
                                            if (
                                                typeof firstElement.publicKey
                                                    .toString === 'function'
                                            ) {
                                                resultPublicKey =
                                                    firstElement.publicKey.toString()
                                            } else if (
                                                typeof firstElement.publicKey ===
                                                'string'
                                            ) {
                                                resultPublicKey =
                                                    firstElement.publicKey
                                            }
                                        } catch {
                                            // Could not extract public key
                                        }
                                    }
                                } else if (firstElement.bytes) {
                                    signatureBytes = firstElement.bytes
                                } else {
                                    // Puede ser que el objeto mismo sea la firma con propiedades numéricas
                                    const keys = Object.keys(firstElement)
                                    if (
                                        keys.length > 0 &&
                                        keys.every((k) => !isNaN(Number(k)))
                                    ) {
                                        // Es un objeto indexado numéricamente, convertir a Uint8Array
                                        signatureBytes = new Uint8Array(
                                            Object.values(
                                                firstElement
                                            ) as number[]
                                        )
                                    }
                                }
                            }
                        } else if (signResult instanceof Uint8Array) {
                            signatureBytes = signResult
                        } else if (
                            signResult &&
                            typeof signResult === 'object'
                        ) {
                            // Es un objeto, buscar la firma dentro
                            if (signResult.signature instanceof Uint8Array) {
                                signatureBytes = signResult.signature
                            } else if (signResult.bytes instanceof Uint8Array) {
                                signatureBytes = signResult.bytes
                            } else if (
                                typeof signResult.signature === 'string'
                            ) {
                                // Ya es hex string
                                resultSignature = signResult.signature
                            }
                        }

                        if (!resultSignature && signatureBytes) {
                            resultSignature =
                                Buffer.from(signatureBytes).toString('hex')
                        }

                        if (!resultSignature) {
                            throw new Error(
                                'Invalid signature format from wallet'
                            )
                        }
                    } else {
                        throw new Error(
                            'Wallet does not support message signing. Please use HashPack or Blade wallet.'
                        )
                    }
                }

                // Validar que la firma no esté vacía
                if (
                    !resultSignature ||
                    resultSignature.length === 0 ||
                    resultSignature === '00'
                ) {
                    throw new Error(
                        'Wallet returned an empty signature. Please try again.'
                    )
                }

                return {
                    signature: resultSignature,
                    publicKey: resultPublicKey,
                }
            } catch (error) {
                // Proporcionar mensajes de error más específicos
                if (error instanceof Error) {
                    if (
                        error.message.includes('rejected') ||
                        error.message.includes('denied')
                    ) {
                        throw new Error(
                            'You rejected the signature request. Please try again and approve the request in your wallet.'
                        )
                    }
                    if (error.message.includes('not connected')) {
                        throw new Error('Please connect your wallet first')
                    }
                    if (error.message.includes('Signer not available')) {
                        throw new Error(
                            'Wallet signer not ready. Please disconnect and reconnect your wallet.'
                        )
                    }
                }

                throw error
            }
        },
        [wallet, connectedAccountId]
    )

    return {
        signMessage,
        isReady: wallet.isConnected && !!connectedAccountId && !!wallet.signer,
    }
}
