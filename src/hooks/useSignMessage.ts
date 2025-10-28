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

                // Detect the wallet type and use the appropriate method
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
                    // HashPack uses hashconnect
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
                    interface WindowWithBlade extends Window {
                        bladeWallet?: {
                            sign: (
                                message: string,
                                accountId: string
                            ) => Promise<{ signature?: string; publicKey?: string }>
                        }
                    }

                    const windowWithBlade = window as WindowWithBlade

                    if (!windowWithBlade.bladeWallet) {
                        throw new Error('Blade wallet not found')
                    }

                    const result = await windowWithBlade.bladeWallet.sign(
                        message,
                        connectedAccountId
                    )
                    resultSignature = result.signature || ''
                    resultPublicKey = result.publicKey
                } else {
                    // Generic wallet - try with the signer
                    const signer = wallet.signer
                    if (!signer) {
                        throw new Error(
                            'Signer not available. Your wallet may not support message signing.'
                        )
                    }

                    // Try the standard sign method from the Hedera SDK
                    const messageBytes = new Uint8Array(
                        Buffer.from(message, 'utf-8')
                    )

                    interface SignerWithSignMethod {
                        sign?: (messages: Uint8Array[]) => Promise<unknown>
                        [key: string]: unknown
                    }

                    const signerWithSign = signer as SignerWithSignMethod

                    if (typeof signerWithSign.sign === 'function') {
                        const signResult = await signerWithSign.sign([
                            messageBytes,
                        ])

                        // Handle different response formats
                        let signatureBytes: Uint8Array | null = null

                        if (Array.isArray(signResult)) {
                            // If it's an array, take the first element
                            const firstElement = signResult[0]

                            if (firstElement instanceof Uint8Array) {
                                signatureBytes = firstElement
                            } else if (
                                firstElement &&
                                typeof firstElement === 'object'
                            ) {
                                // It may be an object with signature or bytes properties
                                if (firstElement.signature) {
                                    signatureBytes = firstElement.signature

                                    // Also try to get the public key if available
                                    if (firstElement.publicKey) {
                                        try {
                                            // The public key may be an object that needs toString()
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
                                    // The object itself may be the signature with numeric properties
                                    const keys = Object.keys(firstElement)
                                    if (
                                        keys.length > 0 &&
                                        keys.every((k) => !isNaN(Number(k)))
                                    ) {
                                        // It's a numerically indexed object, convert to Uint8Array
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
                            // It's an object, look for the signature inside
                            const signObj = signResult as Record<string, unknown>
                            if (signObj.signature instanceof Uint8Array) {
                                signatureBytes = signObj.signature
                            } else if (signObj.bytes instanceof Uint8Array) {
                                signatureBytes = signObj.bytes
                            } else if (
                                typeof signObj.signature === 'string'
                            ) {
                                // Already a hex string
                                resultSignature = signObj.signature
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

                // Validate that the signature is not empty
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
                // Provide more specific error messages
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
