/**
 * Script de prueba para simular la firma de Schedule Transactions
 * Este script ayuda a probar el flujo completo de retiros
 */

const {
    Client,
    PrivateKey,
    ScheduleSignTransaction,
    TransactionId,
} = require('@hashgraph/sdk')

async function signScheduleTransaction(scheduleId, userPrivateKey) {
    console.log(`🔐 Simulando firma de Schedule Transaction: ${scheduleId}`)

    // Configurar cliente para testnet
    const client = Client.forTestnet()
    client.setOperator(
        process.env.HEDERA_ACCOUNT_ID,
        process.env.HEDERA_PRIVATE_KEY
    )

    try {
        // Firmar el Schedule Transaction
        const signTx = await new ScheduleSignTransaction()
            .setScheduleId(scheduleId)
            .freezeWith(client)

        // Si tienes la clave privada del usuario
        if (userPrivateKey) {
            const signedTx = await signTx.sign(
                PrivateKey.fromString(userPrivateKey)
            )
            const submitResult = await signedTx.execute(client)
            const receipt = await submitResult.getReceipt(client)

            console.log(`✅ Schedule Transaction firmado exitosamente`)
            console.log(`   Transaction ID: ${submitResult.transactionId}`)
            console.log(`   Status: ${receipt.status}`)

            return true
        } else {
            console.log(`📋 Para firmar manualmente:`)
            console.log(`   Schedule ID: ${scheduleId}`)
            console.log(
                `   El usuario debe usar su wallet para firmar este Schedule`
            )
            return false
        }
    } catch (error) {
        console.error(`❌ Error firmando Schedule Transaction:`, error)
        return false
    } finally {
        client.close()
    }
}

// Para usar este script:
// node test-schedule-signing.js SCHEDULE_ID USER_PRIVATE_KEY(opcional)

if (require.main === module) {
    const scheduleId = process.argv[2]
    const userPrivateKey = process.argv[3]

    if (!scheduleId) {
        console.log('❌ Por favor proporciona el Schedule ID')
        console.log(
            'Uso: node test-schedule-signing.js SCHEDULE_ID [USER_PRIVATE_KEY]'
        )
        process.exit(1)
    }

    signScheduleTransaction(scheduleId, userPrivateKey)
        .then((result) => {
            if (result) {
                console.log(
                    '\n🎉 ¡Schedule Transaction firmado! Ahora puedes ejecutar process-withdrawals'
                )
            } else {
                console.log('\n📋 Schedule Transaction listo para firma manual')
            }
        })
        .catch(console.error)
}

module.exports = { signScheduleTransaction }
