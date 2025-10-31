#!/bin/bash

# Rate Limiting Test Script
# Tests the rate limiting implementation on local server

echo "🧪 Testing Rate Limiting on localhost:3002"
echo "=========================================="
echo ""

# Test endpoint
ENDPOINT="http://localhost:3002/api/auth/nonce?accountId=0.0.12345"

echo "📍 Testing endpoint: /api/auth/nonce"
echo "⚙️  Rate limit: 10 requests per 10 seconds (AUTH tier)"
echo ""

# Make 15 requests to trigger rate limit
for i in {1..15}; do
    echo "Request #$i:"

    # Make request and capture response + headers
    RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}\nX-RateLimit-Limit:%{header_json}" \
        "$ENDPOINT" 2>/dev/null)

    # Extract HTTP code
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

    # Try to get rate limit headers
    curl -s -i "$ENDPOINT" | grep -E "(X-RateLimit|HTTP/|Retry-After)" | head -5

    echo ""

    # Small delay between requests
    sleep 0.5
done

echo ""
echo "=========================================="
echo "✅ Test complete!"
echo ""
echo "Expected behavior:"
echo "  - First 10 requests: HTTP 200 with rate limit headers"
echo "  - Requests 11-15: HTTP 429 (Too Many Requests)"
echo "  - After 10 seconds: Rate limit resets"
