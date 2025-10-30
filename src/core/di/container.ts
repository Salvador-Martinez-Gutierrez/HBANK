/**
 * Dependency Injection Container Configuration
 *
 * This file configures the InversifyJS IoC container for the HBANK Protocol.
 * All services, repositories, and dependencies are registered here.
 *
 * @module core/di/container
 */

import 'reflect-metadata'
import { Container } from 'inversify'
import { TYPES } from './types'
import { serverEnv } from '@/config/serverEnv'

// Infrastructure
import { IEventBus, InMemoryEventBus } from '@/core/events/EventBus'
import {
    ICacheService,
    InMemoryCacheService,
    RedisCacheService,
} from '@/infrastructure/cache'
import {
    HederaClientFactory,
    HederaBalanceService,
    HederaMirrorNodeService,
    HederaRateService,
    HederaDepositService,
    HederaWithdrawalService,
} from '@/infrastructure/hedera'

// Repositories (commented out until dependencies are resolved)
// import { IDepositRepository } from '@/core/repositories/IDepositRepository'
// import { IWithdrawRepository } from '@/core/repositories/IWithdrawRepository'
// import { IRateRepository } from '@/core/repositories/IRateRepository'
// import { HederaDepositRepository } from '@/infrastructure/repositories/hedera/HederaDepositRepository'
// import { HederaWithdrawRepository } from '@/infrastructure/repositories/hedera/HederaWithdrawRepository'
// import { HederaRateRepository } from '@/infrastructure/repositories/hedera/HederaRateRepository'

// Event Handlers
import { initializeEventHandlers, RegisteredHandlers } from '@/core/events/handlers'

/**
 * Create and configure the IoC container
 *
 * This function creates a new container instance and registers all
 * dependencies. It should be called once at application startup.
 *
 * @returns Configured InversifyJS container with all bindings
 *
 * @example
 * ```typescript
 * const container = createContainer()
 * const depositRepo = container.get<IDepositRepository>(TYPES.DepositRepository)
 * ```
 */
export function createContainer(): Container {
    const container = new Container()

    // ========================================
    // Infrastructure Bindings
    // ========================================

    // Event Bus - Singleton for event publishing
    container
        .bind<IEventBus>(TYPES.EventBus)
        .to(InMemoryEventBus)
        .inSingletonScope()

    // Cache Service - Singleton for application-wide caching
    // Automatically selects Redis if REDIS_URL is set, otherwise uses in-memory cache
    const CacheImplementation = serverEnv.redis?.url ? RedisCacheService : InMemoryCacheService
    container.bind<ICacheService>(TYPES.CacheService).to(CacheImplementation).inSingletonScope()

    // ========================================
    // Hedera Infrastructure Bindings
    // ========================================

    // Hedera Client Factory - Singleton for creating Hedera clients
    container
        .bind<HederaClientFactory>(TYPES.HederaClientFactory)
        .to(HederaClientFactory)
        .inSingletonScope()

    // Hedera Balance Service - Singleton for balance queries
    container
        .bind<HederaBalanceService>(TYPES.HederaBalanceService)
        .to(HederaBalanceService)
        .inSingletonScope()

    // Hedera Mirror Node Service - Singleton for transaction verification
    container
        .bind<HederaMirrorNodeService>(TYPES.HederaMirrorNodeService)
        .to(HederaMirrorNodeService)
        .inSingletonScope()

    // Hedera Rate Service - Singleton for rate publishing and queries
    container
        .bind<HederaRateService>(TYPES.HederaRateService)
        .to(HederaRateService)
        .inSingletonScope()

    // Hedera Deposit Service - Singleton for deposit and scheduled transactions
    container
        .bind<HederaDepositService>(TYPES.HederaDepositService)
        .to(HederaDepositService)
        .inSingletonScope()

    // Hedera Withdrawal Service - Singleton for withdrawal operations and HCS publishing
    container
        .bind<HederaWithdrawalService>(TYPES.HederaWithdrawalService)
        .to(HederaWithdrawalService)
        .inSingletonScope()

    // ========================================
    // Repository Bindings
    // ========================================

    // Hedera Repositories (DEFERRED - require HederaClient and Logger bindings)
    // TODO: Bind these once HederaClient factory and Logger are implemented
    // container
    //     .bind<IDepositRepository>(TYPES.DepositRepository)
    //     .to(HederaDepositRepository)
    //     .inSingletonScope()
    //
    // container
    //     .bind<IWithdrawRepository>(TYPES.WithdrawRepository)
    //     .to(HederaWithdrawRepository)
    //     .inSingletonScope()
    //
    // container
    //     .bind<IRateRepository>(TYPES.RateRepository)
    //     .to(HederaRateRepository)
    //     .inSingletonScope()

    // ========================================
    // Event Handlers Initialization
    // ========================================

    // Initialize event handlers after EventBus is bound
    const eventBus = container.get<IEventBus>(TYPES.EventBus)
    const handlers = initializeEventHandlers(eventBus)

    // Store handlers in container for access if needed
    container.bind<RegisteredHandlers>(Symbol.for('EventHandlers')).toConstantValue(handlers)

    // ========================================
    // Service Bindings (To be implemented)
    // ========================================

    // Services will be bound when refactored with DI
    // container.bind<IDepositService>(TYPES.DepositService).to(DepositService)
    // container.bind<IWithdrawService>(TYPES.WithdrawService).to(WithdrawService)
    // container.bind<IRateService>(TYPES.RateService).to(RateService)

    // ========================================
    // Validation Service Bindings (To be implemented)
    // ========================================

    // Validation services will be bound when refactored
    // container.bind<IDepositValidationService>(TYPES.DepositValidationService).to(DepositValidationService)
    // container.bind<IWithdrawValidationService>(TYPES.WithdrawValidationService).to(WithdrawValidationService)
    // container.bind<IRateValidationService>(TYPES.RateValidationService).to(RateValidationService)

    return container
}

/**
 * Global container instance
 *
 * This is the main container used throughout the application.
 * It's created once and reused for all dependency resolution.
 *
 * @example
 * ```typescript
 * import { container } from '@/core/di/container'
 *
 * const depositService = container.get<IDepositService>(TYPES.DepositService)
 * ```
 */
export const container = createContainer()

/**
 * Reset container for testing
 *
 * This function creates a fresh container instance, useful for testing
 * where you want to mock dependencies.
 *
 * @returns New container instance
 *
 * @example
 * ```typescript
 * beforeEach(() => {
 *   const testContainer = resetContainer()
 *   // Bind mocks to testContainer
 * })
 * ```
 */
export function resetContainer(): Container {
    return createContainer()
}
