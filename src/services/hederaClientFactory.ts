import { AccountId, Client, Hbar, PrivateKey } from '@hashgraph/sdk'

import { ensureTestnetAccess, serverEnv } from '@/config/serverEnv'
import { createScopedLogger } from '@/lib/logger'

const clients = new Map<string, Client>()
const logger = createScopedLogger('hedera-client')

type Operator = 'deposit' | 'emissions' | 'instantWithdraw'

type OperatorConfig = {
    accountId: string
    privateKey: string
}

const buildClient = (operator: Operator, config: OperatorConfig) => {
    ensureTestnetAccess()

    const client = Client.forTestnet()
    const accountId = AccountId.fromString(config.accountId)
    const privateKey = PrivateKey.fromString(config.privateKey)

    client.setOperator(accountId, privateKey)
    client.setDefaultMaxQueryPayment(
        Hbar.fromTinybars(Number(serverEnv.limits.maxQueryPaymentTinybars))
    )
    client.setDefaultMaxTransactionFee(
        Hbar.fromTinybars(Number(serverEnv.limits.maxScheduleSignFeeTinybars))
    )

    logger.info('Initialized Hedera client', {
        operator,
        accountId: accountId.toString(),
    })
    return client
}

export const getHederaClient = (operator: Operator): Client => {
    const cacheKey = `${operator}:testnet`

    if (!clients.has(cacheKey)) {
        const operatorConfig = serverEnv.operators[operator]
        clients.set(cacheKey, buildClient(operator, operatorConfig))
    }

    return clients.get(cacheKey)!
}

export const resetHederaClients = () => {
    clients.forEach((client) => client.close())
    clients.clear()
}
