/**
 * Hook para recibir actualizaciones en tiempo real de precios de tokens
 *
 * Este hook se suscribe a la tabla tokens_registry de Supabase para recibir
 * actualizaciones automáticas cuando los precios cambian.
 *
 * SEGURIDAD: ✅ SEGURO
 * - Solo lectura (READ-ONLY)
 * - Datos públicos (precios de tokens)
 * - No expone información de usuario
 * - No requiere autenticación
 */

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface TokenPriceUpdate {
    token_address: string
    price_usd: string
    last_price_update: string
}

/**
 * Suscribe a actualizaciones de precios en tiempo real
 *
 * @param onPriceUpdate - Callback cuando se actualiza un precio
 * @param enabled - Si está habilitado (default: true)
 */
export function useTokenPriceRealtime(
    onPriceUpdate: (update: TokenPriceUpdate) => void,
    enabled: boolean = true
) {
    useEffect(() => {
        if (!enabled) return

        console.log('🔴 Subscribing to token price updates...')

        // Create channel to listen for changes in tokens_registry
        const channel = supabase
            .channel('token-price-updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'tokens_registry',
                    // Solo escuchar cambios en price_usd
                },
                (payload) => {
                    console.log('💰 Token price update:', payload)

                    // Extract updated token data
                    if (payload.new && 'token_address' in payload.new) {
                        const update: TokenPriceUpdate = {
                            token_address: payload.new.token_address as string,
                            price_usd: payload.new.price_usd as string,
                            last_price_update: payload.new
                                .last_price_update as string,
                        }

                        onPriceUpdate(update)
                    }
                }
            )
            .subscribe((status) => {
                console.log('📡 Realtime subscription status:', status)
            })

        // Cleanup: desuscribirse cuando el componente se desmonte
        return () => {
            console.log('🔴 Unsubscribing from token price updates...')
            channel.unsubscribe()
        }
    }, [onPriceUpdate, enabled])
}

/**
 * Hook simplificado que recibe todas las actualizaciones de precios
 *
 * @param onUpdate - Callback con el map de precios actualizados
 * @param enabled - Si está habilitado (default: true)
 */
export function useAllTokenPricesRealtime(
    onUpdate: (prices: Map<string, string>) => void,
    enabled: boolean = true
) {
    useEffect(() => {
        if (!enabled) return

        console.log('🔴 Subscribing to all token prices...')

        const priceMap = new Map<string, string>()

        const channel = supabase
            .channel('all-token-prices')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'tokens_registry',
                },
                (payload) => {
                    if (payload.new && 'token_address' in payload.new) {
                        const tokenAddress = payload.new.token_address as string
                        const priceUsd = payload.new.price_usd as string

                        // Update price map
                        priceMap.set(tokenAddress, priceUsd)

                        // Notify with updated map
                        onUpdate(new Map(priceMap))

                        console.log(
                            `💰 Price updated: ${tokenAddress} = $${priceUsd}`
                        )
                    }
                }
            )
            .subscribe()

        return () => {
            console.log('🔴 Unsubscribing from all token prices...')
            channel.unsubscribe()
        }
    }, [onUpdate, enabled])
}
