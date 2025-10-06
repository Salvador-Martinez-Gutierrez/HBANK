const TEN = BigInt(10)

const ensureIntegerString = (value: string, label: string): bigint => {
    const trimmed = value.trim()
    if (!/^\d+$/.test(trimmed)) {
        throw new Error(`Invalid ${label} component: ${value}`)
    }
    return BigInt(trimmed)
}

const buildTinyUnits = (
    integerPart: string,
    fractionalPart: string,
    decimals: number
): bigint => {
    const scaleFactor = TEN ** BigInt(decimals)
    const integerComponent =
        ensureIntegerString(integerPart, 'integer') * scaleFactor
    const fractionalComponent = fractionalPart
        ? ensureIntegerString(
              fractionalPart.padEnd(decimals, '0').slice(0, decimals),
              'fractional'
          )
        : BigInt(0)

    return integerComponent + fractionalComponent
}

export const toTinyUnits = (
    amount: number | string,
    decimals: number
): bigint => {
    if (typeof amount === 'number') {
        if (!Number.isFinite(amount)) {
            throw new Error('Amount must be a finite number')
        }
        const fixed = amount.toFixed(decimals)
        const [integerPart, fractionalPart = ''] = fixed.split('.')
        return buildTinyUnits(integerPart, fractionalPart, decimals)
    }

    const normalized = amount.trim()
    if (!/^(\d+)(\.\d+)?$/.test(normalized)) {
        throw new Error(`Invalid decimal string: ${amount}`)
    }

    const [integerPart, fractionalPart = ''] = normalized.split('.')
    return buildTinyUnits(integerPart, fractionalPart, decimals)
}

export const fromTinyUnits = (tinyAmount: bigint, decimals: number): number => {
    const divisor = Number(TEN ** BigInt(decimals))
    return Number(tinyAmount) / divisor
}
