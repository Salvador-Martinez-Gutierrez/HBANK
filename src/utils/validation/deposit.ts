import { z } from 'zod'

const hederaEntityPattern = /^\d+\.\d+\.\d+$/

const toNumber = (value: unknown) => {
    if (typeof value === 'number') {
        return value
    }
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number.parseFloat(value)
        if (!Number.isNaN(parsed)) {
            return parsed
        }
    }
    return value
}

const positiveNumber = (field: string) =>
    z
        .number({ invalid_type_error: `${field} must be a number` })
        .positive(`${field} must be greater than zero`)

export const depositInitSchema = z
    .object({
        userAccountId: z
            .string()
            .trim()
            .regex(hederaEntityPattern, 'Invalid Hedera account ID'),
        amount: z.preprocess(
            (value) => toNumber(value),
            positiveNumber('amount')
        ), // USDC amount
        expectedRate: z.preprocess(
            (value) => toNumber(value),
            positiveNumber('expectedRate')
        ),
        rateSequenceNumber: z
            .string()
            .trim()
            .min(1, 'rateSequenceNumber is required'),
        rateTimestamp: z.string().optional(),
        clientRequestId: z.string().optional(),
    })
    .refine((data) => Number.isFinite(data.amount), {
        message: 'amount must be a finite number',
        path: ['amount'],
    })
    .refine((data) => Number.isFinite(data.expectedRate), {
        message: 'expectedRate must be a finite number',
        path: ['expectedRate'],
    })

export type DepositInitPayload = z.infer<typeof depositInitSchema>

export const depositUserSignedSchema = z.object({
    scheduleId: z
        .string()
        .trim()
        .regex(hederaEntityPattern, 'Invalid Hedera schedule ID'),
    clientRequestId: z.string().optional(),
})

export type DepositUserSignedPayload = z.infer<typeof depositUserSignedSchema>

export type RateRecord = {
    rate: number
    sequenceNumber: string
    timestamp?: string
}

const RATE_TOLERANCE = 0.0001

export const isRateMatch = (
    latestRate: RateRecord,
    submittedRate: RateRecord
) => {
    const sequenceMatches =
        latestRate.sequenceNumber === submittedRate.sequenceNumber
    const withinTolerance =
        Math.abs(latestRate.rate - submittedRate.rate) < RATE_TOLERANCE
    return sequenceMatches && withinTolerance
}
