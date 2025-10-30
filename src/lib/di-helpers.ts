/**
 * Dependency Injection Helpers
 *
 * Utilities to easily access services from the DI container in API routes,
 * server components, and server actions.
 */

import { container } from '@/core/di/container'
import { TYPES } from '@/core/di/types'
import type { IEventBus } from '@/core/events/EventBus'
import type { ICacheService } from '@/infrastructure/cache'
import type {
    HederaClientFactory,
    HederaBalanceService,
    HederaMirrorNodeService,
    HederaRateService,
    HederaDepositService,
    HederaWithdrawalService,
} from '@/infrastructure/hedera'

/**
 * Get the Event Bus instance
 *
 * @example
 * ```typescript
 * const eventBus = getEventBus()
 * await eventBus.publish(new DepositCompleted(...))
 * ```
 */
export function getEventBus(): IEventBus {
    return container.get<IEventBus>(TYPES.EventBus)
}

/**
 * Get the Cache Service instance
 *
 * @example
 * ```typescript
 * const cache = getCacheService()
 * await cache.set('key', value, 300)
 * ```
 */
export function getCacheService(): ICacheService {
    return container.get<ICacheService>(TYPES.CacheService)
}

/**
 * Get the Hedera Client Factory
 *
 * @example
 * ```typescript
 * const factory = getHederaClientFactory()
 * const client = factory.createMainClient()
 * ```
 */
export function getHederaClientFactory(): HederaClientFactory {
    return container.get<HederaClientFactory>(TYPES.HederaClientFactory)
}

/**
 * Get the Hedera Balance Service
 *
 * @example
 * ```typescript
 * const balanceService = getHederaBalanceService()
 * const balance = await balanceService.checkBalance(accountId, tokenId)
 * ```
 */
export function getHederaBalanceService(): HederaBalanceService {
    return container.get<HederaBalanceService>(TYPES.HederaBalanceService)
}

/**
 * Get the Hedera Mirror Node Service
 *
 * @example
 * ```typescript
 * const mirrorService = getHederaMirrorNodeService()
 * const exists = await mirrorService.checkTransactionInMirrorNode(txId)
 * ```
 */
export function getHederaMirrorNodeService(): HederaMirrorNodeService {
    return container.get<HederaMirrorNodeService>(TYPES.HederaMirrorNodeService)
}

/**
 * Get the Hedera Rate Service
 *
 * @example
 * ```typescript
 * const rateService = getHederaRateService()
 * const rate = await rateService.getCurrentRate()
 * ```
 */
export function getHederaRateService(): HederaRateService {
    return container.get<HederaRateService>(TYPES.HederaRateService)
}

/**
 * Get the Hedera Deposit Service
 *
 * @example
 * ```typescript
 * const depositService = getHederaDepositService()
 * const result = await depositService.scheduleDeposit(userId, amount)
 * ```
 */
export function getHederaDepositService(): HederaDepositService {
    return container.get<HederaDepositService>(TYPES.HederaDepositService)
}

/**
 * Get the Hedera Withdrawal Service
 *
 * @example
 * ```typescript
 * const withdrawalService = getHederaWithdrawalService()
 * const txId = await withdrawalService.transferUSDCToUser(userId, amount)
 * ```
 */
export function getHederaWithdrawalService(): HederaWithdrawalService {
    return container.get<HederaWithdrawalService>(TYPES.HederaWithdrawalService)
}

/**
 * Get all Hedera services at once
 *
 * Useful when you need multiple services in the same route.
 *
 * @example
 * ```typescript
 * const { balanceService, depositService, rateService } = getHederaServices()
 * ```
 */
export function getHederaServices() {
    return {
        clientFactory: getHederaClientFactory(),
        balanceService: getHederaBalanceService(),
        mirrorNodeService: getHederaMirrorNodeService(),
        rateService: getHederaRateService(),
        depositService: getHederaDepositService(),
        withdrawalService: getHederaWithdrawalService(),
    }
}
