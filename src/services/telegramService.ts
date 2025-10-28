import TelegramBot from 'node-telegram-bot-api'
import { createScopedLogger } from '@/lib/logger'

const logger = createScopedLogger('service:telegramService')


export interface WithdrawNotification {
    type: 'instant' | 'standard'
    userAccountId: string
    amountHUSD: number
    amountUSDC: number
    rate: number
    txId: string
    fee?: number
    timestamp: string
    walletBalanceAfter: number // Remaining balance in wallet after withdrawal
}

export class TelegramService {
    private bot: TelegramBot | null = null
    private chatId: string | null = null
    private isEnabled: boolean = false

    constructor() {
        this.initializeBot()
    }

    private initializeBot() {
        const botToken = process.env.TELEGRAM_BOT_TOKEN
        const chatId = process.env.TELEGRAM_CHAT_ID

        if (!botToken || !chatId) {
            logger.info(
                '⚠️ Telegram service disabled. Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID environment variables'
            )
            return
        }

        try {
            this.bot = new TelegramBot(botToken, { polling: false })
            this.chatId = chatId
            this.isEnabled = true
            logger.info('✅ Telegram service initialized successfully')
        } catch (error) {
            logger.error('❌ Failed to initialize Telegram bot:', error)
        }
    }

    /**
     * Send withdrawal notification to Telegram channel
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
     * Format withdrawal notification message
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
     * Send test message to verify Telegram integration
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
     * Check if Telegram service is enabled and configured
     */
    isConfigured(): boolean {
        return this.isEnabled
    }

    /**
     * Get bot information for debugging
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
     * Get recent updates to help find chat IDs
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
