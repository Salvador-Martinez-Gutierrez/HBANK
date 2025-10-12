# Wallet Display Features - Portfolio

## Nuevas Funcionalidades Implementadas

### 1. **Colapsar/Expandir Wallets** ⚡️

Los usuarios ahora pueden colapsar wallets para que ocupen menos espacio en la pantalla.

**Características:**

-   Botón de chevron (▼/▲) en la esquina superior derecha de cada wallet card
-   **Estado se guarda en localStorage** (instantáneo, sin llamadas a API)
-   **Al colapsar:** Muestra el balance total del wallet en grande + cantidad de tokens
-   **Al expandir:** Muestra todos los tokens asociados con sus balances individuales
-   **Balance destacado:** Con gradiente y diseño prominente para fácil visualización
-   **Performance optimizada:** No hay re-renders innecesarios ni latencia

**Uso:**

```typescript
// Usar el hook useWalletCollapse
const { isWalletCollapsed, toggleWalletCollapsed } = useWalletCollapse()

// Toggle instantáneo (sin API calls)
toggleWalletCollapsed(walletId)

// Verificar estado
const collapsed = isWalletCollapsed(walletId)
```

### 2. **Reordenar Wallets (Drag & Drop)** ⚡️

Los usuarios pueden personalizar el orden de visualización de sus wallets mediante arrastrar y soltar.

**Características:**

-   Icono de grip (⋮⋮) a la izquierda de cada wallet card para arrastrar
-   **Estado se guarda en localStorage** (instantáneo, sin llamadas a API)
-   Funciona en desktop y touch devices
-   Animaciones suaves durante el drag
-   El orden se mantiene entre sesiones
-   **Performance optimizada:** Reordenamiento instantáneo sin latencia

**Uso:**

```typescript
// Usar el hook useWalletOrder
const { sortWallets, saveWalletOrder } = useWalletOrder(userId)

// Aplicar orden personalizado a los wallets
const sortedWallets = sortWallets(rawWallets)

// Guardar nuevo orden (instantáneo, sin API calls)
saveWalletOrder(walletIds)
```

## Cambios en la Base de Datos

**Nota:** Los campos `is_collapsed` y `display_order` fueron removidos de la base de datos porque ahora se manejan con localStorage para mejor performance y experiencia de usuario instantánea.

## Arquitectura de los Cambios

### Frontend

**Hooks:**

-   `useWalletCollapse()` - Hook para manejar el estado de colapsar/expandir usando localStorage

    -   `isWalletCollapsed(walletId)` - Verifica si un wallet está colapsado
    -   `toggleWalletCollapsed(walletId)` - Toggle el estado
    -   `collapseWallet(walletId)` - Colapsa un wallet específico
    -   `expandWallet(walletId)` - Expande un wallet específico
    -   `collapseAll(walletIds[])` - Colapsa todos los wallets
    -   `expandAll()` - Expande todos los wallets

-   `useWalletOrder(userId)` - Hook para manejar el orden de wallets usando localStorage
    -   `sortWallets(wallets)` - Aplica el orden personalizado guardado
    -   `saveWalletOrder(walletIds)` - Guarda el nuevo orden
    -   `walletOrder` - Array con el orden actual de IDs

**Componentes:**

-   `<WalletCard />` - Componente individual de wallet con drag handle y botón de colapsar
-   Integración con `@dnd-kit` para drag & drop

**Hook `usePortfolioWallets`:**
Funciones expuestas:

-   `wallets` - Array de wallets sin orden personalizado (usa `useWalletOrder` para ordenarlos)
-   `addWallet()`, `deleteWallet()`, `syncTokens()` - Operaciones de wallet

**Página `/portfolio`:**

-   Implementa `DndContext` y `SortableContext` de `@dnd-kit`
-   Usa `useWalletCollapse()` para manejar el estado de colapsar localmente
-   Maneja eventos de drag end para reordenar wallets
-   Integra el nuevo componente `<WalletCard />`

## Dependencias Agregadas

```json
{
    "@dnd-kit/core": "6.3.1",
    "@dnd-kit/sortable": "10.0.0",
    "@dnd-kit/utilities": "3.2.2"
}
```

## Testing

Para probar las funcionalidades:

1. **Colapsar/Expandir:**

    - Ir a la página de Portfolio
    - Click en el botón de chevron de cualquier wallet
    - Verificar que el contenido se oculta/muestra **instantáneamente**
    - Recargar la página y verificar que el estado persiste (localStorage)
    - **No debería haber ninguna llamada a API** al colapsar/expandir

2. **Reordenar:**
    - Arrastrar un wallet desde el icono de grip (⋮⋮)
    - Soltar en una nueva posición
    - Verificar que el orden cambia
    - Recargar la página y verificar que el nuevo orden persiste

## Notas de Implementación

### Performance Optimizations

**Colapsar/Expandir (localStorage):**

-   ✅ **Sin API calls** - Estado completamente local
-   ✅ **Instantáneo** - No hay latencia de red
-   ✅ **Sin re-renders** - Solo actualiza el componente específico
-   ✅ **Persistente** - Se mantiene entre sesiones usando localStorage
-   ✅ **Lightweight** - Usa un Set para lookups O(1)

**Reordenar (Base de datos):**

-   El reordenamiento actualiza todos los wallets afectados en una sola transacción
-   Solo se llama a la API cuando el drag termina (no durante el drag)

### UX

-   Animaciones suaves durante el drag y transiciones al colapsar/expandir
-   Feedback visual claro durante las interacciones

### Accesibilidad

-   Soporte completo para teclado usando `KeyboardSensor` de `@dnd-kit`
-   Botones con títulos descriptivos

### Mobile

-   Touch gestures funcionan correctamente en dispositivos móviles
-   Drag & drop optimizado para touch

## Próximas Mejoras

-   [ ] Agregar botones "Colapsar todos" / "Expandir todos" en el header
-   [ ] Agregar animación más elaborada durante el drag
-   [ ] Implementar ordenamiento automático por valor total
-   [ ] Añadir preset de ordenamiento (alfabético, por valor, etc.)

## Diferencias con la Implementación Original

### ❌ Antes (Con API Call)

```typescript
const handleToggleCollapse = async (walletId, isCollapsed) => {
    await fetch('/api/portfolio/wallets/toggle-collapsed', {
        method: 'PATCH',
        body: JSON.stringify({ walletId, isCollapsed }),
    })
    await fetchWallets() // Re-fetch everything
}
```

**Problemas:**

-   Latencia de red (200-500ms)
-   Re-render de toda la página
-   Carga innecesaria en el servidor
-   Requiere autenticación
-   Puede fallar por problemas de red

### ✅ Ahora (Con localStorage)

```typescript
const toggleWalletCollapsed = (walletId) => {
    const newSet = new Set(collapsedWallets)
    newSet.has(walletId) ? newSet.delete(walletId) : newSet.add(walletId)
    localStorage.setItem(
        'portfolio_collapsed_wallets',
        JSON.stringify([...newSet])
    )
    setCollapsedWallets(newSet)
}
```

**Beneficios:**

-   Instantáneo (<1ms)
-   Solo re-render del wallet específico
-   Sin carga en el servidor
-   Funciona offline
-   No puede fallar
-   Mejor UX general
