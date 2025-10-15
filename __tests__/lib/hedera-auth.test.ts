/**
 * Tests para el sistema de autenticación con Hedera Wallet
 */

import { NonceService } from '@/services/nonceService'
import {
    verifyHederaSignature,
    isValidHederaAccountId,
} from '@/lib/hedera-auth'
import { createJWT, verifyJWT } from '@/lib/jwt'

describe('Hedera Authentication System', () => {
    beforeEach(() => {
        // Limpiar nonces antes de cada test
        NonceService.clearAll()

        // Set JWT_SECRET for tests
        process.env.JWT_SECRET =
            'test_jwt_secret_key_at_least_32_characters_long_for_testing'
    })

    describe('NonceService', () => {
        test('should generate a unique nonce', () => {
            const accountId = '0.0.12345'
            const { nonce, message } = NonceService.generateNonce(accountId)

            expect(nonce).toBeDefined()
            expect(message).toContain(nonce)
            expect(message).toContain('Login to HBANK Protocol')
        })

        test('should validate a valid nonce', () => {
            const accountId = '0.0.12345'
            const { nonce } = NonceService.generateNonce(accountId)

            const validation = NonceService.validateNonce(nonce, accountId)

            expect(validation.valid).toBe(true)
            expect(validation.message).toBeDefined()
        })

        test('should reject an invalid nonce', () => {
            const accountId = '0.0.12345'
            const invalidNonce = 'invalid-nonce-123'

            const validation = NonceService.validateNonce(
                invalidNonce,
                accountId
            )

            expect(validation.valid).toBe(false)
            expect(validation.error).toBe('Nonce not found')
        })

        test('should reject a nonce with wrong accountId', () => {
            const accountId1 = '0.0.12345'
            const accountId2 = '0.0.67890'
            const { nonce } = NonceService.generateNonce(accountId1)

            const validation = NonceService.validateNonce(nonce, accountId2)

            expect(validation.valid).toBe(false)
            expect(validation.error).toBe('AccountId mismatch')
        })

        test('should reject a used nonce', () => {
            const accountId = '0.0.12345'
            const { nonce } = NonceService.generateNonce(accountId)

            // Mark as used
            NonceService.markAsUsed(nonce)

            const validation = NonceService.validateNonce(nonce, accountId)

            expect(validation.valid).toBe(false)
            expect(validation.error).toBe('Nonce already used')
        })
    })

    describe('Hedera Account ID Validation', () => {
        test('should validate correct Hedera account IDs', () => {
            expect(isValidHederaAccountId('0.0.12345')).toBe(true)
            expect(isValidHederaAccountId('0.0.1')).toBe(true)
            expect(isValidHederaAccountId('0.0.999999')).toBe(true)
        })

        test('should reject invalid Hedera account IDs', () => {
            expect(isValidHederaAccountId('12345')).toBe(false)
            expect(isValidHederaAccountId('0.0')).toBe(false)
            expect(isValidHederaAccountId('0-0-12345')).toBe(false)
            expect(isValidHederaAccountId('abc.def.ghi')).toBe(false)
        })
    })

    describe('JWT', () => {
        test('should create a valid JWT', async () => {
            const accountId = '0.0.12345'
            const token = await createJWT(accountId)

            expect(token).toBeDefined()
            expect(typeof token).toBe('string')
            expect(token.split('.')).toHaveLength(3)
        })

        test('should verify a valid JWT', async () => {
            const accountId = '0.0.12345'
            const token = await createJWT(accountId)

            const payload = await verifyJWT(token)

            expect(payload).not.toBeNull()
            expect(payload?.sub).toBe(accountId)
            expect(payload?.iss).toBe('hbank-protocol')
        })

        test('should reject an invalid JWT', async () => {
            const invalidToken = 'invalid.jwt.token'

            const payload = await verifyJWT(invalidToken)

            expect(payload).toBeNull()
        })

        test('should reject a JWT with wrong signature', async () => {
            const accountId = '0.0.12345'
            const token = await createJWT(accountId)

            // Modify the signature
            const parts = token.split('.')
            parts[2] = 'tampered-signature'
            const tamperedToken = parts.join('.')

            const payload = await verifyJWT(tamperedToken)

            expect(payload).toBeNull()
        })
    })

    describe('Signature Verification', () => {
        test('should validate signature format check', () => {
            // Esta es una prueba básica del formato
            // Para pruebas reales de verificación de firma, necesitarías
            // claves y firmas reales de Hedera

            const message = 'Test message'
            const signature = '0123456789abcdef' // Hex signature
            const publicKey = '302a300506032b6570032100' // DER format

            // Esta prueba fallará porque la firma no es válida,
            // pero verifica que la función no lance errores
            expect(() => {
                verifyHederaSignature(message, signature, publicKey)
            }).not.toThrow()
        })
    })

    describe('Complete Auth Flow', () => {
        test('should complete nonce generation and validation flow', () => {
            const accountId = '0.0.12345'

            // Step 1: Generate nonce
            const { nonce, message } = NonceService.generateNonce(accountId)
            expect(nonce).toBeDefined()
            expect(message).toContain(nonce)

            // Step 2: Validate nonce
            const validation = NonceService.validateNonce(nonce, accountId)
            expect(validation.valid).toBe(true)

            // Step 3: Mark as used
            NonceService.markAsUsed(nonce)

            // Step 4: Try to use again (should fail)
            const validation2 = NonceService.validateNonce(nonce, accountId)
            expect(validation2.valid).toBe(false)
        })

        test('should complete JWT creation and verification flow', async () => {
            const accountId = '0.0.12345'

            // Step 1: Create JWT
            const token = await createJWT(accountId)
            expect(token).toBeDefined()

            // Step 2: Verify JWT
            const payload = await verifyJWT(token)
            expect(payload).not.toBeNull()
            expect(payload?.sub).toBe(accountId)
        })
    })
})
