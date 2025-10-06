import { z } from 'zod'

import { VALIDATION } from '@/app/backend-constants'

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

export const instantWithdrawSchema = z
    .object({
        userAccountId: z
            .string()
            .trim()
            .regex(VALIDATION.ACCOUNT_ID_REGEX, 'Invalid Hedera account ID'),
        amountHUSD: z.preprocess(
            (value) => toNumber(value),
            positiveNumber('amountHUSD')
        ),
        rate: z.preprocess((value) => toNumber(value), positiveNumber('rate')),
        rateSequenceNumber: z
            .string()
            .trim()
            .min(1, 'rateSequenceNumber is required'),
        requestType: z.literal('instant'),
        clientRequestId: z.string().optional(),
    })
    .refine((data) => Number.isFinite(data.amountHUSD), {
        message: 'amountHUSD must be a finite number',
        path: ['amountHUSD'],
    })
    .refine((data) => Number.isFinite(data.rate), {
        message: 'rate must be a finite number',
        path: ['rate'],
    })

export type InstantWithdrawPayload = z.infer<typeof instantWithdrawSchema>
