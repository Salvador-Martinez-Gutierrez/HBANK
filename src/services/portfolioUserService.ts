/**
 * Servicio para gestionar usuarios de portfolio en Supabase
 * Sincroniza accountId de JWT con la tabla users en Supabase
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logger } from '@/lib/logger'

/**
 * Sincroniza o crea usuario en Supabase basado en accountId autenticado
 * Esto asegura que el usuario existe en la tabla users y puede usar RLS policies
 */
export async function syncOrCreateUser(accountId: string) {
    try {
        // Convertir accountId a formato de email para Supabase Auth
        const emailSafeAddress = accountId.replace(/\./g, '-')
        const email = `wallet-${emailSafeAddress}@hbank.app`

        logger.info('Syncing user with Supabase', { accountId, email })

        // Buscar si el usuario ya existe en auth.users
        const { data: existingAuthUsers } =
            await supabaseAdmin.auth.admin.listUsers()

        let authUserId: string | null = null
        const existingAuthUser = existingAuthUsers.users.find(
            (u) => u.email === email
        )

        if (existingAuthUser) {
            authUserId = existingAuthUser.id
            logger.info('Auth user found', { authUserId, accountId })
        } else {
            // Crear usuario en Supabase Auth
            // Usamos un password aleatorio fuerte ya que no se usará para login
            // (el login es mediante firma de wallet)
            const randomPassword = generateSecurePassword()

            const { data: newAuthUser, error: createError } =
                await supabaseAdmin.auth.admin.createUser({
                    email,
                    password: randomPassword,
                    email_confirm: true,
                    user_metadata: {
                        wallet_address: accountId,
                        auth_method: 'hedera_wallet_signature',
                    },
                })

            if (createError) {
                logger.error('Error creating auth user', {
                    error: createError.message,
                    accountId,
                })
                return { success: false, error: 'Failed to create auth user' }
            }

            authUserId = newAuthUser.user.id
            logger.info('Auth user created', { authUserId, accountId })
        }

        // Verificar que el usuario existe en la tabla users
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', authUserId)
            .maybeSingle()

        if (existingUser) {
            logger.info('User found in database', { userId: authUserId })
            return { success: true, userId: authUserId, user: existingUser }
        }

        // Si no existe, crearlo
        const { data: newUser, error: insertError } = await (
            supabaseAdmin.from('users').insert as any
        )({
            id: authUserId,
            wallet_address: accountId,
        })
            .select()
            .single()

        if (insertError) {
            logger.error('Error creating user in database', {
                error: insertError.message,
                userId: authUserId,
            })
            return { success: false, error: 'Failed to create user record' }
        }

        logger.info('User created in database', { userId: authUserId })

        return { success: true, userId: authUserId, user: newUser }
    } catch (error) {
        logger.error('Error in syncOrCreateUser', {
            error: error instanceof Error ? error.message : String(error),
            accountId,
        })
        return { success: false, error: 'Internal error' }
    }
}

/**
 * Obtener usuario por accountId (wallet address)
 */
export async function getUserByAccountId(accountId: string) {
    try {
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('wallet_address', accountId)
            .maybeSingle()

        return { success: true, user }
    } catch (error) {
        logger.error('Error getting user by accountId', {
            error: error instanceof Error ? error.message : String(error),
            accountId,
        })
        return { success: false, error: 'Failed to get user' }
    }
}

/**
 * Generar password seguro aleatorio
 */
function generateSecurePassword(): string {
    const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    const length = 32
    let password = ''
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)

    for (let i = 0; i < length; i++) {
        password += chars[array[i] % chars.length]
    }

    return password
}
