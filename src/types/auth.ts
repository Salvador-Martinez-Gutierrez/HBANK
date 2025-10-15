/**
 * Tipos para el sistema de autenticación con Hedera Wallet
 */

/**
 * Request para obtener un nonce
 */
export interface NonceRequest {
    accountId: string
}

/**
 * Response del endpoint de nonce
 */
export interface NonceResponse {
    message: string
    nonce: string
}

/**
 * Request para verificar la firma
 */
export interface VerifyRequest {
    accountId: string
    nonce: string
    signature: string
    publicKey?: string // Opcional: la wallet puede enviarlo
}

/**
 * Response del endpoint de verificación
 */
export interface AuthResponse {
    success: boolean
    accountId?: string
    error?: string
}

/**
 * Payload del JWT
 */
export interface JWTPayload {
    sub: string // accountId
    iat: number
    exp: number
    iss: string
}

/**
 * Información del nonce almacenado
 */
export interface StoredNonce {
    accountId: string
    nonce: string
    message: string
    createdAt: number
    expiresAt: number
    used: boolean
}

/**
 * Usuario autenticado (para extender Request)
 */
export interface AuthenticatedUser {
    accountId: string
}
