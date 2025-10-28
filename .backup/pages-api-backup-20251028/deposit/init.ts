import { withApiHandler } from '@/lib/api-handler'
import { depositService } from '@/services/depositService'
import { depositInitSchema } from '@/utils/validation/deposit'

export default withApiHandler(
    async ({ req, res, logger }) => {
        const payload = depositInitSchema.parse(req.body)

        logger.info('Payload validated', {
            rateSequenceNumber: payload.rateSequenceNumber,
            userAccountIdSuffix: payload.userAccountId.slice(-6),
        })

        const result = await depositService.initializeDeposit(payload)
        logger.info('Deposit initialization completed', {
            scheduleId: result.scheduleId,
        })

        res.status(200).json(result)
    },
    {
        methods: ['POST'],
        scope: 'api:deposit:init',
    }
)
