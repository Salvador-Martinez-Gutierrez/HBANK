# Message Signing Prefix Issue - Hedera Wallet Authentication

## Problem Summary

When implementing off-chain authentication with Hedera wallets using `@buidlerlabs/hashgraph-react-wallets` and `@hashgraph/sdk`, **signature verification was consistently failing** despite correct implementation of the signing flow.

## Root Cause

Hedera wallets (like HashPack) add a **message prefix** before signing, similar to Ethereum's EIP-191 standard:

```
"\x19Hedera Signed Message:\n" + message_length_in_bytes + original_message
```

**This behavior is not documented** in the library or Hedera SDK documentation, causing verification to fail when developers verify against the raw message.

## Solution

When verifying signatures on the backend, the **same prefix must be added** to the message:

```typescript
// Frontend (automatic by wallet)
const messageBytes = new TextEncoder().encode(message)
const signResult = await signer.sign([messageBytes])

// Backend (must add prefix manually)
const messageBuffer = Buffer.from(message, 'utf-8')
const prefix = `\x19Hedera Signed Message:\n${messageBuffer.length}`
const prefixedMessage = Buffer.concat([
    Buffer.from(prefix, 'utf-8'),
    messageBuffer,
])

const isValid = publicKey.verify(prefixedMessage, signatureBytes) // ✅ Now works
```

## Impact

Without knowing about this prefix:

-   ❌ All signature verifications fail
-   ❌ Developers waste hours debugging
-   ❌ Off-chain authentication appears broken
-   ❌ No error messages hint at the real issue

## Request

Please add this critical information to the documentation:

1. **In signing documentation**: Mention that wallets add `"\x19Hedera Signed Message:\n" + length` prefix
2. **In verification examples**: Show how to add the prefix on the backend
3. **In troubleshooting**: List this as a common issue

## Example Implementation

### Complete Verification Function

```typescript
import { PublicKey } from '@hashgraph/sdk'

export function verifyHederaSignature(
    message: string,
    signatureHex: string,
    publicKeyString: string
): boolean {
    // 1. Prepare message with Hedera standard prefix
    const messageBuffer = Buffer.from(message, 'utf-8')
    const hederaPrefix = `\x19Hedera Signed Message:\n${messageBuffer.length}`
    const prefixedMessage = Buffer.concat([
        Buffer.from(hederaPrefix, 'utf-8'),
        messageBuffer,
    ])

    // 2. Convert hex signature to bytes
    const signatureBytes = Uint8Array.from(Buffer.from(signatureHex, 'hex'))

    // 3. Parse public key
    const publicKey = PublicKey.fromString(publicKeyString)

    // 4. Verify with prefixed message
    return publicKey.verify(prefixedMessage, signatureBytes)
}
```

### Fallback Strategy

For maximum compatibility with different wallets:

```typescript
export function verifyWithFallback(message, signature, publicKey) {
    const buffer = Buffer.from(message, 'utf-8')
    const pk = PublicKey.fromString(publicKey)
    const sig = Uint8Array.from(Buffer.from(signature, 'hex'))

    // 1. Try Hedera standard
    const hederaPrefix = `\x19Hedera Signed Message:\n${buffer.length}`
    if (pk.verify(Buffer.concat([Buffer.from(hederaPrefix), buffer]), sig)) {
        return true
    }

    // 2. Try Ethereum standard (some wallets)
    const ethPrefix = `\x19Ethereum Signed Message:\n${buffer.length}`
    if (pk.verify(Buffer.concat([Buffer.from(ethPrefix), buffer]), sig)) {
        return true
    }

    // 3. Try raw message (legacy)
    return pk.verify(buffer, sig)
}
```

## Technical Details

-   **Prefix Format**: `"\x19Hedera Signed Message:\n" + decimal_length + message`
-   **Example**: For message "Hello World" (11 bytes) → `"\x19Hedera Signed Message:\n11Hello World"`
-   **Byte 0x19**: Standard prefix to prevent signature reuse as transaction
-   **Length**: Decimal string representation of byte length
-   **Newline**: Literal `\n` character after length

## Context

This implementation was discovered through extensive debugging while building authentication for HBANK Protocol on Hedera Testnet.

**Environment**:

-   `@buidlerlabs/hashgraph-react-wallets`: v7.1.3
-   `@hashgraph/sdk`: v2.71.1
-   Wallet: HashPack
-   Network: Hedera Testnet

## References

-   Similar pattern in Ethereum: [EIP-191](https://eips.ethereum.org/EIPS/eip-191)
-   Complete implementation: See attached `HEDERA_WALLET_AUTH_GUIDE.md`

---

**Thank you for maintaining this excellent library!** Adding this to the docs will save countless hours for developers implementing message signing authentication.
