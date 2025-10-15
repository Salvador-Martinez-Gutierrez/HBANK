# 🔐 Portfolio Authentication - Security Fix

## ✅ Security Issues Fixed

### 1. **Signature Verification Missing** ❌ → ✅

**Before:** `/api/portfolio/auth` did not verify wallet signatures

```typescript
// TODO: Verify signature (requires public key from wallet)
// const isValid = verifyHederaSignature(message, signature, publicKey)
console.warn('⚠️ Signature verification not fully implemented')
return true // CRITICAL VULNERABILITY!
```

**After:** Now uses `/api/auth/verify` which properly verifies signatures

```typescript
const isValid = await verifyHederaSignatureWithAccountId(
    message,
    signature,
    accountId
)
if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' })
}
```

### 2. **Predictable Credentials** ❌ → ✅

**Before:** Credentials were 100% predictable and exposed to frontend

```typescript
const email = `wallet-${walletAddress.replace(/\./g, '-')}@hbank.app`
const password = `hbank_${walletAddress}_portal` // CRITICAL!
```

**After:** JWT-based authentication with HttpOnly cookies

-   No credentials exposed to frontend
-   Secure, signed tokens
-   7-day expiration

### 3. **No Session Validation** ❌ → ✅

**Before:** Anyone with wallet address could generate credentials and access data

**After:** All endpoints protected with JWT middleware

```typescript
export default withAuth(async (req, res) => {
    const accountId = req.user.accountId // Verified from JWT
    // ...
})
```

---

## 🔄 New Secure Authentication Flow

### **Step 1: Get Nonce**

```bash
GET /api/auth/nonce?accountId=0.0.12345
```

Response:

```json
{
    "nonce": "uuid-v4",
    "message": "Login to HBANK Protocol with Hedera Wallet: {nonce}"
}
```

### **Step 2: Sign Message**

User signs the message with their Hedera wallet:

```typescript
const { signature } = await signMessage(message)
```

### **Step 3: Verify Signature & Get JWT**

```bash
POST /api/auth/verify
Content-Type: application/json

{
    "accountId": "0.0.12345",
    "nonce": "uuid-from-step-1",
    "signature": "hex-signature"
}
```

Response:

```json
{
    "success": true,
    "accountId": "0.0.12345"
}
```

JWT stored in HttpOnly cookie:

```
Set-Cookie: hbank-auth-token=<jwt>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

### **Step 4: Access Protected Endpoints**

All subsequent requests include JWT automatically via cookie:

```bash
GET /api/portfolio/fetch-user?accountId=0.0.12345
# JWT sent automatically in cookie

POST /api/portfolio/wallets
# JWT verified by withAuth() middleware
```

---

## 🛡️ Security Features

### ✅ **JWT with HttpOnly Cookies**

-   Cannot be accessed by JavaScript
-   Prevents XSS attacks
-   Auto-sent with every request

### ✅ **Signature Verification**

-   Verifies ownership of Hedera account
-   Uses Mirror Node to get public key
-   Supports Hedera signature format with prefix

### ✅ **Nonce-based Authentication**

-   Each nonce is single-use
-   Expires in 5 minutes
-   Prevents replay attacks

### ✅ **Authorization Middleware**

```typescript
export const withAuth = (handler) => async (req, res) => {
    const token = req.cookies['hbank-auth-token']
    const payload = await verifyJWT(token)

    if (!payload) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    req.user = { accountId: payload.sub }
    return handler(req, res)
}
```

### ✅ **Row Level Security (RLS)**

Supabase policies ensure data isolation:

```sql
CREATE POLICY "Users can view their own wallets"
ON wallets FOR SELECT
TO authenticated
USING (user_id = auth.uid());
```

---

## 📝 Updated Files

### Backend

-   ✅ `src/lib/auth-middleware.ts` - JWT verification middleware
-   ✅ `src/services/portfolioUserService.ts` - User sync with Supabase
-   ✅ `pages/api/portfolio/auth.ts` - **DEPRECATED** (returns 410)
-   ✅ `pages/api/portfolio/fetch-user.ts` - Now uses JWT auth
-   ✅ `pages/api/portfolio/wallets.ts` - Now uses JWT auth
-   ✅ `pages/api/portfolio/sync-tokens.ts` - Now uses JWT auth

### Frontend

-   ✅ `src/hooks/usePortfolioAuth.ts` - Uses secure nonce flow
-   ✅ `src/app/(protocol)/portfolio/page.tsx` - Updated auth flow

### Existing (Already Secure)

-   ✅ `pages/api/auth/nonce.ts` - Generate nonces
-   ✅ `pages/api/auth/verify.ts` - Verify signatures
-   ✅ `pages/api/auth/me.ts` - Check session
-   ✅ `pages/api/auth/logout.ts` - Clear session
-   ✅ `src/lib/jwt.ts` - JWT utilities
-   ✅ `src/lib/hedera-auth.ts` - Signature verification
-   ✅ `src/services/nonceService.ts` - Nonce management

---

## 🧪 Testing the Secure Flow

### 1. **Connect Wallet**

```typescript
// User connects Hedera wallet
const { accountId } = useWallet()
```

### 2. **Authenticate**

```typescript
// Get nonce
const { nonce, message } = await fetch(`/api/auth/nonce?accountId=${accountId}`)

// Sign message
const { signature } = await signMessage(message)

// Verify and get JWT
await fetch('/api/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ accountId, nonce, signature }),
})
// JWT now in HttpOnly cookie
```

### 3. **Access Data**

```typescript
// All requests automatically include JWT cookie
const response = await fetch('/api/portfolio/fetch-user?accountId=0.0.12345')
// Backend verifies JWT → Returns user data
```

### 4. **Logout**

```typescript
await fetch('/api/auth/logout', { method: 'POST' })
// JWT cookie cleared
```

---

## ⚠️ Migration Notes

### Breaking Changes

-   ❌ `/api/portfolio/auth` is now **DEPRECATED** (returns 410)
-   ✅ Use `/api/auth/nonce` + `/api/auth/verify` instead

### Frontend Changes

-   `usePortfolioAuth.signIn()` signature changed:
    -   **Before:** `signIn(walletAddress, signature, message, timestamp)`
    -   **After:** `signIn(accountId, signature, nonce)`

### No Breaking Changes For

-   ✅ `usePortfolioWallets` hook (unchanged)
-   ✅ RLS policies (work better with new auth)
-   ✅ Supabase queries (transparent JWT → Supabase sync)

---

## 🔍 Security Checklist

-   [x] Signature verification implemented
-   [x] Nonces are single-use and expire
-   [x] JWT stored in HttpOnly cookies
-   [x] All portfolio endpoints use JWT middleware
-   [x] User ownership verified on every request
-   [x] RLS policies active in Supabase
-   [x] No credentials exposed to frontend
-   [x] Session expiration (7 days)
-   [x] Logout clears JWT cookie
-   [x] CSRF protection (SameSite=Strict)

---

## 📚 Additional Resources

-   [Hedera Wallet Auth Guide](./HEDERA_WALLET_AUTH_GUIDE.md)
-   [API Auth Endpoints](../pages/api/auth/README.md)
-   [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)

---

## 🎉 Summary

**Security Level:**

-   Before: 🔴 **CRITICAL VULNERABILITIES**
-   After: 🟢 **PRODUCTION READY**

**Key Improvements:**

1. ✅ Proper signature verification
2. ✅ JWT-based session management
3. ✅ HttpOnly cookies prevent XSS
4. ✅ Nonce prevents replay attacks
5. ✅ Middleware protects all endpoints
6. ✅ RLS policies enforce data isolation

The authentication flow is now **secure and production-ready**! 🚀
