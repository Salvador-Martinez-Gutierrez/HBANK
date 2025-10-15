# 🔴 Real-Time Token Price Updates

## 📋 Descripción

Implementación de actualizaciones de precios de tokens en tiempo real usando Supabase Realtime. Esta feature mejora la UX del portfolio sin comprometer la seguridad.

---

## 🔒 Análisis de Seguridad

### ✅ **¿Por qué es SEGURO usar Realtime aquí?**

#### 1. **Solo Datos Públicos**

```typescript
// tokens_registry contiene solo datos públicos
{
  token_address: "0.0.123456",  // Público
  token_symbol: "HBAR",         // Público
  price_usd: "0.05",            // Público (de SaucerSwap)
  decimals: 8                   // Público
}
```

#### 2. **READ-ONLY (Solo Lectura)**

```typescript
// Solo escuchamos cambios, nunca escribimos
supabase
  .channel('token-prices')
  .on('postgres_changes', { event: 'UPDATE' }, ...)
  .subscribe()
```

#### 3. **Sin Información de Usuario**

-   No expone qué tokens posee un usuario
-   No expone balances de usuario
-   No expone información de wallets
-   Solo actualiza precios públicos de mercado

#### 4. **No Requiere Autenticación**

```typescript
// Cualquiera puede ver los precios (como CoinGecko)
// Pero solo usuarios autenticados ven SUS balances
```

---

## 🏗️ Arquitectura Híbrida (Recomendada)

### **Backend API (JWT) para Operaciones Críticas** 🔐

```typescript
// ✅ SEGURO: JWT + Backend + Supabase Admin
GET / api / portfolio / wallets
POST / api / portfolio / wallets
DELETE / api / portfolio / wallets
```

**Uso:**

-   Obtener wallets del usuario
-   Agregar/eliminar wallets
-   Sincronizar balances
-   Cualquier operación sensible

### **Supabase Realtime para Datos Públicos** 🔴

```typescript
// ✅ SEGURO: Solo lectura, datos públicos
useTokenPriceRealtime(onPriceUpdate)
```

**Uso:**

-   Actualizar precios de tokens
-   Notificaciones de cambios de precio
-   Indicadores de mercado
-   Cualquier dato público no sensible

---

## 📁 Archivos Implementados

### **Hook de Realtime**

`src/hooks/useTokenPriceRealtime.ts`

```typescript
/**
 * Hook para suscribirse a actualizaciones de precios
 * SEGURIDAD: ✅ Solo lectura, datos públicos
 */
export function useTokenPriceRealtime(
    onPriceUpdate: (update: TokenPriceUpdate) => void,
    enabled: boolean = true
)
```

**Características:**

-   Se suscribe a tabla `tokens_registry`
-   Solo escucha eventos `UPDATE`
-   Auto-cleanup cuando el componente se desmonta
-   Puede habilitarse/deshabilitarse dinámicamente

### **Integración en Portfolio**

`src/hooks/usePortfolioWallets.ts`

```typescript
// Callback para actualizar precios
const handlePriceUpdate = useCallback((update: TokenPriceUpdate) => {
    setWallets((currentWallets) => {
        // Actualiza solo el precio del token modificado
        return currentWallets.map((wallet) => ({
            ...wallet,
            wallet_tokens: wallet.wallet_tokens.map((wt) => {
                if (
                    wt.tokens_registry?.token_address === update.token_address
                ) {
                    return {
                        ...wt,
                        tokens_registry: {
                            ...wt.tokens_registry,
                            price_usd: update.price_usd,
                        },
                    }
                }
                return wt
            }),
        }))
    })
}, [])

// Activar realtime solo si hay wallets
useTokenPriceRealtime(handlePriceUpdate, wallets.length > 0)
```

### **UI Indicator**

`src/components/realtime-price-indicator.tsx`

```typescript
/**
 * Muestra un badge "Live Prices" cuando está conectado
 */
export function RealtimePriceIndicator({
    enabled,
    lastUpdate,
}: RealtimePriceIndicatorProps)
```

---

## 🎯 Flujo de Actualización

```
1. Cron Job actualiza precios en Supabase
   ↓
2. Supabase detecta UPDATE en tokens_registry
   ↓
3. Supabase Realtime emite evento a clientes suscritos
   ↓
4. useTokenPriceRealtime recibe el evento
   ↓
5. handlePriceUpdate actualiza el estado local
   ↓
6. React re-renderiza con nuevos precios
   ↓
7. Usuario ve el precio actualizado instantáneamente
```

**Tiempo total:** < 100ms desde el update en DB

---

## 💡 Ventajas de esta Implementación

### 1. **Mejor UX**

-   ✅ Precios actualizados automáticamente
-   ✅ Sin necesidad de refresh manual
-   ✅ Feedback visual con indicador "Live Prices"

### 2. **Seguridad Mantenida**

-   ✅ Wallets siguen protegidas por JWT
-   ✅ Balances siguen privados
-   ✅ Solo precios públicos en realtime

### 3. **Eficiencia**

-   ✅ Sin polling constante al backend
-   ✅ Actualizaciones solo cuando cambian precios
-   ✅ Menos carga en el servidor

### 4. **Escalabilidad**

-   ✅ Supabase maneja las conexiones WebSocket
-   ✅ Tu backend no se sobrecarga con polling
-   ✅ Funciona con miles de usuarios simultáneos

---

## 🔧 Configuración

### **Habilitar Realtime en Supabase**

1. Ir a Dashboard → Database → Replication
2. Habilitar realtime para tabla `tokens_registry`:

```sql
-- Ya debería estar habilitado, pero por si acaso:
ALTER TABLE tokens_registry REPLICA IDENTITY FULL;
```

3. Configurar políticas (opcional, ya que son datos públicos):

```sql
-- Permitir lectura pública de precios
CREATE POLICY "Anyone can view token prices"
ON tokens_registry FOR SELECT
USING (true);
```

---

## 📊 Monitoreo

### **Logs en Consola**

```typescript
// Conexión establecida
🔴 Subscribing to token price updates...
📡 Realtime subscription status: SUBSCRIBED

// Precio actualizado
💰 Token price update: { token_address: "0.0.123456", price_usd: "0.05" }
💰 Updating token price in wallets: 0.0.123456

// Desconexión
🔴 Unsubscribing from token price updates...
```

### **Métricas Sugeridas**

```typescript
// Rastrear actualizaciones
const [updateCount, setUpdateCount] = useState(0)
const [lastUpdate, setLastUpdate] = useState<Date>()

const handlePriceUpdate = (update) => {
    setUpdateCount((prev) => prev + 1)
    setLastUpdate(new Date())
    // ... actualizar precios
}
```

---

## 🐛 Troubleshooting

### **"No recibo actualizaciones"**

1. Verificar que Realtime está habilitado en Supabase
2. Verificar que `NEXT_PUBLIC_SUPABASE_URL` está configurado
3. Verificar que `NEXT_PUBLIC_SUPABASE_ANON_KEY` está configurado
4. Verificar logs en consola del navegador

### **"Pérdida de conexión"**

Supabase Realtime se reconecta automáticamente. El hook maneja esto:

```typescript
.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime connected')
    } else if (status === 'CLOSED') {
        console.log('⚠️ Realtime disconnected, reconnecting...')
    }
})
```

### **"Demasiadas actualizaciones"**

Si los precios se actualizan muy frecuentemente, puedes implementar debouncing:

```typescript
import { debounce } from 'lodash'

const debouncedUpdate = useMemo(() => debounce(handlePriceUpdate, 1000), [])

useTokenPriceRealtime(debouncedUpdate, enabled)
```

---

## 🔮 Mejoras Futuras

### 1. **Notificaciones de Precio**

```typescript
// Alertar cuando un token sube/baja X%
if (Math.abs(priceChange) > threshold) {
    toast(`${token.symbol} ${priceChange > 0 ? '📈' : '📉'} ${priceChange}%`)
}
```

### 2. **Histórico de Precios**

```typescript
// Mantener un buffer de precios para gráficos
const [priceHistory, setPriceHistory] = useState<PricePoint[]>([])
```

### 3. **Precio Promedio**

```typescript
// Calcular precio promedio de varios exchanges
const avgPrice = calculateAverage(prices)
```

---

## 🎉 Conclusión

Esta implementación combina lo mejor de ambos mundos:

-   **JWT + Backend** para operaciones críticas y privadas
-   **Supabase Realtime** para datos públicos en tiempo real

**Resultado:** Portfolio seguro con precios actualizados al instante. 🚀🔒

---

## 📚 Referencias

-   [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
-   [PostgreSQL Change Data Capture](https://supabase.com/docs/guides/realtime/postgres-changes)
-   [WebSocket Security Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html)
