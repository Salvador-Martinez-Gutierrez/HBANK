/**
 * Utilidades para verificación de firmas de Hedera Wallet
 */

import { PublicKey } from '@hashgraph/sdk'
import axios from 'axios'
import { logger } from './logger'

/**
 * Obtiene la clave pública de un accountId desde el Mirror Node
 */
export async function getPublicKeyFromMirrorNode(
    accountId: string
): Promise<string | null> {
    try {
        const mirrorNodeUrl =
            process.env.HEDERA_NETWORK === 'mainnet'
                ? 'https://mainnet-public.mirrornode.hedera.com'
                : 'https://testnet.mirrornode.hedera.com'

        const url = `${mirrorNodeUrl}/api/v1/accounts/${accountId}`

        logger.info('Fetching public key from Mirror Node', { accountId, url })

        const response = await axios.get(url, {
            timeout: 10000,
            headers: process.env.MIRROR_NODE_API_KEY
                ? { 'x-api-key': process.env.MIRROR_NODE_API_KEY }
                : {},
        })

        if (response.data?.key?.key) {
            logger.info('Public key retrieved successfully', { accountId })
            return response.data.key.key
        }

        logger.warn('No public key found in Mirror Node response', {
            accountId,
        })
        return null
    } catch (error) {
        logger.error('Error fetching public key from Mirror Node', {
            accountId,
            error: error instanceof Error ? error.message : String(error),
        })
        return null
    }
}

/**
 * Verifica una firma de mensaje usando la clave pública de Hedera
 *
 * @param message - El mensaje que fue firmado
 * @param signature - La firma en formato hexadecimal o Uint8Array
 * @param publicKeyString - La clave pública en formato DER (hex string)
 * @returns true si la firma es válida, false en caso contrario
 */
export function verifyHederaSignature(
    message: string,
    signature: string | Uint8Array,
    publicKeyString: string
): boolean {
    try {
        // IMPORTANTE: Los wallets de Hedera añaden un prefijo al mensaje antes de firmarlo
        // Similar al estándar de Ethereum: "\x19Hedera Signed Message:\n" + length + message
        const messageBuffer = Buffer.from(message, 'utf-8')
        const hederaPrefix = `\x19Hedera Signed Message:\n${messageBuffer.length}`
        const hederaPrefixedMessage = Buffer.concat([
            Buffer.from(hederaPrefix, 'utf-8'),
            messageBuffer,
        ])

        const messageBytes = hederaPrefixedMessage

        // Convertir la firma a Uint8Array si viene como string
        let signatureBytes: Uint8Array
        if (typeof signature === 'string') {
            if (!signature || signature === '0x' || signature === '') {
                logger.error('Empty or invalid signature string')
                return false
            }

            const cleanSignature = signature.replace(/^0x/, '')
            signatureBytes = Uint8Array.from(Buffer.from(cleanSignature, 'hex'))
        } else {
            signatureBytes = signature
        }

        if (!signatureBytes || signatureBytes.length === 0) {
            logger.error('Empty signature bytes')
            return false
        }

        // Crear instancia de PublicKey desde el string DER
        const publicKey = PublicKey.fromString(publicKeyString)

        // Verificar la firma con el mensaje prefijado (Hedera standard)
        let isValid = publicKey.verify(messageBytes, signatureBytes)

        // Si falla, intentar con prefijo de Ethereum como fallback
        if (!isValid) {
            const ethPrefix = `\x19Ethereum Signed Message:\n${messageBuffer.length}`
            const ethPrefixedMessage = Buffer.concat([
                Buffer.from(ethPrefix, 'utf-8'),
                messageBuffer,
            ])

            isValid = publicKey.verify(ethPrefixedMessage, signatureBytes)
        }

        // Si aún falla, intentar sin prefijo (raw message)
        if (!isValid) {
            isValid = publicKey.verify(messageBuffer, signatureBytes)
        }

        logger.info('Signature verification result', {
            isValid,
            messageLength: message.length,
            signatureLength: signatureBytes.length,
        })

        return isValid
    } catch (error) {
        logger.error('Error verifying Hedera signature', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        })
        return false
    }
}

/**
 * Verifica una firma usando el accountId (obtiene la public key del Mirror Node)
 *
 * @param message - El mensaje que fue firmado
 * @param signature - La firma en formato hexadecimal o Uint8Array
 * @param accountId - El accountId de Hedera (formato 0.0.XXXX)
 * @returns true si la firma es válida, false en caso contrario
 */
export async function verifyHederaSignatureWithAccountId(
    message: string,
    signature: string | Uint8Array,
    accountId: string
): Promise<boolean> {
    try {
        // Obtener la public key del Mirror Node
        const publicKeyString = await getPublicKeyFromMirrorNode(accountId)

        if (!publicKeyString) {
            logger.error('Could not retrieve public key for account', {
                accountId,
            })
            return false
        }

        // Verificar la firma
        return verifyHederaSignature(message, signature, publicKeyString)
    } catch (error) {
        logger.error('Error in verifyHederaSignatureWithAccountId', {
            accountId,
            error: error instanceof Error ? error.message : String(error),
        })
        return false
    }
}

/**
 * Valida el formato de un accountId de Hedera
 */
export function isValidHederaAccountId(accountId: string): boolean {
    const accountIdRegex = /^\d+\.\d+\.\d+$/
    return accountIdRegex.test(accountId)
}
