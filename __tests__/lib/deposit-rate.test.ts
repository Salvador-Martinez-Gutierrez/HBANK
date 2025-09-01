import {
    calculateHUSDCAmount,
    getCurrentRateConfig,
    validateRateCalculation,
} from '../../src/lib/deposit-rate'

describe('Deposit Rate Utilities', () => {
    describe('calculateHUSDCAmount', () => {
        it('should calculate 1:1 HUSDC amount by default', () => {
            expect(calculateHUSDCAmount(100)).toBe(100)
            expect(calculateHUSDCAmount(50.5)).toBe(50.5)
            expect(calculateHUSDCAmount(0.01)).toBe(0.01)
        })

        it('should use custom rate configuration', () => {
            const customRate = { baseRate: 1.05 }
            expect(calculateHUSDCAmount(100, customRate)).toBe(105)
            expect(calculateHUSDCAmount(50, customRate)).toBe(52.5)
        })

        it('should handle zero amounts', () => {
            expect(calculateHUSDCAmount(0)).toBe(0)
        })
    })

    describe('getCurrentRateConfig', () => {
        it('should return default 1:1 rate configuration', async () => {
            const config = await getCurrentRateConfig()
            expect(config).toEqual({
                baseRate: 1.0,
            })
        })
    })

    describe('validateRateCalculation', () => {
        it('should validate correct 1:1 rate calculation', () => {
            expect(validateRateCalculation(100, 100)).toBe(true)
            expect(validateRateCalculation(50.5, 50.5)).toBe(true)
        })

        it('should reject incorrect rate calculations', () => {
            expect(validateRateCalculation(100, 200)).toBe(false)
            expect(validateRateCalculation(100, 50)).toBe(false)
        })

        it('should allow small tolerances', () => {
            // 0.1% difference should be acceptable with default tolerance
            expect(validateRateCalculation(100, 100.1)).toBe(true)
            expect(validateRateCalculation(100, 99.9)).toBe(true)
        })

        it('should respect custom tolerance', () => {
            // 0.5% difference with 0.01% tolerance should fail
            expect(validateRateCalculation(100, 100.5, 0.0001)).toBe(false)

            // But should pass with 1% tolerance
            expect(validateRateCalculation(100, 100.5, 0.01)).toBe(true)
        })

        it('should handle edge cases', () => {
            // Zero amounts should be handled gracefully
            expect(validateRateCalculation(0, 0)).toBe(true)
        })
    })
})
