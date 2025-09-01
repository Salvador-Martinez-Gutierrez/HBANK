# Flujo de Depósito Atómico

Este documento describe el nuevo flujo de depósito atómico implementado utilizando transacciones programadas de Hedera (ScheduleCreateTransaction/ScheduleSignTransaction).

## Descripción General

El flujo de depósito atómico permite intercambios seguros de USDC ↔ HUSDC en una sola transacción atómica. Esto garantiza que:

-   Si el usuario transfiere USDC, automáticamente recibe HUSDC
-   Si la transacción falla en cualquier punto, no se transfieren tokens
-   No hay posibilidad de estados intermedios inconsistentes

## Flujo de Usuario

### 1. Inicialización del Depósito

**Frontend → Backend**

```
POST /api/deposit/init
{
  "userAccountId": "0.0.12345",
  "amount": 100.50
}
```

**Backend responde:**

```json
{
    "success": true,
    "scheduleId": "0.0.99999",
    "amountHUSDC": 100.5,
    "rate": 1.0,
    "usdcAmount": 100.5,
    "timestamp": "2025-09-01T...",
    "txId": "0.0.123456@..."
}
```

### 2. Firma del Usuario

**Frontend** ejecuta `ScheduleSignTransaction` en la wallet del usuario:

```javascript
const scheduleSignTx = new ScheduleSignTransaction().setScheduleId(
    ScheduleId.fromString(scheduleId)
)

const signedTx = await scheduleSignTx.signWithSigner(signer)
const response = await signedTx.executeWithSigner(signer)
```

### 3. Completar Transacción

**Frontend → Backend**

```
POST /api/deposit/user-signed
{
  "scheduleId": "0.0.99999",
  "clientRequestId": "optional-id"
}
```

**Backend responde:**

```json
{
    "success": true,
    "executed": true,
    "txId": "0.0.789012@...",
    "scheduleId": "0.0.99999",
    "timestamp": "2025-09-01T..."
}
```

## Validaciones Implementadas

### Frontend (UX)

-   Validación básica de cantidad
-   Verificación de conexión de wallet

### Backend

-   **Validación on-chain de balances:**
    -   Usuario tiene suficiente USDC
    -   Treasury tiene suficiente HUSDC
-   **Cálculo de rates:**
    -   Actualmente 1:1 (USDC ↔ HUSDC)
    -   Extensible para rates dinámicos
-   **Verificación de firmas:**
    -   Confirma que el usuario firmó el schedule
    -   Ejecuta firma del treasury para completar

## Arquitectura Técnica

### Endpoints

#### `/api/deposit/init`

-   **Propósito:** Crear ScheduleCreateTransaction
-   **Validaciones:** Balances on-chain, amounts válidos
-   **Retorna:** scheduleId para firma del usuario

#### `/api/deposit/user-signed`

-   **Propósito:** Completar transacción atómica
-   **Validaciones:** Verificar firma del usuario, estado del schedule
-   **Acción:** Ejecutar ScheduleSignTransaction del treasury

### Componentes de Frontend

#### `DepositDialog`

-   **Ubicación:** `src/components/deposit-dialog.tsx`
-   **Funcionalidad:** Interfaz para depósito atómico
-   **Estados:** Inicializando → Firmando → Completando

### Utilitarios

#### `deposit-rate.ts`

-   **Ubicación:** `src/lib/deposit-rate.ts`
-   **Función:** Cálculo de rates, extensible para futuro
-   **Configuración:** Actualmente 1:1, preparado para rates dinámicos

## Beneficios del Flujo Atómico

1. **Atomicidad:** Toda la operación USDC→HUSDC sucede en una transacción
2. **Seguridad:** No hay estados intermedios vulnerables
3. **UX mejorado:** Usuario solo firma una vez
4. **Transparencia:** Transacción visible en Hedera Mirror Node
5. **Extensibilidad:** Preparado para rates dinámicos y features futuras

## Configuración Requerida

### Variables de Entorno

```
TREASURY_ID=0.0.6510977
OPERATOR_KEY=your-treasury-private-key
USDC_TOKEN_ID=0.0.429274
HUSDC_TOKEN_ID=0.0.429275
```

### Permisos de Tokens

-   Treasury debe tener allowance suficiente para HUSDC
-   Usuario debe tener allowance para USDC

## Manejo de Errores

### Errores Comunes

-   `Insufficient USDC balance`: Usuario no tiene suficiente USDC
-   `Insufficient treasury HUSDC balance`: Treasury sin HUSDC suficiente
-   `User signature not found`: Usuario no firmó correctamente
-   `Schedule already executed`: Transacción ya fue completada
-   `Schedule was deleted`: Schedule fue eliminado

### Códigos de Estado HTTP

-   `200`: Éxito
-   `400`: Error de validación/datos
-   `404`: Schedule no encontrado
-   `409`: Schedule ya ejecutado
-   `410`: Schedule eliminado
-   `500`: Error interno del servidor

## Extensiones Futuras

### Rates Dinámicos

El sistema está preparado para implementar rates variables:

```typescript
// Futuro: rates basados en condiciones del mercado
const rateConfig = {
    baseRate: 1.02,
    timeBonus: 0.001,
    volumeBonus: 0.002,
}
```

### Múltiples Tokens

Fácil extensión para soportar otros tokens estables:

```typescript
const supportedTokens = ['USDC', 'USDT', 'DAI']
```

### Límites y Fees

Sistema preparado para implementar:

-   Límites mínimos/máximos por transacción
-   Fees variables según volumen
-   Límites por usuario/timeframe
