import { useEffect, useState } from 'react'
import { useWallet } from '@buidlerlabs/hashgraph-react-wallets'

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
                if (signer && typeof signer.getAccountId === 'function') {
                    const id = await signer.getAccountId()
                    if (id) {
                        setAccountId(id.toString())
                        return
                    }
                }

                // Método 2: Desde el connector
                if (connector.getAccountIds) {
                    const ids = await connector.getAccountIds()
                    if (ids && ids.length > 0) {
                        setAccountId(ids[0])
                        return
                    }
                }

                // Método 3: Desde la sesión (para WalletConnect)
                if (connector.getSession) {
                    const session = await connector.getSession()
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
                if (connector.getProvider) {
                    const provider = await connector.getProvider()
                    if (provider.accountId) {
                        setAccountId(provider.accountId.toString())
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
