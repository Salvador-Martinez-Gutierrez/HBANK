import { withApiHandler } from '@/lib/api-handler'
import { instantWithdrawService } from '@/services/instantWithdrawService'

export default withApiHandler(
    async ({ res, logger }) => {
        const result = await instantWithdrawService.getMaxInstantWithdrawable()

        logger.info('Fetched instant withdraw max', {
            maxInstantWithdrawable: result.maxInstantWithdrawable,
        })

        res.status(200).json(result)
    },
    {
        methods: ['GET'],
        scope: 'api:withdraw:instant:max',
    }
)
