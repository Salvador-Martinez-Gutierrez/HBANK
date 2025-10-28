/**
 * Withdraw Service Interface
 *
 * Defines the contract for withdrawal operations including standard
 * and instant withdrawals.
 */

export interface WithdrawPayload {
    userAccountId: string
    amountHusd: number
}

export interface WithdrawResult {
    scheduleId: string
    amountUsdc: number
    transactionBytes: Uint8Array
}

export interface InstantWithdrawPayload {
    userAccountId: string
    amountHusd: number
}

export interface InstantWithdrawResult {
    transactionId: string
    amountUsdc: number
    feeAmount: number
    netAmount: number
}

export interface IWithdrawService {
    /**
     * Initialize a standard withdrawal (scheduled)
     */
    initializeWithdraw(payload: WithdrawPayload): Promise<WithdrawResult>

    /**
     * Execute instant withdrawal with fee
     */
    executeInstantWithdraw(payload: InstantWithdrawPayload): Promise<InstantWithdrawResult>

    /**
     * Get maximum instant withdrawal amount
     */
    getMaxInstantWithdraw(userAccountId: string): Promise<{
        maxAmount: number
        feePercentage: number
        availableLiquidity: number
    }>

    /**
     * Get withdrawal history for a user
     */
    getWithdrawHistory(
        userAccountId: string,
        limit?: number
    ): Promise<Array<{
        id: string
        timestamp: Date
        amountHusd: number
        amountUsdc: number
        type: 'instant' | 'standard'
        status: string
        fee?: number
    }>>

    /**
     * Process pending withdrawals (admin function)
     */
    processPendingWithdrawals(): Promise<{
        processed: number
        failed: number
        errors: Array<{ id: string; error: string }>
    }>
}
