import { NextRequest, NextResponse } from 'next/server'
import { createScopedLogger } from '@/lib/logger'
import { container } from '@/core/di/container'
import { TYPES } from '@/core/di/types'
import { HederaBalanceService } from '@/infrastructure/hedera'
import { serverEnv } from '@/config/serverEnv'

const logger = createScopedLogger('api:wallet-balances')

interface WalletInfo {
    id: string
    name: string
    description: string
    envKey: string
    balances: {
        hbar: number
        usdc: number
        husd: number
    }
    health: 'healthy' | 'warning' | 'critical'
}

interface WalletBalancesResponse {
    wallets: WalletInfo[]
    lastUpdated: string
}

export async function GET(_req: NextRequest): Promise<NextResponse> {
    try {
        // Get HederaBalanceService from DI container
        const balanceService = container.get<HederaBalanceService>(TYPES.HederaBalanceService)

        // Define all wallets from serverEnv
        const wallets = [
            {
                id: serverEnv.operators.ratePublisher?.accountId ?? '',
                name: 'Rate Publisher',
                description: 'Publishes exchange rates to HCS',
                envKey: 'RATE_PUBLISHER_ID',
            },
            {
                id: serverEnv.operators.treasury?.accountId ?? '',
                name: 'Treasury',
                description: 'Holds hUSD tokens',
                envKey: 'TREASURY_ID',
            },
            {
                id: serverEnv.operators.deposit.accountId,
                name: 'Deposit Wallet',
                description: 'Receives USDC deposits',
                envKey: 'DEPOSIT_WALLET_ID',
            },
            {
                id: serverEnv.operators.instantWithdraw.accountId,
                name: 'Instant Withdrawal',
                description: 'Processes instant USDC withdrawals',
                envKey: 'INSTANT_WITHDRAW_WALLET_ID',
            },
            {
                id: serverEnv.operators.standardWithdraw?.accountId ?? '',
                name: 'Standard Withdrawal',
                description: 'Processes standard USDC withdrawals',
                envKey: 'STANDARD_WITHDRAW_WALLET_ID',
            },
            {
                id: serverEnv.operators.emissions.accountId,
                name: 'Emissions',
                description: 'Mints hUSD tokens',
                envKey: 'EMISSIONS_ID',
            },
        ]

        const usdcTokenId = serverEnv.tokens.usdc.tokenId
        const husdTokenId = serverEnv.tokens.husd.tokenId

        const walletBalances: WalletInfo[] = []

        for (const wallet of wallets) {
            try {
                // Get HBAR balance
                const hbarBalance = await getHbarBalance(wallet.id)

                // Get USDC balance
                const usdcBalance = await balanceService.checkBalance(
                    wallet.id,
                    usdcTokenId
                )

                // Get hUSD balance (using the specific method for hUSD)
                const husdBalance = await getHusdBalance(wallet.id, husdTokenId)

                // Determine health status
                const health = determineWalletHealth(
                    wallet.name,
                    hbarBalance,
                    usdcBalance,
                    husdBalance
                )

                walletBalances.push({
                    id: wallet.id,
                    name: wallet.name,
                    description: wallet.description,
                    envKey: wallet.envKey,
                    balances: {
                        hbar: hbarBalance,
                        usdc: usdcBalance,
                        husd: husdBalance,
                    },
                    health,
                })
            } catch (error) {
                logger.error(`Error fetching balance for wallet ${wallet.name}`, {
                    walletName: wallet.name,
                    walletId: wallet.id,
                    error: error instanceof Error ? error.message : String(error),
                })
                // Add wallet with zero balances if error occurs
                walletBalances.push({
                    id: wallet.id,
                    name: wallet.name,
                    description: wallet.description,
                    envKey: wallet.envKey,
                    balances: {
                        hbar: 0,
                        usdc: 0,
                        husd: 0,
                    },
                    health: 'critical',
                })
            }
        }

        return NextResponse.json({
            wallets: walletBalances,
            lastUpdated: new Date().toISOString(),
        } as WalletBalancesResponse)
    } catch (error) {
        logger.error('Error fetching wallet balances', {
            error: error instanceof Error ? error.message : String(error),
        })
        return NextResponse.json(
            { error: 'Failed to fetch wallet balances' },
            { status: 500 }
        )
    }
}

async function getHbarBalance(accountId: string): Promise<number> {
    try {
        const mirrorNodeUrl = 'https://testnet.mirrornode.hedera.com'
        const url = `${mirrorNodeUrl}/api/v1/accounts/${accountId}`

        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        // Convert tinybars to HBAR using environment decimal setting
        const HBAR_MULTIPLIER = Math.pow(10, serverEnv.decimals.hbar)
        return data.balance ? data.balance.balance / HBAR_MULTIPLIER : 0
    } catch (error) {
        logger.error('Error fetching HBAR balance', {
            accountId,
            error: error instanceof Error ? error.message : String(error),
        })
        return 0
    }
}

async function getHusdBalance(
    accountId: string,
    tokenId: string
): Promise<number> {
    try {
        const mirrorNodeUrl = 'https://testnet.mirrornode.hedera.com'
        const url = `${mirrorNodeUrl}/api/v1/accounts/${accountId}/tokens`

        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        if (data.tokens && Array.isArray(data.tokens)) {
            const husdToken = data.tokens.find(
                (token: {
                    token_id: string
                    balance: number
                    decimals?: number
                }) => token.token_id === tokenId
            )
            if (husdToken) {
                // Use the actual decimals from the token info, fallback to 8 for hUSD
                const decimals = husdToken.decimals ?? 3
                return husdToken.balance / Math.pow(10, decimals)
            }
        }

        return 0
    } catch (error) {
        logger.error('Error fetching hUSD balance', {
            accountId,
            tokenId,
            error: error instanceof Error ? error.message : String(error),
        })
        return 0
    }
}

function determineWalletHealth(
    walletName: string,
    hbarBalance: number,
    usdcBalance: number,
    husdBalance: number
): 'healthy' | 'warning' | 'critical' {
    if (hbarBalance < 1) {
        return 'critical' // Not enough HBAR for transactions
    }

    // Specific checks for different wallet types - WARNING only when main token is 0
    switch (walletName) {
        case 'Instant Withdrawal':
        case 'Standard Withdrawal':
            // Withdrawal wallets should have USDC
            if (usdcBalance === 0) {
                return 'warning' // Main token (USDC) is 0
            }
            break

        case 'Emissions':
            // Emissions wallet should have hUSD
            if (husdBalance === 0) {
                return 'warning' // Main token (hUSD) is 0
            }
            break

        case 'Treasury':
        case 'Rate Publisher':
        case 'Deposit Wallet':
            // These wallets mainly need HBAR for operations
            // They are healthy as long as they have enough HBAR
            break
    }

    return 'healthy'
}
