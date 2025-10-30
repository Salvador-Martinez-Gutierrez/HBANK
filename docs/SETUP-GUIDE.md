# Guía de Configuración - HBANK Protocol

## 📋 Qué Necesitas Hacer Para Usar los Cambios

Esta guía te explica paso a paso qué configurar para usar toda la nueva infraestructura implementada.

---

## 1. Sentry (Monitoring & Error Tracking)

### ¿Qué necesitas?

Sentry requiere una cuenta y configuración:

#### Paso 1: Crear Cuenta en Sentry

1. Ve a https://sentry.io/signup/
2. Crea una cuenta gratuita (incluye 5,000 errores/mes gratis)
3. Crea un nuevo proyecto:
   - Tipo: **Next.js**
   - Nombre: `hbank-protocol`

#### Paso 2: Obtener el DSN

Después de crear el proyecto, Sentry te mostrará un **DSN** (Data Source Name):

```
https://abc123def456@o123456.ingest.sentry.io/789012
```

Este es el "API key" de Sentry.

#### Paso 3: Configurar Variables de Entorno

Agrega estas variables a tu archivo `.env.local`:

```bash
# Sentry - REQUERIDO para que funcione
NEXT_PUBLIC_SENTRY_DSN=https://abc123def456@o123456.ingest.sentry.io/789012
SENTRY_DSN=https://abc123def456@o123456.ingest.sentry.io/789012

# Sentry - OPCIONAL (solo para production source maps)
SENTRY_ORG=tu-organizacion  # El nombre de tu org en Sentry
SENTRY_PROJECT=hbank-protocol
SENTRY_AUTH_TOKEN=sntrys_xxx  # Crear en: Settings > Auth Tokens
```

#### Paso 4: ¿Cómo Obtener el Auth Token? (OPCIONAL)

Solo necesitas esto si quieres **source maps** en producción:

1. En Sentry, ve a **Settings → Auth Tokens**
2. Click "Create New Token"
3. Nombre: `hbank-upload`
4. Permisos: `project:releases` y `project:write`
5. Copia el token y agrégalo a `.env.local`

#### ⚠️ Importante sobre Sentry

- **En desarrollo**: Sentry NO enviará eventos si `NEXT_PUBLIC_SENTRY_DSN` no está configurado (ver logs en consola)
- **En producción**: DEBES configurar el DSN para recibir errores
- **Sin DSN**: El código funcionará normalmente, solo sin tracking

---

## 2. Redis (Caching - OPCIONAL)

### ¿Necesitas Redis?

**NO es obligatorio inmediatamente:**

- **En desarrollo**: Usa `InMemoryCacheService` (ya configurado por defecto)
- **En producción**: Recomendado usar Redis

### Configuración de Redis (cuando lo necesites)

#### Opción 1: Redis Local (Desarrollo)

```bash
# macOS con Homebrew
brew install redis
brew services start redis

# URL por defecto
REDIS_URL=redis://localhost:6379
```

#### Opción 2: Redis Cloud (Producción)

Proveedores gratuitos:
- **Upstash** (https://upstash.com/) - 10,000 comandos/día gratis
- **Redis Cloud** (https://redis.com/try-free/) - 30MB gratis

Después de crear la base de datos, obtendrás una URL:

```bash
REDIS_URL=rediss://default:password@redis-xxxxx.upstash.io:6379
```

#### Cambiar de InMemory a Redis

En `src/core/di/container.ts`, cambia:

```typescript
// DESARROLLO (actual)
container
    .bind<ICacheService>(TYPES.CacheService)
    .to(InMemoryCacheService)
    .inSingletonScope()

// PRODUCCIÓN (cuando tengas Redis)
container
    .bind<ICacheService>(TYPES.CacheService)
    .to(RedisCacheService)
    .inSingletonScope()
```

O hazlo dinámico:

```typescript
import { RedisCacheService, InMemoryCacheService } from '@/infrastructure/cache'

const CacheImpl = process.env.REDIS_URL ? RedisCacheService : InMemoryCacheService

container
    .bind<ICacheService>(TYPES.CacheService)
    .to(CacheImpl)
    .inSingletonScope()
```

---

## 3. Variables de Entorno Nuevas

Agrega estas a tu `.env.local`:

```bash
# ============================================
# NUEVAS VARIABLES REQUERIDAS
# ============================================

# Sentry (Monitoring)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Environment identifier
NEXT_PUBLIC_ENVIRONMENT=development  # o staging, production

# ============================================
# OPCIONALES (Para producción)
# ============================================

# Redis (Caching - solo en production)
REDIS_URL=redis://localhost:6379

# Sentry Source Maps (solo en production)
SENTRY_ORG=tu-organizacion
SENTRY_PROJECT=hbank-protocol
SENTRY_AUTH_TOKEN=sntrys_xxx

# ============================================
# VARIABLES EXISTENTES (Ya las tienes)
# ============================================

# Supabase
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# Hedera
OPERATOR_ID=0.0.xxxxx
OPERATOR_KEY=302e...
# ... todas tus wallets existentes

# Tokens
USDC_TOKEN_ID=0.0.xxxxx
HUSD_TOKEN_ID=0.0.xxxxx

# Topics
RATE_TOPIC_ID=0.0.xxxxx
WITHDRAW_TOPIC_ID=0.0.xxxxx
```

---

## 4. Usar los Nuevos Servicios Hedera

### Antes (código viejo):

```typescript
import { HederaService } from '@/services/HederaService'

const hederaService = new HederaService()
await hederaService.checkBalance(accountId, tokenId)
await hederaService.publishRate(rate, totalUsd, husdSupply)
```

### Ahora (código nuevo con DI):

```typescript
import { container } from '@/core/di/container'
import { TYPES } from '@/core/di/types'
import type { HederaBalanceService, HederaRateService } from '@/infrastructure/hedera'

// Obtener servicios del container
const balanceService = container.get<HederaBalanceService>(TYPES.HederaBalanceService)
const rateService = container.get<HederaRateService>(TYPES.HederaRateService)

// Usar los servicios
await balanceService.checkBalance(accountId, tokenId)
await rateService.publishRate(rate, totalUsd, husdSupply)
```

### Ejemplo completo en una API route:

```typescript
// app/api/balance/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { container } from '@/core/di/container'
import { TYPES } from '@/core/di/types'
import type { HederaBalanceService } from '@/infrastructure/hedera'

export async function GET(request: NextRequest) {
  try {
    const accountId = request.nextUrl.searchParams.get('accountId')
    const tokenId = request.nextUrl.searchParams.get('tokenId')

    // Obtener servicio del container
    const balanceService = container.get<HederaBalanceService>(
      TYPES.HederaBalanceService
    )

    // Usar el servicio
    const balance = await balanceService.checkBalance(accountId!, tokenId!)

    return NextResponse.json({ balance })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check balance' }, { status: 500 })
  }
}
```

---

## 5. Usar Sentry en tu Código

### Capturar Errores Manualmente

```typescript
import { captureException } from '@/lib/sentry'

try {
  await operacionPeligrosa()
} catch (error) {
  // Esto enviará el error a Sentry
  captureException(error, {
    tags: {
      operation: 'deposit',
      service: 'DepositService'
    },
    extra: {
      userId: user.id,
      amount: 100
    }
  })
  throw error // Re-lanza si es necesario
}
```

### Trackear Eventos Importantes

```typescript
import { trackEvent } from '@/lib/sentry'

// Cuando completes un depósito
trackEvent('deposit.completed', {
  userId: user.id,
  amount: 100,
  currency: 'USDC'
})

// Cuando haya una operación exitosa
trackEvent('withdrawal.completed', {
  userId: user.id,
  amount: 50,
  type: 'instant'
})
```

### Agregar Contexto de Usuario

```typescript
import { setUser } from '@/lib/sentry'

// Cuando el usuario se loguea
setUser({
  id: user.id,
  email: user.email,
  username: user.walletAddress
})

// Cuando el usuario se desloguea
setUser(null)
```

---

## 6. Usar el Event Bus

### Publicar Eventos

```typescript
import { container } from '@/core/di/container'
import { TYPES } from '@/core/di/types'
import type { IEventBus } from '@/core/events/EventBus'
import { DepositCompleted } from '@/domain/events/DepositEvents'

// Obtener el event bus
const eventBus = container.get<IEventBus>(TYPES.EventBus)

// Publicar un evento
await eventBus.publish(
  new DepositCompleted(
    depositId,
    userId,
    amount,
    husdAmount,
    rate,
    new Date()
  )
)
```

### Suscribirse a Eventos (opcional)

```typescript
import { container } from '@/core/di/container'
import { TYPES } from '@/core/di/types'
import type { IEventBus } from '@/core/events/EventBus'

const eventBus = container.get<IEventBus>(TYPES.EventBus)

// Suscribirse a eventos de depósito
eventBus.subscribe('DepositCompleted', async (event) => {
  console.log('Depósito completado:', event)
  // Enviar email, actualizar analytics, etc.
})
```

---

## 7. Usar el Cache Service

```typescript
import { container } from '@/core/di/container'
import { TYPES } from '@/core/di/types'
import type { ICacheService } from '@/infrastructure/cache'
import { CacheKeyBuilder } from '@/infrastructure/cache'

const cacheService = container.get<ICacheService>(TYPES.CacheService)

// Guardar en cache
await cacheService.set(
  CacheKeyBuilder.currentRate(),
  { rate: 1.005, timestamp: Date.now() },
  300 // 5 minutos TTL
)

// Obtener del cache
const cachedRate = await cacheService.get<{ rate: number }>(
  CacheKeyBuilder.currentRate()
)

if (cachedRate) {
  return cachedRate.rate // Cache hit
} else {
  // Cache miss - obtener de la fuente
  const rate = await rateService.getCurrentRate()
  await cacheService.set(CacheKeyBuilder.currentRate(), { rate }, 300)
  return rate
}
```

---

## 8. Migración de Código Existente

### Identificar Código que Necesitas Migrar

Busca en tu código usos de:

```bash
# Buscar usos del viejo HederaService
grep -r "new HederaService()" src/
grep -r "HederaService" src/app/

# Buscar métodos específicos
grep -r "checkBalance" src/
grep -r "publishRate" src/
grep -r "scheduleDeposit" src/
grep -r "transferUSDCToUser" src/
```

### Tabla de Migración

| Método Viejo | Servicio Nuevo | Cómo Obtenerlo |
|--------------|----------------|----------------|
| `checkBalance()` | `HederaBalanceService` | `container.get(TYPES.HederaBalanceService)` |
| `checkHbarBalance()` | `HederaBalanceService` | `container.get(TYPES.HederaBalanceService)` |
| `publishRate()` | `HederaRateService` | `container.get(TYPES.HederaRateService)` |
| `getCurrentRate()` | `HederaRateService` | `container.get(TYPES.HederaRateService)` |
| `scheduleDeposit()` | `HederaDepositService` | `container.get(TYPES.HederaDepositService)` |
| `createScheduledHUSDTransfer()` | `HederaDepositService` | `container.get(TYPES.HederaDepositService)` |
| `transferUSDCToUser()` | `HederaWithdrawalService` | `container.get(TYPES.HederaWithdrawalService)` |
| `rollbackHUSDToUser()` | `HederaWithdrawalService` | `container.get(TYPES.HederaWithdrawalService)` |
| `publishWithdrawRequest()` | `HederaWithdrawalService` | `container.get(TYPES.HederaWithdrawalService)` |
| `publishWithdrawResult()` | `HederaWithdrawalService` | `container.get(TYPES.HederaWithdrawalService)` |
| `verifyScheduleTransactionExecuted()` | `HederaMirrorNodeService` | `container.get(TYPES.HederaMirrorNodeService)` |
| `checkTransactionInMirrorNode()` | `HederaMirrorNodeService` | `container.get(TYPES.HederaMirrorNodeService)` |
| `verifyHUSDTransfer()` | `HederaMirrorNodeService` | `container.get(TYPES.HederaMirrorNodeService)` |

---

## 9. Verificar que Todo Funciona

### Checklist de Verificación

```bash
# 1. Verificar que las dependencias están instaladas
pnpm install

# 2. Verificar que el build funciona
npm run build

# 3. Verificar que TypeScript compila (los servicios nuevos)
npx tsc --noEmit src/infrastructure/hedera/*.ts

# 4. Iniciar en desarrollo
npm run dev

# 5. Verificar que Sentry está conectado (revisa la consola)
# Deberías ver logs de Sentry si el DSN está configurado
```

### Test Rápido de Sentry

Crea una ruta de prueba:

```typescript
// app/api/test-sentry/route.ts
import { NextResponse } from 'next/server'
import { captureException, captureMessage } from '@/lib/sentry'

export async function GET() {
  try {
    // Test de mensaje
    captureMessage('Sentry test message', 'info')

    // Test de error
    throw new Error('Sentry test error - this is intentional!')
  } catch (error) {
    captureException(error, {
      tags: { test: 'true' },
      extra: { timestamp: new Date().toISOString() }
    })

    return NextResponse.json({
      message: 'Error sent to Sentry! Check your Sentry dashboard.'
    })
  }
}
```

Visita: `http://localhost:3000/api/test-sentry`

Luego revisa tu dashboard de Sentry: `https://sentry.io/organizations/[tu-org]/issues/`

---

## 10. Resumen: ¿Qué es OBLIGATORIO vs OPCIONAL?

### ✅ OBLIGATORIO (para que funcione ahora)

1. **Instalar dependencias**
   ```bash
   pnpm install
   ```

2. **Ninguna variable nueva es obligatoria inmediatamente**
   - El código viejo (`HederaService`) sigue funcionando
   - Los nuevos servicios están listos pero no los estás usando aún

### 🔧 RECOMENDADO (para usar los nuevos servicios)

1. **Configurar Sentry DSN**
   - Solo si quieres error tracking
   - Sin DSN = todo funciona, sin tracking

2. **Usar los nuevos servicios**
   - Migra gradualmente tu código
   - Usa DI container para obtener servicios

### 🚀 OPCIONAL (para producción)

1. **Redis**
   - Solo para caching en producción
   - Desarrollo usa InMemory por defecto

2. **Sentry Auth Token**
   - Solo para source maps en producción
   - Sin token = errores sin código fuente

---

## 11. Plan de Migración Gradual

No necesitas cambiar todo de golpe. Puedes migrar paso a paso:

### Fase 1: Sin Cambios (Estado Actual)
- Todo sigue funcionando como antes
- `HederaService` viejo sigue disponible

### Fase 2: Agregar Sentry (Opcional)
```bash
# 1. Crear cuenta en Sentry
# 2. Agregar DSN a .env.local
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# 3. Reiniciar servidor
npm run dev
```

### Fase 3: Migrar un Servicio a la Vez
```typescript
// Ejemplo: Migrar balance checking
// ANTES
const hederaService = new HederaService()
const balance = await hederaService.checkBalance(accountId, tokenId)

// DESPUÉS
const balanceService = container.get<HederaBalanceService>(TYPES.HederaBalanceService)
const balance = await balanceService.checkBalance(accountId, tokenId)
```

### Fase 4: Agregar Redis (Producción)
```bash
# Solo cuando vayas a producción
REDIS_URL=rediss://...
```

---

## 🆘 Troubleshooting

### Error: "Module not found: Can't resolve '@/infrastructure/hedera'"

**Solución:**
```bash
# Reiniciar el servidor de desarrollo
pkill -f "next dev"
npm run dev
```

### Error: "Cannot find module 'inversify'"

**Solución:**
```bash
pnpm install inversify reflect-metadata
```

### Sentry no envía eventos

**Verifica:**
1. `NEXT_PUBLIC_SENTRY_DSN` está en `.env.local`
2. El DSN es correcto (copia/pega desde Sentry dashboard)
3. Reiniciaste el servidor después de agregar el DSN

### "InMemoryCacheService" vs "RedisCacheService" error

**Solución:**
Por defecto usa InMemory. Si quieres Redis:
1. Instala Redis
2. Agrega `REDIS_URL` a `.env.local`
3. Cambia binding en `container.ts`

---

## 📞 Soporte

Si tienes dudas sobre:
- **Sentry**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Redis**: https://redis.io/docs/
- **InversifyJS**: https://inversify.io/

---

**¡Listo!** Con esta guía deberías poder configurar todo lo necesario. Empieza por Sentry (es lo más fácil y útil) y luego ve migrando servicios gradualmente.
