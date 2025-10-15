/**
 * Servicio de gestión de nonces para autenticación con Hedera Wallet
 *
 * Los nonces se almacenan en memoria (Map) con expiración de 5 minutos.
 * Para producción, considerar usar Redis para ambientes multi-instancia.
 */

import { v4 as uuidv4 } from 'uuid'
import type { StoredNonce } from '@/types/auth'

// Tiempo de expiración del nonce (5 minutos)
const NONCE_EXPIRATION_MS = 5 * 60 * 1000

// 🔥 Usar globalThis para persistir el Map en desarrollo (HMR)
// Esto previene que se pierdan los nonces cuando Next.js recarga módulos
declare global {
    var __nonceStore: Map<string, StoredNonce> | undefined
}

// Almacenamiento en memoria de nonces
// Key: nonce, Value: StoredNonce
const nonceStore = global.__nonceStore || new Map<string, StoredNonce>()

// Persistir en global para desarrollo
if (process.env.NODE_ENV === 'development') {
    global.__nonceStore = nonceStore
}

// Limpiar nonces expirados cada 2 minutos (solo inicializar una vez)
if (!global.__nonceStore) {
    setInterval(() => {
        const now = Date.now()
        for (const [nonce, data] of nonceStore.entries()) {
            if (data.expiresAt < now) {
                nonceStore.delete(nonce)
            }
        }
    }, 2 * 60 * 1000)
}

export class NonceService {
    /**
     * Genera un nuevo nonce para un accountId
     */
    static generateNonce(accountId: string): {
        nonce: string
        message: string
    } {
        const nonce = uuidv4()
        const message = `Login to HBANK Protocol with Hedera Wallet: ${nonce}`

        const now = Date.now()
        const storedNonce: StoredNonce = {
            accountId,
            nonce,
            message,
            createdAt: now,
            expiresAt: now + NONCE_EXPIRATION_MS,
            used: false,
        }

        // Almacenar el nonce
        nonceStore.set(nonce, storedNonce)

        return { nonce, message }
    }

    /**
     * Valida un nonce y devuelve la información almacenada
     */
    static validateNonce(
        nonce: string,
        accountId: string
    ): {
        valid: boolean
        message?: string
        error?: string
    } {
        const storedNonce = nonceStore.get(nonce)

        if (!storedNonce) {
            return {
                valid: false,
                error: 'Nonce not found',
            }
        }

        // Verificar que el accountId coincida
        if (storedNonce.accountId !== accountId) {
            return {
                valid: false,
                error: 'AccountId mismatch',
            }
        }

        // Verificar que no haya expirado
        if (storedNonce.expiresAt < Date.now()) {
            nonceStore.delete(nonce)
            return {
                valid: false,
                error: 'Nonce expired',
            }
        }

        // Verificar que no haya sido usado
        if (storedNonce.used) {
            return {
                valid: false,
                error: 'Nonce already used',
            }
        }

        return {
            valid: true,
            message: storedNonce.message,
        }
    }

    /**
     * Marca un nonce como usado
     */
    static markAsUsed(nonce: string): void {
        const storedNonce = nonceStore.get(nonce)
        if (storedNonce) {
            storedNonce.used = true
            nonceStore.set(nonce, storedNonce)
        }
    }

    /**
     * Elimina un nonce del almacenamiento
     */
    static deleteNonce(nonce: string): void {
        nonceStore.delete(nonce)
    }

    /**
     * Devuelve el número de nonces almacenados (útil para debugging)
     */
    static getStoredCount(): number {
        return nonceStore.size
    }

    /**
     * Limpia todos los nonces (útil para testing)
     */
    static clearAll(): void {
        nonceStore.clear()
    }
}
