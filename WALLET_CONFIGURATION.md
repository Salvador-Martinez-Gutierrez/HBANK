# Configuración de Wallets Separadas - Valora Protocol

## Resumen de Cambios

Se ha implementado un sistema de wallets separadas para diferentes operaciones del protocolo Valora. Anteriormente, todas las operaciones utilizaban las mismas wallets (OPERATOR_ID, TREASURY_ID, EMISSIONS_ID). Ahora cada operación tiene su propia wallet dedicada.

## Nuevas Variables de Entorno

### Wallets Principales

```env
# Treasury Wallet (almacena tokens hUSD)
TREASURY_ID=0.0.6510977
TREASURY_KEY=3030020100300706052b8104000a04220420b76e9a8ca7d267fec7059872cf9e85ec657f8a20fdf02f7032bb79ed92d5dddb

# Deposit Wallet (recibe depósitos de USDC)
DEPOSIT_WALLET_ID=0.0.6510977
DEPOSIT_WALLET_KEY=3030020100300706052b8104000a04220420b76e9a8ca7d267fec7059872cf9e85ec657f8a20fdf02f7032bb79ed92d5dddb

# Instant Withdrawal Wallet (procesa retiros instantáneos de USDC)
INSTANT_WITHDRAW_WALLET_ID=0.0.6510977
INSTANT_WITHDRAW_WALLET_KEY=3030020100300706052b8104000a04220420b76e9a8ca7d267fec7059872cf9e85ec657f8a20fdf02f7032bb79ed92d5dddb

# Standard Withdrawal Wallet (procesa retiros estándar de USDC)
STANDARD_WITHDRAW_WALLET_ID=0.0.6510977
STANDARD_WITHDRAW_WALLET_KEY=3030020100300706052b8104000a04220420b76e9a8ca7d267fec7059872cf9e85ec657f8a20fdf02f7032bb79ed92d5dddb

# Emissions Wallet (mintea tokens hUSD)
EMISSIONS_ID=0.0.6510977
EMISSIONS_KEY=3030020100300706052b8104000a04220420b76e9a8ca7d267fec7059872cf9e85ec657f8a20fdf02f7032bb79ed92d5dddb

# Rate Publisher Wallet (publica exchange rates a HCS)
RATE_PUBLISHER_ID=0.0.6510977
RATE_PUBLISHER_KEY=3030020100300706052b8104000a04220420b76e9a8ca7d267fec7059872cf9e85ec657f8a20fdf02f7032bb79ed92d5dddb
```

### Variables Legadas (para compatibilidad hacia atrás)

```env
# Estas variables se mantienen para compatibilidad con código existente
OPERATOR_ID=0.0.6510977
OPERATOR_KEY=3030020100300706052b8104000a04220420b76e9a8ca7d267fec7059872cf9e85ec657f8a20fdf02f7032bb79ed92d5dddb
```

## Funcionalidad de Cada Wallet

### 1. Treasury Wallet (`TREASURY_ID`)
- **Propósito**: Almacena tokens hUSD recibidos de usuarios para retiros
- **Operaciones**:
  - Recibe hUSD cuando usuarios solicitan retiros
  - Envía hUSD de vuelta en caso de rollback de retiros fallidos

### 2. Deposit Wallet (`DEPOSIT_WALLET_ID`)
- **Propósito**: Recibe depósitos de USDC de usuarios
- **Operaciones**:
  - Recibe USDC en transacciones de depósito
  - Firma transacciones programadas de depósito

### 3. Instant Withdrawal Wallet (`INSTANT_WITHDRAW_WALLET_ID`)
- **Propósito**: Procesa retiros instantáneos de USDC
- **Operaciones**:
  - Envía USDC inmediatamente a usuarios (retiros instantáneos)
  - Debe mantener liquidez suficiente para retiros instantáneos

### 4. Standard Withdrawal Wallet (`STANDARD_WITHDRAW_WALLET_ID`)
- **Propósito**: Procesa retiros estándar de USDC (después del período de bloqueo)
- **Operaciones**:
  - Envía USDC a usuarios después del período de bloqueo de 48h
  - Procesa retiros masivos programados

### 5. Emissions Wallet (`EMISSIONS_ID`)
- **Propósito**: Mintea y distribuye tokens hUSD
- **Operaciones**:
  - Envía hUSD nuevos a usuarios en depósitos
  - Mantiene el suministro de hUSD

### 6. Rate Publisher Wallet (`RATE_PUBLISHER_ID`)
- **Propósito**: Publica exchange rates a Hedera Consensus Service
- **Operaciones**:
  - Envía mensajes de rate updates al HCS topic
  - Mantiene el oracle de precios actualizado

## Archivos Modificados

### Servicios Principales
- `src/services/hederaService.ts` - Actualizado para usar wallets específicas
- `src/services/hederaRateService.ts` - Usa Rate Publisher Wallet
- `src/app/server-constants.ts` - Añadidas nuevas constantes de wallet

### APIs de Depósito
- `pages/api/deposit.ts` - Usa Deposit y Emissions wallets
- `pages/api/deposit/init.ts` - Usa Deposit y Emissions wallets
- `pages/api/deposit/user-signed.ts` - Usa Deposit wallet

### APIs de Retiro
- `pages/api/withdraw/instant/index.ts` - Usa Instant Withdrawal wallet
- `pages/api/withdraw/instant/max.ts` - Verifica balance de Instant Withdrawal wallet
- `pages/api/process-withdrawals.ts` - Usa Standard Withdrawal wallet

### Tests
- Todos los archivos de test han sido actualizados para usar las nuevas variables

## Beneficios de la Separación

1. **Seguridad**: Cada wallet tiene responsabilidades específicas, limitando el riesgo
2. **Escalabilidad**: Diferentes wallets pueden manejar diferentes volúmenes
3. **Monitoreo**: Fácil tracking de operaciones por tipo
4. **Mantenimiento**: Operaciones específicas aisladas a wallets específicas
5. **Flexibilidad**: Futuras actualizaciones pueden cambiar solo las wallets necesarias

## Migración Futura

Para usar wallets separadas reales:

1. Crear las nuevas accounts en Hedera
2. Transferir fondos apropiados a cada wallet:
   - USDC → Instant Withdrawal y Standard Withdrawal wallets
   - hUSD → Treasury y Emissions wallets
3. Actualizar las variables de entorno con los nuevos IDs y keys
4. Todas las funciones seguirán funcionando automáticamente

## Estado Actual

**Actualmente todas las wallets apuntan a la misma account (0.0.6510977) para mantener la funcionalidad existente.** 

Cuando se decida migrar a wallets separadas, simplemente se necesita:
1. Actualizar las variables de entorno en `.env.local`
2. Distribuir fondos apropiadamente
3. No se requieren cambios de código adicionales

## Compatibilidad hacia Atrás

Las variables `OPERATOR_ID`, `OPERATOR_KEY`, y `TREASURY_ID` se mantienen para compatibilidad con código existente que pueda referenciarlas directamente.
