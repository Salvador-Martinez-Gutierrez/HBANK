/**
 * Nonce management service for Hedera Wallet authentication
 *
 * Nonces are stored in memory (Map) with 5-minute expiration.
 * For production, consider using Redis for multi-instance environments.
 */

import { v4 as uuidv4 } from 'uuid'
import type { StoredNonce } from '@/types/auth'

// Nonce expiration time (5 minutes)
const NONCE_EXPIRATION_MS = 5 * 60 * 1000

// Use globalThis to persist the Map in development (HMR)
// This prevents losing nonces when Next.js reloads modules
declare global {
    var __nonceStore: Map<string, StoredNonce> | undefined
}

// In-memory storage of nonces
// Key: nonce, Value: StoredNonce
const nonceStore = global.__nonceStore || new Map<string, StoredNonce>()

// Persist in global for development
if (process.env.NODE_ENV === 'development') {
    global.__nonceStore = nonceStore
}

// Clean expired nonces every 2 minutes (initialize only once)
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

        // Store the nonce
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

        // Verify that the accountId matches
        if (storedNonce.accountId !== accountId) {
            return {
                valid: false,
                error: 'AccountId mismatch',
            }
        }

        // Verify that it hasn't expired
        if (storedNonce.expiresAt < Date.now()) {
            nonceStore.delete(nonce)
            return {
                valid: false,
                error: 'Nonce expired',
            }
        }

        // Verify that it hasn't been used
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
