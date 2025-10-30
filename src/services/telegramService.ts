/**
 * Telegram Service
 *
 * Manages Telegram bot notifications for withdrawal events.
 * Sends formatted notifications to a configured Telegram channel when withdrawals are processed.
 * Supports both instant and standard withdrawal notifications with detailed transaction information.
 */

import TelegramBot from 'node-telegram-bot-api'
import { createScopedLogger } from '@/lib/logger'
import { serverEnv } from '@/config/serverEnv'

const logger = createScopedLogger('service:telegramService')

/**
 * Withdrawal notification data structure
 */
export interface WithdrawNotification {
    type: 'instant' | 'standard'
    userAccountId: string
    amountHUSD: number
    amountUSDC: number
    rate: number
    txId: string
    fee?: number
    timestamp: string
    walletBalanceAfter: number
}

export class TelegramService {
    private bot: TelegramBot | null = null
    private chatId: string | null = null
    private isEnabled: boolean = false

    constructor() {
        this.initializeBot()
    }

    private initializeBot() {
        if (!serverEnv.telegram.enabled) {
            logger.info(
                '⚠️ Telegram service disabled. Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID environment variables'
            )
            return
        }

        try {
            this.bot = new TelegramBot(serverEnv.telegram.botToken, { polling: false })
            this.chatId = serverEnv.telegram.chatId
            this.isEnabled = true
            logger.info('✅ Telegram service initialized successfully')
        } catch (error) {
            logger.error('❌ Failed to initialize Telegram bot:', error)
        }
    }

    /**
     * Send a withdrawal notification to the Telegram channel
     *
     * Formats and sends a withdrawal completion message to the configured Telegram channel.
     * Includes transaction details, amounts, exchange rate, and wallet balance information.
     * Silently fails if Telegram is not configured to avoid breaking withdrawal flow.
     *
     * @param notification - Withdrawal notification data
     * @param notification.type - Type of withdrawal ('instant' or 'standard')
     * @param notification.userAccountId - Hedera account ID of the user
     * @param notification.amountHUSD - Amount of hUSD withdrawn
     * @param notification.amountUSDC - Amount of USDC received
     * @param notification.rate - Exchange rate used
     * @param notification.txId - Hedera transaction ID
     * @param notification.fee - Optional fee charged (for instant withdrawals)
     * @param notification.timestamp - ISO timestamp of the withdrawal
     * @param notification.walletBalanceAfter - Remaining balance in the withdrawal wallet
     *
     * @example
     * ```typescript
     * const telegramService = new TelegramService()
     * await telegramService.sendWithdrawNotification({
     *   type: 'instant',
     *   userAccountId: '0.0.123456',
     *   amountHUSD: 100,
     *   amountUSDC: 95,
     *   rate: 1.05,
     *   txId: '0.0.789@1234567890.123',
     *   fee: 0.5,
     *   timestamp: new Date().toISOString(),
     *   walletBalanceAfter: 1000
     * })
     * ```
     */
    async sendWithdrawNotification(
        notification: WithdrawNotification
    ): Promise<void> {
        if (!this.isEnabled || !this.bot || !this.chatId) {
            logger.info('📱 Telegram notification skipped (service disabled)')
            return
        }

        try {
            const message = this.formatWithdrawMessage(notification)
            await this.bot.sendMessage(this.chatId, message, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
            })
            logger.info('✅ Withdrawal notification sent to Telegram')
        } catch (error) {
            logger.error('❌ Failed to send Telegram notification:', error)
            // Don't throw error to avoid breaking the withdrawal process
        }
    }

    /**
     * Format a withdrawal notification message for Telegram
     *
     * Creates a formatted Markdown message with withdrawal details including emojis and
     * formatted amounts. Includes different messaging for instant vs standard withdrawals.
     *
     * @param notification - Withdrawal notification data to format
     * @returns Formatted Markdown message ready for Telegram
     * @private
     */
    private formatWithdrawMessage(notification: WithdrawNotification): string {
        const {
            type,
            userAccountId,
            amountHUSD,
            amountUSDC,
            rate,
            txId,
            fee,
            timestamp,
            walletBalanceAfter,
        } = notification

        // Format the account ID to show first 4 and last 4 characters
        const shortAccountId =
            userAccountId.length > 8
                ? `${userAccountId.substring(0, 4)}...${userAccountId.substring(
                      userAccountId.length - 4
                  )}`
                : userAccountId

        // Create the message based on withdrawal type
        let message = `🔄 *${type.toUpperCase()} WITHDRAWAL COMPLETED*\n\n`

        message += `👤 *User:* \`${shortAccountId}\`\n`
        message += `💰 *Amount:* ${amountHUSD.toFixed(
            3
        )} HUSD → ${amountUSDC.toFixed(6)} USDC\n`
        message += `📊 *Rate:* ${rate.toFixed(8)}\n`

        if (fee && fee > 0) {
            message += `💸 *Fee:* ${fee.toFixed(6)} USDC\n`
            message += `💵 *Net Amount:* ${(amountUSDC - fee).toFixed(
                6
            )} USDC\n`
        }

        message += `🔗 *Transaction:* \`${txId}\`\n`

        // Add wallet balance information
        const walletType =
            type === 'instant' ? 'Instant Withdraw' : 'Standard Withdraw'
        message += `🏦 *${walletType} Wallet Balance:* ${walletBalanceAfter.toFixed(
            6
        )} USDC\n`

        message += `⏰ *Time:* ${new Date(timestamp).toLocaleString('es-ES', {
            timeZone: 'Europe/Madrid',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })}\n\n`

        // Add different emojis based on withdrawal type
        if (type === 'instant') {
            message += `⚡ *Instant withdrawal processed immediately*`
        } else {
            message += `⏳ *Standard withdrawal processed after 48h lock period*`
        }

        return message
    }

    /**
     * Send a test message to verify Telegram integration
     *
     * Sends a test message to the configured Telegram channel to verify the bot is working correctly.
     * Useful for validating bot token, chat ID, and permissions during setup.
     * Provides helpful error messages for common configuration issues.
     *
     * @returns True if the test message was sent successfully, false otherwise
     *
     * @example
     * ```typescript
     * const telegramService = new TelegramService()
     * const success = await telegramService.sendTestMessage()
     * if (success) {
     *   console.log('Telegram integration is working!')
     * } else {
     *   console.log('Check bot token and chat ID configuration')
     * }
     * ```
     */
    async sendTestMessage(): Promise<boolean> {
        if (!this.isEnabled || !this.bot || !this.chatId) {
            logger.info('📱 Telegram test message skipped (service disabled)')
            return false
        }

        try {
            logger.info(
                `🔍 Attempting to send test message to Chat ID: ${this.chatId}`
            )

            const message =
                `🤖 *VALORA Protocol Test Message*\n\n` +
                `✅ Telegram bot is working correctly!\n` +
                `📋 Chat ID: \`${this.chatId}\`\n` +
                `⏰ Time: ${new Date().toLocaleString('es-ES', {
                    timeZone: 'Europe/Madrid',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                })}`

            await this.bot.sendMessage(this.chatId, message, {
                parse_mode: 'Markdown',
            })
            logger.info('✅ Test message sent to Telegram successfully')
            return true
        } catch (error) {
            logger.error('❌ Failed to send test message to Telegram:', error)

            // Provide helpful error messages
            if (error instanceof Error) {
                if (error.message.includes('chat not found')) {
                    logger.error(
                        '💡 SOLUTION: The Chat ID might be incorrect or the bot is not added to the channel'
                    )
                    logger.error(
                        '💡 TIP: Use /api/get-telegram-chat-id to find the correct Chat ID'
                    )
                } else if (error.message.includes('Forbidden')) {
                    logger.error(
                        "💡 SOLUTION: The bot might be blocked or doesn't have permission to send messages"
                    )
                    logger.error(
                        '💡 TIP: Make sure the bot is added as administrator to your channel'
                    )
                } else if (error.message.includes('Unauthorized')) {
                    logger.error(
                        '💡 SOLUTION: The bot token might be incorrect'
                    )
                    logger.error(
                        '💡 TIP: Verify your TELEGRAM_BOT_TOKEN is correct'
                    )
                }
            }

            return false
        }
    }

    /**
     * Check if the Telegram service is enabled and configured
     *
     * @returns True if Telegram bot token and chat ID are configured, false otherwise
     *
     * @example
     * ```typescript
     * const telegramService = new TelegramService()
     * if (telegramService.isConfigured()) {
     *   console.log('Telegram notifications are enabled')
     * }
     * ```
     */
    isConfigured(): boolean {
        return this.isEnabled
    }

    /**
     * Get bot information for debugging
     *
     * Retrieves details about the configured Telegram bot including ID, username,
     * and capabilities. Useful for debugging bot configuration.
     *
     * @returns Bot information object or null if bot is not configured
     *
     * @example
     * ```typescript
     * const telegramService = new TelegramService()
     * const botInfo = await telegramService.getBotInfo()
     * if (botInfo) {
     *   console.log(`Bot: @${botInfo.username}`)
     * }
     * ```
     */
    async getBotInfo(): Promise<Record<string, unknown> | null> {
        if (!this.isEnabled || !this.bot) {
            return null
        }

        try {
            const me = await this.bot.getMe()
            const meUnknown = me as unknown as Record<string, unknown>
            return {
                id: me.id,
                is_bot: me.is_bot,
                first_name: me.first_name,
                username: me.username,
                // Optional properties that might not exist in all versions
                ...(meUnknown.can_join_groups !== undefined && {
                    can_join_groups: meUnknown.can_join_groups,
                }),
                ...(meUnknown.can_read_all_group_messages !== undefined && {
                    can_read_all_group_messages:
                        meUnknown.can_read_all_group_messages,
                }),
                ...(meUnknown.supports_inline_queries !== undefined && {
                    supports_inline_queries: meUnknown.supports_inline_queries,
                }),
            }
        } catch (error) {
            logger.error('❌ Error getting bot info:', error)
            return null
        }
    }

    /**
     * Get recent bot updates to help find chat IDs
     *
     * Retrieves recent messages and interactions with the bot to help identify
     * the correct chat ID for configuration. Useful during initial setup.
     *
     * @returns Array of recent chat interactions with chat ID, type, and title
     *
     * @example
     * ```typescript
     * const telegramService = new TelegramService()
     * const updates = await telegramService.getRecentUpdates()
     * updates.forEach(update => {
     *   console.log(`Chat: ${update.chat_title} (ID: ${update.chat_id})`)
     * })
     * ```
     */
    async getRecentUpdates(): Promise<
        Array<{
            chat_id: number
            chat_type: string
            chat_title: string
        }>
    > {
        if (!this.isEnabled || !this.bot) {
            return []
        }

        try {
            const updates = await this.bot.getUpdates({ limit: 5 })
            return updates
                .map((update) => {
                    const message = update.message ?? update.channel_post
                    return message
                        ? {
                              chat_id: message.chat.id,
                              chat_type: message.chat.type,
                              chat_title:
                                  message.chat.title ??
                                  message.chat.first_name ??
                                  'N/A',
                          }
                        : null
                })
                .filter(
                    (item): item is NonNullable<typeof item> => item !== null
                )
        } catch (error) {
            logger.error('❌ Error getting updates:', error)
            return []
        }
    }
}
