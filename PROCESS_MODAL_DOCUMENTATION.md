# Componente ProcessModal - Sistema Unificado de Comunicación de Estado

## Descripción

He creado un componente modal general que unifica la comunicación de actualizaciones de estado para los procesos de **mint** y **redeem** (tanto instantáneo como estándar). Este componente reemplaza los procesos distintos que existían anteriormente, ofreciendo una experiencia consistente y en tiempo real para todos los tipos de transacciones.

## Archivos Creados

### 1. `src/components/process-modal.tsx`

Componente modal principal que muestra el progreso de cualquier proceso en tiempo real.

**Características:**

-   ✅ Interfaz unificada para mint, redeem instantáneo y redeem estándar
-   ✅ Indicadores visuales de progreso con iconos y colores
-   ✅ Actualización en tiempo real del estado de cada paso
-   ✅ Manejo automático de errores con mensajes descriptivos
-   ✅ Información contextual según el tipo de proceso
-   ✅ Diseño responsive y consistente con el estilo de la aplicación
-   ✅ Cierre automático al completar el proceso

### 2. `src/hooks/useProcessModal.ts`

Hook personalizado para manejar el estado del modal de proceso.

**Funcionalidades:**

-   ✅ Gestión completa del estado del modal
-   ✅ Control de pasos y transiciones
-   ✅ Manejo de errores y completación
-   ✅ Configuraciones predefinidas para cada tipo de proceso
-   ✅ Callbacks para eventos de completación y error

### 3. `src/components/process-modal-demo.tsx`

Componente de demostración que muestra cómo integrar el ProcessModal.

## Tipos de Proceso Soportados

### 1. **Mint (USDC → hUSD)**

Pasos del proceso atómico:

1. **Inicialización** - Creando transacción atómica
2. **Firma del Usuario** - Esperando aprobación en wallet
3. **Completación** - Ejecutando transacción del treasury
4. **Finalización** - Actualizando balances

### 2. **Retiro Instantáneo (hUSD → USDC)**

Pasos del proceso instantáneo:

1. **Validación** - Verificando límites y balances
2. **Procesamiento** - Convirtiendo hUSD a USDC con cálculo de fee
3. **Transferencia** - Enviando USDC a la wallet
4. **Finalización** - Actualizando balances

### 3. **Retiro Estándar (hUSD → USDC)**

Pasos del proceso con bloqueo de 48h:

1. **Crear Solicitud** - Configurando transferencia programada de hUSD
2. **Firma del Usuario** - Esperando aprobación de la solicitud
3. **Envío** - Registrando solicitud en la red Hedera
4. **Bloqueo** - hUSD bloqueado por 48 horas

## Cómo Usar

### Integración Básica

```tsx
import { ProcessModal } from '@/components/process-modal'
import { useProcessModal, MINT_STEPS } from '@/hooks/useProcessModal'

export function MyComponent() {
    const processModal = useProcessModal({
        onComplete: async () => {
            // Lógica después de completar el proceso
            await refreshBalances()
            clearInputs()
        },
        onError: (error) => {
            // Manejo de errores
            showErrorToast(error)
        },
    })

    const handleMint = async () => {
        // Iniciar el proceso
        processModal.startProcess('mint', MINT_STEPS, {
            amount: '100',
            fromToken: 'USDC',
            toToken: 'hUSD',
        })

        try {
            // Paso 1: Inicializar
            processModal.updateStep('initialize', 'active')
            await initializeTransaction()

            // Paso 2: Siguiente paso
            processModal.nextStep()
            processModal.updateStep('user-sign', 'active')
            await waitForUserSignature()

            // ... más pasos

            // Completar
            processModal.completeProcess()
        } catch (error) {
            processModal.setStepError(processModal.currentStep, error.message)
        }
    }

    return (
        <>
            <Button onClick={handleMint}>Iniciar Mint</Button>

            <ProcessModal
                isOpen={processModal.isOpen}
                processType={processModal.processType}
                currentStep={processModal.currentStep}
                steps={processModal.steps}
                onClose={processModal.closeModal}
                amount={processModal.amount}
                fromToken={processModal.fromToken}
                toToken={processModal.toToken}
                error={processModal.error}
            />
        </>
    )
}
```

### Configuraciones Predefinidas

```tsx
// Para mint
import { MINT_STEPS } from '@/hooks/useProcessModal'

// Para retiro instantáneo
import { REDEEM_INSTANT_STEPS } from '@/hooks/useProcessModal'

// Para retiro estándar
import { REDEEM_STANDARD_STEPS } from '@/hooks/useProcessModal'
```

## Beneficios

### 1. **Experiencia de Usuario Mejorada**

-   ✅ Comunicación clara del progreso en tiempo real
-   ✅ Indicadores visuales intuitivos
-   ✅ Información contextual sobre cada proceso
-   ✅ Manejo graceful de errores

### 2. **Consistencia en la Aplicación**

-   ✅ Un solo componente para todos los procesos
-   ✅ Diseño unificado y coherente
-   ✅ Comportamiento predecible

### 3. **Facilidad de Mantenimiento**

-   ✅ Código reutilizable y modular
-   ✅ Fácil de extender para nuevos tipos de proceso
-   ✅ Lógica centralizada de estado

### 4. **Automatización**

-   ✅ Actualización automática de balances al completar
-   ✅ Cierre automático del modal
-   ✅ Manejo automático de transiciones de estado

## Demostración

Para ver el componente en acción, puedes usar el componente de demostración:

```tsx
import { ProcessModalDemo } from '@/components/process-modal-demo'

// En tu página o componente
;<ProcessModalDemo />
```

## Migración de Componentes Existentes

Los componentes actuales como `MintActionButton` y `RedeemActionButton` pueden ser migrados gradualmente para usar este nuevo sistema:

1. Importar el hook `useProcessModal`
2. Reemplazar los toasts individuales con el modal de proceso
3. Usar los pasos predefinidos correspondientes
4. Migrar la lógica de actualización de balances al callback `onComplete`

## Extensibilidad

El sistema está diseñado para ser fácilmente extensible:

-   **Nuevos tipos de proceso**: Añadir nuevas configuraciones de pasos
-   **Pasos personalizados**: Crear configuraciones específicas para casos especiales
-   **Estilos personalizados**: Modificar la apariencia según necesidades específicas

## Conclusión

Este componente ProcessModal proporciona una solución completa y unificada para comunicar el estado de todos los procesos de la aplicación, mejorando significativamente la experiencia del usuario y simplificando el mantenimiento del código.
