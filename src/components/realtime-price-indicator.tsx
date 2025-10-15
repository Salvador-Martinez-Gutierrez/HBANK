/**
 * Componente indicador de actualización de precios en tiempo real
 * Muestra un badge cuando los precios se están actualizando
 */

'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff } from 'lucide-react'

interface RealtimePriceIndicatorProps {
    enabled: boolean
    lastUpdate?: string
}

export function RealtimePriceIndicator({
    enabled,
    lastUpdate,
}: RealtimePriceIndicatorProps) {
    const [isConnected, setIsConnected] = useState(false)
    const [showPulse, setShowPulse] = useState(false)

    useEffect(() => {
        if (enabled) {
            // Simular conexión establecida después de un momento
            const timer = setTimeout(() => setIsConnected(true), 1000)
            return () => clearTimeout(timer)
        } else {
            setIsConnected(false)
        }
    }, [enabled])

    useEffect(() => {
        if (lastUpdate) {
            // Mostrar animación de pulso cuando hay actualización
            setShowPulse(true)
            const timer = setTimeout(() => setShowPulse(false), 2000)
            return () => clearTimeout(timer)
        }
    }, [lastUpdate])

    if (!enabled) {
        return null
    }

    return (
        <Badge
            variant={isConnected ? 'default' : 'secondary'}
            className={`flex items-center gap-1 transition-all ${
                showPulse ? 'animate-pulse' : ''
            }`}
        >
            {isConnected ? (
                <>
                    <Wifi className='h-3 w-3' />
                    <span className='text-xs'>Live Prices</span>
                </>
            ) : (
                <>
                    <WifiOff className='h-3 w-3' />
                    <span className='text-xs'>Connecting...</span>
                </>
            )}
        </Badge>
    )
}

/**
 * Hook para rastrear actualizaciones de precios
 */
export function useRealtimePriceTracker() {
    const [lastUpdate, setLastUpdate] = useState<string>()
    const [updateCount, setUpdateCount] = useState(0)

    const trackUpdate = () => {
        setLastUpdate(new Date().toISOString())
        setUpdateCount((prev) => prev + 1)
    }

    return {
        lastUpdate,
        updateCount,
        trackUpdate,
    }
}
