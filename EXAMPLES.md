# Ejemplos de Uso - Valora Protocol Backend

Este archivo contiene ejemplos prácticos de cómo usar los endpoints implementados.

## 🚀 Configuración Inicial

Asegúrate de tener las variables de entorno configuradas en `.env.local`:

```env
HEDERA_NETWORK=testnet
OPERATOR_ID=0.0.12345
OPERATOR_KEY=302e020100300506032b657004220420d45e1557156908c967804615ed29a95b33b6e0aa5ac4af9f5bb76058e7dde83a
TOPIC_ID=0.0.67890
TREASURY_ID=0.0.11111
EMISSIONS_ID=0.0.22222
USDC_TOKEN_ID=0.0.33333
HUSD_TOKEN_ID=0.0.44444
```

## 📋 Ejemplos de API Calls

### 1. Depósito de USDC

#### Ejemplo Exitoso

```javascript
const depositUSDC = async () => {
    try {
        const response = await fetch('http://localhost:3000/api/deposit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                accountId: '0.0.12345',
                amountUsdc: 100,
            }),
        })

        const result = await response.json()

        if (response.ok) {
            console.log('Depósito exitoso:', result)
            // {
            //   "status": "success",
            //   "scheduleId": "0.0.99999",
            //   "husdAmount": 99.5
            // }
        } else {
            console.error('Error en depósito:', result.error)
        }
    } catch (error) {
        console.error('Error de red:', error)
    }
}
```

#### Ejemplo con Error - Saldo Insuficiente

```javascript
const depositInsufficientBalance = async () => {
    const response = await fetch('http://localhost:3000/api/deposit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            accountId: '0.0.12345',
            amountUsdc: 1000, // Usuario solo tiene 50 USDC
        }),
    })

    const result = await response.json()
    // {
    //   "error": "Insufficient USDC balance"
    // }
    // Status: 400
}
```

#### Ejemplo con Error - Monto Mínimo

```javascript
const depositBelowMinimum = async () => {
    const response = await fetch('http://localhost:3000/api/deposit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            accountId: '0.0.12345',
            amountUsdc: 5, // Mínimo es 10 USDC
        }),
    })

    const result = await response.json()
    // {
    //   "error": "Minimum deposit is 10 USDC"
    // }
    // Status: 400
}
```

### 2. Publicación de Exchange Rate

#### Ejemplo Exitoso

```javascript
const publishExchangeRate = async () => {
    try {
        const response = await fetch('http://localhost:3000/api/publish-rate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                rate: 1.005,
                totalUsd: 100000,
                husdSupply: 99502.49, // totalUsd / rate = 99502.49
            }),
        })

        const result = await response.json()

        if (response.ok) {
            console.log('Rate publicado exitosamente:', result)
            // {
            //   "status": "published",
            //   "topicId": "0.0.67890",
            //   "rate": 1.005
            // }
        } else {
            console.error('Error al publicar rate:', result.error)
        }
    } catch (error) {
        console.error('Error de red:', error)
    }
}
```

#### Ejemplo con Error - Cálculo Inconsistente

```javascript
const publishInconsistentRate = async () => {
    const response = await fetch('http://localhost:3000/api/publish-rate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            rate: 1.005,
            totalUsd: 100000,
            husdSupply: 98500, // Esto daría rate = 1.015, no 1.005
        }),
    })

    const result = await response.json()
    // {
    //   "error": "Rate calculation is inconsistent with provided values"
    // }
    // Status: 400
}
```

## 🔧 Funciones de Utilidad

### Cliente HTTP Reutilizable

```javascript
class ValoraAPI {
    constructor(baseURL = 'http://localhost:3000') {
        this.baseURL = baseURL
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        }

        try {
            const response = await fetch(url, config)
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Request failed')
            }

            return data
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error)
            throw error
        }
    }

    async deposit(accountId, amountUsdc) {
        return this.request('/api/deposit', {
            method: 'POST',
            body: JSON.stringify({ accountId, amountUsdc }),
        })
    }

    async publishRate(rate, totalUsd, husdSupply) {
        return this.request('/api/publish-rate', {
            method: 'POST',
            body: JSON.stringify({ rate, totalUsd, husdSupply }),
        })
    }
}

// Uso
const api = new ValoraAPI()

// Depósito
const depositResult = await api.deposit('0.0.12345', 100)

// Publicar rate
const rateResult = await api.publishRate(1.005, 100000, 99502.49)
```

### Validador de Account ID

```javascript
const isValidHederaAccountId = (accountId) => {
    const regex = /^0\.0\.\d+$/
    return regex.test(accountId)
}

// Ejemplo de uso
console.log(isValidHederaAccountId('0.0.12345')) // true
console.log(isValidHederaAccountId('invalid')) // false
```

### Calculadora de Rate

```javascript
const calculateExchangeRate = (totalUsd, husdSupply) => {
    if (husdSupply === 0) {
        throw new Error('hUSD supply cannot be zero')
    }
    return totalUsd / husdSupply
}

const validateRateConsistency = (
    rate,
    totalUsd,
    husdSupply,
    tolerance = 0.001
) => {
    const calculatedRate = calculateExchangeRate(totalUsd, husdSupply)
    const difference = Math.abs(calculatedRate - rate) / rate
    return difference <= tolerance
}

// Ejemplo de uso
const rate = 1.005
const totalUsd = 100000
const husdSupply = 99502.49

const isConsistent = validateRateConsistency(rate, totalUsd, husdSupply)
console.log('Rate is consistent:', isConsistent) // true
```

## 🧪 Ejemplos de Testing

### Test Manual con curl

```bash
# Depósito exitoso
curl -X POST http://localhost:3000/api/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "0.0.12345",
    "amountUsdc": 100
  }'

# Publicar rate
curl -X POST http://localhost:3000/api/publish-rate \
  -H "Content-Type: application/json" \
  -d '{
    "rate": 1.005,
    "totalUsd": 100000,
    "husdSupply": 99502.49
  }'
```

### Test con Postman

#### Collection de Postman

```json
{
    "info": {
        "name": "Valora Protocol API",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "item": [
        {
            "name": "Deposit USDC",
            "request": {
                "method": "POST",
                "header": [
                    {
                        "key": "Content-Type",
                        "value": "application/json"
                    }
                ],
                "body": {
                    "mode": "raw",
                    "raw": "{\n  \"accountId\": \"0.0.12345\",\n  \"amountUsdc\": 100\n}"
                },
                "url": {
                    "raw": "{{baseUrl}}/api/deposit",
                    "host": ["{{baseUrl}}"],
                    "path": ["api", "deposit"]
                }
            }
        },
        {
            "name": "Publish Rate",
            "request": {
                "method": "POST",
                "header": [
                    {
                        "key": "Content-Type",
                        "value": "application/json"
                    }
                ],
                "body": {
                    "mode": "raw",
                    "raw": "{\n  \"rate\": 1.005,\n  \"totalUsd\": 100000,\n  \"husdSupply\": 99502.49\n}"
                },
                "url": {
                    "raw": "{{baseUrl}}/api/publish-rate",
                    "host": ["{{baseUrl}}"],
                    "path": ["api", "publish-rate"]
                }
            }
        }
    ],
    "variable": [
        {
            "key": "baseUrl",
            "value": "http://localhost:3000"
        }
    ]
}
```

## 🔍 Casos de Uso Complejos

### Flujo Completo de Depósito

```javascript
const completeDepositFlow = async (userAccountId, amount) => {
    const api = new ValoraAPI()

    try {
        console.log(
            `Iniciando depósito de ${amount} USDC para ${userAccountId}`
        )

        // 1. Validar account ID
        if (!isValidHederaAccountId(userAccountId)) {
            throw new Error('Invalid Hedera account ID format')
        }

        // 2. Verificar monto mínimo
        if (amount < 10) {
            throw new Error('Minimum deposit is 10 USDC')
        }

        // 3. Ejecutar depósito
        const result = await api.deposit(userAccountId, amount)

        console.log('Depósito exitoso:', {
            scheduleId: result.scheduleId,
            husdAmount: result.husdAmount,
            timestamp: new Date().toISOString(),
        })

        // 4. Aquí el frontend mostraría al usuario el scheduleId
        // para que pueda firmar la transacción programada

        return result
    } catch (error) {
        console.error('Error en flujo de depósito:', error.message)
        throw error
    }
}

// Uso
await completeDepositFlow('0.0.12345', 100)
```

### Sistema de Monitoreo de Rates

```javascript
class RateMonitor {
    constructor(api) {
        this.api = api
        this.lastRate = null
        this.maxChangePercent = 0.1 // 10%
    }

    validateRateChange(newRate) {
        if (!this.lastRate) return true

        const changePercent = Math.abs(newRate - this.lastRate) / this.lastRate
        return changePercent <= this.maxChangePercent
    }

    async publishRateWithValidation(rate, totalUsd, husdSupply) {
        try {
            // 1. Validar cambio de rate
            if (!this.validateRateChange(rate)) {
                throw new Error(
                    `Rate change exceeds ${this.maxChangePercent * 100}% limit`
                )
            }

            // 2. Validar consistencia
            if (!validateRateConsistency(rate, totalUsd, husdSupply)) {
                throw new Error('Rate calculation is inconsistent')
            }

            // 3. Publicar
            const result = await this.api.publishRate(
                rate,
                totalUsd,
                husdSupply
            )

            // 4. Actualizar last rate
            this.lastRate = rate

            console.log('Rate published successfully:', result)
            return result
        } catch (error) {
            console.error('Rate publication failed:', error.message)
            throw error
        }
    }
}

// Uso
const api = new ValoraAPI()
const monitor = new RateMonitor(api)

await monitor.publishRateWithValidation(1.005, 100000, 99502.49)
```

## 📊 Monitoreo y Logs

### Logger para Transacciones

```javascript
class TransactionLogger {
    static log(type, data, status = 'success') {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type,
            status,
            data,
            sessionId: this.generateSessionId(),
        }

        console.log(`[${type.toUpperCase()}] ${status}:`, logEntry)

        // En producción, enviar a servicio de logging
        // this.sendToLoggingService(logEntry);
    }

    static generateSessionId() {
        return Math.random().toString(36).substring(2, 15)
    }
}

// Uso en el flujo de depósito
const depositWithLogging = async (accountId, amount) => {
    try {
        TransactionLogger.log('deposit', { accountId, amount }, 'started')

        const result = await api.deposit(accountId, amount)

        TransactionLogger.log(
            'deposit',
            {
                accountId,
                amount,
                scheduleId: result.scheduleId,
                husdAmount: result.husdAmount,
            },
            'success'
        )

        return result
    } catch (error) {
        TransactionLogger.log(
            'deposit',
            {
                accountId,
                amount,
                error: error.message,
            },
            'error'
        )

        throw error
    }
}
```

Este archivo proporciona ejemplos prácticos y casos de uso reales para los endpoints implementados. Los desarrolladores pueden usar estos ejemplos como base para integrar los endpoints en sus aplicaciones.
