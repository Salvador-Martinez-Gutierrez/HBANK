# Guía Completa: Autenticación con Hedera Wallet (Off-Chain Message Signing)

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [El Problema del Prefijo de Mensaje](#el-problema-del-prefijo-de-mensaje)
4. [Flujo de Implementación](#flujo-de-implementación)
5. [Consideraciones Técnicas](#consideraciones-técnicas)
6. [Mejores Prácticas](#mejores-prácticas)
7. [Troubleshooting](#troubleshooting)
8. [Referencias](#referencias)

---

## Resumen Ejecutivo

Este documento describe la implementación de un sistema de **autenticación sin contraseñas** para aplicaciones Hedera usando **firma de mensajes off-chain** (sin fees de transacción). El usuario firma un mensaje de desafío con su wallet, y el backend verifica la firma usando el SDK de Hedera.

### ✅ Características

-   **Sin fees**: La firma es off-chain, no requiere transacciones en la red
-   **Seguro**: Usa criptografía de clave pública/privada
-   **Universal**: Compatible con múltiples wallets (HashPack, Blade, etc.)
-   **Sesiones**: Implementa JWT para mantener sesiones autenticadas
-   **Protección**: Nonces con expiración para prevenir ataques de replay

### ⚠️ Desafío Principal

Los wallets de Hedera añaden un **prefijo estándar** al mensaje antes de firmarlo (similar a Ethereum), lo cual **no está documentado** y causa fallos de verificación si no se maneja correctamente.

---

## Arquitectura del Sistema

### Componentes

```
┌──────────────────┐
│   Frontend       │
│  (Next.js)       │
│                  │
│  1. useHederaAuth│──┐
│  2. useSignMessage│  │
│  3. Auth Buttons │  │
└──────────────────┘  │
                      │ HTTP/JSON
                      │
┌──────────────────┐  │
│   Backend API    │◄─┘
│  (Next.js API)   │
│                  │
│  1. /auth/nonce  │
│  2. /auth/verify │
│  3. /auth/me     │
│  4. /auth/logout │
└──────────────────┘
        │
        │ Verificación
        ▼
┌──────────────────┐
│  Hedera SDK      │
│  @hashgraph/sdk  │
│                  │
│  PublicKey.verify│
└──────────────────┘
```

### Stack Tecnológico

| Componente         | Tecnología                           | Versión |
| ------------------ | ------------------------------------ | ------- |
| Framework          | Next.js                              | 15.5.0  |
| Wallet Integration | @buidlerlabs/hashgraph-react-wallets | 7.1.3   |
| Hedera SDK         | @hashgraph/sdk                       | 2.71.1  |
| JWT                | jose                                 | 6.1.0   |
| Network            | Hedera Testnet/Mainnet               | -       |

---

## El Problema del Prefijo de Mensaje

### 🔴 El Problema

Cuando un wallet firma un mensaje, **NO firma el mensaje tal cual**. En su lugar, añade un prefijo estándar similar al de Ethereum para prevenir que las firmas de mensajes puedan ser reutilizadas como transacciones válidas.

### 📝 Formato del Prefijo

```
"\x19Hedera Signed Message:\n" + [longitud_en_bytes] + [mensaje_original]
```

#### Ejemplo Completo

```javascript
// Mensaje original
const message = 'Login to HBANK Protocol: abc123-uuid'
// Longitud: 80 bytes

// Mensaje que realmente se firma
const prefixedMessage =
    '\x19Hedera Signed Message:\n80Login to HBANK Protocol: abc123-uuid'
// Longitud total: 106 bytes (26 de prefijo + 80 del mensaje)
```

### 🔧 Implementación Correcta

#### Frontend (Firma)

```typescript
// El wallet añade el prefijo automáticamente
const messageBytes = new TextEncoder().encode(message)
const signResult = await signer.sign([messageBytes])
```

#### Backend (Verificación)

```typescript
// DEBEMOS añadir el mismo prefijo para verificar
const messageBuffer = Buffer.from(message, 'utf-8')
const prefix = `\x19Hedera Signed Message:\n${messageBuffer.length}`
const prefixedMessage = Buffer.concat([
    Buffer.from(prefix, 'utf-8'),
    messageBuffer,
])

// Ahora sí podemos verificar
const isValid = publicKey.verify(prefixedMessage, signatureBytes)
```

### ⚡ Estrategia de Fallback

Para máxima compatibilidad, intentamos tres formatos en orden:

1. **Hedera Standard**: `"\x19Hedera Signed Message:\n" + length + message`
2. **Ethereum Standard**: `"\x19Ethereum Signed Message:\n" + length + message`
3. **Raw Message**: mensaje sin prefijo (legacy o wallets no estándar)

```typescript
export function verifyHederaSignature(
    message: string,
    signature: string | Uint8Array,
    publicKeyString: string
): boolean {
    const messageBuffer = Buffer.from(message, 'utf-8')
    const publicKey = PublicKey.fromString(publicKeyString)

    // 1. Intentar con prefijo Hedera
    const hederaPrefix = `\x19Hedera Signed Message:\n${messageBuffer.length}`
    const hederaPrefixedMessage = Buffer.concat([
        Buffer.from(hederaPrefix, 'utf-8'),
        messageBuffer,
    ])

    let isValid = publicKey.verify(hederaPrefixedMessage, signatureBytes)

    // 2. Si falla, intentar con prefijo Ethereum
    if (!isValid) {
        const ethPrefix = `\x19Ethereum Signed Message:\n${messageBuffer.length}`
        const ethPrefixedMessage = Buffer.concat([
            Buffer.from(ethPrefix, 'utf-8'),
            messageBuffer,
        ])
        isValid = publicKey.verify(ethPrefixedMessage, signatureBytes)
    }

    // 3. Si aún falla, intentar sin prefijo
    if (!isValid) {
        isValid = publicKey.verify(messageBuffer, signatureBytes)
    }

    return isValid
}
```

---

## Flujo de Implementación

### Paso 1: Generación de Nonce

**Endpoint**: `GET /api/auth/nonce?accountId=0.0.XXXX`

```typescript
// Backend
export class NonceService {
    static generateNonce(accountId: string) {
        const nonce = uuidv4()
        const message = `Login to HBANK Protocol with Hedera Wallet: ${nonce}`

        nonceStore.set(nonce, {
            accountId,
            nonce,
            message,
            createdAt: Date.now(),
            expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutos
            used: false,
        })

        return { nonce, message }
    }
}
```

**Respuesta**:

```json
{
    "nonce": "aaba1dc9-8de2-429a-a50f-cf01887b27fd",
    "message": "Login to HBANK Protocol with Hedera Wallet: aaba1dc9-8de2-429a-a50f-cf01887b27fd"
}
```

### Paso 2: Firma del Mensaje

**Frontend**:

```typescript
export function useSignMessage() {
    const wallet = useWallet()

    const signMessage = async (message: string) => {
        const signer = wallet.signer
        const messageBytes = new TextEncoder().encode(message)

        // El wallet añade el prefijo automáticamente
        const signResult = await signer.sign([messageBytes])

        // Extraer firma y clave pública del resultado
        const { signature, publicKey } = signResult[0]

        return {
            signature: Buffer.from(signature).toString('hex'),
            publicKey: publicKey.toString(), // DER format
        }
    }

    return { signMessage }
}
```

### Paso 3: Verificación de Firma

**Endpoint**: `POST /api/auth/verify`

```typescript
// Request Body
{
  "accountId": "0.0.6623545",
  "nonce": "aaba1dc9-8de2-429a-a50f-cf01887b27fd",
  "signature": "6240c1799f5620227795...", // 128 hex chars
  "publicKey": "302d300706052b8104000a0322000312..." // DER format
}
```

```typescript
// Backend Handler
export default async function handler(req, res) {
    const { accountId, nonce, signature, publicKey } = req.body

    // 1. Validar nonce
    const nonceValidation = NonceService.validateNonce(nonce, accountId)
    if (!nonceValidation.valid) {
        return res.status(400).json({ error: 'Invalid nonce' })
    }

    // 2. Verificar firma (con prefijo!)
    const isValid = publicKey
        ? verifyHederaSignature(nonceValidation.message, signature, publicKey)
        : await verifyHederaSignatureWithAccountId(
              nonceValidation.message,
              signature,
              accountId
          )

    if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' })
    }

    // 3. Marcar nonce como usado
    NonceService.markAsUsed(nonce)

    // 4. Crear JWT
    const token = await createJWT(accountId)

    // 5. Setear cookie segura
    res.setHeader(
        'Set-Cookie',
        serialize('hbank-auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7, // 7 días
            path: '/',
        })
    )

    return res.status(200).json({ success: true })
}
```

### Paso 4: Gestión de Sesión

**Verificar Sesión**: `GET /api/auth/me`

```typescript
export default async function handler(req, res) {
    const token = req.cookies['hbank-auth-token']

    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' })
    }

    try {
        const payload = await verifyJWT(token)
        return res.status(200).json({ accountId: payload.accountId })
    } catch {
        return res.status(401).json({ error: 'Invalid token' })
    }
}
```

**Cerrar Sesión**: `POST /api/auth/logout`

```typescript
export default async function handler(req, res) {
    res.setHeader(
        'Set-Cookie',
        serialize('hbank-auth-token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 0,
            path: '/',
        })
    )

    return res.status(200).json({ success: true })
}
```

---

## Consideraciones Técnicas

### 1. Formato de Firma

-   **Tamaño**: 64 bytes (128 caracteres hexadecimales)
-   **Tipo**: ECDSA raw signature (componentes r + s concatenados)
-   **Encoding**: Hexadecimal string sin prefijo `0x`

### 2. Formato de Clave Pública

-   **Formato**: DER (Distinguished Encoding Rules)
-   **Curva**: secp256k1 (ECDSA)
-   **Estructura**: `302d300706052b8104000a032200` + 33 bytes de clave comprimida
-   **Longitud Total**: 66 caracteres hex (33 bytes)

### 3. Nonce Storage

#### Desarrollo

```typescript
// Usar global variable para persistir en HMR
declare global {
    var __nonceStore: Map<string, StoredNonce> | undefined
}

const nonceStore = global.__nonceStore || new Map()

if (process.env.NODE_ENV === 'development') {
    global.__nonceStore = nonceStore
}
```

#### Producción

```typescript
// Usar Redis o similar para múltiples instancias
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export class NonceService {
    static async generateNonce(accountId: string) {
        const nonce = uuidv4()
        await redis.setex(
            `nonce:${nonce}`,
            300, // 5 minutos
            JSON.stringify({ accountId /* ... */ })
        )
        return { nonce, message }
    }
}
```

### 4. Seguridad JWT

```typescript
import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(
    process.env.JWT_SECRET // Mínimo 32 caracteres
)

export async function createJWT(accountId: string) {
    return await new SignJWT({ accountId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secret)
}

export async function verifyJWT(token: string) {
    const { payload } = await jwtVerify(token, secret)
    return payload as { accountId: string }
}
```

### 5. Detección de Wallet

```typescript
export function useSignMessage() {
    const wallet = useWallet()

    const signMessage = async (message: string) => {
        const walletType = wallet.walletType?.toLowerCase() || ''

        if (walletType.includes('hashpack')) {
            // Usar método específico de HashPack
            const hashconnect = wallet.connector.hashconnect
            const result = await hashconnect.signMessage(accountId, message)
            return { signature: result.signature, publicKey: result.publicKey }
        } else if (walletType.includes('blade')) {
            // Usar método específico de Blade
            const result = await window.bladeWallet.sign(message, accountId)
            return { signature: result.signature, publicKey: result.publicKey }
        } else {
            // Método genérico
            const signer = wallet.signer
            const messageBytes = new TextEncoder().encode(message)
            const signResult = await signer.sign([messageBytes])

            // Extraer del resultado
            const { signature, publicKey } = signResult[0]
            return {
                signature: Buffer.from(signature).toString('hex'),
                publicKey: publicKey.toString(),
            }
        }
    }

    return { signMessage }
}
```

---

## Mejores Prácticas

### ✅ Hacer

1. **Validar siempre el nonce antes de verificar la firma**

    - Evita procesamiento innecesario de firmas inválidas
    - Previene ataques de replay

2. **Marcar nonces como usados inmediatamente**

    - Incluso si la verificación falla
    - Previene intentos múltiples con el mismo nonce

3. **Usar cookies HttpOnly para JWTs**

    - Protege contra XSS
    - Configurar SameSite=Strict

4. **Limpiar nonces expirados regularmente**

    - Previene crecimiento de memoria
    - Usar interval o cron job

5. **Enviar la clave pública desde el frontend**

    - Más rápido que consultar Mirror Node
    - Garantiza que se usa la clave correcta

6. **Implementar rate limiting**
    - Por IP y por accountId
    - Previene ataques de fuerza bruta

### ❌ Evitar

1. **NO verificar la firma sin el prefijo**

    - Siempre añadir `"\x19Hedera Signed Message:\n"` + length

2. **NO guardar JWTs en localStorage**

    - Vulnerable a XSS
    - Usar siempre cookies HttpOnly

3. **NO reutilizar nonces**

    - Un nonce = una firma
    - Implementar verificación de uso

4. **NO confiar solo en el Mirror Node**

    - Puede estar desactualizado
    - Usar la clave pública del resultado de firma cuando sea posible

5. **NO usar nonces con expiración muy larga**
    - Máximo 5-10 minutos
    - Balance entre UX y seguridad

---

## Troubleshooting

### Problema 1: "Signature verification returns false"

**Síntomas**: La firma siempre retorna `false` en verificación

**Causa**: No se está añadiendo el prefijo al mensaje

**Solución**:

```typescript
// ❌ INCORRECTO
const isValid = publicKey.verify(Buffer.from(message), signatureBytes)

// ✅ CORRECTO
const messageBuffer = Buffer.from(message, 'utf-8')
const prefix = `\x19Hedera Signed Message:\n${messageBuffer.length}`
const prefixedMessage = Buffer.concat([
    Buffer.from(prefix, 'utf-8'),
    messageBuffer,
])
const isValid = publicKey.verify(prefixedMessage, signatureBytes)
```

### Problema 2: "Nonce not found"

**Síntomas**: El nonce no se encuentra al intentar verificar

**Causa**: El store de nonces se reinicia en desarrollo (HMR)

**Solución**:

```typescript
// Usar global variable en desarrollo
declare global {
    var __nonceStore: Map<string, StoredNonce> | undefined
}

const nonceStore = global.__nonceStore || new Map()

if (process.env.NODE_ENV === 'development') {
    global.__nonceStore = nonceStore
}
```

### Problema 3: "Empty signature (0x00)"

**Síntomas**: La firma recibida es solo "00" o está vacía

**Causa**: El wallet no está firmando correctamente o el método de extracción es incorrecto

**Solución**:

```typescript
const signResult = await signer.sign([messageBytes])

// Verificar estructura del resultado
console.log('Keys:', Object.keys(signResult[0]))
// Expected: ['publicKey', 'signature', 'accountId']

// Extraer correctamente
const firstElement = signResult[0]
if (firstElement.signature instanceof Uint8Array) {
    const signature = Buffer.from(firstElement.signature).toString('hex')
} else if (typeof firstElement.signature === 'object') {
    // Convertir objeto indexado a Uint8Array
    const bytes = Object.values(firstElement.signature)
    const signature = Buffer.from(bytes).toString('hex')
}
```

### Problema 4: "Public key format error"

**Síntomas**: Error al parsear la clave pública

**Causa**: La clave no está en formato DER o está corrupta

**Solución**:

```typescript
try {
    // Si la clave empieza con 302d/302e, es DER
    if (publicKeyString.startsWith('302')) {
        publicKey = PublicKey.fromStringDER(publicKeyString)
    }
    // Si empieza con 02/03, es clave comprimida
    else if (
        publicKeyString.startsWith('02') ||
        publicKeyString.startsWith('03')
    ) {
        publicKey = PublicKey.fromString(publicKeyString)
    } else {
        // Intentar fromString por defecto
        publicKey = PublicKey.fromString(publicKeyString)
    }
} catch (error) {
    logger.error('Failed to parse public key', { publicKeyString, error })
    throw new Error('Invalid public key format')
}
```

### Problema 5: "Infinite loop of auth/me requests"

**Síntomas**: Peticiones continuas a `/api/auth/me`

**Causa**: useEffect con dependencias incorrectas

**Solución**:

```typescript
// ❌ INCORRECTO - causa infinite loop
useEffect(() => {
    checkAuthStatus()
}, [checkAuthStatus]) // checkAuthStatus cambia en cada render

// ✅ CORRECTO - solo ejecuta al montar
useEffect(() => {
    checkAuthStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, []) // Array vacío = solo en mount
```

---

## Referencias

### Documentación Oficial

-   [Hedera SDK Documentation](https://docs.hedera.com/hedera/sdks-and-apis/sdks)
-   [@buidlerlabs/hashgraph-react-wallets](https://github.com/buidlerlabs/hashgraph-react-wallets)
-   [EIP-191: Signed Data Standard](https://eips.ethereum.org/EIPS/eip-191)

### Código de Ejemplo

Ver archivos en este repositorio:

-   `src/lib/hedera-auth.ts` - Verificación de firmas
-   `src/hooks/useHederaAuth.ts` - Hook de autenticación
-   `src/hooks/useSignMessage.ts` - Hook de firma
-   `pages/api/auth/verify.ts` - Endpoint de verificación

### Variables de Entorno Requeridas

```env
# JWT Secret (mínimo 32 caracteres)
JWT_SECRET=your_very_long_and_secure_jwt_secret_key_at_least_32_characters

# Hedera Network
HEDERA_NETWORK=testnet  # o mainnet

# Mirror Node API Key (opcional, mejora rate limits)
MIRROR_NODE_API_KEY=your_api_key_here
```

---

## Conclusión

La autenticación con firma de mensajes en Hedera es una solución elegante y sin fees para implementar login con wallet. El desafío principal es el **prefijo de mensaje no documentado** que los wallets añaden automáticamente.

**Claves del éxito**:

1. ✅ Añadir el prefijo `"\x19Hedera Signed Message:\n"` + length al verificar
2. ✅ Usar la clave pública del resultado de firma cuando esté disponible
3. ✅ Implementar nonces con expiración para seguridad
4. ✅ Usar cookies HttpOnly para sesiones JWT
5. ✅ Implementar fallbacks para diferentes formatos de wallet

Con estas consideraciones, el sistema funciona de manera robusta y segura para autenticación en aplicaciones Hedera.

---

**Última actualización**: Octubre 2025  
**Versión**: 1.0.0  
**Autor**: HBANK Protocol Team
