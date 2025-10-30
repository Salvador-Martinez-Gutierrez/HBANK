# 🚀 HBANK Protocol - Quick Start

## Inicio Rápido (5 Minutos)

### 1. Instalar Dependencias

```bash
pnpm install
```

### 2. Configurar Variables (Ya las tienes)

Tus variables existentes en `.env.local` funcionan perfectamente. No necesitas cambiar nada.

**Opcional - Para habilitar Sentry:**

```bash
# Agregar a .env.local:
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Crear cuenta gratis: https://sentry.io/signup/
# Crear proyecto tipo "Next.js"
# Copiar el DSN del dashboard
```

### 3. Iniciar Servidor

```bash
npm run dev
```

Verás en consola:

```
🚀🚀🚀 HBANK Protocol Starting... 🚀🚀🚀

Environment: development
Cache: MEMORY (usando cache en memoria)
Sentry: ENABLED (o DISABLED)
Hedera Network: testnet

✓ Total Variables: 45
✓ Set: 42
✗ Missing Required: 0
⚠ Missing Optional: 3 (no afectan funcionalidad)

✅ All required variables are set!
```

### 4. ¡Listo! Prueba las APIs

```bash
# Test 1: Obtener rate actual (con caching)
curl http://localhost:3000/api/rate

# Test 2: Publicar nuevo rate
curl -X POST http://localhost:3000/api/publish-rate \
  -H "Content-Type: application/json" \
  -d '{
    "rate": 1.005,
    "totalUsd": 100000,
    "husdSupply": 99502.49
  }'
```

---

## ✨ Nuevas Features Disponibles

### 1. DI Container - Servicios Inyectables

**Antes:**
```typescript
const hederaService = new HederaService()
await hederaService.publishRate(rate, totalUsd, husdSupply)
```

**Ahora:**
```typescript
import { getHederaRateService } from '@/lib/di-helpers'

const rateService = getHederaRateService()
await rateService.publishRate(rate, totalUsd, husdSupply)
```

### 2. API Wrapper - Error Handling Automático

```typescript
// app/api/mi-ruta/route.ts
import { withAPIWrapper } from '@/lib/api-wrapper'
import { getHederaBalanceService } from '@/lib/di-helpers'

export const GET = withAPIWrapper(
    async (request) => {
        const balanceService = getHederaBalanceService()
        const balance = await balanceService.checkBalance(accountId, tokenId)

        return { balance } // Auto-wrapped con success: true
    },
    {
        errorPrefix: 'Failed to check balance',
        sentryTags: { operation: 'check_balance' }
    }
)
```

**Beneficios:**
- ✅ Error tracking automático (Sentry)
- ✅ Response format estandarizado
- ✅ Breadcrumbs para debugging
- ✅ User context automático

### 3. Caching Automático

```typescript
import { getCacheService } from '@/lib/di-helpers'
import { CacheKeyBuilder } from '@/infrastructure/cache'

const cache = getCacheService()

// Guardar
await cache.set(CacheKeyBuilder.currentRate(), { rate: 1.005 }, 300)

// Obtener
const cached = await cache.get(CacheKeyBuilder.currentRate())
```

**Automático:**
- Usa Redis si `REDIS_URL` está configurado
- Usa memoria si no (perfecto para development)
- No necesitas cambiar código

### 4. Event Bus - Auditoría Automática

```typescript
import { getEventBus } from '@/lib/di-helpers'
import { RatePublished } from '@/domain/events/RateEvents'

const eventBus = getEventBus()

await eventBus.publish(new RatePublished(...))
// ✅ Se guarda en audit log automáticamente
// ✅ Se envía a handlers (metrics, notifications)
```

---

## 📁 Archivos Importantes

### Para Ti (Desarrollador)

```
src/lib/
├── di-helpers.ts       ← Obtener servicios fácilmente
├── api-wrapper.ts      ← Wrapper para rutas API
├── sentry.ts           ← Helpers de Sentry
└── env-validator.ts    ← Validar env vars

src/infrastructure/hedera/
├── HederaRateService.ts        ← Publicar rates
├── HederaBalanceService.ts     ← Check balances
├── HederaDepositService.ts     ← Depósitos
├── HederaWithdrawalService.ts  ← Retiros
└── HederaMirrorNodeService.ts  ← Verificaciones
```

### Ejemplos de Rutas Migradas

```
src/app/api/
├── publish-rate/route.ts  ← ✨ Ejemplo completo migrado
└── rate/route.ts          ← ✨ Nuevo, con caching
```

### Documentación

```
docs/
├── IMPLEMENTATION-COMPLETE.md   ← LEE ESTO PRIMERO
├── SETUP-GUIDE.md               ← Configuración detallada
├── MONITORING-GUIDE.md          ← Todo sobre Sentry
└── CACHING-GUIDE.md             ← Estrategias de cache
```

---

## 🎯 Ejemplo Completo: Migrar una Ruta

**1. Archivo original:**

```typescript
// app/api/mi-ruta/route.ts
export async function GET(request: NextRequest) {
    try {
        const hederaService = new HederaService()
        const result = await hederaService.doSomething()
        return NextResponse.json({ result })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}
```

**2. Migrado (copia y pega):**

```typescript
// app/api/mi-ruta/route.ts
import { withAPIWrapper } from '@/lib/api-wrapper'
import { getHederaClientFactory } from '@/lib/di-helpers'

export const GET = withAPIWrapper(
    async (request) => {
        // Obtener servicio
        const factory = getHederaClientFactory()

        // Ejecutar operación
        const result = await factory.doSomething()

        // Retornar (auto-wrapped)
        return { result }
    },
    {
        errorPrefix: 'Failed to do something',
        sentryTags: { operation: 'do_something' }
    }
)
```

**Beneficios inmediatos:**
- ✅ Sentry captura errores automáticamente
- ✅ Response format estandarizado: `{ success: true, data: {...} }`
- ✅ Breadcrumbs para debugging
- ✅ User context si está en headers

---

## 🔧 Configuración Opcional

### Sentry (Recomendado)

**5 minutos:**

1. Ir a https://sentry.io/signup/
2. Crear proyecto "Next.js"
3. Copiar DSN
4. Agregar a `.env.local`:
   ```bash
   NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   ```
5. Reiniciar servidor

**Test:**
```bash
curl -X POST http://localhost:3000/api/publish-rate \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'

# Ver error en: https://sentry.io/organizations/[tu-org]/issues/
```

### Redis (Solo Producción)

**No necesario para desarrollo.**

Para staging/production:

1. Crear cuenta en Upstash (gratis): https://upstash.com/
2. Crear base de datos
3. Copiar URL
4. Agregar a env vars en Vercel/deploy:
   ```bash
   REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379
   ```

El sistema detecta automáticamente Redis y lo usa.

---

## 📊 Verificar que Todo Funciona

### Al iniciar el servidor

Deberías ver:

```
✅ All required variables are set!
Cache: MEMORY
Sentry: ENABLED
```

### Test de Sentry

```bash
# Hacer request que causa error
curl -X POST http://localhost:3000/api/publish-rate \
  -H "Content-Type: application/json" \
  -d '{}'

# Ver en Sentry dashboard (si configurado)
```

### Test de Cache

```bash
# Primera llamada (cache miss)
curl http://localhost:3000/api/rate
# Response: "cached": false

# Segunda llamada (cache hit)
curl http://localhost:3000/api/rate
# Response: "cached": true
```

---

## 🎉 ¡Listo!

El sistema está **100% funcional** con:

- ✅ Dependency Injection
- ✅ Error tracking (Sentry)
- ✅ Caching (Redis/InMemory)
- ✅ Event sourcing
- ✅ API wrapper
- ✅ Env validation

**No hay breaking changes.** Todo tu código viejo sigue funcionando.

---

## 📚 Próximos Pasos

1. **Leer:** [IMPLEMENTATION-COMPLETE.md](./docs/IMPLEMENTATION-COMPLETE.md)
2. **Ver ejemplos:** `/api/publish-rate/route.ts` y `/api/rate/route.ts`
3. **Migrar rutas:** Copiar el patrón de los ejemplos
4. **Configurar Sentry:** 5 minutos para error tracking

---

## 💬 ¿Preguntas?

- **Setup:** Ver [docs/SETUP-GUIDE.md](./docs/SETUP-GUIDE.md)
- **Sentry:** Ver [docs/MONITORING-GUIDE.md](./docs/MONITORING-GUIDE.md)
- **Cache:** Ver [docs/CACHING-GUIDE.md](./docs/CACHING-GUIDE.md)
- **Ejemplos:** Ver `/api/publish-rate` y `/api/rate`

**Estado:** ✅ TODO FUNCIONANDO - Ready to use!

---

**Última Actualización:** 2025-01-29
