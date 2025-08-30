import { useEffect, useState } from 'react'
import { useWallet } from '@buidlerlabs/hashgraph-react-wallets'

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
                // Método 1: Desde el signer
                if (signer && 'getAccountId' in signer) {
                    const id = await (signer as WalletSigner).getAccountId?.()
                    if (id) {
                        setAccountId(typeof id === 'string' ? id : String(id))
                        return
                    }
                }

                // Método 2: Desde el connector
                if ('getAccountIds' in connector) {
                    const ids = await (connector as WalletConnector).getAccountIds?.()
                    if (ids && ids.length > 0) {
                        setAccountId(ids[0])
                        return
                    }
                }

                // Método 3: Desde la sesión (para WalletConnect)
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

                // Método 4: Desde el provider (para HashPack)
                if ('getProvider' in connector) {
                    const provider = await (connector as WalletConnector).getProvider?.()
                    if (provider?.accountId) {
                        setAccountId(typeof provider.accountId === 'string' ? provider.accountId : String(provider.accountId))
                    }
                }
            } catch (error) {
                console.error('Error fetching account ID:', error)
                setAccountId('')
            }
        }

        fetchAccountId()
    }, [isConnected, connector, signer])

    return accountId
}
