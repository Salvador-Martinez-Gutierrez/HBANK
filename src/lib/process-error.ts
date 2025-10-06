const FALLBACK_MESSAGE = 'Something went wrong. Please try again.'
const MAX_ERROR_LENGTH = 180

const KNOWN_ERROR_PATTERNS: Array<{ regex: RegExp; message: string }> = [
    {
        regex: /insufficient(?:\s+(?:balance|funds|token|liquidity))?/i,
        message: 'Insufficient balance to complete the transaction.',
    },
    {
        regex: /(user|wallet)\s+(?:signature|sign|approval).*fail/i,
        message:
            'The wallet signature failed. Please try again from your wallet.',
    },
    {
        regex: /(user\s+reject|user\s+denied|rejected\s+request|transaction\s+cancel)/i,
        message: 'The transaction was cancelled from your wallet.',
    },
    {
        regex: /(mirror node|sequence number)/i,
        message:
            'The rate information is stale. Refresh the page and try again in a moment.',
    },
    {
        regex: /identical_schedule_already_created/i,
        message:
            'This transaction was already submitted recently. Check your wallet history before retrying.',
    },
    {
        regex: /network|connection|unreachable|timeout/i,
        message: 'Network issue detected. Check your connection and try again.',
    },
]

const JSON_REGEXP = /\{[\s\S]*\}/

const extractMessageFromJson = (raw: string): string | undefined => {
    const trimmed = raw.trim()
    const candidates: string[] = []

    if (trimmed.startsWith('{')) {
        candidates.push(trimmed)
    }

    const match = trimmed.match(JSON_REGEXP)
    if (match) {
        candidates.push(match[0])
    }

    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(candidate)
            if (!parsed) continue
            if (typeof parsed === 'string') {
                return parsed
            }

            const possibleKeys = [
                'message',
                'error',
                'description',
                'detail',
                'details',
                'statusMessage',
            ]

            for (const key of possibleKeys) {
                const value = parsed[key]
                if (typeof value === 'string' && value.trim().length > 0) {
                    return value
                }
            }

            // If details is an object with a message property
            if (typeof parsed.details === 'object' && parsed.details !== null) {
                for (const key of possibleKeys) {
                    const value = parsed.details[key]
                    if (typeof value === 'string' && value.trim()) {
                        return value
                    }
                }
            }
        } catch {
            // Ignore JSON parse errors and continue
            continue
        }
    }

    return undefined
}

const normalizeWhitespace = (value: string) =>
    value
        .replace(/\s+/g, ' ')
        .replace(/^Error:\s*/i, '')
        .trim()

const clampLength = (value: string) =>
    value.length > MAX_ERROR_LENGTH
        ? `${value.slice(0, MAX_ERROR_LENGTH - 1)}…`
        : value

export const formatProcessError = (
    rawError: string | null | undefined,
    options?: { fallbackMessage?: string }
): string => {
    if (!rawError || rawError === 'undefined') {
        return options?.fallbackMessage ?? FALLBACK_MESSAGE
    }

    const extractedFromJson = extractMessageFromJson(rawError)
    const candidate = normalizeWhitespace(extractedFromJson ?? rawError)

    if (!candidate) {
        return options?.fallbackMessage ?? FALLBACK_MESSAGE
    }

    for (const pattern of KNOWN_ERROR_PATTERNS) {
        if (pattern.regex.test(candidate)) {
            return pattern.message
        }
    }

    const fallback = options?.fallbackMessage ?? FALLBACK_MESSAGE
    return clampLength(candidate) || fallback
}
