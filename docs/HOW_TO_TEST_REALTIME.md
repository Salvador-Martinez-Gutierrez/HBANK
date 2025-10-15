# 🧪 Cómo Probar Real-Time Token Prices

## ✅ Estado: REALTIME HABILITADO

Realtime ya está **completamente configurado** en Supabase:

-   ✅ Tabla `tokens_registry` agregada a publicación `supabase_realtime`
-   ✅ Replica identity configurada a `FULL`
-   ✅ Políticas RLS configuradas (lectura pública, escritura solo backend)

---

## 🎯 Método 1: Probar en la UI del Portfolio

### Paso 1: Iniciar el servidor

```powershell
pnpm dev
```

### Paso 2: Ir a Portfolio

1. Navega a http://localhost:3000/portfolio
2. Conecta tu wallet
3. Autentica tu portfolio (firma el mensaje)
4. Asegúrate de tener wallets con tokens

### Paso 3: Observar el Indicador

-   Deberías ver un badge **"Live Prices"** con icono Wifi verde
-   Esto indica que está conectado a Realtime

### Paso 4: Actualizar un Precio

Ve a **Supabase Dashboard** → **SQL Editor** y ejecuta:

```sql
-- Actualizar precio de HBAR (o cualquier token que tengas)
UPDATE tokens_registry
SET
    price_usd = '0.123456',
    last_price_update = NOW()
WHERE token_address = '0.0.456858';  -- HBAR
```

### Paso 5: Observar la Actualización

**Sin hacer refresh**, deberías ver:

-   ✨ El badge "Live Prices" hace una animación de pulso
-   💰 El precio del token se actualiza instantáneamente
-   📊 El valor total del portfolio se recalcula automáticamente

---

## 🧪 Método 2: Script de Prueba en Terminal

### Paso 1: Ejecutar el Script de Prueba

```powershell
# Instalar tsx si no lo tienes
pnpm add -D tsx

# Ejecutar el script
npx tsx scripts/test-realtime.ts
```

Verás:

```
🔴 Connecting to Supabase Realtime...
📡 URL: https://vmylyihnbvhxaousrzbs.supabase.co
---
Waiting for token price updates...
To test, run this SQL in Supabase:
  UPDATE tokens_registry SET price_usd = '0.999', last_price_update = NOW() WHERE token_address = '0.0.731861';
---
📡 Subscription status: SUBSCRIBED
✅ Successfully subscribed to token price updates!
```

### Paso 2: Actualizar un Token

En **Supabase SQL Editor**:

```sql
UPDATE tokens_registry
SET price_usd = '0.999', last_price_update = NOW()
WHERE token_address = '0.0.731861';
```

### Paso 3: Ver el Resultado

En la terminal del script verás:

```
✅ RECEIVED UPDATE!
📦 Payload: {
  "schema": "public",
  "table": "tokens_registry",
  "commit_timestamp": "2025-10-15T...",
  "eventType": "UPDATE",
  "new": {
    "token_address": "0.0.731861",
    "price_usd": "0.999",
    "last_price_update": "2025-10-15T...",
    ...
  },
  "old": {
    "token_address": "0.0.731861",
    "price_usd": "0.05",
    ...
  }
}
```

---

## 🔍 Método 3: Verificar en DevTools del Navegador

### Paso 1: Abrir DevTools

`F12` o `Ctrl + Shift + I`

### Paso 2: Ir a Console

Deberías ver logs como:

```
🔴 Subscribing to token price updates...
📡 Realtime subscription status: SUBSCRIBED
```

### Paso 3: Actualizar un Token

Ejecuta el SQL en Supabase

### Paso 4: Ver los Logs

```
💰 Token price update: {
  schema: "public",
  table: "tokens_registry",
  commit_timestamp: "...",
  eventType: "UPDATE",
  new: { token_address: "0.0.456858", price_usd: "0.123456", ... }
}
💰 Updating token price in wallets: 0.0.456858
```

---

## 📊 Qué Tokens Probar

Usa cualquiera de los tokens que tengas en tus wallets. Aquí hay algunos comunes:

```sql
-- HBAR
UPDATE tokens_registry SET price_usd = '0.12345', last_price_update = NOW() WHERE token_address = '0.0.456858';

-- SAUCE
UPDATE tokens_registry SET price_usd = '0.03456', last_price_update = NOW() WHERE token_address = '0.0.731861';

-- USDC
UPDATE tokens_registry SET price_usd = '1.0001', last_price_update = NOW() WHERE token_address = '0.0.456858';

-- HSUITE
UPDATE tokens_registry SET price_usd = '0.00123', last_price_update = NOW() WHERE token_address = '0.0.540049';
```

Para ver todos tus tokens:

```sql
SELECT token_address, token_symbol, price_usd
FROM tokens_registry
ORDER BY token_symbol;
```

---

## 🐛 Troubleshooting

### "No veo el badge Live Prices"

-   ✅ Verifica que tienes wallets agregados y con tokens
-   ✅ El badge solo aparece si `wallets.length > 0`

### "No recibo actualizaciones"

1. **Verifica la conexión:**

    ```sql
    SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tokens_registry';
    ```

    Debería devolver una fila.

2. **Verifica replica identity:**

    ```sql
    SELECT relname, relreplident FROM pg_class WHERE relname = 'tokens_registry';
    ```

    `relreplident` debe ser `'f'` (FULL)

3. **Revisa DevTools Console**
    - Busca errores en rojo
    - Verifica que dice `SUBSCRIBED` y no `CHANNEL_ERROR`

### "Dice CHANNEL_ERROR"

-   Verifica que las variables de entorno están configuradas:
    -   `NEXT_PUBLIC_SUPABASE_URL`
    -   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
-   Reinicia el servidor de desarrollo

---

## ✨ Comportamiento Esperado

### ✅ CORRECTO

1. Actualizas precio en Supabase
2. **< 100ms** después aparece en UI
3. Badge hace animación de pulso
4. No hay refresh de página
5. Valor total se recalcula automáticamente

### ❌ INCORRECTO

-   Tienes que hacer refresh para ver el precio
-   El badge no aparece
-   No ves logs en console
-   Da error CHANNEL_ERROR

---

## 📈 Próximos Pasos

Una vez que confirmes que funciona:

### 1. Actualizar Precios desde Cron Job

Tu cron job que actualiza precios desde SaucerSwap funcionará automáticamente:

```typescript
// En tu cron job
await supabaseAdmin
    .from('tokens_registry')
    .update({
        price_usd: newPrice,
        last_price_update: new Date().toISOString(),
    })
    .eq('token_address', tokenAddress)

// ✅ Todos los usuarios conectados verán el precio actualizado instantáneamente
```

### 2. Agregar Notificaciones (Opcional)

```typescript
const handlePriceUpdate = (update) => {
    const oldPrice = findOldPrice(update.token_address)
    const change = ((parseFloat(update.price_usd) - oldPrice) / oldPrice) * 100

    if (Math.abs(change) > 5) {
        toast(
            `${token.symbol} ${change > 0 ? '📈' : '📉'} ${change.toFixed(2)}%`
        )
    }
}
```

### 3. Agregar Gráfico de Precio (Opcional)

```typescript
const [priceHistory, setPriceHistory] = useState<PricePoint[]>([])

const handlePriceUpdate = (update) => {
    setPriceHistory((prev) => [
        ...prev,
        {
            timestamp: Date.now(),
            price: parseFloat(update.price_usd),
        },
    ])
}
```

---

## 🎉 ¡Listo para Probar!

Ejecuta cualquiera de los 3 métodos y deberías ver las actualizaciones en tiempo real funcionando perfectamente.
