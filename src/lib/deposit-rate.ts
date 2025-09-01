/**
 * Deposit rate calculation utilities
 * Extracted to allow future rate variations
 */

export interface DepositRateConfig {
    baseRate: number
    // Future: dynamic rates based on market conditions, time, volume, etc.
}

/**
 * Calculates the amount of HUSDC to mint for a given USDC deposit
 * Currently 1:1 but can be extended for dynamic rates
 */
export function calculateHUSDCAmount(
    usdcAmount: number,
    config: DepositRateConfig = { baseRate: 1.0 }
): number {
    // For now, simple 1:1 conversion
    // Future: implement dynamic rate logic here
    return usdcAmount * config.baseRate
}

/**
 * Gets the current deposit rate configuration
 * This can be extended to fetch from external sources, HCS, etc.
 */
export async function getCurrentRateConfig(): Promise<DepositRateConfig> {
    // For now, return fixed 1:1 rate
    // Future: fetch from HCS topic, external API, etc.
    return {
        baseRate: 1.0,
    }
}

/**
 * Validates if the rate calculation is within acceptable bounds
 */
export function validateRateCalculation(
    usdcAmount: number,
    husdcAmount: number,
    tolerance: number = 0.001
): boolean {
    // Handle edge case of zero amounts
    if (usdcAmount === 0 && husdcAmount === 0) {
        return true
    }

    // If one is zero but not the other, it's invalid
    if (usdcAmount === 0 || husdcAmount === 0) {
        return false
    }

    const expectedRate = husdcAmount / usdcAmount
    const baseRate = 1.0 // Current expected rate

    return Math.abs(expectedRate - baseRate) / baseRate <= tolerance
}
