import { SignJWT, jwtVerify } from 'jose'
import type { JWTPayload } from '@/types/auth'
import { logger } from './logger'
import { serverEnv } from '@/config/serverEnv'

const getJWTSecret = (): Uint8Array => {
    // serverEnv already validates that JWT_SECRET exists and is at least 32 characters
    return new TextEncoder().encode(serverEnv.jwtSecret)
}

const JWT_EXPIRATION = '24h'

const JWT_ISSUER = 'hbank-protocol'

export async function createJWT(accountId: string): Promise<string> {
    try {
        const secret = getJWTSecret()
        const now = Math.floor(Date.now() / 1000)

        const jwt = await new SignJWT({ sub: accountId })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt(now)
            .setIssuer(JWT_ISSUER)
            .setExpirationTime(JWT_EXPIRATION)
            .sign(secret)

        logger.info('JWT created successfully', { accountId })
        return jwt
    } catch (error) {
        logger.error('Error creating JWT', {
            accountId,
            error: error instanceof Error ? error.message : String(error),
        })
        throw new Error('Failed to create JWT')
    }
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
    try {
        const secret = getJWTSecret()

        const { payload } = await jwtVerify(token, secret, {
            issuer: JWT_ISSUER,
        })

        if (!payload.sub || typeof payload.sub !== 'string') {
            logger.warn('JWT payload missing required fields')
            return null
        }

        return {
            sub: payload.sub,
            iat: payload.iat as number,
            exp: payload.exp as number,
            iss: payload.iss as string,
        }
    } catch (error) {
        logger.error('Error verifying JWT', {
            error: error instanceof Error ? error.message : String(error),
        })
        return null
    }
}

export function decodeJWT(token: string): { accountId?: string } | null {
    try {
        const parts = token.split('.')
        if (parts.length !== 3) {
            return null
        }

        const payload = JSON.parse(
            Buffer.from(parts[1], 'base64').toString('utf-8')
        )

        return {
            accountId: payload.sub,
        }
    } catch (error) {
        logger.error('Error decoding JWT', {
            error: error instanceof Error ? error.message : String(error),
        })
        return null
    }
}
