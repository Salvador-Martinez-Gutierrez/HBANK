/**
 * Rate Service Interface
 *
 * Defines the contract for exchange rate operations including
 * publishing, retrieval, and historical data.
 */

export interface RateData {
    rate: number
    sequenceNumber: string
    timestamp: Date
    validUntil?: Date
}

export interface RateHistoryItem {
    rate: number
    sequenceNumber: string
    timestamp: Date
}

export interface IRateService {
    /**
     * Get current exchange rate
     */
    getCurrentRate(): Promise<RateData | null>

    /**
     * Publish new exchange rate to Hedera
     */
    publishRate(rate: number, sequenceNumber: string): Promise<{
        transactionId: string
        rate: number
        sequenceNumber: string
    }>

    /**
     * Get rate history
     */
    getRateHistory(limit?: number): Promise<RateHistoryItem[]>

    /**
     * Validate if a rate is still valid
     */
    isRateValid(sequenceNumber: string): Promise<boolean>

    /**
     * Get rate by sequence number
     */
    getRateBySequence(sequenceNumber: string): Promise<RateData | null>
}
