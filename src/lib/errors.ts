export class ApiError extends Error {
    public readonly statusCode: number
    public readonly expose: boolean
    public readonly details?: unknown

    constructor(
        statusCode: number,
        message: string,
        options?: { expose?: boolean; details?: unknown }
    ) {
        super(message)
        this.name = 'ApiError'
        this.statusCode = statusCode
        this.expose = options?.expose ?? (statusCode >= 400 && statusCode < 500)
        this.details = options?.details
    }
}

export const badRequest = (message: string, details?: unknown) =>
    new ApiError(400, message, { expose: true, details })

export const unauthorized = (message: string, details?: unknown) =>
    new ApiError(401, message, { expose: true, details })

export const forbidden = (message: string, details?: unknown) =>
    new ApiError(403, message, { expose: true, details })

export const notFound = (message: string, details?: unknown) =>
    new ApiError(404, message, { expose: true, details })

export const conflict = (message: string, details?: unknown) =>
    new ApiError(409, message, { expose: true, details })

export const gone = (message: string, details?: unknown) =>
    new ApiError(410, message, { expose: true, details })

export const unprocessableEntity = (message: string, details?: unknown) =>
    new ApiError(422, message, { expose: true, details })

export const tooManyRequests = (message: string, details?: unknown) =>
    new ApiError(429, message, { expose: true, details })

export const internalError = (message: string, details?: unknown) =>
    new ApiError(500, message, { expose: false, details })

export const serviceUnavailable = (message: string, details?: unknown) =>
    new ApiError(503, message, { expose: true, details })
