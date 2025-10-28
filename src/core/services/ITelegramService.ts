/**
 * Telegram Service Interface
 *
 * Defines the contract for sending notifications via Telegram bot.
 */

export interface TelegramMessage {
    message: string
    parseMode?: 'Markdown' | 'HTML'
    disableNotification?: boolean
}

export interface ITelegramService {
    /**
     * Send a notification message
     */
    sendNotification(message: string): Promise<void>

    /**
     * Send formatted message with parse mode
     */
    sendMessage(options: TelegramMessage): Promise<void>

    /**
     * Notify about deposit
     */
    notifyDeposit(
        userAccountId: string,
        amountUsdc: number,
        amountHusd: number
    ): Promise<void>

    /**
     * Notify about withdrawal
     */
    notifyWithdrawal(
        userAccountId: string,
        amountHusd: number,
        amountUsdc: number,
        type: 'instant' | 'standard'
    ): Promise<void>

    /**
     * Notify about rate update
     */
    notifyRateUpdate(rate: number, sequenceNumber: string): Promise<void>

    /**
     * Notify about error
     */
    notifyError(error: string, context?: Record<string, unknown>): Promise<void>
}
