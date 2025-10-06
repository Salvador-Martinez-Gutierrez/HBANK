import { withApiHandler } from '@/lib/api-handler'
import { depositService } from '@/services/depositService'
import { depositUserSignedSchema } from '@/utils/validation/deposit'

export default withApiHandler(
    async ({ req, res, logger }) => {
        const payload = depositUserSignedSchema.parse(req.body)

        logger.info('Processing treasury signature', {
            scheduleId: payload.scheduleId,
        })

        const result = await depositService.completeTreasurySignature(payload)

        logger.info('Treasury signature result', {
            scheduleExecuted: result.executed,
        })

        res.status(200).json({
            ...result,
            clientRequestId: payload.clientRequestId,
        })
    },
    {
        methods: ['POST'],
        scope: 'api:deposit:user-signed',
    }
)
