import { ProcessModalDemo } from '@/components/process-modal-demo'

export default function ProcessModalTestPage() {
    return (
        <div className='min-h-screen bg-gray-50 py-12'>
            <div className='container mx-auto px-4'>
                <div className='text-center mb-8'>
                    <h1 className='text-3xl font-bold text-gray-900 mb-4'>
                        ProcessModal - Sistema Unificado de Comunicación
                    </h1>
                    <p className='text-lg text-gray-600 max-w-2xl mx-auto'>
                        Componente modal general para comunicar actualizaciones
                        de estado en tiempo real para procesos de mint y redeem
                        (instantáneo y estándar).
                    </p>
                </div>

                <ProcessModalDemo />

                <div className='mt-12 max-w-4xl mx-auto'>
                    <div className='bg-white rounded-lg shadow-md p-6'>
                        <h2 className='text-2xl font-semibold mb-4'>
                            Características Implementadas
                        </h2>

                        <div className='grid md:grid-cols-2 gap-6'>
                            <div>
                                <h3 className='text-lg font-medium text-green-600 mb-3'>
                                    ✅ Funcionalidades
                                </h3>
                                <ul className='space-y-2 text-sm text-gray-700'>
                                    <li>
                                        • Interfaz unificada para mint y redeem
                                    </li>
                                    <li>
                                        • Indicadores visuales de progreso en
                                        tiempo real
                                    </li>
                                    <li>• Manejo automático de errores</li>
                                    <li>
                                        • Actualización automática de balances
                                    </li>
                                    <li>• Cierre automático al completar</li>
                                    <li>• Diseño responsive y consistente</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className='text-lg font-medium text-blue-600 mb-3'>
                                    🔧 Arquitectura
                                </h3>
                                <ul className='space-y-2 text-sm text-gray-700'>
                                    <li>
                                        • Hook personalizado useProcessModal
                                    </li>
                                    <li>
                                        • Componente ProcessModal reutilizable
                                    </li>
                                    <li>
                                        • Configuraciones predefinidas por
                                        proceso
                                    </li>
                                    <li>• Sistema de callbacks para eventos</li>
                                    <li>• TypeScript con tipado completo</li>
                                    <li>
                                        • Integración con sistemas existentes
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className='mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200'>
                            <h4 className='font-medium text-yellow-800 mb-2'>
                                💡 Instrucciones de Uso
                            </h4>
                            <p className='text-sm text-yellow-700'>
                                1. Selecciona un tipo de proceso arriba
                                <br />
                                2. Ingresa una cantidad
                                <br />
                                3. Haz clic en &ldquo;Iniciar Proceso&rdquo;
                                <br />
                                4. Observa el modal de progreso en tiempo real
                                <br />
                                5. El modal se cerrará automáticamente al
                                completar
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
