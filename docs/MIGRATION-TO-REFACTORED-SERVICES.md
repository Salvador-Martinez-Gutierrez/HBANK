# 🚀 Guía de Migración a Servicios Refactorizados

**Objetivo:** Migrar todas las APIs de `HederaService` (monolítico) a los nuevos servicios refactorizados con DI.

**Fecha de creación:** 2025-10-30
**Estimación de tiempo:** 2-3 horas
**Riesgo:** Medio (cambios en producción, requiere testing exhaustivo)

---

## 📊 Estado Actual

- ✅ **6 servicios refactorizados** creados y funcionando
- ✅ **DI Container** configurado correctamente
- ❌ **APIs NO migradas** - todavía usan `HederaService` original
- ❌ **HederaService** (988 líneas) sigue en uso

**Archivos a migrar:** 4 APIs principales

---

## 🎯 Objetivos de la Migración

1. ✅ Migrar todas las APIs a usar los nuevos servicios
2. ✅ Eliminar dependencia de `HederaService` monolítico
3. ✅ Verificar que todo funciona correctamente
4. ✅ Deprecar y eventualmente eliminar `HederaService.ts`
5. ✅ Mantener zero breaking changes para los consumidores

---

## 📋 Pre-requisitos

### Verificación de Entorno

- [ ] El proyecto compila sin errores: `pnpm type-check`
- [ ] ESLint pasa: `pnpm lint`
- [ ] Las variables de entorno están configuradas (`.env.local`)
- [ ] Los tests existentes pasan (si los hay): `pnpm test`

### Backup

- [ ] Crear una rama nueva: `git checkout -b migration/hedera-services`
- [ ] Commit del estado actual: `git add -A && git commit -m "checkpoint: before hedera services migration"`

---

## 📝 Plan de Migración

### Estrategia: Migración Incremental

Vamos a migrar **archivo por archivo**, testeando cada uno antes de continuar:

1. **Fase 1:** Migrar API más simple (`/api/tvl`) - **PRUEBA**
2. **Fase 2:** Migrar API de balances (`/api/wallet-balances`)
3. **Fase 3:** Migrar API de withdrawals (`/api/process-withdrawals`)
4. **Fase 4:** Migrar API de withdraw (`/api/withdraw`)
5. **Fase 5:** Verificación completa y limpieza
6. **Fase 6:** Deprecar `HederaService`

---

## 🔧 FASE 1: Migrar /api/tvl (PRUEBA)

### Objetivo
Migrar la API más simple como prueba de concepto.

### Checklist

#### 1.1 Analizar el código actual

- [ ] Leer `src/app/api/tvl/route.ts`
- [ ] Identificar métodos de `HederaService` usados:
  - `checkBalance()` → Migrar a `HederaBalanceService`

#### 1.2 Crear archivo de migración

**Archivo:** `src/app/api/tvl/route.ts`

**ANTES:**
```typescript
import { HederaService } from '@/services/hederaService'

const hederaService = new HederaService()
const balance = await hederaService.checkBalance(walletId, tokenId)
```

**DESPUÉS:**
```typescript
import { container } from '@/core/di/container'
import { TYPES } from '@/core/di/types'
import { HederaBalanceService } from '@/infrastructure/hedera'

export async function GET(_req: NextRequest): Promise<NextResponse> {
    try {
        logger.info('Calculating TVL from wallet balances')

        // ✅ Usar DI para obtener el servicio
        const balanceService = container.get<HederaBalanceService>(TYPES.HederaBalanceService)
        const usdcTokenId = process.env.USDC_TOKEN_ID ?? ''

        // ✅ Usar el servicio refactorizado
        const [
            instantWithdrawBalance,
            standardWithdrawBalance,
            depositsBalance,
        ] = await Promise.all([
            balanceService.checkBalance(
                process.env.INSTANT_WITHDRAW_WALLET_ID ?? '',
                usdcTokenId
            ),
            balanceService.checkBalance(
                process.env.STANDARD_WITHDRAW_WALLET_ID ?? '',
                usdcTokenId
            ),
            balanceService.checkBalance(
                process.env.DEPOSIT_WALLET_ID ?? '',
                usdcTokenId
            ),
        ])

        // ... resto del código igual
    } catch (error) {
        // ... manejo de errores igual
    }
}
```

#### 1.3 Implementar los cambios

- [ ] Editar `src/app/api/tvl/route.ts`
- [ ] Remover import de `HederaService`
- [ ] Agregar imports del container y tipos
- [ ] Reemplazar `new HederaService()` con `container.get<>()`
- [ ] Actualizar llamadas a métodos

#### 1.4 Testing

- [ ] Compilar: `pnpm type-check`
- [ ] Lint: `pnpm lint`
- [ ] Levantar el servidor: `pnpm dev`
- [ ] Testear endpoint: `curl http://localhost:3000/api/tvl`
- [ ] Verificar respuesta correcta
- [ ] Verificar logs (deben aparecer de `hedera-balance`)

#### 1.5 Commit

- [ ] `git add src/app/api/tvl/route.ts`
- [ ] `git commit -m "migrate: /api/tvl to HederaBalanceService"`

---

## 🔧 FASE 2: Migrar /api/wallet-balances

### Objetivo
Migrar API de balance de wallets.

### Checklist

#### 2.1 Analizar el código actual

- [ ] Leer `src/app/api/wallet-balances/route.ts`
- [ ] Identificar métodos de `HederaService` usados:
  - `checkBalance()` → Migrar a `HederaBalanceService`

#### 2.2 Implementar los cambios

**Archivo:** `src/app/api/wallet-balances/route.ts`

**Cambios necesarios:**

```typescript
// ✅ AGREGAR imports
import { container } from '@/core/di/container'
import { TYPES } from '@/core/di/types'
import { HederaBalanceService } from '@/infrastructure/hedera'

export async function GET(_req: NextRequest): Promise<NextResponse> {
    try {
        // ✅ REEMPLAZAR
        // const hederaService = new HederaService()
        const balanceService = container.get<HederaBalanceService>(TYPES.HederaBalanceService)

        // ... resto del código

        for (const wallet of wallets) {
            try {
                // ✅ REEMPLAZAR
                // const usdcBalance = await hederaService.checkBalance(wallet.id, usdcTokenId)
                const usdcBalance = await balanceService.checkBalance(wallet.id, usdcTokenId)

                // ... resto igual
            }
        }
    }
}
```

- [ ] Editar `src/app/api/wallet-balances/route.ts`
- [ ] Remover import de `HederaService`
- [ ] Agregar imports del container y tipos
- [ ] Reemplazar `new HederaService()` con `container.get<>()`
- [ ] Actualizar todas las llamadas a `checkBalance()`

#### 2.3 Funciones auxiliares

**IMPORTANTE:** Las funciones `getHbarBalance()` y `getHusdBalance()` también usan `HederaService`. Necesitan ser actualizadas o eliminadas.

**Opción 1 - Actualizar funciones:**
```typescript
// ✅ Inyectar balanceService en las funciones auxiliares
async function getHbarBalance(accountId: string, balanceService: HederaBalanceService): Promise<number> {
    return await balanceService.checkHbarBalance(accountId)
}

async function getHusdBalance(accountId: string, tokenId: string, balanceService: HederaBalanceService): Promise<number> {
    return await balanceService.checkBalance(accountId, tokenId)
}
```

**Opción 2 - Inline las llamadas (recomendado):**
```typescript
// Reemplazar getHbarBalance(wallet.id) con:
const hbarBalance = await balanceService.checkHbarBalance(wallet.id)

// Reemplazar getHusdBalance(wallet.id, husdTokenId) con:
const husdBalance = await balanceService.checkBalance(wallet.id, husdTokenId)
```

- [ ] Decidir estrategia para funciones auxiliares
- [ ] Implementar cambios en funciones auxiliares

#### 2.4 Testing

- [ ] Compilar: `pnpm type-check`
- [ ] Lint: `pnpm lint`
- [ ] Levantar el servidor: `pnpm dev`
- [ ] Testear endpoint: `curl http://localhost:3000/api/wallet-balances`
- [ ] Verificar que devuelve todos los balances correctamente
- [ ] Verificar logs estructurados

#### 2.5 Commit

- [ ] `git add src/app/api/wallet-balances/route.ts`
- [ ] `git commit -m "migrate: /api/wallet-balances to HederaBalanceService"`

---

## 🔧 FASE 3: Migrar /api/process-withdrawals

### Objetivo
Migrar el procesador de withdrawals.

### Checklist

#### 3.1 Analizar el código actual

- [ ] Leer `src/app/api/process-withdrawals/route.ts`
- [ ] Identificar métodos de `HederaService` usados:
  - `transferUSDCToUser()` → Migrar a `HederaWithdrawalService`
  - `rollbackHUSDToUser()` → Migrar a `HederaWithdrawalService`
  - `publishWithdrawResult()` → Migrar a `HederaWithdrawalService`
  - `verifyScheduleTransactionExecuted()` → Migrar a `HederaMirrorNodeService`

#### 3.2 Implementar los cambios

**Archivo:** `src/app/api/process-withdrawals/route.ts`

**Cambios necesarios:**

```typescript
// ✅ AGREGAR imports
import { container } from '@/core/di/container'
import { TYPES } from '@/core/di/types'
import { HederaWithdrawalService, HederaMirrorNodeService } from '@/infrastructure/hedera'

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        // ✅ REEMPLAZAR
        // const hederaService = new HederaService()
        const withdrawalService = container.get<HederaWithdrawalService>(TYPES.HederaWithdrawalService)
        const mirrorNodeService = container.get<HederaMirrorNodeService>(TYPES.HederaMirrorNodeService)

        // ... lógica de procesamiento

        // ✅ REEMPLAZAR llamadas
        // const verified = await hederaService.verifyScheduleTransactionExecuted(scheduleId)
        const verified = await mirrorNodeService.verifyScheduleTransactionExecuted(scheduleId)

        if (verified) {
            // ✅ REEMPLAZAR
            // const txId = await hederaService.transferUSDCToUser(userId, amountUSDC)
            const txId = await withdrawalService.transferUSDCToUser(userId, amountUSDC)

            // ✅ REEMPLAZAR
            // await hederaService.publishWithdrawResult(requestId, 'completed', txId)
            await withdrawalService.publishWithdrawResult(requestId, 'completed', txId)
        } else {
            // ✅ REEMPLAZAR
            // await hederaService.rollbackHUSDToUser(userId, amountHUSD)
            await withdrawalService.rollbackHUSDToUser(userId, amountHUSD)

            // ✅ REEMPLAZAR
            // await hederaService.publishWithdrawResult(requestId, 'failed', undefined, error)
            await withdrawalService.publishWithdrawResult(requestId, 'failed', undefined, error)
        }
    }
}
```

- [ ] Editar `src/app/api/process-withdrawals/route.ts`
- [ ] Remover import de `HederaService`
- [ ] Agregar imports del container y tipos
- [ ] Reemplazar `new HederaService()` con `container.get<>()`
- [ ] Actualizar todas las llamadas a métodos
- [ ] Verificar manejo de errores

#### 3.3 Testing

- [ ] Compilar: `pnpm type-check`
- [ ] Lint: `pnpm lint`
- [ ] Levantar el servidor: `pnpm dev`
- [ ] Testear endpoint: `curl -X POST http://localhost:3000/api/process-withdrawals`
- [ ] **IMPORTANTE:** Este endpoint requiere datos específicos - revisar logs
- [ ] Verificar que no hay errores de runtime

#### 3.4 Commit

- [ ] `git add src/app/api/process-withdrawals/route.ts`
- [ ] `git commit -m "migrate: /api/process-withdrawals to refactored services"`

---

## 🔧 FASE 4: Migrar /api/withdraw

### Objetivo
Migrar la API principal de withdrawals.

### Checklist

#### 4.1 Analizar el código actual

- [ ] Leer `src/app/api/withdraw/route.ts`
- [ ] Identificar métodos de `HederaService` usados:
  - `createScheduledHUSDTransfer()` → Migrar a `HederaDepositService`
  - `publishWithdrawRequest()` → Migrar a `HederaWithdrawalService`

#### 4.2 Implementar los cambios

**Archivo:** `src/app/api/withdraw/route.ts`

**Cambios necesarios:**

```typescript
// ✅ AGREGAR imports
import { container } from '@/core/di/container'
import { TYPES } from '@/core/di/types'
import { HederaDepositService, HederaWithdrawalService } from '@/infrastructure/hedera'

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        // ✅ REEMPLAZAR
        // const hederaService = new HederaService()
        const depositService = container.get<HederaDepositService>(TYPES.HederaDepositService)
        const withdrawalService = container.get<HederaWithdrawalService>(TYPES.HederaWithdrawalService)

        // ... lógica de validación

        // ✅ REEMPLAZAR
        // const scheduleId = await hederaService.createScheduledHUSDTransfer(userId, amountHUSD)
        const scheduleId = await depositService.createScheduledHUSDTransfer(userId, amountHUSD)

        // ✅ REEMPLAZAR
        // await hederaService.publishWithdrawRequest(requestId, userId, amountHUSD, rate, rateSeq, scheduleId)
        await withdrawalService.publishWithdrawRequest(
            requestId,
            userId,
            amountHUSD,
            rate,
            rateSequenceNumber,
            scheduleId
        )

        return NextResponse.json({
            scheduleId,
            // ... resto de respuesta
        })
    }
}
```

- [ ] Editar `src/app/api/withdraw/route.ts`
- [ ] Remover import de `HederaService`
- [ ] Agregar imports del container y tipos
- [ ] Reemplazar `new HederaService()` con `container.get<>()`
- [ ] Actualizar llamadas a métodos
- [ ] Verificar que los parámetros coinciden

#### 4.3 Testing

- [ ] Compilar: `pnpm type-check`
- [ ] Lint: `pnpm lint`
- [ ] Levantar el servidor: `pnpm dev`
- [ ] Testear endpoint: `curl -X POST http://localhost:3000/api/withdraw -H "Content-Type: application/json" -d '{"userId":"0.0.123","amountHUSD":100}'`
- [ ] Verificar respuesta correcta con `scheduleId`
- [ ] Verificar logs de ambos servicios

#### 4.4 Commit

- [ ] `git add src/app/api/withdraw/route.ts`
- [ ] `git commit -m "migrate: /api/withdraw to refactored services"`

---

## ✅ FASE 5: Verificación Completa

### Objetivo
Verificar que TODAS las migraciones funcionan correctamente.

### Checklist General

#### 5.1 Verificación de código

- [ ] Buscar usos restantes: `grep -r "new HederaService()" src/`
- [ ] Buscar imports restantes: `grep -r "from '@/services/hederaService'" src/app/`
- [ ] Verificar que no quedan referencias en archivos `.ts` (ignorar `.bak`)

#### 5.2 Compilación y calidad

- [ ] `pnpm type-check` pasa sin errores
- [ ] `pnpm lint` pasa sin errores
- [ ] `pnpm build` completa exitosamente

#### 5.3 Testing funcional

**Levantar servidor:**
```bash
pnpm dev
```

**Testear cada endpoint:**

- [ ] GET `/api/tvl`
  ```bash
  curl -s http://localhost:3000/api/tvl | jq
  ```
  ✅ Esperado: JSON con `tvl`, `breakdown`, `lastUpdated`

- [ ] GET `/api/wallet-balances`
  ```bash
  curl -s http://localhost:3000/api/wallet-balances | jq
  ```
  ✅ Esperado: JSON con array de `wallets` con balances

- [ ] POST `/api/withdraw` (requiere auth - verificar solo que no crashea)
  ```bash
  curl -s http://localhost:3000/api/withdraw -X POST -H "Content-Type: application/json" -d '{}' | jq
  ```
  ✅ Esperado: Error de validación (no crash)

- [ ] POST `/api/process-withdrawals` (verificar que no crashea)
  ```bash
  curl -s http://localhost:3000/api/process-withdrawals -X POST | jq
  ```
  ✅ Esperado: Respuesta controlada (no crash)

#### 5.4 Verificación de logs

- [ ] Los logs muestran scoped loggers correctos:
  - `[hedera-balance]`
  - `[hedera-withdrawal]`
  - `[hedera-deposit]`
  - `[hedera-mirror-node]`
- [ ] No hay errores de DI (inyección de dependencias)
- [ ] No hay warnings de módulos no encontrados

#### 5.5 Commit final de fase

- [ ] `git add -A`
- [ ] `git commit -m "verify: all endpoints migrated successfully"`

---

## 🧹 FASE 6: Limpieza y Deprecación

### Objetivo
Limpiar código obsoleto y deprecar el servicio monolítico.

### Checklist

#### 6.1 Deprecar HederaService

**Archivo:** `src/services/hederaService.ts`

Agregar al inicio del archivo:
```typescript
/**
 * @deprecated This service has been refactored into smaller, focused services.
 *
 * Please use the following services instead:
 * - HederaClientFactory: Client management
 * - HederaBalanceService: Balance queries
 * - HederaMirrorNodeService: Transaction verification
 * - HederaRateService: Rate publishing
 * - HederaDepositService: Deposit operations
 * - HederaWithdrawalService: Withdrawal operations
 *
 * Import from: @/infrastructure/hedera
 * Access via DI: container.get<ServiceType>(TYPES.ServiceType)
 *
 * This file will be removed in a future version.
 * Migration guide: docs/MIGRATION-TO-REFACTORED-SERVICES.md
 */
export class HederaService {
    // ... existing code
}
```

- [ ] Agregar comentario de deprecación a `HederaService`
- [ ] Commit: `git commit -m "deprecate: mark HederaService as deprecated"`

#### 6.2 Eliminar archivos .bak

- [ ] Revisar archivos `.bak`:
  ```bash
  find src -name "*.bak"
  ```

- [ ] Verificar que no tienen código importante
- [ ] Eliminar archivos `.bak`:
  ```bash
  find src -name "*.bak" -delete
  ```

- [ ] Commit: `git commit -m "chore: remove backup files"`

#### 6.3 Actualizar documentación

**Archivo:** `REFACTORING-GUIDE.md`

Actualizar Fase 2.4:
```markdown
### 2.4 Refactorizar Servicios Gigantes ✅ COMPLETADO (100%)
- [x] Crear servicios de validación focalizados
- [x] Dividir `HederaService.ts` (988 líneas):
  - [x] Crear `HederaClientFactory.ts` (223 líneas) ✅
  - [x] Crear `HederaBalanceService.ts` (189 líneas) ✅
  - [x] Crear `HederaMirrorNodeService.ts` (351 líneas) ✅
  - [x] Crear `HederaRateService.ts` (178 líneas) ✅
  - [x] Crear `HederaDepositService.ts` (268 líneas) ✅
  - [x] Crear `HederaWithdrawalService.ts` (364 líneas) ✅
  - [x] Actualizar servicios que dependen de HederaService ✅
  - [x] Migrar todas las APIs a usar nuevos servicios ✅
  - [x] Deprecar HederaService original ✅
```

**Archivo:** `HEDERA-SERVICE-REFACTORING-PLAN.md`

Actualizar Implementation Order:
```markdown
## Implementation Order

1. ✅ Create directory structure
2. ✅ Extract HederaClientFactory (needed by all)
3. ✅ Extract HederaBalanceService (simple, no dependencies)
4. ✅ Extract HederaMirrorNodeService (needed by deposit/withdrawal)
5. ✅ Extract HederaRateService (medium complexity)
6. ✅ Extract HederaDepositService (depends on mirror node)
7. ✅ Extract HederaWithdrawalService (most complex)
8. ✅ Update DI container bindings
9. ✅ Deprecate old HederaService
10. ✅ Update all service consumers
```

- [ ] Actualizar `REFACTORING-GUIDE.md`
- [ ] Actualizar `HEDERA-SERVICE-REFACTORING-PLAN.md`
- [ ] Commit: `git commit -m "docs: update refactoring progress to 100%"`

---

## 🎉 FASE 7: Finalización

### Checklist Final

#### 7.1 Revisión completa

- [ ] Todo el código compila: `pnpm type-check`
- [ ] Linter pasa: `pnpm lint`
- [ ] Build exitoso: `pnpm build`
- [ ] Todos los endpoints probados y funcionando
- [ ] Logs estructurados funcionando correctamente
- [ ] No quedan referencias a `new HederaService()` en código activo

#### 7.2 Documentación

- [ ] `REFACTORING-GUIDE.md` actualizado
- [ ] `HEDERA-SERVICE-REFACTORING-PLAN.md` actualizado
- [ ] Este documento (`MIGRATION-TO-REFACTORED-SERVICES.md`) creado
- [ ] README actualizado (si aplica)

#### 7.3 Git

- [ ] Todos los cambios committeados
- [ ] Historia de commits limpia y descriptiva
- [ ] Crear commit final:
  ```bash
  git add -A
  git commit -m "feat: complete migration to refactored Hedera services

  - Migrated 4 API endpoints to use DI-based services
  - Deprecated monolithic HederaService (988 lines)
  - Now using 6 focused services (~261 lines average)
  - Updated documentation to reflect 100% completion
  - Zero breaking changes for API consumers

  Services:
  - HederaClientFactory (223 lines)
  - HederaBalanceService (189 lines)
  - HederaMirrorNodeService (351 lines)
  - HederaRateService (178 lines)
  - HederaDepositService (268 lines)
  - HederaWithdrawalService (364 lines)

  Total refactored: 1,573 lines
  Original monolith: 988 lines
  Improvement: Better separation of concerns, testability, and maintainability"
  ```

#### 7.4 Push y PR (opcional)

- [ ] Push a rama: `git push origin migration/hedera-services`
- [ ] Crear Pull Request con descripción detallada
- [ ] Asignar reviewers
- [ ] Esperar revisión y aprobación
- [ ] Merge a main/develop

---

## 🚨 Plan de Rollback

Si algo sale mal durante la migración:

### Opción 1: Rollback Git (Recomendado)

```bash
# Ver commits recientes
git log --oneline -10

# Rollback al commit antes de la migración
git reset --hard <commit-hash-before-migration>

# Si ya hiciste push, forzar push (¡CUIDADO!)
git push --force origin migration/hedera-services
```

### Opción 2: Revertir archivos específicos

```bash
# Revertir archivo específico
git checkout HEAD~1 src/app/api/tvl/route.ts

# Revertir todos los archivos de API
git checkout HEAD~1 src/app/api/**/*.ts
```

### Opción 3: Branch cleanup

```bash
# Eliminar rama de migración y empezar de nuevo
git checkout main
git branch -D migration/hedera-services
git checkout -b migration/hedera-services-v2
```

---

## 📊 Métricas de Éxito

Al finalizar, deberías tener:

### Código
- ✅ 0 referencias a `new HederaService()` en `/src/app/`
- ✅ 0 imports de `@/services/hederaService` en APIs activas
- ✅ 4 APIs migradas exitosamente
- ✅ 6 servicios refactorizados en uso
- ✅ 100% de coverage de funcionalidad migrada

### Calidad
- ✅ TypeScript: 0 errores
- ✅ ESLint: 0 errores (warnings aceptables)
- ✅ Build exitoso
- ✅ Logs estructurados funcionando

### Arquitectura
- ✅ Single Responsibility Principle aplicado
- ✅ Dependency Injection funcionando
- ✅ Servicios < 400 líneas cada uno
- ✅ Clear separation of concerns

### Documentación
- ✅ Guías actualizadas
- ✅ HederaService deprecado con instrucciones claras
- ✅ Ejemplos de uso actualizados

---

## 🆘 Troubleshooting

### Error: "No matching bindings found for serviceIdentifier"

**Causa:** El servicio no está registrado en el DI container.

**Solución:**
```typescript
// Verificar en src/core/di/container.ts que existe:
container.bind<HederaBalanceService>(TYPES.HederaBalanceService)
    .to(HederaBalanceService)
    .inSingletonScope()
```

### Error: "Cannot find module '@/infrastructure/hedera'"

**Causa:** Barrel export no está configurado correctamente.

**Solución:**
```typescript
// Verificar que src/infrastructure/hedera/index.ts exporta:
export { HederaBalanceService } from './HederaBalanceService'
export { HederaWithdrawalService } from './HederaWithdrawalService'
// ... etc
```

### Error: TypeScript no encuentra tipos

**Causa:** Imports incorrectos o tipos no exportados.

**Solución:**
```typescript
// Asegurarse de importar tipos correctos:
import { HederaBalanceService } from '@/infrastructure/hedera'
// NO: import { HederaBalanceService } from '@/infrastructure/hedera/HederaBalanceService'
```

### Runtime Error: "client is not defined"

**Causa:** Cliente de Hedera no inicializado correctamente.

**Solución:**
- Verificar que todas las env vars están configuradas
- Verificar que `HederaClientFactory` está creando clientes correctamente
- Revisar logs de inicialización

### Los logs no aparecen con el scope correcto

**Causa:** Logger no configurado en el servicio.

**Solución:**
```typescript
// Al inicio de cada servicio debe haber:
import { createScopedLogger } from '@/lib/logger'
const logger = createScopedLogger('hedera-balance')
```

---

## 📚 Referencias

- **Refactoring Guide:** `REFACTORING-GUIDE.md`
- **Hedera Service Refactoring Plan:** `docs/HEDERA-SERVICE-REFACTORING-PLAN.md`
- **DI Container:** `src/core/di/container.ts`
- **DI Types:** `src/core/di/types.ts`
- **Infrastructure Services:** `src/infrastructure/hedera/`

---

## ✅ Checklist Master

Usa esta checklist como referencia rápida:

```
PREPARACIÓN
[ ] Crear rama de migración
[ ] Hacer commit de checkpoint
[ ] Verificar que proyecto compila

FASE 1: /api/tvl
[ ] Migrar a HederaBalanceService
[ ] Testing
[ ] Commit

FASE 2: /api/wallet-balances
[ ] Migrar a HederaBalanceService
[ ] Actualizar funciones auxiliares
[ ] Testing
[ ] Commit

FASE 3: /api/process-withdrawals
[ ] Migrar a HederaWithdrawalService
[ ] Migrar a HederaMirrorNodeService
[ ] Testing
[ ] Commit

FASE 4: /api/withdraw
[ ] Migrar a HederaDepositService
[ ] Migrar a HederaWithdrawalService
[ ] Testing
[ ] Commit

FASE 5: Verificación
[ ] Buscar referencias restantes
[ ] Type-check completo
[ ] Lint completo
[ ] Build exitoso
[ ] Testing de todos los endpoints
[ ] Verificar logs

FASE 6: Limpieza
[ ] Deprecar HederaService
[ ] Eliminar archivos .bak
[ ] Actualizar documentación

FASE 7: Finalización
[ ] Revisión completa
[ ] Commit final
[ ] Push y PR (opcional)
```

---

**¡Éxito con la migración! 🚀**

Si encuentras problemas no cubiertos en esta guía, documéntalos para mejorar el proceso.
