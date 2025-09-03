// Debug script to check topic message structure

async function debugTopicMessages() {
    try {
        const url = 'https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.6750041/messages?limit=3';
        console.log('🔍 Fetching from:', url);
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('📊 Total messages:', data.messages?.length || 0);
        
        if (data.messages && data.messages.length > 0) {
            console.log('\n🔍 First message structure:');
            const firstMsg = data.messages[0];
            console.log('Keys:', Object.keys(firstMsg));
            console.log('Full message:', JSON.stringify(firstMsg, null, 2));
            
            // Check different possible content fields
            console.log('\n📝 Content fields:');
            console.log('- contents:', firstMsg.contents ? 'EXISTS' : 'MISSING');
            console.log('- message:', firstMsg.message ? 'EXISTS' : 'MISSING');
            console.log('- data:', firstMsg.data ? 'EXISTS' : 'MISSING');
            
            if (firstMsg.contents) {
                try {
                    const decoded = Buffer.from(firstMsg.contents, 'base64').toString('utf8');
                    console.log('- Decoded contents:', decoded);
                } catch (err) {
                    console.log('- Error decoding contents:', err.message);
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

debugTopicMessages();
