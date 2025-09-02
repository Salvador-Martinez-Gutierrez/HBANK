import { useState, useEffect, useCallback, useRef } from 'react'

export interface RateData {
    rate: number
    timestamp: string
    sequenceNumber: string
    lastUpdated: Date
}

export interface UseRealTimeRateReturn {
    rateData: RateData | null
    isLoading: boolean
    error: string | null
    refetch: () => Promise<void>
    isConnected: boolean
}

const MIRROR_NODE_REST_API = 'https://testnet.mirrornode.hedera.com/api/v1'
const TOPIC_ID = '0.0.6626120'
// Values for mainnet (100 req/min = ~1.67 req/s)
const DEFAULT_POLLING_INTERVAL = 10000 // 10 seconds (6 req/min)
const MIN_INTERVAL = 8000 // 8 seconds (7.5 req/min)
const MAX_INTERVAL = 120000 // 2 minutes (0.5 req/min)
const MAX_RETRIES = 5

// Singleton state to share between all hook instances
interface RateState {
    rateData: RateData | null
    isLoading: boolean
    error: string | null
    isConnected: boolean
}

class RateManager {
    private static instance: RateManager
    private subscribers: Set<(data: RateState) => void> = new Set()
    private pollingTimeout: NodeJS.Timeout | null = null
    private isPolling = false
    private currentData: RateData | null = null
    private isLoading = true
    private error: string | null = null
    private isConnected = false
    private retryCount = 0
    private lastSequence: string | null = null
    private abortController: AbortController | null = null
    private isPollingInProgress = false

    // ✅ Sistema adaptativo de intervalos
    private currentInterval = DEFAULT_POLLING_INTERVAL
    private consecutiveErrors = 0
    private consecutiveSuccesses = 0
    private rateLimitDetected = false

    static getInstance(): RateManager {
        if (!RateManager.instance) {
            console.log(
                '🏗️ [Singleton] Creating NEW RateManager instance',
                new Date().toISOString()
            )
            RateManager.instance = new RateManager()
        } else {
            console.log('🔄 [Singleton] Reusing existing RateManager instance')
        }
        return RateManager.instance
    }

    subscribe(callback: (data: RateState) => void) {
        console.log(
            `📝 [Singleton] New subscriber added. Total: ${
                this.subscribers.size + 1
            }`
        )
        this.subscribers.add(callback)

        // Send current state immediately
        callback({
            rateData: this.currentData,
            isLoading: this.isLoading,
            error: this.error,
            isConnected: this.isConnected,
        })

        // Start polling if not already started
        if (!this.isPolling) {
            this.startPolling()
        }

        return () => {
            this.subscribers.delete(callback)
            console.log(
                `📝 [Singleton] Subscriber removed. Total: ${this.subscribers.size}`
            )
            // Stop polling if no more subscribers
            if (this.subscribers.size === 0) {
                this.stopPolling()
            }
        }
    }

    private notifySubscribers() {
        const data = {
            rateData: this.currentData,
            isLoading: this.isLoading,
            error: this.error,
            isConnected: this.isConnected,
        }
        this.subscribers.forEach((callback) => callback(data))
    }

    private parseRateMessage(message: string): RateData | null {
        try {
            const decoded = atob(message)
            const parsed = JSON.parse(decoded)

            if (
                parsed.rate &&
                parsed.timestamp &&
                typeof parsed.rate === 'number'
            ) {
                return {
                    rate: parsed.rate,
                    timestamp: parsed.timestamp,
                    sequenceNumber: Date.now().toString(),
                    lastUpdated: new Date(),
                }
            }

            return null
        } catch (err) {
            console.error('Error parsing rate message:', err)
            return null
        }
    }

    // ✅ Detección y manejo de rate limits
    private handleError(err: Error | unknown, response?: Response): void {
        this.consecutiveErrors++
        this.consecutiveSuccesses = 0

        const errorMessage = err instanceof Error ? err.message : String(err)

        // Detectar rate limit
        if (
            response?.status === 429 ||
            errorMessage.includes('429') ||
            errorMessage.includes('rate limit')
        ) {
            this.rateLimitDetected = true
            this.currentInterval = Math.min(
                MAX_INTERVAL,
                this.currentInterval * 2
            )
            console.warn(
                `🚫 [Singleton] Rate limit detected! Backing off to ${
                    this.currentInterval / 1000
                }s`
            )
        }
        // Detectar errores de red/servidor
        else if (
            (response?.status && response.status >= 500) ||
            errorMessage.includes('fetch')
        ) {
            this.currentInterval = Math.min(
                MAX_INTERVAL,
                this.currentInterval * 1.5
            )
            console.warn(
                `⚠️ [Singleton] Server error detected. Increasing interval to ${
                    this.currentInterval / 1000
                }s`
            )
        }
        // Otros errores
        else {
            this.currentInterval = Math.min(
                MAX_INTERVAL,
                this.currentInterval * 1.2
            )
            console.warn(
                `❌ [Singleton] Error detected. Adjusting interval to ${
                    this.currentInterval / 1000
                }s`
            )
        }
    }

    // ✅ Recuperación exitosa
    private handleSuccess(): void {
        this.consecutiveSuccesses++
        this.consecutiveErrors = 0
        this.retryCount = 0

        // Recuperarse gradualmente de rate limits
        if (this.rateLimitDetected && this.consecutiveSuccesses >= 3) {
            this.rateLimitDetected = false
            console.log('✅ [Singleton] Recovered from rate limit')
        }

        // Reducir intervalo gradualmente en éxitos consecutivos
        if (
            this.consecutiveSuccesses >= 5 &&
            this.currentInterval > MIN_INTERVAL
        ) {
            this.currentInterval = Math.max(
                MIN_INTERVAL,
                this.currentInterval * 0.9
            )
            console.log(
                `⚡ [Singleton] Performance good, reducing interval to ${
                    this.currentInterval / 1000
                }s`
            )
        }
    }

    private async fetchLatestRate(): Promise<RateData | null> {
        let response: Response | undefined

        try {
            const controller = new AbortController()
            this.abortController = controller

            this.error = null
            console.log(
                '🔍 [Singleton] Fetching latest rate from Mirror Node...'
            )

            response = await fetch(
                `${MIRROR_NODE_REST_API}/topics/${TOPIC_ID}/messages?order=desc&limit=10`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Valora-Protocol/1.0',
                    },
                    signal: controller.signal,
                }
            )

            // ✅ Verificar rate limit antes de procesar
            if (response.status === 429) {
                throw new Error(`Rate limit exceeded: ${response.status}`)
            }

            if (!response.ok) {
                throw new Error(
                    `Mirror Node API error: ${response.status} ${response.statusText}`
                )
            }

            const result = await response.json()

            if (!result.messages || result.messages.length === 0) {
                console.log('📨 [Singleton] No messages found in topic')
                if (!this.lastSequence) {
                    const fallbackRate: RateData = {
                        rate: 1.0,
                        timestamp: new Date().toISOString(),
                        sequenceNumber: 'fallback-' + Date.now(),
                        lastUpdated: new Date(),
                    }
                    this.lastSequence = fallbackRate.sequenceNumber
                    console.log(
                        '📊 [Singleton] Using fallback rate:',
                        fallbackRate.rate
                    )
                    return fallbackRate
                }
                return null
            }

            console.log(
                `📨 [Singleton] Found ${result.messages.length} messages in topic`
            )

            for (const msg of result.messages) {
                const rateData = this.parseRateMessage(msg.message)
                if (rateData) {
                    if (this.lastSequence !== msg.sequence_number.toString()) {
                        this.lastSequence = msg.sequence_number.toString()
                        rateData.sequenceNumber = msg.sequence_number.toString()
                        console.log(
                            '📊 [Singleton] New rate found:',
                            rateData.rate
                        )
                        return rateData
                    } else if (!this.lastSequence) {
                        this.lastSequence = msg.sequence_number.toString()
                        rateData.sequenceNumber = msg.sequence_number.toString()
                        console.log(
                            '📊 [Singleton] Initial rate loaded:',
                            rateData.rate
                        )
                        return rateData
                    } else {
                        console.log(
                            '📊 [Singleton] Rate data unchanged, skipping update'
                        )
                        return null
                    }
                }
            }

            console.log('📊 [Singleton] No valid rate messages found')
            return null
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                console.log('🚫 [Singleton] Request aborted')
                return null
            }

            // ✅ Manejar error con el sistema adaptativo
            this.handleError(err, response)
            console.error('Mirror Node fetch failed:', err)
            const errorMessage =
                err instanceof Error ? err.message : String(err)
            this.error = `Failed to fetch from Mirror Node: ${errorMessage}`
            return null
        }
    }

    private async poll() {
        if (!this.isPolling || this.isPollingInProgress) return

        this.isPollingInProgress = true
        console.log(
            `🔄 [Singleton] Starting poll cycle (interval: ${
                this.currentInterval / 1000
            }s)`
        )

        try {
            const data = await this.fetchLatestRate()
            if (data) {
                this.currentData = data
                this.isConnected = true
                this.isLoading = false
                this.handleSuccess() // ✅ Registrar éxito
                this.notifySubscribers()
            } else {
                this.isConnected = true
                this.isLoading = false
                this.handleSuccess() // ✅ Registrar éxito (aunque no haya datos nuevos)
                this.notifySubscribers()
            }
        } catch (err) {
            console.error('Polling failed:', err)
            this.retryCount++

            if (this.retryCount >= MAX_RETRIES) {
                this.error = 'Max retries reached. Check your connection.'
                this.isConnected = false
                this.isLoading = false
                this.notifySubscribers()
                return
            }
        } finally {
            this.isPollingInProgress = false
        }

        if (this.isPolling) {
            this.pollingTimeout = setTimeout(
                () => this.poll(),
                this.currentInterval
            )
            console.log(
                `⏰ [Singleton] Next poll scheduled in ${
                    this.currentInterval / 1000
                }s`
            )
        }
    }

    private startPolling() {
        if (this.isPolling) return

        this.isPolling = true
        console.log(
            '🚀 [Singleton] Starting Mirror Node polling for topic',
            TOPIC_ID,
            `(${this.currentInterval / 1000}s interval)`
        )
        this.poll()
    }

    private stopPolling() {
        this.isPolling = false
        if (this.pollingTimeout) {
            clearTimeout(this.pollingTimeout)
            this.pollingTimeout = null
        }
        if (this.abortController && !this.abortController.signal.aborted) {
            this.abortController.abort()
        }
        this.abortController = null
        this.isPollingInProgress = false
        console.log('🛑 [Singleton] Stopped polling')
    }

    async refetch(): Promise<void> {
        this.isLoading = true
        this.error = null
        this.notifySubscribers()

        try {
            const data = await this.fetchLatestRate()
            if (data) {
                this.currentData = data
                this.isConnected = true
                this.handleSuccess()
            }
        } catch (err) {
            console.error('Manual refetch failed:', err)
            this.error = `Refetch failed: ${err}`
        } finally {
            this.isLoading = false
            this.notifySubscribers()
        }
    }
}

export function useRealTimeRate(): UseRealTimeRateReturn {
    const [state, setState] = useState<RateState>({
        rateData: null,
        isLoading: true,
        error: null,
        isConnected: false,
    })

    const managerRef = useRef<RateManager>()

    useEffect(() => {
        managerRef.current = RateManager.getInstance()

        const unsubscribe = managerRef.current.subscribe((newState) => {
            setState(newState)
        })

        return unsubscribe
    }, [])

    const refetch = useCallback(async () => {
        if (managerRef.current) {
            await managerRef.current.refetch()
        }
    }, [])

    return {
        ...state,
        refetch,
    }
}
