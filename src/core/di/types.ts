/**
 * Dependency Injection Container Types
 *
 * This file defines all the symbols used for dependency injection
 * throughout the HBANK Protocol application using InversifyJS.
 *
 * @module core/di/types
 */

/**
 * DI Container Symbols
 *
 * These symbols are used to bind and resolve dependencies in the IoC container.
 * Use these constants instead of string literals to ensure type safety.
 *
 * @example
 * ```typescript
 * container.bind<IDepositRepository>(TYPES.DepositRepository).to(HederaDepositRepository)
 *
 * class DepositService {
 *   constructor(
 *     @inject(TYPES.DepositRepository) private repository: IDepositRepository
 *   ) {}
 * }
 * ```
 */
export const TYPES = {
    // ========================================
    // Infrastructure
    // ========================================

    /** Logger implementation */
    Logger: Symbol.for('Logger'),

    /** Cache service for storing temporary data */
    CacheService: Symbol.for('CacheService'),

    // ========================================
    // Hedera Infrastructure
    // ========================================

    /** Hedera client instance */
    HederaClient: Symbol.for('HederaClient'),

    /** Hedera service for blockchain operations */
    HederaService: Symbol.for('HederaService'),

    /** Hedera client factory for creating configured clients */
    HederaClientFactory: Symbol.for('HederaClientFactory'),

    // ========================================
    // Repositories
    // ========================================

    /** Repository for deposit operations */
    DepositRepository: Symbol.for('DepositRepository'),

    /** Repository for withdrawal operations */
    WithdrawRepository: Symbol.for('WithdrawRepository'),

    /** Repository for exchange rate operations */
    RateRepository: Symbol.for('RateRepository'),

    // ========================================
    // Domain Services
    // ========================================

    /** Service for deposit operations */
    DepositService: Symbol.for('DepositService'),

    /** Service for withdrawal operations */
    WithdrawService: Symbol.for('WithdrawService'),

    /** Service for instant withdrawal operations */
    InstantWithdrawService: Symbol.for('InstantWithdrawService'),

    /** Service for exchange rate operations */
    RateService: Symbol.for('RateService'),

    // ========================================
    // Validation Services
    // ========================================

    /** Validation service for deposits */
    DepositValidationService: Symbol.for('DepositValidationService'),

    /** Validation service for withdrawals */
    WithdrawValidationService: Symbol.for('WithdrawValidationService'),

    /** Validation service for exchange rates */
    RateValidationService: Symbol.for('RateValidationService'),

    // ========================================
    // External Services
    // ========================================

    /** Telegram notification service */
    TelegramService: Symbol.for('TelegramService'),

    /** Portfolio wallet service */
    PortfolioWalletService: Symbol.for('PortfolioWalletService'),

    /** Portfolio authentication service */
    PortfolioAuthService: Symbol.for('PortfolioAuthService'),
} as const

/**
 * Type-safe symbol type
 * This ensures that only valid TYPES symbols can be used for injection
 */
export type DITypes = typeof TYPES[keyof typeof TYPES]
