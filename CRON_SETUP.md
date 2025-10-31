# Cron Job Setup - DeFi Data Aggregation

## Overview

This cron job syncs DeFi market data (pools, farms, tokens) from SaucerSwap API every 5 minutes and stores it in Supabase snapshot tables. This architecture reduces API calls from ~22 per user sync to ~4-6 per user sync (73% reduction).

## Architecture

```
┌─────────────┐     Every 5 min      ┌──────────────────────┐
│  VPS Cron   │ ───────────────────> │ POST /api/defi/      │
│    Job      │                       │   sync-snapshot      │
└─────────────┘                       └──────────────────────┘
                                               │
                                               ├─> Fetch SaucerSwap API
                                               │   (pools, farms, tokens)
                                               │
                                               ├─> Save to Supabase
                                               │   (snapshot tables)
                                               │
                                               └─> Invalidate Redis cache


┌─────────────┐                       ┌──────────────────────┐
│    User     │ ───> Sync Wallet ──> │ GET /api/defi/       │
│             │                       │   snapshot           │
└─────────────┘                       └──────────────────────┘
                                               │
                                               ├─> Try Redis cache (60s TTL)
                                               │
                                               └─> Fallback to Supabase
```

## Prerequisites

1. **Database Migration Applied**

    - Run migration: `20250131_create_defi_snapshot_tables.sql`
    - This creates 3 tables: `defi_pools_snapshot`, `defi_farms_snapshot`, `defi_tokens_snapshot`

2. **Environment Variable**

    - `CRON_API_KEY`: Secret key for authenticating cron requests
    - Add to `.env.local` or production environment
    - Example: `CRON_API_KEY=your-secure-random-key-here`

3. **VPS Access**
    - SSH access to your VPS
    - Ability to edit crontab

## Cron Job Configuration

### 1. Generate API Key

Generate a secure random API key:

```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Add to your environment:

```bash
CRON_API_KEY=your-generated-key-here
```

### 2. Test the Endpoint Manually

Before setting up the cron, test the endpoint:

```bash
curl -X POST https://your-domain.com/api/defi/sync-snapshot \
  -H "Authorization: Bearer YOUR_CRON_API_KEY" \
  -H "Content-Type: application/json"
```

Expected response:

```json
{
    "success": true,
    "message": "DeFi snapshot synced successfully",
    "stats": {
        "poolsCount": 150,
        "farmsCount": 25,
        "tokensCount": 500,
        "timestamp": "2025-01-31T10:30:00.000Z"
    }
}
```

### 3. Create Cron Script

Create a bash script on your VPS:

```bash
nano /home/your-user/scripts/sync-defi-snapshot.sh
```

Add the following content:

```bash
#!/bin/bash

# DeFi Snapshot Sync Script
# Calls the sync-snapshot endpoint to update DeFi market data

# Configuration
API_URL="https://your-domain.com/api/defi/sync-snapshot"
API_KEY="YOUR_CRON_API_KEY"
LOG_FILE="/home/your-user/logs/defi-sync.log"

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Start sync
log_message "Starting DeFi snapshot sync..."

# Call the endpoint
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json")

# Extract HTTP code and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

# Check response
if [ "$HTTP_CODE" -eq 200 ]; then
    log_message "SUCCESS: $BODY"
else
    log_message "ERROR: HTTP $HTTP_CODE - $BODY"
fi

# Keep only last 1000 lines of log
tail -n 1000 "$LOG_FILE" > "$LOG_FILE.tmp"
mv "$LOG_FILE.tmp" "$LOG_FILE"
```

Make it executable:

```bash
chmod +x /home/your-user/scripts/sync-defi-snapshot.sh
```

### 4. Configure Cron Job

Edit your crontab:

```bash
crontab -e
```

Add the following line to run every 5 minutes:

```cron
# DeFi Snapshot Sync - Every 5 minutes
*/5 * * * * /home/your-user/scripts/sync-defi-snapshot.sh
```

Alternative schedules:

```cron
# Every 3 minutes (more frequent, higher API costs)
*/3 * * * * /home/your-user/scripts/sync-defi-snapshot.sh

# Every 10 minutes (less frequent, lower API costs)
*/10 * * * * /home/your-user/scripts/sync-defi-snapshot.sh

# Every hour (least frequent, minimal API costs)
0 * * * * /home/your-user/scripts/sync-defi-snapshot.sh
```

Save and exit (Ctrl+X, then Y, then Enter in nano).

### 5. Verify Cron is Running

Check that cron is active:

```bash
# View your crontab
crontab -l

# Check cron service status
sudo systemctl status cron  # Debian/Ubuntu
sudo systemctl status crond # CentOS/RHEL

# View recent cron logs
grep CRON /var/log/syslog  # Debian/Ubuntu
grep CRON /var/log/cron    # CentOS/RHEL
```

### 6. Monitor Logs

View the sync logs:

```bash
# View last 50 lines
tail -n 50 /home/your-user/logs/defi-sync.log

# Follow logs in real-time
tail -f /home/your-user/logs/defi-sync.log

# View only errors
grep ERROR /home/your-user/logs/defi-sync.log
```

## Database Cleanup

The migration includes a cleanup function to prevent table bloat. Snapshots older than 7 days are automatically deleted.

### Manual Cleanup (Optional)

If you want to manually clean old snapshots:

```sql
-- Connect to Supabase SQL Editor or psql
SELECT cleanup_old_defi_snapshots();
```

### Scheduled Cleanup (Recommended)

If your Supabase plan includes pg_cron, you can schedule automatic cleanup:

```sql
-- Run cleanup daily at 3 AM
SELECT cron.schedule(
    'cleanup-defi-snapshots',
    '0 3 * * *',
    'SELECT cleanup_old_defi_snapshots();'
);
```

## Troubleshooting

### Cron not running

1. Check cron service is active: `sudo systemctl status cron`
2. Verify script permissions: `ls -l /home/your-user/scripts/sync-defi-snapshot.sh`
3. Check script has correct shebang: `head -n 1 /home/your-user/scripts/sync-defi-snapshot.sh`

### 401 Unauthorized error

-   Verify `CRON_API_KEY` is correctly set in your environment
-   Verify the script uses the correct API key
-   Check the API key matches in both places

### 500 Internal Server Error

-   Check application logs in Vercel/hosting platform
-   Verify `SAUCERSWAP_API_KEY` is set
-   Verify Supabase credentials are correct
-   Check if migration was applied correctly

### No data in snapshot tables

-   Run the endpoint manually to verify it works
-   Check application logs for errors
-   Verify RLS policies allow service role to write

### Old data in cache

The cache is automatically invalidated when new snapshots are created. If you see stale data:

1. The cron may not be running - check logs
2. Redis may be down - check connection
3. Clear cache manually:

```bash
# If using Redis CLI
redis-cli DEL defi:snapshot:combined defi:snapshot:pools defi:snapshot:farms defi:snapshot:tokens
```

## Performance Impact

### Before (Direct SaucerSwap API calls)

-   ~22 API calls per wallet sync
-   Rate limit: 100 calls/min
-   Max ~4-5 users syncing simultaneously

### After (Data Aggregation API)

-   ~4-6 API calls per wallet sync (73% reduction)
-   Cron: 3 API calls every 5 minutes
-   Users: Only user-specific calls (farm totals, bonzo)
-   Can handle 15+ users syncing simultaneously

## Security Considerations

1. **Never commit API keys** - Use environment variables
2. **Rotate keys regularly** - Change `CRON_API_KEY` every 3-6 months
3. **Monitor logs** - Watch for unauthorized access attempts
4. **Use HTTPS** - Always use secure connections
5. **Restrict access** - Consider IP whitelisting if possible

## Cost Estimation

### SaucerSwap API Costs

Assuming 100 users syncing 10 times per day:

**Before:**

-   22 calls × 100 users × 10 syncs = 22,000 calls/day
-   Rate limit breaches likely

**After:**

-   Cron: 3 calls × 288 (every 5 min) = 864 calls/day
-   Users: 6 calls × 100 users × 10 syncs = 6,000 calls/day
-   Total: ~6,864 calls/day (69% reduction)

## Monitoring & Alerts

Consider setting up alerts for:

1. **Cron failures** - No successful sync in 15+ minutes
2. **API errors** - Multiple 500 errors from SaucerSwap
3. **Stale data** - Last snapshot older than 10 minutes
4. **Database size** - Snapshot tables growing too large

You can use:

-   Uptime monitoring (UptimeRobot, Pingdom)
-   Log aggregation (Papertrail, Logtail)
-   Custom alerting scripts

## Next Steps

1. ✅ Apply database migration
2. ✅ Set environment variable `CRON_API_KEY`
3. ✅ Test endpoint manually
4. ✅ Create cron script on VPS
5. ✅ Configure crontab
6. ✅ Monitor logs for first few runs
7. ✅ Verify data appears in snapshot tables
8. ✅ Test user wallet sync still works

## Support

If you encounter issues:

1. Check logs: `/home/your-user/logs/defi-sync.log`
2. Check application logs in hosting platform
3. Verify all environment variables are set
4. Test endpoint manually with curl
5. Check Supabase dashboard for snapshot tables

---

**Last Updated:** January 31, 2025
**Cron Frequency:** Every 5 minutes
**Endpoint:** POST /api/defi/sync-snapshot
