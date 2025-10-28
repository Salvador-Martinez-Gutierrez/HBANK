import { NextApiRequest, NextApiResponse } from 'next'
import { TelegramService } from '@/services/telegramService'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        console.log('🧪 Testing Telegram bot integration...')

        const telegramService = new TelegramService()

        // Check if Telegram service is configured
        if (!telegramService.isConfigured()) {
            return res.status(400).json({
                success: false,
                error: 'Telegram service is not configured. Please check TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables.',
                debug: {
                    botToken: !!process.env.TELEGRAM_BOT_TOKEN,
                    chatId: !!process.env.TELEGRAM_CHAT_ID,
                    chatIdValue: process.env.TELEGRAM_CHAT_ID
                        ? 'Set'
                        : 'Not set',
                },
            })
        }

        // Get bot information for debugging
        const botInfo = await telegramService.getBotInfo()
        console.log('🤖 Bot info:', botInfo)

        // Send test message
        const testSuccess = await telegramService.sendTestMessage()

        if (testSuccess) {
            console.log('✅ Telegram test message sent successfully')

            // Also send a sample withdrawal notification
            await telegramService.sendWithdrawNotification({
                type: 'instant',
                userAccountId: '0.0.123456',
                amountHUSD: 100.5,
                amountUSDC: 95.25,
                rate: 0.95,
                txId: '0.0.123456@1234567890.123456789',
                fee: 5.25,
                timestamp: new Date().toISOString(),
                walletBalanceAfter: 1234.56789, // Balance example
            })

            return res.status(200).json({
                success: true,
                message:
                    'Telegram bot test completed successfully! Check your Telegram channel for the test messages.',
                debug: {
                    botInfo,
                    chatId: process.env.TELEGRAM_CHAT_ID,
                },
            })
        } else {
            const recentUpdates = await telegramService.getRecentUpdates()

            return res.status(500).json({
                success: false,
                error: 'Failed to send test message to Telegram. Please check your bot configuration.',
                debug: {
                    botInfo,
                    chatId: process.env.TELEGRAM_CHAT_ID,
                    recentUpdates,
                    suggestions: [
                        'Make sure your Chat ID is correct',
                        'For channels, Chat ID should be negative (like -1001234567890)',
                        'Use /api/get-telegram-chat-id to find the correct Chat ID',
                        'Make sure the bot is added as administrator to your channel',
                    ],
                },
            })
        }
    } catch (error) {
        console.error('❌ Error testing Telegram bot:', error)
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            debug: {
                botToken: !!process.env.TELEGRAM_BOT_TOKEN,
                chatId: process.env.TELEGRAM_CHAT_ID,
                errorType:
                    error instanceof Error
                        ? error.constructor.name
                        : typeof error,
            },
        })
    }
}
