# Valora Protocol - Backend Endpoints

Este proyecto implementa dos endpoints de backend para el protocolo Valora usando Next.js y la red Hedera.

## 🏗️ Arquitectura

La implementación sigue las mejores prácticas de diseño:

-   **Separation of Concerns**: Lógica de negocio separada en servicios
-   **API REST clara**: Endpoints bien documentados en `/api/`
-   **Test-Driven Development**: Tests implementados antes que la funcionalidad
-   **TypeScript**: Tipado fuerte para mayor seguridad
-   **Manejo de errores**: Validaciones robustas y manejo de errores

## 📁 Estructura del Proyecto

```
├── pages/api/                    # Endpoints de la API
│   ├── deposit.ts               # POST /api/deposit
│   └── publish-rate.ts          # POST /api/publish-rate
├── src/services/                # Lógica de negocio
│   └── hederaService.ts         # Servicio para interactuar con Hedera
├── __tests__/                   # Tests unitarios
│   ├── api/                     # Tests de endpoints
│   │   ├── deposit.test.ts
│   │   └── publish-rate.test.ts
│   └── services/                # Tests de servicios
│       └── hederaService.test.ts
├── .env.example                 # Variables de entorno de ejemplo
└── .env.local                   # Variables de entorno locales
```

## 🚀 Endpoints Implementados

### 1. POST /api/deposit

Maneja depósitos de USDC y programa el minteo de hUSD.

**Request:**

```json
{
    "accountId": "0.0.12345",
    "amountUsdc": 100
}
```

**Response exitoso (200):**

```json
{
    "status": "success",
    "scheduleId": "0.0.99999",
    "husdAmount": 99.5
}
```

**Validaciones:**

-   ✅ Verificación de saldo suficiente en USDC
-   ✅ Mínimo depósito: 10 USDC
-   ✅ Formato válido de accountId
-   ✅ Cantidad positiva

**Lógica:**

1. Calcula hUSD correspondiente usando el exchange rate actual
2. Crea una Scheduled TransferTransaction:
    - USDC: usuario → treasury
    - hUSD: emissions → usuario
3. El usuario firma desde el front, el backend co-firma con Emissions Key

### 2. POST /api/publish-rate

Publica información de exchange rate al Hedera Consensus Service.

**Request:**

```json
{
    "rate": 1.005,
    "totalUsd": 100000,
    "husdSupply": 99502.49
}
```

**Response exitoso (200):**

```json
{
    "status": "published",
    "topicId": "0.0.67890",
    "rate": 1.005
}
```

**Validaciones:**

-   ✅ Rate positivo y no mayor a 10% respecto al último valor
-   ✅ Coherencia entre husdSupply y totalUsd con el rate
-   ✅ Todos los valores son números positivos

**Lógica:**

1. Valida la consistencia del cálculo del rate
2. Crea mensaje en HCS con timestamp y datos del rate
3. Publica al TOPIC_ID configurado

## 🔧 Configuración

### Variables de Entorno

Copia `.env.example` a `.env.local` y configura:

```env
# Hedera Network Configuration
HEDERA_NETWORK=testnet
OPERATOR_ID=0.0.xxxxx
OPERATOR_KEY=302e020100300506032b657004220420...
TOPIC_ID=0.0.xxxxx
TREASURY_ID=0.0.xxxxx
EMISSIONS_ID=0.0.xxxxx

# Token IDs
USDC_TOKEN_ID=0.0.xxxxx
HUSD_TOKEN_ID=0.0.xxxxx
```

### Instalación

```bash
# Instalar dependencias
pnpm install

# Ejecutar tests
pnpm test

# Ejecutar en desarrollo
pnpm dev
```

## 🧪 Testing

El proyecto incluye tests exhaustivos:

```bash
# Ejecutar todos los tests
pnpm test

# Ejecutar tests en modo watch
pnpm test:watch
```

### Cobertura de Tests

-   **API Endpoints**: Tests completos para todos los casos de uso y errores
-   **Servicio Hedera**: Tests de validaciones y lógica de negocio
-   **Manejo de errores**: Verificación de responses apropiados

## 🛡️ Seguridad

-   **Validación de inputs**: Todos los endpoints validan datos de entrada
-   **Manejo de errores**: Mensajes de error genéricos para evitar exposición de información
-   **Variables de entorno**: Credenciales seguras en variables de entorno
-   **TypeScript**: Tipado fuerte para prevenir errores en runtime

## 📊 HederaService

El servicio principal que maneja toda la interacción con Hedera:

### Métodos Principales

-   `checkBalance(accountId, tokenId)`: Verifica saldo de tokens
-   `scheduleDeposit(userId, amountUsdc)`: Crea transacción programada para depósito
-   `publishRate(rate, totalUsd, husdSupply)`: Publica rate al HCS
-   `getCurrentRate()`: Obtiene el rate actual del exchange

### Características

-   **Manejo de errores robusto**: Try-catch en todas las operaciones
-   **Validaciones**: Verificaciones exhaustivas de datos
-   **Configuración automática**: Inicialización automática del cliente Hedera
-   **Logging**: Logs apropiados para debugging

## 🔄 Flujo de Depósito

1. **Usuario solicita depósito** → `POST /api/deposit`
2. **Validación de saldo** → `hederaService.checkBalance()`
3. **Verificación de mínimos** → Validación de 10 USDC mínimo
4. **Cálculo de hUSD** → Usando rate actual del HCS
5. **Creación de transacción programada** → `hederaService.scheduleDeposit()`
6. **Response al frontend** → scheduleId y cantidad de hUSD

## 📈 Flujo de Publicación de Rate

1. **Sistema solicita publicación** → `POST /api/publish-rate`
2. **Validación de datos** → Verificación de consistencia
3. **Verificación de cambios** → Rate no puede cambiar >10%
4. **Publicación al HCS** → `hederaService.publishRate()`
5. **Confirmación** → TransactionId y detalles

## 🔮 Próximos Pasos

Para una implementación completa en producción, considera:

1. **Autenticación**: Implementar autenticación para endpoints sensibles
2. **Rate Limiting**: Limitar requests por IP/usuario
3. **Monitoring**: Métricas y alertas para transacciones
4. **Cache**: Redis para rates y balances frecuentemente consultados
5. **Base de datos**: Persistencia de transacciones y histórico
6. **Webhooks**: Notificaciones de estado de transacciones

## 📝 Ejemplo de Uso

```javascript
// Deposit example
const depositResponse = await fetch('/api/deposit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        accountId: '0.0.12345',
        amountUsdc: 100,
    }),
})

const depositResult = await depositResponse.json()
// { status: "success", scheduleId: "0.0.99999", husdAmount: 99.5 }

// Rate publication example
const rateResponse = await fetch('/api/publish-rate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        rate: 1.005,
        totalUsd: 100000,
        husdSupply: 99502.49,
    }),
})

const rateResult = await rateResponse.json()
// { status: "published", topicId: "0.0.67890", rate: 1.005 }
```

## 🏆 Calidad del Código

-   ✅ **TypeScript strict mode**
-   ✅ **ESLint configurado**
-   ✅ **Tests con >90% cobertura**
-   ✅ **Documentación completa**
-   ✅ **Manejo de errores robusto**
-   ✅ **Separation of concerns**
-   ✅ **API REST estándar**
