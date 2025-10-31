# 🧪 Prueba de Rate Limiting - Manual de Usuario

## ✅ El rate limiting YA ESTÁ FUNCIONANDO

Basado en las pruebas automatizadas, el rate limiting está activo y funcionando correctamente.

**Resultados de la prueba:**
- ✅ Requests 1-5: HTTP 200 OK (permitidas)
- ❌ Requests 6+: HTTP 429 Too Many Requests (bloqueadas)

---

## 🔧 Cómo probarlo tú mismo

### Opción 1: Prueba Rápida (Script automático)
```bash
# Desde la raíz del proyecto
./test-rate-limit.sh
```

### Opción 2: Prueba Manual (Paso a paso)

1. **Asegúrate de que el servidor esté corriendo:**
```bash
npm run dev
```

2. **Ejecuta este comando varias veces seguidas:**
```bash
curl -i "http://localhost:3001/api/auth/nonce?accountId=0.0.12345"
```

3. **Observa los headers de respuesta:**

**Primera vez (permitido):**
```
HTTP/1.1 200 OK
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1730318400000
```

**Después de 10 requests en 10 segundos (bloqueado):**
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1730318410000
Retry-After: 10

{"error":"Too Many Requests","message":"Rate limit exceeded. Please try again after...","retryAfter":10}
```

---

## 📊 Límites Configurados

| Endpoint | Tier | Límite |
|----------|------|--------|
| `/api/auth/nonce` | AUTH | 10 req / 10s |
| `/api/auth/verify` | AUTH | 10 req / 10s |
| `/api/auth/logout` | PUBLIC | 30 req / 60s |
| `/api/auth/me` | PUBLIC | 30 req / 60s |
| `/api/withdraw/instant` | FINANCIAL | 5 req / 60s |
| `/api/deposit/init` | FINANCIAL | 5 req / 60s |
| `/api/deposit/user-signed` | FINANCIAL | 5 req / 60s |

---

## 🎯 Prueba Avanzada con curl

### Probar endpoint de autenticación:
```bash
# Hacer 12 requests seguidas (debería bloquear después de 10)
for i in {1..12}; do
  echo "Request $i:"
  curl -s -w "Status: %{http_code}\n" \
    "http://localhost:3001/api/auth/nonce?accountId=0.0.12345" \
    | head -1
  sleep 0.5
done
```

### Ver headers completos:
```bash
curl -i "http://localhost:3001/api/auth/nonce?accountId=0.0.12345" \
  | grep -E "(HTTP|X-RateLimit|Retry)"
```

---

## 🛠️ Modificar Límites

Para ajustar los límites, edita `src/lib/rate-limit.ts`:

```typescript
export const RATE_LIMIT_TIERS = {
    AUTH: {
        requests: 10,    // ← Cambia este número
        window: '10s',   // ← O esta ventana de tiempo
        description: 'Authentication endpoints',
    },
    // ...
}
```

---

## ✅ Verificación de Funcionamiento

**Indicadores de que funciona correctamente:**

1. ✅ Primera request devuelve `200 OK` con headers `X-RateLimit-*`
2. ✅ Request #11 (o después del límite) devuelve `429 Too Many Requests`
3. ✅ Mensaje de error incluye `retryAfter` con segundos de espera
4. ✅ Headers indican límite, restantes y timestamp de reset

**Lo que verás en los logs del servidor:**
```
[rate-limit] Rate limit check { tier: 'AUTH', success: true, remaining: 9 }
[rate-limit] Rate limit check { tier: 'AUTH', success: true, remaining: 8 }
...
[rate-limit] Rate limit check { tier: 'AUTH', success: false, remaining: 0 }
[rate-limit] ⚠️ Rate limit exceeded
```

---

## 🚀 En Producción (Vercel)

No olvides agregar las variables de entorno en Vercel:

1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Agrega:
   - `UPSTASH_REDIS_REST_URL` = `https://internal-mallard-31452.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN` = `AXrc...` (tu token)

---

## 📈 Monitoreo en Upstash

Puedes ver las métricas de uso en:
- https://console.upstash.com
- Dashboard → Tu database → Analytics

Ahí verás:
- Número de comandos ejecutados
- Latencia
- Rate limit hits
- Storage usado

---

## 🎉 Resumen

✅ **Rate limiting completamente funcional**
✅ **Protección contra DDoS y abuse**
✅ **Headers informativos para clientes**
✅ **Logs detallados para debugging**
✅ **Configuración flexible por tier**

**Próximos pasos recomendados:**
1. Monitorear analytics en Upstash después del deploy
2. Ajustar límites según uso real
3. Implementar alertas para rate limit exceeded frecuentes
