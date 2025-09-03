// Types for the withdrawal system with 48h lock
export interface WithdrawRequest {
    type: 'withdraw_request'
    requestId: string
    user: string
    amountHUSD: number
    rate: number
    rateSequenceNumber: string
    scheduleId: string // ID of the Schedule Transaction for HUSD transfer
    requestedAt: string
    unlockAt: string
    status: 'pending'
}

export interface WithdrawResult {
    type: 'withdraw_result'
    requestId: string
    status: 'completed' | 'failed'
    txId?: string
    failureReason?: string
    processedAt: string
}

// New interface for instant withdrawal results
export interface InstantWithdrawResult {
    type: 'instant_withdraw_result'
    requestId: string
    user: string
    amountHUSD: number
    grossUSDC: number
    fee: number
    netUSDC: number
    rate: number
    rateSequenceNumber: string
    txId: string
    status: 'completed'
    processedAt: string
}

export type WithdrawMessage =
    | WithdrawRequest
    | WithdrawResult
    | InstantWithdrawResult

export interface WithdrawStatus {
    requestId: string
    user: string
    amountHUSD: number
    rate: number
    status: 'pending' | 'completed' | 'failed'
    requestedAt: string
    unlockAt: string
    txId?: string
    failureReason?: string
    processedAt?: string
}

// Enums for withdrawal states
export enum WithdrawState {
    PENDING = 'pending',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

// Constants for withdrawal system
export const WITHDRAWAL_LOCK_HOURS = 48
export const WITHDRAWAL_WORKER_INTERVAL_MINUTES = 60 // Run every hour
