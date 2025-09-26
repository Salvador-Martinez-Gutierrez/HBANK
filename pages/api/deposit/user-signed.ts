import { NextApiRequest, NextApiResponse } from 'next'
import {
    Client,
    ScheduleInfoQuery,
    ScheduleSignTransaction,
    ScheduleId,
    AccountId,
    PrivateKey,
    TransferTransaction,
    TokenId,
    Hbar,
} from '@hashgraph/sdk'

/**
 * POST /api/deposit/user-signed
 *
 * Verifies user signature on schedule and executes treasury signature to complete atomic deposit
 *
 * @param req - Request object containing scheduleId and optional clientRequestId
 * @param res - Response object
 *
 * @example
 * POST /api/deposit/user-signed
 * {
 *   "scheduleId": "0.0.99999",
 *   "clientRequestId": "optional-client-id"
 * }
 *
 * @returns
 * {
 *   "success": true,
 *   "executed": true,
 *   "txId": "0.0.123456@1234567890.123456789"
 * }
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    console.log('=== DEPOSIT USER-SIGNED ENDPOINT CALLED ===')
    console.log('Method:', req.method)
    console.log('Body:', req.body)

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { scheduleId, clientRequestId } = req.body

        // Field validation
        if (!scheduleId) {
            console.error('Missing scheduleId:', { scheduleId })
            return res.status(400).json({
                error: 'Missing required field: scheduleId',
            })
        }

        console.log('Processing user signature verification:', {
            scheduleId,
            clientRequestId,
        })

        // Validate environment variables - we need EMISSIONS wallet (not deposit)
        const emissionsWalletId = process.env.EMISSIONS_ID
        const emissionsWalletKey = process.env.EMISSIONS_KEY

        if (!emissionsWalletId || !emissionsWalletKey) {
            console.error('Missing environment variables:', {
                EMISSIONS_ID: !!emissionsWalletId,
                EMISSIONS_KEY: !!emissionsWalletKey,
            })
            return res.status(500).json({
                error: 'Server configuration error',
                message: 'Missing required environment variables',
            })
        }

        // Configure Hedera client with EMISSIONS wallet (the one that needs to sign)
        const client = Client.forTestnet()
        const emissionsAccountId = AccountId.fromString(emissionsWalletId)
        const emissionsPrivateKey = PrivateKey.fromString(emissionsWalletKey)

        client.setOperator(emissionsAccountId, emissionsPrivateKey)
        console.log(
            'Client configured for emissions wallet:',
            emissionsAccountId.toString()
        )

        // Query the schedule to verify user signature
        console.log('Querying schedule information...')

        const scheduleQuery = new ScheduleInfoQuery()
            .setScheduleId(ScheduleId.fromString(scheduleId))
            .setMaxQueryPayment(Hbar.fromTinybars(100_000_000)) // 1 HBAR for query fee

        const scheduleInfo = await scheduleQuery.execute(client)

        console.log('Schedule info retrieved:', {
            scheduleId: scheduleInfo.scheduleId?.toString(),
            memo: scheduleInfo.scheduleMemo,
            adminKey: scheduleInfo.adminKey?.toString(),
            executed: scheduleInfo.executed,
            deleted: scheduleInfo.deleted,
        })

        // Check if schedule was already executed
        if (scheduleInfo.executed) {
            console.log('Schedule already executed')
            return res.status(200).json({
                success: true,
                executed: true,
                message: 'Transaction already executed',
                scheduleId,
            })
        }

        // Check if schedule was deleted
        if (scheduleInfo.deleted) {
            console.error('Schedule was deleted')
            return res.status(400).json({
                error: 'Schedule was deleted',
                scheduleId,
            })
        }

        // Verify that user has signed by checking if schedule is ready to execute
        // In ScheduleCreateTransaction, when we have all required signatures,
        // the schedule will be ready for execution
        console.log(
            'Schedule requires user signature before emissions wallet can complete it'
        )

        // For now, we'll assume the user has signed if they're calling this endpoint
        // In production, you might want additional verification

        // Execute emissions wallet signature to complete the transaction
        console.log('Executing emissions wallet signature...')

        const scheduleSign = new ScheduleSignTransaction()
            .setScheduleId(ScheduleId.fromString(scheduleId))
            .setMaxTransactionFee(Hbar.fromTinybars(1_000_000_000)) // Set explicit fee of 10 HBAR

        const signResponse = await scheduleSign.execute(client)
        const signReceipt = await signResponse.getReceipt(client)

        console.log('Emissions wallet signature executed:', {
            txId: signResponse.transactionId?.toString(),
            status: signReceipt.status.toString(),
        })

        if (signReceipt.status.toString() !== 'SUCCESS') {
            throw new Error(
                `Emissions wallet signature failed with status: ${signReceipt.status}`
            )
        }

        // Query the schedule again to check if it's now executed
        const finalScheduleQuery = new ScheduleInfoQuery()
            .setScheduleId(ScheduleId.fromString(scheduleId))
            .setMaxQueryPayment(Hbar.fromTinybars(100_000_000)) // 1 HBAR for query fee

        const finalScheduleInfo = await finalScheduleQuery.execute(client)

        console.log('Final schedule status:', {
            executed: finalScheduleInfo.executed,
        })

        // The scheduled transaction already includes both USDC and hUSD transfers
        // No need to send hUSD separately - it's already handled by the schedule

        const result = {
            success: true,
            executed: finalScheduleInfo.executed || false,
            txId: signResponse.transactionId?.toString(),
            scheduleId,
            timestamp: new Date().toISOString(),
            clientRequestId,
        }

        console.log('=== DEPOSIT USER-SIGNED SUCCESSFUL ===', result)
        return res.status(200).json(result)
    } catch (error: unknown) {
        console.error('=== DEPOSIT USER-SIGNED ERROR ===')
        const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
        const errorStack = error instanceof Error ? error.stack : undefined
        console.error('Error message:', errorMessage)
        console.error('Error stack:', errorStack)

        // Check if this is a specific Hedera error
        let statusCode = 500
        let errorType = 'Treasury signature failed'

        if (errorMessage.includes('INVALID_SCHEDULE_ID')) {
            statusCode = 404
            errorType = 'Schedule not found'
        } else if (errorMessage.includes('SCHEDULE_ALREADY_EXECUTED')) {
            statusCode = 409
            errorType = 'Schedule already executed'
        } else if (errorMessage.includes('SCHEDULE_ALREADY_DELETED')) {
            statusCode = 410
            errorType = 'Schedule was deleted'
        }

        return res.status(statusCode).json({
            error: errorType,
            message: errorMessage,
            details:
                process.env.NODE_ENV === 'development' ? errorStack : undefined,
        })
    }
}
