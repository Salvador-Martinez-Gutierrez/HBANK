import { NextApiRequest, NextApiResponse } from 'next'
import { ZodError } from 'zod'

import { ApiError, internalError, unprocessableEntity } from './errors'
import { createScopedLogger, ScopedLogger } from './logger'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type ApiHandlerOptions = {
    methods: HttpMethod[]
    scope: string
}

export type ApiHandlerContext<TRequest = unknown> = {
    req: NextApiRequest & { body: TRequest }
    res: NextApiResponse
    logger: ScopedLogger
}

type ApiHandler<TPayload = unknown> = (
    context: ApiHandlerContext<TPayload>
) => Promise<void>

const methodNotAllowed = (methods: HttpMethod[]) =>
    new ApiError(405, 'Method not allowed', {
        expose: true,
        details: { allowed: methods },
    })

export const withApiHandler =
    <TPayload>(handler: ApiHandler<TPayload>, options: ApiHandlerOptions) =>
    async (req: NextApiRequest, res: NextApiResponse) => {
        const { methods, scope } = options
        const requestId =
            (req.headers['x-request-id'] as string | undefined) ??
            (typeof req.body === 'object' && req.body !== null
                ? (req.body as { clientRequestId?: string }).clientRequestId
                : undefined)

        const logger = createScopedLogger(scope, {
            requestId,
            method: req.method,
            path: req.url,
        })

        if (!req.method || !methods.includes(req.method as HttpMethod)) {
            const error = methodNotAllowed(methods)
            logger.warn('Rejected unsupported method', {
                attemptedMethod: req.method,
            })
            res.setHeader('Allow', methods.join(', '))
            return res
                .status(error.statusCode)
                .json({ error: error.message, allowedMethods: methods })
        }

        try {
            await handler({
                req: req as ApiHandlerContext<TPayload>['req'],
                res,
                logger,
            })
        } catch (error: unknown) {
            if (error instanceof ApiError) {
                const level = error.statusCode >= 500 ? 'error' : 'warn'
                logger[level]('Handled ApiError', {
                    message: error.message,
                    details: error.details,
                })
                return res.status(error.statusCode).json({
                    error: error.message,
                    ...(error.details ? { details: error.details } : {}),
                })
            }

            if (error instanceof ZodError) {
                logger.warn('Validation failed', { issues: error.issues })
                const response = unprocessableEntity(
                    'Validation failed',
                    error.flatten()
                )
                return res.status(response.statusCode).json({
                    error: response.message,
                    details: response.details,
                })
            }

            logger.error('Unhandled error', {
                message:
                    error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
            })

            const response = internalError('Unexpected server error')
            return res
                .status(response.statusCode)
                .json({ error: response.message })
        }
    }
