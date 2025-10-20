/**
 * EJEMPLO DE USO - Nuevo Endpoint de Hedera Validation Cloud
 *
 * Este archivo muestra ejemplos de cómo usar los nuevos endpoints
 * para obtener balances de tokens, NFTs y LPs.
 */

// =============================================================================
// EJEMPLO 1: Obtener balance completo de una cuenta
// =============================================================================

const VALIDATION_CLOUD_API_KEY = 'pXHTfQvt_oM9ciuRzrpRL_rHe85ZtVP1Phl0qMe17oQ'
const BASE_URL = 'https://mainnet.hedera.validationcloud.io/v1'
const ACCOUNT_ID = '0.0.1357150'

async function getAccountBalances(accountId: string) {
    const url = `${BASE_URL}/${VALIDATION_CLOUD_API_KEY}/api/v1/accounts/${accountId}?transactions=false`

    const response = await fetch(url)
    const data = await response.json()

    // Balance de HBAR (dividir por 10^8)
    const hbarBalance = data.balance.balance / 100000000
    console.log(`HBAR Balance: ${hbarBalance}`)

    // Todos los tokens (fungibles, NFTs, LPs)
    const tokens = data.balance.tokens || []
    console.log(`Total tokens: ${tokens.length}`)

    // Filtrar tokens con balance > 0
    const activeTokens = tokens.filter(
        (token: any) => parseInt(token.balance) > 0
    )
    console.log(`Active tokens: ${activeTokens.length}`)

    return { hbarBalance, tokens: activeTokens }
}

// =============================================================================
// EJEMPLO 2: Obtener metadata de un token específico
// =============================================================================

async function getTokenInfo(tokenId: string) {
    const url = `${BASE_URL}/${VALIDATION_CLOUD_API_KEY}/api/v1/tokens/${tokenId}`

    const response = await fetch(url)
    const data = await response.json()

    console.log('Token Info:', {
        name: data.name,
        symbol: data.symbol,
        decimals: data.decimals,
        type: data.type, // FUNGIBLE_COMMON o NON_FUNGIBLE_UNIQUE
        totalSupply: data.total_supply,
    })

    return data
}

// =============================================================================
// EJEMPLO 3: Clasificar tokens por tipo
// =============================================================================

async function classifyTokens(accountId: string) {
    const { tokens } = await getAccountBalances(accountId)

    const classified = {
        fungible: [] as any[],
        lps: [] as any[],
        nfts: [] as any[],
    }

    for (const token of tokens) {
        const metadata = await getTokenInfo(token.token_id)

        if (metadata.type === 'NON_FUNGIBLE_UNIQUE') {
            // Es un NFT
            classified.nfts.push({
                tokenId: token.token_id,
                balance: token.balance,
                ...metadata,
            })
        } else if (metadata.type === 'FUNGIBLE_COMMON') {
            // Es fungible - verificar si es LP
            if (
                metadata.name.startsWith('ssLP') ||
                metadata.symbol.startsWith('ssLP')
            ) {
                // Es un LP token
                classified.lps.push({
                    tokenId: token.token_id,
                    balance: token.balance,
                    ...metadata,
                })
            } else {
                // Es un token fungible normal
                classified.fungible.push({
                    tokenId: token.token_id,
                    balance: token.balance,
                    ...metadata,
                })
            }
        }
    }

    console.log('Clasificación:', {
        fungibles: classified.fungible.length,
        lps: classified.lps.length,
        nfts: classified.nfts.length,
    })

    return classified
}

// =============================================================================
// EJEMPLO 4: Respuesta completa del endpoint de cuenta
// =============================================================================

/*
RESPUESTA DE EJEMPLO:
GET https://mainnet.hedera.validationcloud.io/v1/{API_KEY}/api/v1/accounts/0.0.1357150?transactions=false

{
  "account": "0.0.1357150",
  "alias": null,
  "auto_renew_period": 7776000,
  "balance": {
    "balance": 123456789,  // HBAR en tinybars (dividir por 10^8)
    "timestamp": "0.000000000",
    "tokens": [
      {
        "token_id": "0.0.1461946",
        "balance": "1000000",
        "decimals": 6
      },
      {
        "token_id": "0.0.731861",
        "balance": "500000000",
        "decimals": 8
      },
      {
        "token_id": "0.0.456858",  // NFT
        "balance": "3",  // Cantidad de NFTs
        "decimals": 0
      }
    ]
  },
  "created_timestamp": "1234567890.000000000",
  "deleted": false,
  "ethereum_nonce": 0,
  "evm_address": "0x...",
  "expiry_timestamp": null,
  "key": {
    "_type": "ED25519",
    "key": "..."
  },
  "max_automatic_token_associations": 0,
  "memo": "",
  "receiver_sig_required": false,
  "staked_account_id": null,
  "staked_node_id": null,
  "stake_period_start": null
}
*/

// =============================================================================
// EJEMPLO 5: Respuesta completa del endpoint de token
// =============================================================================

/*
RESPUESTA DE EJEMPLO:
GET https://mainnet.hedera.validationcloud.io/v1/{API_KEY}/api/v1/tokens/0.0.1461946

{
  "token_id": "0.0.1461946",
  "symbol": "USDC",
  "name": "USD Coin",
  "type": "FUNGIBLE_COMMON",  // o "NON_FUNGIBLE_UNIQUE" para NFTs
  "decimals": "6",
  "initial_supply": "0",
  "total_supply": "1000000000000",
  "max_supply": "9223372036854775807",
  "treasury_account_id": "0.0.1461945",
  "admin_key": {
    "_type": "ProtobufEncoded",
    "key": "..."
  },
  "created_timestamp": "1234567890.000000000",
  "modified_timestamp": "1234567890.000000000",
  "deleted": false,
  "memo": "",
  "supply_type": "INFINITE",
  "custom_fees": {
    "created_timestamp": "1234567890.000000000",
    "fixed_fees": [],
    "fractional_fees": []
  }
}

EJEMPLO DE LP TOKEN:
{
  "token_id": "0.0.3456789",
  "symbol": "ssLP-HBAR-USDC",
  "name": "ssLP HBAR/USDC",  // ¡Comienza con "ssLP"!
  "type": "FUNGIBLE_COMMON",
  "decimals": "8",
  ...
}

EJEMPLO DE NFT:
{
  "token_id": "0.0.456858",
  "symbol": "COOL-NFT",
  "name": "Cool NFT Collection",
  "type": "NON_FUNGIBLE_UNIQUE",  // ¡Este es el campo clave!
  "decimals": "0",
  ...
}
*/

// =============================================================================
// EJEMPLO 6: Uso en el portfolio service
// =============================================================================

/*
import { syncWalletTokens } from '@/services/portfolioWalletService'

// Sincronizar wallet
const result = await syncWalletTokens(
    'wallet-uuid-123',
    '0.0.1357150'
)

console.log('Resultado de sincronización:', result)
// {
//   success: true,
//   stats: {
//     hbarBalance: 1.23456789,
//     fungibleTokens: 5,
//     lpTokens: 2,
//     nfts: 3
//   }
// }
*/

// =============================================================================
// EJEMPLO 7: Conversión de balance con decimales
// =============================================================================

function convertBalance(balance: string, decimals: number): number {
    const balanceNum = parseInt(balance)
    return balanceNum / Math.pow(10, decimals)
}

// Ejemplos:
// HBAR: 123456789 tinybars / 10^8 = 1.23456789 HBAR
// USDC: 1000000 / 10^6 = 1.00 USDC
// Token con 8 decimales: 500000000 / 10^8 = 5.00

console.log('HBAR Balance:', convertBalance('123456789', 8)) // 1.23456789
console.log('USDC Balance:', convertBalance('1000000', 6)) // 1.0
console.log('Token Balance:', convertBalance('500000000', 8)) // 5.0

// =============================================================================
// NOTAS IMPORTANTES
// =============================================================================

/*
1. RATE LIMITING
   - Validation Cloud tiene límites de rate
   - Considera implementar caching si haces muchas llamadas

2. FILTRADO DE BALANCE CERO
   - Siempre filtrar tokens con balance = 0
   - Reduce llamadas innecesarias al endpoint de metadata

3. DETECCIÓN DE LP TOKENS
   - Debe ser FUNGIBLE_COMMON
   - El nombre o símbolo debe empezar con "ssLP"
   
4. NFTs
   - type === "NON_FUNGIBLE_UNIQUE"
   - El campo balance indica la cantidad de NFTs de esa colección
   - Puede necesitar endpoint adicional para obtener serial numbers específicos

5. HBAR BALANCE
   - Siempre dividir por 10^8 (100,000,000)
   - 1 HBAR = 100,000,000 tinybars

6. MANEJO DE ERRORES
   - Algunos tokens pueden no tener metadata disponible
   - Implementar fallback para tokens desconocidos
*/

export { getAccountBalances, getTokenInfo, classifyTokens, convertBalance }
