// Polyfills for browser compatibility with Hedera SDK
import { Buffer } from 'buffer'

if (typeof window !== 'undefined') {
    // Make Buffer available globally in the browser
    window.Buffer = Buffer

    // Add other global polyfills if needed
    if (!window.global) {
        window.global = window
    }
}
