# Guía de Integración del ProcessModal

## Cambios necesarios en mint-action-button.tsx

### 1. Añadir imports (línea 17, después de los otros imports):

```tsx
import { ProcessModal } from '@/components/process-modal'
import { useProcessModal, MINT_STEPS } from '@/hooks/useProcessModal'
```

### 2. Añadir el hook dentro del componente (línea 32, después de const toast = useToast()):

```tsx
// Process modal hook - INTEGRACIÓN CLAVE
const processModal = useProcessModal({
    onComplete: async () => {
        // Limpiar campos de entrada después del mint exitoso
        if (onInputClear) {
            onInputClear()
        }

        // Refrescar balances de tokens después del mint exitoso
        console.log('🔄 Refreshing token balances after successful mint...')
        try {
            // Refresh inmediato
            await refreshBalances()
            if (onBalanceRefresh) {
                await onBalanceRefresh()
            }
            console.log('✅ Immediate balance refresh completed')

            // Esperar un poco para que el mirror node se actualice (delay de red Hedera)
            setTimeout(async () => {
                try {
                    await refreshBalances()
                    if (onBalanceRefresh) {
                        await onBalanceRefresh()
                    }
                    console.log('✅ Delayed balance refresh completed')
                } catch (refreshError) {
                    console.warn(
                        '⚠️ Failed delayed balance refresh:',
                        refreshError
                    )
                }
            }, 3000)
        } catch (refreshError) {
            console.warn('⚠️ Failed immediate balance refresh:', refreshError)
        }
    },
    onError: (error) => {
        toast.error(`Mint failed: ${error}`)
    },
})
```

### 3. Al inicio de la función handleMint (línea ~160, después de las validaciones iniciales):

**ANTES** (línea ~188):

```tsx
toast.loading('🔄 Starting atomic mint...', { id: 'atomic-mint' })
```

**CAMBIAR POR**:

```tsx
// INICIAR EL MODAL DE PROCESO - PASO CRÍTICO
processModal.startProcess('mint', MINT_STEPS, {
    amount: `${amountNum}`,
    fromToken: 'USDC',
    toToken: 'hUSD',
})
```

### 4. Reemplazar los toast.loading con processModal.updateStep:

**Paso Initialize** (línea ~192):

```tsx
// Paso 1: Inicializar depósito atómico
processModal.updateStep('initialize', 'active')
```

**Paso User Sign** (línea ~227):

```tsx
// Paso 2: Usuario firma el schedule
processModal.nextStep()
processModal.updateStep('user-sign', 'active')
```

**Paso Complete** (línea ~280):

```tsx
// Paso 3: Completar transacción atómica
processModal.nextStep()
processModal.updateStep('complete', 'active')
```

**Paso Finalize** (línea ~310):

```tsx
// Paso 4: Finalizar
processModal.nextStep()
processModal.updateStep('finalize', 'active')
```

### 5. Al final del handleMint exitoso (línea ~325, reemplazar toast.dismiss y toast.success):

**ANTES**:

```tsx
toast.dismiss('atomic-mint')
toast.success(
    `🎉 Atomic Mint Successful!\n💸 Sent: ${amountNum} USDC → 💰 Received: ${amountHUSDC} hUSD\n🔗 Transaction: ${completeResult.txId?.slice(
        0,
        20
    )}...`,
    {
        duration: 8000,
        style: {
            maxWidth: '450px',
        },
    }
)
```

**CAMBIAR POR**:

```tsx
// Completar el proceso
processModal.completeProcess()

toast.success(
    `🎉 Atomic Mint Successful!\n💸 Sent: ${amountNum} USDC → 💰 Received: ${amountHUSDC} hUSD\n🔗 Transaction: ${completeResult.txId?.slice(
        0,
        20
    )}...`,
    {
        duration: 8000,
        style: {
            maxWidth: '450px',
        },
    }
)
```

### 6. En el catch del handleMint (línea ~339):

**ANTES**:

```tsx
toast.dismiss('atomic-mint')
toast.error(`❌ Atomic mint failed: ${errorMessage}`)
```

**CAMBIAR POR**:

```tsx
const errorMessage =
    error instanceof Error ? error.message : 'Unknown error occurred'
processModal.setStepError(processModal.currentStep, errorMessage)
```

### 7. En el caso de rate conflict (línea ~208):

**DESPUÉS DE**:

```tsx
setShowRateConflict(true)
setIsProcessing(false)
return
```

**AÑADIR**:

```tsx
processModal.closeModal()
```

### 8. En el caso de user rejection (línea ~261):

**DESPUÉS DE**:

```tsx
setIsProcessing(false)
return
```

**AÑADIR**:

```tsx
processModal.closeModal()
```

### 9. Añadir el ProcessModal al JSX return (al final del return, antes del último </> tag):

```tsx
{
    /* Process Modal - COMPONENTE CLAVE AÑADIDO */
}
;<ProcessModal
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
```

## Resultado esperado:

-   Al hacer mint, aparecerá el ProcessModal con 4 pasos
-   Cada paso se marcará como activo conforme progrese
-   Si hay errores, se mostrarán en el modal
-   Al completar exitosamente, el modal se cerrará automáticamente después de 2 segundos
-   Los balances se actualizarán automáticamente
