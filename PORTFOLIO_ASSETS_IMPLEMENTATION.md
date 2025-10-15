# Portfolio Asset Management - Implementation Summary

## ✅ Cambios Implementados

### 1. 📊 Nueva Migración de Base de Datos

**Archivo**: `supabase/migrations/20250115_create_asset_tables.sql`

Se crearon 3 tablas principales para separar los tipos de assets:

#### `tokens_registry`

-   Tabla compartida con metadata de todos los tokens
-   Campos: token_address, token_name, token_symbol, token_icon, decimals, token_type, price_usd
-   token_type puede ser: 'FUNGIBLE', 'NON_FUNGIBLE', 'LP_TOKEN'

#### `wallet_tokens`

-   Tokens fungibles por wallet
-   Relación con tokens_registry
-   Campos: wallet_id, token_id, balance, last_synced_at

#### `liquidity_pool_tokens`

-   Tokens de liquidity pools por wallet
-   Relación con tokens_registry
-   Campos: wallet_id, token_id, balance, pool_metadata (JSONB), last_synced_at

#### Mejoras a `nfts`

-   Se agregó wallet_id y token_registry_id
-   Se actualizó la constraint única

---

### 2. 🔄 Servicio de Sincronización Mejorado

**Archivo**: `src/services/portfolioWalletService.ts`

#### Nueva función `isLiquidityPoolToken()`

Detecta tokens LP por patrones en nombre/símbolo:

-   Terminan en "LP"
-   Contienen "SAUCER LP"
-   Patrones como "HBAR-TOKEN" o "TOKEN/HBAR"

#### `syncWalletTokens()` Mejorada

Ahora hace 3 llamadas a Validation Cloud:

1. **GET `/accounts/{address}/tokens`**

    - Obtiene todos los tokens fungibles y LP
    - Los clasifica según `isLiquidityPoolToken()`
    - Guarda en `wallet_tokens` o `liquidity_pool_tokens`

2. **GET `/accounts/{address}/nfts`**

    - Obtiene todos los NFTs
    - Guarda en tabla `nfts`
    - Incluye metadata y serial_number

3. **Enriquecimiento con SaucerSwap**
    - Precios en tiempo real
    - Metadata (nombre, símbolo, icono)
    - Cache de 5 minutos

**Return**:

```typescript
{
    success: true,
    stats: {
        fungibleTokens: number,
        lpTokens: number,
        nfts: number
    }
}
```

#### `getUserWallets()` Actualizada

Ahora hace SELECT con JOINs a todas las tablas:

```sql
SELECT *,
    wallet_tokens (*, tokens_registry (*)),
    liquidity_pool_tokens (*, tokens_registry (*)),
    nfts (*, tokens_registry (*))
FROM wallets
```

---

### 3. 🎨 Componente UI: AssetSections

**Archivo**: `src/components/asset-sections.tsx`

Componente con **3 pestañas** (tabs):

#### Tab 1: Tokens (Fungibles)

-   Icono: `Coins`
-   Muestra: token_icon, nombre, balance, valor USD
-   Badge con contador

#### Tab 2: LP Tokens

-   Icono: `Droplet`
-   Estilo azul distintivo
-   Muestra: balance, valor, metadata del pool

#### Tab 3: NFTs

-   Icono: `ImageIcon`
-   Grid 2-4 columnas (responsive)
-   Muestra: imagen, nombre, serial number
-   Fallback a gradiente si no hay imagen

---

### 4. 🔧 WalletCard Actualizado

**Archivo**: `src/components/wallet-card.tsx`

#### Cambios principales:

-   Reemplazó la lista única de tokens por `<AssetSections />`
-   Calcula valor total incluyendo tokens fungibles + LP tokens
-   Badge muestra: "X tokens · Y NFTs"
-   Removió sort button (ahora cada sección maneja su propio orden)

---

### 5. 📝 Tipos TypeScript

**Archivo**: `src/types/portfolio.ts`

Nuevos tipos:

```typescript
export type TokenType = 'FUNGIBLE' | 'NON_FUNGIBLE' | 'LP_TOKEN'
export type LiquidityPoolToken =
    Database['public']['Tables']['liquidity_pool_tokens']['Row']

export interface LPTokenWithMetadata extends LiquidityPoolToken {
    tokens_registry: TokenRegistry
}

export interface NFTWithMetadata extends NFT {
    tokens_registry?: TokenRegistry
}

export interface WalletWithAssets extends Wallet {
    wallet_tokens: WalletTokenWithMetadata[]
    liquidity_pool_tokens: LPTokenWithMetadata[]
    nfts: NFTWithMetadata[]
}
```

---

## 🚀 Próximos Pasos

### 1. Aplicar Migración en Supabase

```bash
# Conectar a tu proyecto Supabase
supabase link --project-ref YOUR_PROJECT_REF

# Aplicar la migración
supabase db push
```

### 2. Regenerar Tipos de Supabase

```bash
# Generar tipos TypeScript desde el schema
supabase gen types typescript --local > src/types/supabase.ts
```

### 3. Probar el Sync

```bash
npm run dev
```

1. Ir a la página de Portfolio
2. Click en "Sync" en cualquier wallet
3. Verificar que aparezcan las 3 pestañas
4. Revisar que se muestren tokens, LP tokens y NFTs

---

## 📋 Checklist de Verificación

-   [ ] Migración aplicada en Supabase
-   [ ] Tipos regenerados (`supabase gen types`)
-   [ ] Endpoints de Validation Cloud funcionando
-   [ ] Las 3 pestañas se ven correctamente
-   [ ] Tokens fungibles se muestran con precio
-   [ ] LP tokens se destacan visualmente
-   [ ] NFTs se muestran en grid con imágenes
-   [ ] El contador de assets es correcto
-   [ ] El valor total incluye fungibles + LP tokens

---

## 🔍 Endpoints de Validation Cloud Usados

### 1. Tokens & LP Tokens

```
GET https://mainnet.hedera.validationcloud.io/v1/{API_KEY}/api/v1/accounts/{address}/tokens
```

Respuesta:

```json
{
    "tokens": [
        {
            "token_id": "0.0.123456",
            "balance": "1000000",
            "decimals": 8,
            "type": "FUNGIBLE_COMMON"
        }
    ]
}
```

### 2. NFTs

```
GET https://mainnet.hedera.validationcloud.io/v1/{API_KEY}/api/v1/accounts/{address}/nfts
```

Respuesta:

```json
{
    "nfts": [
        {
            "token_id": "0.0.789012",
            "serial_number": 1,
            "metadata": {
                "name": "NFT Name",
                "image": "ipfs://...",
                "description": "..."
            }
        }
    ]
}
```

---

## 🐛 Notas de Troubleshooting

### Error: "liquidity_pool_tokens does not exist"

-   Ejecutar la migración en Supabase
-   Verificar que la migración se aplicó correctamente

### Error: TypeScript "Property does not exist"

-   Regenerar tipos con `supabase gen types`
-   Reiniciar el servidor de desarrollo

### NFTs no aparecen

-   Verificar que la API de Validation Cloud soporta el endpoint de NFTs
-   Revisar logs en consola del servidor

### Precios no aparecen

-   Verificar que SaucerSwap API esté respondiendo
-   Revisar cache (5 minutos TTL)

---

## 📚 Referencias

-   [Validation Cloud Docs](https://docs.validationcloud.io/)
-   [Hedera Mirror Node API](https://docs.hedera.com/hedera/sdks-and-apis/rest-api)
-   [SaucerSwap API](https://docs.saucerswap.finance/)
-   [Supabase Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)
