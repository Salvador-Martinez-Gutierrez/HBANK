/**
 * Centralized query keys for TanStack Query
 * This ensures consistency across the app and makes invalidation easier
 */

export const queryKeys = {
    // TVL
    tvl: ['tvl'] as const,

    // Instant Withdraw
    instantWithdrawMax: ['instant-withdraw-max'] as const,

    // Withdrawals
    withdrawals: (userAccountId?: string) =>
        userAccountId
            ? (['withdrawals', userAccountId] as const)
            : (['withdrawals'] as const),

    // History
    history: (userAccountId?: string, cursor?: string) =>
        userAccountId
            ? (['history', userAccountId, cursor] as const)
            : (['history'] as const),

    // Rate
    rate: ['rate'] as const,
    rateHistory: (limit?: number) =>
        limit ? (['rate-history', limit] as const) : (['rate-history'] as const),

    // Portfolio
    portfolioWallets: (userId?: string) =>
        userId
            ? (['portfolio-wallets', userId] as const)
            : (['portfolio-wallets'] as const),
    portfolioAuth: ['portfolio-auth'] as const,

    // Token prices
    tokenPrices: ['token-prices'] as const,
    tokenPrice: (tokenId: string) => ['token-price', tokenId] as const,

    // Wallet balances
    walletBalances: (accountId?: string) =>
        accountId
            ? (['wallet-balances', accountId] as const)
            : (['wallet-balances'] as const),

    // Account balances
    accountBalances: (accountId: string) => ['account-balances', accountId] as const,

    // Token balances (for Hedera)
    tokenBalances: (accountId?: string) =>
        accountId
            ? (['token-balances', accountId] as const)
            : (['token-balances'] as const),
}
