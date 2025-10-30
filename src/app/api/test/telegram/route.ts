import { NextRequest, NextResponse } from 'next/server'
import { TelegramService } from '@/services/telegramService'
import { createScopedLogger } from '@/lib/logger'
import { serverEnv } from '@/config/serverEnv'

const logger = createScopedLogger('api:test:telegram')

export async function POST(_req: NextRequest): Promise<NextResponse> {
    try {
        logger.info('Testing Telegram bot integration')

        const telegramService = new TelegramService()

        // Check if Telegram service is configured
        if (!telegramService.isConfigured()) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Telegram service is not configured. Please check TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables.',
                    debug: {
                        botToken: !!serverEnv.telegram.botToken,
                        chatId: !!serverEnv.telegram.chatId,
                        chatIdValue: serverEnv.telegram.chatId
                            ? 'Set'
                            : 'Not set',
                    },
                },
                { status: 400 }
            )
        }

        // Get bot information for debugging
        const botInfo = await telegramService.getBotInfo()
        logger.info('Bot info retrieved', { botInfo })

        // Send test message
        const testSuccess = await telegramService.sendTestMessage()

        if (testSuccess) {
            logger.info('Telegram test message sent successfully')

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

            return NextResponse.json({
                success: true,
                message:
                    'Telegram bot test completed successfully! Check your Telegram channel for the test messages.',
                debug: {
                    botInfo,
                    chatId: serverEnv.telegram.chatId,
                },
            })
        } else {
            const recentUpdates = await telegramService.getRecentUpdates()

            return NextResponse.json(
                {
                    success: false,
                    error: 'Failed to send test message to Telegram. Please check your bot configuration.',
                    debug: {
                        botInfo,
                        chatId: serverEnv.telegram.chatId,
                        recentUpdates,
                        suggestions: [
                            'Make sure your Chat ID is correct',
                            'For channels, Chat ID should be negative (like -1001234567890)',
                            'Use /api/get-telegram-chat-id to find the correct Chat ID',
                            'Make sure the bot is added as administrator to your channel',
                        ],
                    },
                },
                { status: 500 }
            )
        }
    } catch (error) {
        logger.error('Error testing Telegram bot', {
            error: error instanceof Error ? error.message : String(error),
        })
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error ? error.message : 'Unknown error',
                debug: {
                    botToken: !!serverEnv.telegram.botToken,
                    chatId: serverEnv.telegram.chatId,
                    errorType:
                        error instanceof Error
                            ? error.constructor.name
                            : typeof error,
                },
            },
            { status: 500 }
        )
    }
}
