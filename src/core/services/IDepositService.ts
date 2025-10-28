/**
 * Deposit Service Interface
 *
 * Defines the contract for deposit operations including initialization,
 * execution, and tracking of deposit transactions.
 */

export interface DepositPayload {
    userAccountId: string
    amountUsdc: number
    rateSequenceNumber: string
}

export interface DepositResult {
    scheduleId: string
    husdAmount: number
    rate: number
    transactionBytes: Uint8Array
}

export interface DepositExecutionPayload {
    scheduleId: string
    userSignature: Uint8Array
    userAccountId: string
}

export interface IDepositService {
    /**
     * Initialize a new deposit transaction
     * Creates a scheduled transaction on Hedera that will transfer USDC
     * and mint HUSD at the current exchange rate
     */
    initializeDeposit(payload: DepositPayload): Promise<DepositResult>

    /**
     * Execute a scheduled deposit after user has signed
     */
    executeDeposit(payload: DepositExecutionPayload): Promise<{
        transactionId: string
        husdAmount: number
    }>

    /**
     * Get deposit history for a user
     */
    getDepositHistory(
        userAccountId: string,
        limit?: number
    ): Promise<Array<{
        scheduleId: string
        timestamp: Date
        amountUsdc: number
        amountHusd: number
        status: string
    }>>
}
