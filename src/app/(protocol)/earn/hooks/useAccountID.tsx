import { useEffect, useState } from 'react'
import { useWallet } from '@buidlerlabs/hashgraph-react-wallets'
import { logger } from '@/lib/logger'


// Types for wallet connectors and signers
interface WalletSigner {
    getAccountId?: () => unknown
}

interface WalletConnector {
    getAccountIds?: () => Promise<string[]>
    getSession?: () => Promise<{
        namespaces?: {
            hedera?: {
                accounts?: string[]
            }
        }
    }>
    getProvider?: () => Promise<{
        accountId?: unknown
    }>
}

export function useAccountId() {
    const [accountId, setAccountId] = useState<string>('')
    const { isConnected, connector, signer } = useWallet()

    useEffect(() => {
        const fetchAccountId = async () => {
            if (!isConnected || !connector) {
                setAccountId('')
                return
            }

            try {
                // Method 1: From the signer
                if (signer && 'getAccountId' in signer) {
                    const id = await (signer as WalletSigner).getAccountId?.()
                    if (id) {
                        setAccountId(typeof id === 'string' ? id : String(id))
                        return
                    }
                }

                // Method 2: From the connector
                if ('getAccountIds' in connector) {
                    const ids = await (connector as WalletConnector).getAccountIds?.()
                    if (ids && ids.length > 0) {
                        setAccountId(ids[0])
                        return
                    }
                }

                // Method 3: From the session (for WalletConnect)
                if ('getSession' in connector) {
                    const session = await (connector as WalletConnector).getSession?.()
                    const hederaAccount =
                        session?.namespaces?.hedera?.accounts?.[0]
                    if (hederaAccount) {
                        // Format: "hedera:testnet:0.0.12345"
                        const parts = hederaAccount.split(':')
                        const accountId = parts[parts.length - 1]
                        setAccountId(accountId)
                        return
                    }
                }

                // Method 4: From the provider (for HashPack)
                if ('getProvider' in connector) {
                    const provider = await (connector as WalletConnector).getProvider?.()
                    if (provider?.accountId) {
                        setAccountId(typeof provider.accountId === 'string' ? provider.accountId : String(provider.accountId))
                    }
                }
            } catch (error) {
                logger.error('Error fetching account ID:', error)
                setAccountId('')
            }
        }

        void fetchAccountId()
    }, [isConnected, connector, signer])

    return accountId
}
