# 🔐 Hedera Wallet Authentication API

Sistema de autenticación off-chain para Hedera Wallet sin fees.

---

## 📍 Endpoints

### `GET /api/auth/nonce`

Obtiene un nonce único para firmar.

**Query Parameters:**

-   `accountId` (required) - Hedera account ID (e.g., "0.0.12345")

**Response:**

```json
{
    "nonce": "uuid-v4-string",
    "message": "Login to HBANK Protocol with Hedera Wallet: {nonce}"
}
```

**Example:**

```bash
curl "https://your-domain.com/api/auth/nonce?accountId=0.0.12345"
```

---

### `POST /api/auth/verify`

Verifica la firma y crea una sesión JWT.

**Body:**

```json
{
    "accountId": "0.0.12345",
    "nonce": "uuid-from-previous-step",
    "signature": "hex-signature-from-wallet",
    "publicKey": "optional-public-key-hex"
}
```

**Response:**

```json
{
    "success": true,
    "accountId": "0.0.12345"
}
```

**Cookie Set:**

```
hbank-auth-token=jwt-token; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

**Example:**

```bash
curl -X POST "https://your-domain.com/api/auth/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "0.0.12345",
    "nonce": "uuid-here",
    "signature": "signature-hex-here"
  }'
```

---

### `POST /api/auth/logout`

Cierra la sesión y limpia la cookie.

**Response:**

```json
{
    "success": true,
    "message": "Logged out successfully"
}
```

**Example:**

```bash
curl -X POST "https://your-domain.com/api/auth/logout" \
  -H "Cookie: hbank-auth-token=your-jwt-token"
```

---

### `GET /api/auth/me`

Verifica la sesión actual.

**Response (authenticated):**

```json
{
    "accountId": "0.0.12345"
}
```

**Response (not authenticated):**

```json
{
    "error": "Unauthorized: No token provided"
}
```

**Example:**

```bash
curl "https://your-domain.com/api/auth/me" \
  -H "Cookie: hbank-auth-token=your-jwt-token"
```

---

## 🔒 Security

-   Nonces expire in 5 minutes
-   JWT expires in 7 days
-   Cookies are HttpOnly, Secure, SameSite=Strict
-   No transaction fees (off-chain signing)
-   Automatic logout on wallet disconnect

---

## 📚 Full Documentation

See [docs/HEDERA_AUTH.md](../docs/HEDERA_AUTH.md) for complete documentation.
