/**
 * BUSINESS CALCULATIONS
 * Lógica de cálculos extraída de hooks y servicios
 */

import { FEES } from '@/app/constants'

// Calculate instant withdrawal amounts with fee
export const calculateInstantWithdrawal = (
  husdAmount: number, 
  rate: number
): {
  grossUSDC: number
  fee: number
  netUSDC: number
  effectiveRate: number
} => {
  const grossUSDC = husdAmount * rate
  const fee = grossUSDC * FEES.instantWithdraw
  const netUSDC = grossUSDC - fee
  const effectiveRate = netUSDC / husdAmount

  return {
    grossUSDC,
    fee,
    netUSDC,
    effectiveRate
  }
}

// Calculate mint amounts
export const calculateMintAmount = (
  usdcAmount: number,
  rate: number
): number => {
  return usdcAmount / rate
}

// Calculate APY from rate changes
export const calculateAPY = (
  currentRate: number,
  previousRate: number,
  timePeriodDays: number
): number => {
  const rateChange = (currentRate - previousRate) / previousRate
  const annualizedReturn = (rateChange * 365) / timePeriodDays
  return annualizedReturn
}

// Calculate time remaining for withdrawal unlock
export const calculateTimeRemaining = (unlockTime: string): number => {
  const unlockDate = new Date(unlockTime)
  const now = new Date()
  return Math.max(0, unlockDate.getTime() - now.getTime())
}

// Calculate maximum withdrawable amount based on available liquidity
export const calculateMaxWithdrawable = (
  userBalance: number,
  availableLiquidity: number
): number => {
  return Math.min(userBalance, availableLiquidity)
}