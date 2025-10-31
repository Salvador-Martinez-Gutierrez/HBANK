# 🔍 Análisis ACTUALIZADO de Llamadas a la API de SaucerSwap

**Fecha**: 31 de Octubre, 2025  
**Estado**: Código actualizado con logger y optimizaciones parciales

---

## 📊 Estado Actual del Código

### ✅ Optimizaciones YA Implementadas:

1. **Cache de `/tokens`**: 15 minutos (CACHE_TTL)
2. **Request Coalescing**: Múltiples llamadas simultáneas comparten el mismo request
3. **Sistema de Logger**: Implementado con scoped loggers
4. **Funciones optimizadas**:
    - `getTokenPrice()`: Usa cache, no hace llamadas individuales
    - `getHbarPrice()`: Usa cache vía `getTokenPrice()`
    - `createTokenLookupMap()`: Retorna el mapa cacheado

### ❌ Sin Optimizar:

1. **`getLpTokenData(tokenId)`**: Llama a `/pools/known` sin cache
2. **`fetchFarmTotals(accountId)`**: Llama a `/farms/totals/{accountId}` sin cache
3. **`fetchPoolId(id)`**: Llama a `/farms` completo sin cache
4. **`getLpTokenDataByPoolId(poolId)`**: Llama a `/pools/{poolId}` sin cache

---

## 📈 Escenario: Usuario con 3 Wallets

### Asumiendo cada wallet tiene:

-   2 LP tokens en pools
-   2 farms activas

### Llamadas ACTUALES con `sync-all-wallets`:

| Endpoint                    | Optimizado     | Por Wallet | Total (3 wallets)   |
| --------------------------- | -------------- | ---------- | ------------------- |
| GET /tokens                 | ✅ Cache 15min | 0 (cached) | **1** (primera vez) |
| GET /tokens/{HBAR}          | ✅ Usa cache   | 0          | **0**               |
| GET /pools/known            | ❌ Sin cache   | 2          | **6**               |
| GET /farms/totals/{account} | ❌ Sin cache   | 1          | **3**               |
| GET /farms                  | ❌ Sin cache   | 2          | **6**               |
| GET /pools/{poolId}         | ❌ Sin cache   | 2          | **6**               |
| **TOTAL**                   |                |            | **22 llamadas**     |

**Nota**: La primera wallet hace 1 llamada a `/tokens`, las siguientes 2 wallets usan el cache.

---

## 🔥 Problemas Principales Identificados

### 1. **GET /pools/known** - 6 llamadas redundantes

```typescript
// Se llama en getLpTokenData() POR CADA LP token
export async function getLpTokenData(tokenId: string) {
    const url = `${SAUCERSWAP_API}/pools/known` // ❌ Devuelve TODOS los pools
    // ... busca el pool específico en el array
}
```

**Problema**: Si tienes 3 LP tokens en 3 wallets, haces 6 llamadas que devuelven los mismos ~50 pools cada vez.

**Solución**: Cache de 10-15 minutos similar al de tokens.

### 2. **GET /farms** - 6 llamadas redundantes

```typescript
// Se llama en fetchPoolId() POR CADA farm
export async function fetchPoolId(id: number) {
    const url = `${SAUCERSWAP_API}/farms` // ❌ Devuelve TODAS las farms
    const farms: Farm[] = await response.json()
    const farm = farms.find((f) => f.id === id) // Busca UNA
}
```

**Problema**: Si tienes 2 farms por wallet en 3 wallets, haces 6 llamadas que devuelven las mismas ~10 farms.

**Solución**: Cache de 10-15 minutos + obtener todas las farms una sola vez.

### 3. **Falta de batching para pools individuales**

```typescript
// Se llama getLpTokenDataByPoolId() por cada farm
const lpData = await getLpTokenDataByPoolId(poolId)
```

**Problema**: 1 llamada individual por cada farm activa.

---

## 🚀 Optimizaciones Recomendadas

### 🔴 Prioridad CRÍTICA (Resolver rate limits)

#### 1. Cache para `/pools/known`

```typescript
// En defiService.ts
let cachedPools: LpTokenData[] | null = null
let poolsCacheTimestamp: number = 0
const POOLS_CACHE_TTL = 10 * 60 * 1000 // 10 minutos

export async function getAllPools(): Promise<LpTokenData[]> {
    const now = Date.now()

    // Usar cache si está válido
    if (cachedPools && now - poolsCacheTimestamp < POOLS_CACHE_TTL) {
        logger.info(`🔄 Using cached pools (${cachedPools.length} pools)`)
        return cachedPools
    }

    // Fetch fresh data
    const url = `${SAUCERSWAP_API}/pools/known`
    const response = await fetch(url, {
        headers: {
            'x-api-key': SAUCERSWAP_API_KEY,
            'Content-Type': 'application/json',
        },
    })

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
    }

    cachedPools = await response.json()
    poolsCacheTimestamp = now

    logger.info(`✅ Loaded ${cachedPools.length} pools from SaucerSwap`)
    return cachedPools
}

// Modificar getLpTokenData para usar el cache
export async function getLpTokenData(
    tokenId: string
): Promise<LpTokenData | undefined> {
    const pools = await getAllPools() // Usa cache
    return pools.find((pool) => pool.lpToken.id === tokenId)
}
```

**Impacto**: De 6 llamadas a 1 llamada → **Ahorro de 5 llamadas**

#### 2. Cache para `/farms`

```typescript
// En defiService.ts
let cachedFarms: Farm[] | null = null
let farmsCacheTimestamp: number = 0
const FARMS_CACHE_TTL = 10 * 60 * 1000 // 10 minutos

export async function getAllFarms(): Promise<Farm[]> {
    const now = Date.now()

    if (cachedFarms && now - farmsCacheTimestamp < FARMS_CACHE_TTL) {
        logger.info(`🔄 Using cached farms (${cachedFarms.length} farms)`)
        return cachedFarms
    }

    const url = `${SAUCERSWAP_API}/farms`
    const response = await fetch(url, {
        headers: {
            'x-api-key': SAUCERSWAP_API_KEY,
            'Content-Type': 'application/json',
        },
    })

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
    }

    cachedFarms = await response.json()
    farmsCacheTimestamp = now

    logger.info(`✅ Loaded ${cachedFarms.length} farms from SaucerSwap`)
    return cachedFarms
}

// Modificar fetchPoolId para usar el cache
export async function fetchPoolId(id: number): Promise<number | null> {
    const farms = await getAllFarms() // Usa cache
    const farm = farms.find((f) => f.id === id)

    if (farm) {
        logger.info(`✅ Found pool ID ${farm.poolId} for farm ${id}`)
        return farm.poolId
    }

    logger.info(`⚠️ No farm found with id: ${id}`)
    return null
}
```

**Impacto**: De 6 llamadas a 1 llamada → **Ahorro de 5 llamadas**

#### 3. Aumentar delay entre wallets

```typescript
// En sync-all-wallets.ts
// Cambiar de 300ms a 1000ms
await new Promise((resolve) => setTimeout(resolve, 1000))
```

**Impacto**: Reduce la velocidad de requests y ayuda a evitar rate limits.

---

## 📊 Impacto de Optimizaciones

### Antes de las optimizaciones:

| Acción                    | Llamadas |
| ------------------------- | -------- |
| Sync 3 wallets individual | 27       |
| Sync 3 wallets (sync-all) | 22       |

### Después de implementar cache:

| Acción                    | Llamadas  |
| ------------------------- | --------- |
| Sync 3 wallets individual | **10-12** |
| Sync 3 wallets (sync-all) | **10**    |

**Reducción**: ~55% menos llamadas

### Desglose optimizado (3 wallets con sync-all):

| Endpoint                    | Llamadas                    |
| --------------------------- | --------------------------- |
| GET /tokens                 | 1 (cache compartido) ✅     |
| GET /tokens/{HBAR}          | 0 (usa cache) ✅            |
| GET /pools/known            | 1 (cache nuevo) ✨          |
| GET /farms                  | 1 (cache nuevo) ✨          |
| GET /farms/totals/{account} | 3 (una por wallet) ✅       |
| GET /pools/{poolId}         | 4-6 (según pools únicos) ✅ |
| **TOTAL**                   | **10-12**                   |

---

## 🎯 Plan de Implementación

### Fase 1 - CRÍTICA (Resolver rate limits inmediatos)

-   [x] Cache de tokens (YA IMPLEMENTADO)
-   [x] Request coalescing (YA IMPLEMENTADO)
-   [ ] **Cache de pools (`getAllPools()`)**
-   [ ] **Cache de farms (`getAllFarms()`)**
-   [ ] **Aumentar delay entre wallets a 1s**

### Fase 2 - Mejoras adicionales

-   [ ] Cache de pool individuales por poolId
-   [ ] Retry logic con exponential backoff en todos los endpoints
-   [ ] Deduplicación de poolIds antes de llamar a `/pools/{poolId}`

### Fase 3 - Optimización avanzada

-   [ ] Pre-fetch de pools y farms al inicio del sync-all
-   [ ] Batch requests cuando sea posible
-   [ ] Monitoring de rate limits y ajuste dinámico de delays

---

## 💡 Notas Adicionales

### Rate Limits de SaucerSwap

Según los errores 429 que estás viendo, probablemente tienen:

-   ~60 requests por minuto
-   O ~100 requests por 5 minutos

Con 22 llamadas en menos de 1 segundo (3 wallets con 300ms delay), es fácil superar el límite.

### Recomendación

**Implementar Fase 1 URGENTEMENTE** para reducir de 22 a 10 llamadas (~55% reducción).
