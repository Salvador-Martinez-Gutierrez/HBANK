'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ProcessModal } from '@/components/process-modal'
import {
    useProcessModal,
    MINT_STEPS,
    REDEEM_INSTANT_STEPS,
    REDEEM_STANDARD_STEPS,
} from '@/hooks/useProcessModal'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Componente de demostración para mostrar cómo usar el ProcessModal
 * Este es un ejemplo de cómo integrar el nuevo componente general
 * para las actualizaciones de estado de mint y redeem
 */
export function ProcessModalDemo() {
    const [amount, setAmount] = useState('100')
    const [processType, setProcessType] = useState<
        'mint' | 'redeem-instant' | 'redeem-standard'
    >('mint')

    // Hook del modal de proceso unificado
    const processModal = useProcessModal({
        onComplete: () => {
            console.log('✅ Proceso completado exitosamente!')
            // Aquí se ejecutaría la lógica de actualización de balances
            // refreshBalances(), onBalanceRefresh(), etc.
        },
        onError: (error) => {
            console.error('❌ Error en el proceso:', error)
            // Aquí se manejaría el error
        },
    })

    // Función de ejemplo para simular el proceso de mint
    const simulateMintProcess = async () => {
        try {
            // Paso 1: Inicializar
            processModal.updateStep('initialize', 'active')
            await simulateApiCall('Creando transacción atómica...', 2000)

            // Paso 2: Firma del usuario
            processModal.nextStep()
            processModal.updateStep('user-sign', 'active')
            await simulateApiCall('Esperando firma del usuario...', 3000)

            // Paso 3: Completar transacción
            processModal.nextStep()
            processModal.updateStep('complete', 'active')
            await simulateApiCall('Completando transacción atómica...', 2500)

            // Paso 4: Finalizar
            processModal.nextStep()
            processModal.updateStep('finalize', 'active')
            await simulateApiCall('Actualizando balances...', 1500)

            // Completar el proceso
            processModal.completeProcess()
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Error desconocido'
            processModal.setStepError(processModal.currentStep, errorMessage)
        }
    }

    // Función de ejemplo para simular el proceso de retiro instantáneo
    const simulateInstantWithdrawProcess = async () => {
        try {
            // Paso 1: Validar
            processModal.updateStep('validate', 'active')
            await simulateApiCall('Validando límites de retiro...', 1500)

            // Paso 2: Procesar
            processModal.nextStep()
            processModal.updateStep('process', 'active')
            await simulateApiCall('Procesando retiro instantáneo...', 2000)

            // Paso 3: Transferir
            processModal.nextStep()
            processModal.updateStep('transfer', 'active')
            await simulateApiCall('Transfiriendo USDC...', 2500)

            // Paso 4: Finalizar
            processModal.nextStep()
            processModal.updateStep('finalize', 'active')
            await simulateApiCall('Actualizando balances...', 1500)

            // Completar el proceso
            processModal.completeProcess()
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Error desconocido'
            processModal.setStepError(processModal.currentStep, errorMessage)
        }
    }

    // Función de ejemplo para simular el proceso de retiro estándar
    const simulateStandardWithdrawProcess = async () => {
        try {
            // Paso 1: Crear schedule
            processModal.updateStep('create-schedule', 'active')
            await simulateApiCall('Creando solicitud de retiro...', 2000)

            // Paso 2: Firma del usuario
            processModal.nextStep()
            processModal.updateStep('user-sign', 'active')
            await simulateApiCall('Esperando firma del usuario...', 3000)

            // Paso 3: Enviar solicitud
            processModal.nextStep()
            processModal.updateStep('submit', 'active')
            await simulateApiCall('Enviando solicitud...', 1500)

            // Paso 4: Bloquear hUSD
            processModal.nextStep()
            processModal.updateStep('lock', 'active')
            await simulateApiCall('Bloqueando hUSD por 48 horas...', 2000)

            // Completar el proceso
            processModal.completeProcess()
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Error desconocido'
            processModal.setStepError(processModal.currentStep, errorMessage)
        }
    }

    // Función auxiliar para simular llamadas a API
    const simulateApiCall = (message: string, delay: number): Promise<void> => {
        console.log(message)
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simular fallo ocasional (10% de probabilidad)
                if (Math.random() < 0.1) {
                    reject(new Error('Error simulado de API'))
                } else {
                    resolve()
                }
            }, delay)
        })
    }

    // Función principal para iniciar el proceso
    const handleStartProcess = async () => {
        // Obtener los pasos correspondientes al tipo de proceso
        let steps = MINT_STEPS
        if (processType === 'redeem-instant') {
            steps = REDEEM_INSTANT_STEPS
        } else if (processType === 'redeem-standard') {
            steps = REDEEM_STANDARD_STEPS
        }

        // Iniciar el modal con los pasos correspondientes
        processModal.startProcess(processType, steps, {
            amount,
            fromToken: processType === 'mint' ? 'USDC' : 'hUSD',
            toToken: processType === 'mint' ? 'hUSD' : 'USDC',
        })

        // Ejecutar el proceso correspondiente
        if (processType === 'mint') {
            await simulateMintProcess()
        } else if (processType === 'redeem-instant') {
            await simulateInstantWithdrawProcess()
        } else {
            await simulateStandardWithdrawProcess()
        }
    }

    return (
        <div className='max-w-md mx-auto p-6 space-y-6'>
            <Card>
                <CardHeader>
                    <CardTitle>Demostración del ProcessModal</CardTitle>
                    <CardDescription>
                        Componente unificado para mostrar el progreso de
                        procesos de mint y redeem
                    </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                    <div className='space-y-2'>
                        <Label htmlFor='amount'>Cantidad</Label>
                        <Input
                            id='amount'
                            type='number'
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder='Ingresa una cantidad'
                        />
                    </div>

                    <div className='space-y-2'>
                        <Label>Tipo de Proceso</Label>
                        <div className='grid grid-cols-1 gap-2'>
                            <Button
                                variant={
                                    processType === 'mint'
                                        ? 'default'
                                        : 'outline'
                                }
                                onClick={() => setProcessType('mint')}
                                className='w-full'
                            >
                                Mint (USDC → hUSD)
                            </Button>
                            <Button
                                variant={
                                    processType === 'redeem-instant'
                                        ? 'default'
                                        : 'outline'
                                }
                                onClick={() => setProcessType('redeem-instant')}
                                className='w-full'
                            >
                                Retiro Instantáneo (hUSD → USDC)
                            </Button>
                            <Button
                                variant={
                                    processType === 'redeem-standard'
                                        ? 'default'
                                        : 'outline'
                                }
                                onClick={() =>
                                    setProcessType('redeem-standard')
                                }
                                className='w-full'
                            >
                                Retiro Estándar (hUSD → USDC)
                            </Button>
                        </div>
                    </div>

                    <Button
                        onClick={handleStartProcess}
                        className='w-full'
                        disabled={!amount || parseFloat(amount) <= 0}
                    >
                        Iniciar Proceso de{' '}
                        {processType === 'mint' ? 'Mint' : 'Retiro'}
                    </Button>

                    <div className='text-sm text-gray-600 space-y-1'>
                        <p>
                            <strong>Características del ProcessModal:</strong>
                        </p>
                        <ul className='list-disc list-inside space-y-1 text-xs'>
                            <li>Interfaz unificada para mint y redeem</li>
                            <li>
                                Indicadores visuales de progreso en tiempo real
                            </li>
                            <li>Manejo automático de errores</li>
                            <li>
                                Actualización automática de balances al
                                completar
                            </li>
                            <li>
                                Cierre automático después de completar el
                                proceso
                            </li>
                            <li>
                                Diseño consistente con el estilo de la
                                aplicación
                            </li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            {/* Modal de proceso unificado */}
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
        </div>
    )
}
