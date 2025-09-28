#!/usr/bin/env node

const { execSync } = require('child_process')

console.log('🤖 VALORA Telegram Bot Setup Helper\n')

console.log('📋 Current configuration:')
console.log(
    'TELEGRAM_BOT_TOKEN:',
    process.env.TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ Not set'
)
console.log(
    'TELEGRAM_CHAT_ID:',
    process.env.TELEGRAM_CHAT_ID
        ? `✅ Set (${process.env.TELEGRAM_CHAT_ID})`
        : '❌ Not set'
)

console.log('\n🔍 To find your Chat ID:')
console.log('1. Add your bot to your Telegram channel as administrator')
console.log('2. Send a test message in your channel')
console.log('3. Run: curl http://localhost:3000/api/get-telegram-chat-id')
console.log('4. Look for your channel in the response and copy the chat_id')

console.log('\n🧪 To test your configuration:')
console.log('curl -X POST http://localhost:3000/api/test-telegram')

console.log('\n💡 Common Chat ID formats:')
console.log('• Channels: -1001234567890 (negative, long)')
console.log('• Groups: -123456890 (negative, shorter)')
console.log('• Private: 123456789 (positive)')

console.log('\n📝 Your next steps:')
if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.log('❌ Set TELEGRAM_BOT_TOKEN in your .env file')
}
if (!process.env.TELEGRAM_CHAT_ID) {
    console.log('❌ Set TELEGRAM_CHAT_ID in your .env file')
}
if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    console.log(
        '✅ Configuration looks complete! Test it with the curl command above.'
    )
}
