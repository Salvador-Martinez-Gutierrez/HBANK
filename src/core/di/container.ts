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

/**
 * Create and configure the IoC container
 *
 * This function creates a new container instance and registers all
 * dependencies. It should be called once at application startup.
 *
 * @returns Configured InversifyJS container
 *
 * @example
 * ```typescript
 * const container = createContainer()
 * const depositService = container.get<IDepositService>(TYPES.DepositService)
 * ```
 */
export function createContainer(): Container {
    const container = new Container()

    // ========================================
    // Infrastructure Bindings
    // ========================================

    // Logger will be bound when implemented
    // container.bind<ILogger>(TYPES.Logger).to(PinoLogger).inSingletonScope()

    // ========================================
    // Repository Bindings
    // ========================================

    // Repositories will be bound when implemented
    // container.bind<IDepositRepository>(TYPES.DepositRepository).to(HederaDepositRepository)
    // container.bind<IWithdrawRepository>(TYPES.WithdrawRepository).to(HederaWithdrawRepository)
    // container.bind<IRateRepository>(TYPES.RateRepository).to(HederaRateRepository)

    // ========================================
    // Service Bindings
    // ========================================

    // Services will be bound when implemented
    // container.bind<IDepositService>(TYPES.DepositService).to(DepositService)
    // container.bind<IWithdrawService>(TYPES.WithdrawService).to(WithdrawService)
    // container.bind<IRateService>(TYPES.RateService).to(RateService)

    // ========================================
    // Validation Service Bindings
    // ========================================

    // Validation services will be bound when implemented
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
