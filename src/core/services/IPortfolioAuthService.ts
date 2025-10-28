/**
 * Portfolio Auth Service Interface
 *
 * Defines the contract for portfolio authentication and user management.
 */

export interface PortfolioUser {
    id: string
    hedera_account_id: string
    created_at: Date
    last_login?: Date
}

export interface AuthToken {
    token: string
    expiresAt: Date
}

export interface IPortfolioAuthService {
    /**
     * Generate authentication nonce for a user
     */
    generateNonce(hederaAccountId: string): Promise<{
        nonce: string
        expiresAt: Date
    }>

    /**
     * Verify signed message and create session
     */
    verifyAndCreateSession(
        hederaAccountId: string,
        signature: string,
        nonce: string
    ): Promise<{
        token: string
        user: PortfolioUser
    }>

    /**
     * Verify JWT token
     */
    verifyToken(token: string): Promise<{
        valid: boolean
        userId?: string
        hederaAccountId?: string
    }>

    /**
     * Get or create user
     */
    getOrCreateUser(hederaAccountId: string): Promise<PortfolioUser>

    /**
     * Logout user (invalidate token)
     */
    logout(token: string): Promise<void>

    /**
     * Refresh authentication token
     */
    refreshToken(oldToken: string): Promise<AuthToken>
}
