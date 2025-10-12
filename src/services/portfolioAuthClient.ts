/**
 * Client-side authentication utilities for Portfolio
 * These functions can be safely imported in client components
 */

/**
 * Generate a message for the user to sign with their wallet
 * This is used client-side before sending to the API
 */
export function generateAuthMessage(walletAddress: string): string {
    const timestamp = Date.now()
    return `Sign this message to authenticate with HBank Portfolio.\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}\n\nThis request will not trigger a blockchain transaction or cost any gas fees.`
}

/**
 * Client-side auth payload type
 */
export interface AuthPayload {
    walletAddress: string
    message: string
    signature: string
}
