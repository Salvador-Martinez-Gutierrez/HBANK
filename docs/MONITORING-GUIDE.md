# HBANK Protocol - Monitoring & Observability Guide

## Overview

This guide covers the complete monitoring and observability setup for the HBANK Protocol, including error tracking with Sentry, performance monitoring, and operational dashboards.

## Table of Contents

1. [Sentry Setup](#sentry-setup)
2. [Error Tracking](#error-tracking)
3. [Performance Monitoring](#performance-monitoring)
4. [Key Metrics](#key-metrics)
5. [Alerts Configuration](#alerts-configuration)
6. [Dashboards](#dashboards)
7. [Best Practices](#best-practices)

---

## Sentry Setup

### Environment Variables

Add these variables to your `.env` file:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_ORG=your-org-name
SENTRY_PROJECT=hbank-protocol
SENTRY_AUTH_TOKEN=your-auth-token

# Environment
NEXT_PUBLIC_ENVIRONMENT=production  # or development, staging
```

### Configuration Files

The Sentry setup consists of:

- **`sentry.client.config.ts`** - Browser/client-side configuration
- **`sentry.server.config.ts`** - Node.js server-side configuration
- **`sentry.edge.config.ts`** - Edge runtime configuration
- **`src/instrumentation.ts`** - Next.js instrumentation hook
- **`src/lib/sentry.ts`** - Utility functions for Sentry

### Features Enabled

✅ **Error Tracking** - All uncaught errors are automatically captured
✅ **Performance Monitoring** - Automatic transaction tracking
✅ **Session Replay** - Visual reproduction of user sessions with errors
✅ **Breadcrumbs** - Detailed event trail leading to errors
✅ **Source Maps** - Production errors show original TypeScript code
✅ **User Context** - Associate errors with specific users
✅ **Environment Filtering** - Separate dev/staging/prod errors

---

## Error Tracking

### Automatic Error Capture

Sentry automatically captures:

- Uncaught exceptions
- Unhandled promise rejections
- Console errors
- React component errors (via Error Boundaries)
- API route errors
- Server action errors

### Manual Error Tracking

Use the utility functions from `src/lib/sentry.ts`:

#### Capture Exceptions

```typescript
import { captureException } from '@/lib/sentry'

try {
  await depositService.createDeposit(userId, amount)
} catch (error) {
  captureException(error, {
    tags: {
      operation: 'deposit',
      service: 'DepositService'
    },
    extra: {
      userId,
      amount,
      timestamp: new Date().toISOString()
    },
    level: 'error'
  })
  throw error // Re-throw if needed
}
```

#### Capture Messages

```typescript
import { captureMessage } from '@/lib/sentry'

// Log important warnings or info
captureMessage('Unusual withdrawal amount detected', 'warning', {
  tags: { operation: 'withdrawal' },
  extra: { amount, userId, threshold: 10000 }
})
```

#### Set User Context

```typescript
import { setUser } from '@/lib/sentry'

// When user logs in
setUser({
  id: user.id,
  email: user.email,
  username: user.walletAddress,
  ip_address: '{{auto}}' // Automatically capture IP
})

// When user logs out
setUser(null)
```

#### Add Breadcrumbs

```typescript
import { addBreadcrumb } from '@/lib/sentry'

addBreadcrumb({
  category: 'deposit',
  message: 'User initiated deposit',
  level: 'info',
  data: {
    amount: 100,
    currency: 'USDC',
    walletAddress: '0.0.12345'
  }
})
```

---

## Performance Monitoring

### Automatic Performance Tracking

Sentry automatically tracks:

- **Page Load Performance** - First Contentful Paint, Largest Contentful Paint
- **Navigation Performance** - Route transitions
- **API Call Duration** - Outgoing HTTP requests
- **Database Query Performance** - If using supported ORMs

### Manual Performance Tracking

#### Track Custom Operations

```typescript
import { startTransaction } from '@/lib/sentry'

async function processWithdrawal(requestId: string) {
  const transaction = startTransaction('withdrawal.process', 'function')

  try {
    // Create child spans for sub-operations
    const verifySpan = transaction.startChild({
      op: 'verification',
      description: 'Verify schedule transaction'
    })

    await verifySchedule(requestId)
    verifySpan.finish()

    const transferSpan = transaction.startChild({
      op: 'transfer',
      description: 'Transfer USDC to user'
    })

    await transferUSDC(userId, amount)
    transferSpan.finish()

  } finally {
    transaction.finish()
  }
}
```

#### Wrapper Function for Error Handling

```typescript
import { withErrorHandling } from '@/lib/sentry'

// Wrap function with automatic error capture
const safeCreateDeposit = withErrorHandling(
  createDeposit,
  {
    tags: { operation: 'deposit' },
    extra: { service: 'DepositService' }
  }
)

// Now all errors are automatically captured
await safeCreateDeposit(userId, amount)
```

---

## Key Metrics

### Critical Business Metrics

Track these using `trackEvent()`:

```typescript
import { trackEvent } from '@/lib/sentry'

// Deposit Events
trackEvent('deposit.initiated', {
  userId,
  amount,
  currency: 'USDC'
})

trackEvent('deposit.completed', {
  userId,
  amount,
  husdReceived,
  rate,
  duration: endTime - startTime
})

trackEvent('deposit.failed', {
  userId,
  amount,
  reason: error.message
})

// Withdrawal Events
trackEvent('withdrawal.requested', {
  userId,
  amount,
  type: 'standard' // or 'instant'
})

trackEvent('withdrawal.completed', {
  userId,
  amount,
  duration: endTime - startTime
})

// Rate Updates
trackEvent('rate.published', {
  rate,
  totalUsd,
  husdSupply,
  sequenceNumber
})

// Treasury Operations
trackEvent('treasury.rebalance', {
  oldBalance,
  newBalance,
  difference
})
```

### System Metrics

Monitor these automatically via Sentry:

- **Error Rate** - Errors per minute/hour
- **Response Time** - P50, P75, P95, P99 latency
- **Throughput** - Requests per second
- **Apdex Score** - User satisfaction metric
- **Memory Usage** - Heap size and usage
- **CPU Usage** - Process CPU utilization

---

## Alerts Configuration

### Recommended Sentry Alerts

#### 1. High Error Rate

```yaml
Name: High Error Rate
Condition: Error count > 10 in 5 minutes
Action: Email + Slack
Severity: Critical
```

#### 2. Performance Degradation

```yaml
Name: Slow API Responses
Condition: P95 latency > 2000ms for 10 minutes
Action: Email + Slack
Severity: Warning
```

#### 3. Critical Deposit Failures

```yaml
Name: Deposit Failures
Condition: Event tag "operation=deposit" AND level=error > 5 in 10 minutes
Action: Email + PagerDuty
Severity: Critical
```

#### 4. Withdrawal Failures

```yaml
Name: Withdrawal Failures
Condition: Event tag "operation=withdrawal" AND level=error > 3 in 10 minutes
Action: Email + PagerDuty
Severity: Critical
```

#### 5. Mirror Node Verification Failures

```yaml
Name: Mirror Node Failures
Condition: Message contains "Mirror Node" AND level=error > 5 in 15 minutes
Action: Email + Slack
Severity: High
```

#### 6. Treasury Balance Alerts

```yaml
Name: Low Treasury Balance
Condition: Event "treasury.low_balance"
Action: Email + Slack + PagerDuty
Severity: Critical
```

### Custom Alert Examples

```typescript
// Low balance alert
if (treasuryBalance < MINIMUM_THRESHOLD) {
  captureMessage('Treasury balance below minimum threshold', 'critical', {
    tags: { alert: 'treasury', type: 'low_balance' },
    extra: {
      current: treasuryBalance,
      threshold: MINIMUM_THRESHOLD,
      difference: MINIMUM_THRESHOLD - treasuryBalance
    }
  })
}

// Rate anomaly alert
if (Math.abs(newRate - lastRate) / lastRate > 0.05) {
  captureMessage('Unusual rate change detected', 'warning', {
    tags: { alert: 'rate', type: 'anomaly' },
    extra: {
      oldRate: lastRate,
      newRate,
      changePercent: ((newRate - lastRate) / lastRate) * 100
    }
  })
}
```

---

## Dashboards

### 1. Operations Dashboard

**Key Metrics:**
- Total Deposits (24h, 7d, 30d)
- Total Withdrawals (24h, 7d, 30d)
- Active Users
- Total Value Locked (TVL)
- Current Exchange Rate
- Treasury Balance

**Charts:**
- Deposits vs Withdrawals (line chart)
- TVL over time (area chart)
- Rate history (line chart)
- User activity (bar chart)

### 2. Performance Dashboard

**Key Metrics:**
- Average Response Time
- P95 Latency
- Error Rate
- Requests per Minute
- Apdex Score

**Charts:**
- Response time distribution (histogram)
- Errors by endpoint (bar chart)
- Throughput over time (line chart)
- Error rate over time (line chart)

### 3. Errors Dashboard

**Key Metrics:**
- Total Errors (24h)
- Error Rate Trend
- Top Failing Operations
- Most Common Error Types

**Charts:**
- Errors by operation (pie chart)
- Error trend (line chart)
- Error distribution by service (stacked bar)

### 4. Business Metrics Dashboard

**Key Metrics:**
- Total Volume (USDC)
- Total HUSD Minted
- Average Deposit Size
- Average Withdrawal Size
- Instant vs Standard Withdrawals

**Charts:**
- Volume over time (line chart)
- Deposit size distribution (histogram)
- Withdrawal type breakdown (pie chart)

---

## Best Practices

### 1. Error Handling

```typescript
// ✅ GOOD: Capture error with context
try {
  await performOperation()
} catch (error) {
  captureException(error, {
    tags: { operation: 'operationName' },
    extra: { userId, params }
  })
  throw error
}

// ❌ BAD: Silent failure
try {
  await performOperation()
} catch (error) {
  console.error(error) // Error is lost
}
```

### 2. User Context

```typescript
// ✅ GOOD: Set user context early
useEffect(() => {
  if (user) {
    setUser({
      id: user.id,
      username: user.walletAddress
    })
  }
}, [user])

// ❌ BAD: No user context
// Errors have no user association
```

### 3. Breadcrumbs

```typescript
// ✅ GOOD: Add meaningful breadcrumbs
addBreadcrumb({
  category: 'navigation',
  message: 'User navigated to deposit page',
  level: 'info'
})

addBreadcrumb({
  category: 'deposit',
  message: 'User entered amount',
  data: { amount: 100 }
})

// ❌ BAD: Too many or useless breadcrumbs
addBreadcrumb({ message: 'Function called' }) // Not helpful
```

### 4. Performance Tracking

```typescript
// ✅ GOOD: Track critical operations
const transaction = startTransaction('deposit.create', 'function')
try {
  await createDeposit()
} finally {
  transaction.finish()
}

// ❌ BAD: Don't track trivial operations
// Tracking every function call creates noise
```

### 5. Sample Rates

```typescript
// Production
tracesSampleRate: 0.1  // 10% of transactions
replaysSessionSampleRate: 0.1  // 10% of sessions
replaysOnErrorSampleRate: 1.0  // 100% of error sessions

// Development
tracesSampleRate: 1.0  // 100% (full visibility)
```

### 6. Sensitive Data

```typescript
// ✅ GOOD: Filter sensitive data
beforeSend(event) {
  if (event.request?.headers) {
    delete event.request.headers.authorization
    delete event.request.headers.cookie
  }
  return event
}

// ❌ BAD: Exposing sensitive data
// Raw headers sent to Sentry
```

---

## Integration with Existing Services

### Logger Integration

```typescript
// In logger.ts
import { captureException, addBreadcrumb } from '@/lib/sentry'

export function createScopedLogger(scope: string) {
  return {
    error: (message: string, context?: Record<string, unknown>) => {
      console.error(`[${scope}] ${message}`, context)
      captureException(new Error(message), {
        tags: { scope },
        extra: context
      })
    },
    warn: (message: string, context?: Record<string, unknown>) => {
      console.warn(`[${scope}] ${message}`, context)
      addBreadcrumb({
        category: scope,
        message,
        level: 'warning',
        data: context
      })
    },
    info: (message: string, context?: Record<string, unknown>) => {
      console.info(`[${scope}] ${message}`, context)
      addBreadcrumb({
        category: scope,
        message,
        level: 'info',
        data: context
      })
    }
  }
}
```

### Event Bus Integration

```typescript
// Subscribe to critical events
eventBus.subscribe('DepositFailed', async (event) => {
  captureException(event.error, {
    tags: {
      event: 'DepositFailed',
      userId: event.userId
    },
    extra: {
      amount: event.amount,
      timestamp: event.timestamp
    }
  })
})

eventBus.subscribe('WithdrawalCompleted', async (event) => {
  trackEvent('withdrawal.completed', {
    userId: event.userId,
    amount: event.amount,
    type: event.type
  })
})
```

---

## Deployment Checklist

Before deploying to production:

- [ ] Set `NEXT_PUBLIC_SENTRY_DSN` environment variable
- [ ] Set `SENTRY_AUTH_TOKEN` for source map uploads
- [ ] Configure `SENTRY_ORG` and `SENTRY_PROJECT`
- [ ] Set appropriate sample rates for production
- [ ] Configure Sentry alerts
- [ ] Create Sentry dashboards
- [ ] Test error capture in staging
- [ ] Test performance monitoring
- [ ] Verify source maps are uploaded
- [ ] Set up PagerDuty/Slack integrations
- [ ] Document on-call procedures

---

## Troubleshooting

### Source Maps Not Working

1. Verify `SENTRY_AUTH_TOKEN` is set
2. Check `SENTRY_ORG` and `SENTRY_PROJECT` are correct
3. Ensure build completes successfully
4. Check Sentry UI for uploaded releases

### High Quota Usage

1. Reduce `tracesSampleRate` (e.g., 0.05 = 5%)
2. Reduce `replaysSessionSampleRate`
3. Add more filters to `ignoreErrors`
4. Review and remove excessive breadcrumbs

### Missing User Context

1. Ensure `setUser()` is called after authentication
2. Verify user ID is set correctly
3. Check that `setUser(null)` is called on logout

---

## Resources

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Performance Monitoring](https://docs.sentry.io/platforms/javascript/performance/)
- [Session Replay](https://docs.sentry.io/platforms/javascript/session-replay/)
- [Alerts & Notifications](https://docs.sentry.io/product/alerts/)
- [HBANK Protocol Sentry Dashboard](https://sentry.io/organizations/YOUR_ORG/issues/)

---

**Last Updated:** 2025-01-29
**Version:** 1.0.0
