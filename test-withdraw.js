#!/usr/bin/env node

/**
 * Script de prueba para las funciones de withdrawal
 * Ejecutar: node test-withdraw.js
 */

const BASE_URL = 'http://localhost:3000'

async function testWithdrawAPI() {
    console.log('🧪 Iniciando pruebas del sistema de withdrawal...\n')

    // Test 1: Solicitar un retiro
    console.log('📤 Test 1: Solicitar retiro de 100 HUSD')
    try {
        const withdrawResponse = await fetch(`${BASE_URL}/api/withdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userAccountId: '0.0.123456',
                amountHUSD: 100,
                rate: 1.005,
                rateSequenceNumber: '12345',
            }),
        })

        const withdrawData = await withdrawResponse.json()
        console.log(
            '✅ Respuesta de retiro:',
            JSON.stringify(withdrawData, null, 2)
        )

        if (withdrawData.success) {
            console.log(`   📋 Request ID: ${withdrawData.requestId}`)
            console.log(`   ⏰ Unlock time: ${withdrawData.unlockAt}`)
            console.log(`   💰 Amount: ${withdrawData.amountHUSD} HUSD`)
        }
    } catch (error) {
        console.log('❌ Error en test de withdraw:', error.message)
    }

    console.log('\n' + '='.repeat(50) + '\n')

    // Test 2: Consultar retiros del usuario
    console.log('📋 Test 2: Consultar historial de retiros')
    try {
        const historyResponse = await fetch(
            `${BASE_URL}/api/user-withdrawals?user=0.0.123456`
        )
        const historyData = await historyResponse.json()

        console.log(
            '✅ Historial de retiros:',
            JSON.stringify(historyData, null, 2)
        )

        if (historyData.success && historyData.withdrawals.length > 0) {
            console.log(
                `   📊 Total retiros: ${historyData.withdrawals.length}`
            )
            historyData.withdrawals.forEach((w, i) => {
                console.log(
                    `   ${i + 1}. ${w.status} - ${w.amountHUSD} HUSD (${
                        w.requestId
                    })`
                )
            })
        }
    } catch (error) {
        console.log('❌ Error en consulta de historial:', error.message)
    }

    console.log('\n' + '='.repeat(50) + '\n')

    // Test 3: Procesar retiros maduros (worker)
    console.log('⚙️ Test 3: Procesar retiros maduros')
    try {
        const processResponse = await fetch(
            `${BASE_URL}/api/process-withdrawals`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        )

        const processData = await processResponse.json()
        console.log(
            '✅ Resultado del procesamiento:',
            JSON.stringify(processData, null, 2)
        )

        if (processData.success) {
            console.log(`   📈 Retiros procesados: ${processData.processed}`)
            console.log(`   ⏳ Retiros pendientes: ${processData.pending}`)
        }
    } catch (error) {
        console.log('❌ Error en procesamiento:', error.message)
    }

    console.log('\n🎉 Pruebas completadas!')
}

// Test de errores comunes
async function testErrorCases() {
    console.log('\n🚨 Testing casos de error...\n')

    // Test: Campos faltantes
    console.log('Test: Solicitud con campos faltantes')
    try {
        const response = await fetch(`${BASE_URL}/api/withdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userAccountId: '0.0.123456',
                // Faltan campos requeridos
            }),
        })
        const data = await response.json()
        console.log('✅ Error esperado:', data.error)
    } catch (error) {
        console.log('❌ Error inesperado:', error.message)
    }

    // Test: Monto inválido
    console.log('\nTest: Monto negativo')
    try {
        const response = await fetch(`${BASE_URL}/api/withdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userAccountId: '0.0.123456',
                amountHUSD: -50,
                rate: 1.005,
                rateSequenceNumber: '12345',
            }),
        })
        const data = await response.json()
        console.log('✅ Error esperado:', data.error)
    } catch (error) {
        console.log('❌ Error inesperado:', error.message)
    }
}

// Ejecutar tests
async function main() {
    console.log('🚀 Sistema de Withdrawal - Pruebas Integrales')
    console.log('=' * 60)

    // Verificar que el servidor esté ejecutándose
    try {
        await fetch(`${BASE_URL}/api/health`)
        console.log('✅ Servidor Next.js detectado en http://localhost:3000\n')
    } catch (error) {
        console.log(
            '❌ Error: Servidor no disponible. Ejecuta "pnpm dev" primero\n'
        )
        return
    }

    await testWithdrawAPI()
    await testErrorCases()

    console.log('\n📚 Información adicional:')
    console.log('• Período de bloqueo: 48 horas')
    console.log('• Intervalo de procesamiento: 60 minutos')
    console.log('• Topic HCS para retiros: 0.0.6750041')
    console.log(
        '• Los retiros se procesan automáticamente después del período de bloqueo'
    )
}

if (require.main === module) {
    main().catch(console.error)
}
