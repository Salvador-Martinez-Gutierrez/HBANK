import { NextRequest, NextResponse } from 'next/server'
import TelegramBot from 'node-telegram-bot-api'
import { createScopedLogger } from '@/lib/logger'

const logger = createScopedLogger('api:telegram:chat-id')

export async function GET(_req: NextRequest): Promise<NextResponse> {
    try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN

        if (!botToken) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'TELEGRAM_BOT_TOKEN not found in environment variables',
                },
                { status: 400 }
            )
        }

        logger.info('Getting updates from Telegram bot')

        const bot = new TelegramBot(botToken, { polling: false })

        // Get recent updates
        const updates = await bot.getUpdates({ limit: 10 })

        logger.info('Retrieved Telegram updates', { updateCount: updates.length })

        if (updates.length === 0) {
            return NextResponse.json({
                success: true,
                message:
                    'No recent messages found. Please send a message to your bot or add the bot to your channel and send a message there.',
                instructions: [
                    '1. Add your bot to the Telegram channel as an administrator',
                    '2. Send any message in the channel (like "test")',
                    '3. Call this API again to see the Chat ID',
                ],
            })
        }

        // Extract chat information from updates
        const chats = updates
            .map((update) => {
                const message =
                    update.message ??
                    update.channel_post ??
                    update.edited_message ??
                    update.edited_channel_post
                if (message) {
                    return {
                        chat_id: message.chat.id,
                        chat_type: message.chat.type,
                        chat_title:
                            message.chat.title ??
                            message.chat.first_name ??
                            'N/A',
                        username: message.chat.username ?? 'N/A',
                        message_text: message.text ?? 'N/A',
                        date: new Date(message.date * 1000).toISOString(),
                    }
                }
                return null
            })
            .filter(Boolean)

        // Remove duplicates based on chat_id
        const uniqueChats = chats.reduce((acc, chat) => {
            if (chat && !acc.find((c) => c && c.chat_id === chat.chat_id)) {
                acc.push(chat)
            }
            return acc
        }, [] as typeof chats)

        return NextResponse.json({
            success: true,
            message:
                'Found recent chats. Look for your channel in the list below.',
            chats: uniqueChats,
            instructions: [
                'For channels/groups, use the negative chat_id (like -1001234567890)',
                'For private chats, use the positive chat_id',
                'Look for your channel by checking the chat_title or username',
            ],
        })
    } catch (error) {
        logger.error('Error getting chat IDs', {
            error: error instanceof Error ? error.message : String(error),
        })
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error ? error.message : 'Unknown error',
                instructions: [
                    'Make sure your TELEGRAM_BOT_TOKEN is correct',
                    'Ensure the bot is added to your channel as administrator',
                    'Send a message in the channel first',
                ],
            },
            { status: 500 }
        )
    }
}
