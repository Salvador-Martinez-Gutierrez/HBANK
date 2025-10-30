# Performance Optimization Guide

## Overview

This document outlines performance optimization strategies for the HBANK Protocol, covering both backend services and frontend React components.

## Phase 5.3 Objectives

1. **Reduce Component Complexity**: Refactor large components into smaller, focused units
2. **Optimize Re-renders**: Implement memoization strategies
3. **Improve Bundle Size**: Code splitting and lazy loading
4. **Database Optimization**: Query optimization and indexing
5. **API Performance**: Reduce latency and improve throughput

## Current Performance Issues

### ESLint Complexity Warnings

Based on the build output, these components need refactoring:

| Component | Issue | Current | Max | Priority |
|-----------|-------|---------|-----|----------|
| `MintActionButton` | Lines | 532 | 150 | High |
| `MintActionButton` handler | Complexity | 63 | 20 | Critical |
| `RedeemActionButton` | Lines | 501 | 150 | High |
| `RedeemActionButton` | Complexity | 25 | 20 | High |
| `TradingInterface` | Lines | 438 | 150 | High |
| `useAccountID` handler | Complexity | 25 | 20 | Medium |
| `useTokenBalances` | Lines | 188 | 150 | Medium |
| `useTokenBalances` handler | Complexity | 156 lines | 150 | Medium |
| `PerformancePage` | Lines | 510 | 150 | Medium |
| `CapitalAllocationCard` | Lines | 185 | 150 | Low |
| `WalletTrackingCard` | Lines | 413 | 150 | Low |
| `HCFExplainer` | Lines | 159 | 150 | Low |
| `HCFTradingInterface` | Lines | 413 | 150 | Low |

## Optimization Strategies

### 1. Component Refactoring

#### Strategy: Extract Sub-components

**Before** (MintActionButton - 532 lines):
```typescript
export function MintActionButton() {
  // 532 lines of mixed concerns:
  // - State management
  // - Hedera wallet connection
  // - Transaction submission
  // - Error handling
  // - UI rendering
  // - Validation
  // - Loading states
}
```

**After** (Recommended structure):
```typescript
// Main component - orchestration only
export function MintActionButton() {
  return (
    <TransactionProvider>
      <MintForm />
    </TransactionProvider>
  )
}

// Extracted components (each < 150 lines)
function MintForm() {
  const { submitTransaction } = useTransaction()
  return (
    <>
      <MintAmountInput />
      <MintPreview />
      <MintSubmitButton onClick={submitTransaction} />
    </>
  )
}

function MintAmountInput() { /* 50 lines */ }
function MintPreview() { /* 80 lines */ }
function MintSubmitButton() { /* 40 lines */ }
```

#### Strategy: Extract Custom Hooks

**Before** (Complex logic in component):
```typescript
function MintActionButton() {
  const [amount, setAmount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)

  // 200 lines of Hedera connection logic
  // 150 lines of transaction logic
  // 100 lines of validation logic
}
```

**After** (Hooks extraction):
```typescript
function MintActionButton() {
  const { amount, setAmount, validate } = useMintAmount()
  const { isConnected, connect } = useHederaWallet()
  const { submit, error, loading } = useMintTransaction()

  // 50 lines of simple orchestration
}

// Separate hook files
function useMintAmount() { /* 80 lines */ }
function useHederaWallet() { /* 120 lines */ }
function useMintTransaction() { /* 150 lines */ }
```

### 2. Reduce Cyclomatic Complexity

#### Strategy: Replace Nested Conditions with Guard Clauses

**Before** (Complexity: 63):
```typescript
const handleSubmit = async () => {
  if (isConnected) {
    if (amount > 0) {
      if (balance >= amount) {
        if (!isLoading) {
          if (validateInput()) {
            if (rateData) {
              if (!error) {
                try {
                  // Submit transaction
                } catch (err) {
                  if (err.code === 'USER_REJECTED') {
                    // Handle rejection
                  } else if (err.code === 'INSUFFICIENT_FUNDS') {
                    // Handle insufficient funds
                  } else {
                    // Handle other errors
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**After** (Complexity: ~15):
```typescript
const handleSubmit = async () => {
  // Early returns
  if (!isConnected) return showConnectWallet()
  if (amount <= 0) return showError('Invalid amount')
  if (balance < amount) return showError('Insufficient funds')
  if (isLoading) return
  if (!validateInput()) return
  if (!rateData) return showError('Rate unavailable')
  if (error) return

  try {
    await submitTransaction()
  } catch (err) {
    handleTransactionError(err)
  }
}

function handleTransactionError(err: Error) {
  switch (err.code) {
    case 'USER_REJECTED':
      return showUserRejectedMessage()
    case 'INSUFFICIENT_FUNDS':
      return showInsufficientFundsMessage()
    default:
      return showGenericError(err)
  }
}
```

#### Strategy: Extract Validation Logic

**Before**:
```typescript
const validateTransaction = (amount, wallet, rate) => {
  if (!amount) return { valid: false, error: 'No amount' }
  if (amount <= 0) return { valid: false, error: 'Amount must be positive' }
  if (amount > MAX_AMOUNT) return { valid: false, error: 'Amount too large' }
  if (!wallet) return { valid: false, error: 'No wallet' }
  if (!wallet.isConnected) return { valid: false, error: 'Wallet not connected' }
  if (!rate) return { valid: false, error: 'No rate' }
  if (rate <= 0) return { valid: false, error: 'Invalid rate' }
  // ... 20 more conditions
  return { valid: true }
}
```

**After**:
```typescript
// Use validation library (e.g., Zod)
import { z } from 'zod'

const TransactionSchema = z.object({
  amount: z.number().positive().max(MAX_AMOUNT),
  wallet: z.object({
    isConnected: z.boolean().refine(v => v === true),
    address: z.string().min(1)
  }),
  rate: z.number().positive()
})

const validateTransaction = (data) => {
  return TransactionSchema.safeParse(data)
}
```

### 3. React Performance Optimization

#### Strategy: Memoization

```typescript
import { memo, useMemo, useCallback } from 'react'

// Memoize expensive calculations
const MintPreview = memo(function MintPreview({ amount, rate }) {
  const expectedHUSD = useMemo(() => {
    return calculateExpectedAmount(amount, rate)
  }, [amount, rate])

  return <div>{expectedHUSD}</div>
})

// Memoize callbacks
function MintForm() {
  const handleAmountChange = useCallback((value: number) => {
    setAmount(value)
    trackEvent('amount_changed', { value })
  }, []) // Dependencies: none if setAmount is from useState

  return <Input onChange={handleAmountChange} />
}
```

#### Strategy: Code Splitting

```typescript
// Before: All pages load immediately
import PerformancePage from './performance/page'
import TransparencyPage from './transparency/page'

// After: Lazy load heavy pages
import { lazy, Suspense } from 'react'

const PerformancePage = lazy(() => import('./performance/page'))
const TransparencyPage = lazy(() => import('./transparency/page'))

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/performance" element={<PerformancePage />} />
        <Route path="/transparency" element={<TransparencyPage />} />
      </Routes>
    </Suspense>
  )
}
```

#### Strategy: Virtual Scrolling

For long lists (e.g., transaction history):

```typescript
// Before: Render all items
<div>
  {transactions.map(tx => <TransactionRow key={tx.id} {...tx} />)}
</div>

// After: Virtual scrolling with react-window
import { FixedSizeList } from 'react-window'

<FixedSizeList
  height={600}
  itemCount={transactions.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <TransactionRow style={style} {...transactions[index]} />
  )}
</FixedSizeList>
```

### 4. Backend Performance

#### Strategy: Database Query Optimization

**Before** (N+1 queries):
```typescript
async function getUserDeposits(userId: string) {
  const deposits = await db.deposits.findMany({ userId })

  // N+1 problem: 1 query for deposits + N queries for rates
  const enriched = await Promise.all(
    deposits.map(async deposit => ({
      ...deposit,
      rate: await db.rates.findById(deposit.rateId)
    }))
  )

  return enriched
}
```

**After** (Single query with join):
```typescript
async function getUserDeposits(userId: string) {
  return await db.deposits.findMany({
    where: { userId },
    include: { rate: true }  // Single query with JOIN
  })
}
```

#### Strategy: Implement Caching

```typescript
import { CacheKeyBuilder, ICacheService } from '@/infrastructure/cache'

class RateService {
  constructor(private cache: ICacheService) {}

  async getCurrentRate(): Promise<RateData> {
    const key = CacheKeyBuilder.currentRate()

    // Try cache first
    const cached = await this.cache.get<RateData>(key)
    if (cached) return cached

    // Fetch from source
    const rate = await this.fetchFromConsensus()

    // Cache for 60 seconds
    await this.cache.set(key, rate, 60)

    return rate
  }
}
```

#### Strategy: Batch API Requests

**Before** (Multiple requests):
```typescript
// Client makes 3 separate requests
const rate = await fetch('/api/rate')
const tvl = await fetch('/api/tvl')
const balance = await fetch('/api/balance')
```

**After** (Single batch request):
```typescript
// Client makes 1 request
const data = await fetch('/api/dashboard', {
  body: JSON.stringify({
    queries: ['rate', 'tvl', 'balance']
  })
})

// Server batches internally
app.post('/api/dashboard', async (req, res) => {
  const results = await Promise.all(
    req.body.queries.map(query => handlers[query]())
  )
  res.json(results)
})
```

### 5. Bundle Size Optimization

#### Strategy: Tree Shaking

```typescript
// Before: Import entire library
import _ from 'lodash'
_.debounce(fn, 300)

// After: Import only what you need
import debounce from 'lodash/debounce'
debounce(fn, 300)
```

#### Strategy: Dynamic Imports

```typescript
// Before: Large library loaded upfront
import { Chart } from 'chart.js'

// After: Load only when needed
const renderChart = async (data) => {
  const { Chart } = await import('chart.js')
  new Chart(ctx, { data })
}
```

## Implementation Plan

### High Priority (Complete in Phase 5.3)

1. **Refactor MintActionButton** (src/app/(protocol)/earn/components/mint-action-button.tsx:175:24)
   - Extract `useMintTransaction` hook
   - Extract `MintAmountInput` component
   - Extract `MintPreview` component
   - Reduce complexity from 63 to < 20

2. **Refactor RedeemActionButton** (src/app/(protocol)/earn/components/redeem-action-button.tsx:46:8)
   - Extract `useRedeemTransaction` hook
   - Extract validation logic
   - Reduce complexity from 25 to < 20

3. **Refactor TradingInterface** (src/app/(protocol)/earn/components/trading-interface.tsx:31:8)
   - Extract `TradingForm` component
   - Extract `TradingTabs` component
   - Reduce from 438 lines to < 150

### Medium Priority (Phase 6)

4. **Optimize useAccountID** hook
5. **Optimize useTokenBalances** hook
6. **Refactor PerformancePage** (510 lines)
7. **Implement virtual scrolling** for transaction lists

### Low Priority (Future)

8. **Refactor CapitalAllocationCard**
9. **Refactor WalletTrackingCard**
10. **Refactor HCFExplainer**
11. **Refactor HCFTradingInterface**

## Performance Metrics

### Target Metrics

| Metric | Current | Target | Priority |
|--------|---------|--------|----------|
| Component Complexity (max) | 63 | < 20 | Critical |
| Component Lines (max) | 532 | < 150 | High |
| Bundle Size | TBD | < 200KB | Medium |
| First Contentful Paint | TBD | < 1.5s | High |
| Time to Interactive | TBD | < 3s | High |
| API Response Time (p95) | TBD | < 200ms | Medium |
| Cache Hit Rate | N/A | > 80% | Medium |

### Measurement Tools

1. **React DevTools Profiler**: Identify slow renders
2. **Chrome Lighthouse**: Overall performance score
3. **Bundle Analyzer**: Identify large dependencies
4. **New Relic / Datadog**: Backend API performance
5. **Cache Statistics**: Hit/miss rates

## Testing Strategy

### Performance Tests

```typescript
describe('MintActionButton Performance', () => {
  it('should render in < 50ms', async () => {
    const start = performance.now()
    render(<MintActionButton />)
    const end = performance.now()

    expect(end - start).toBeLessThan(50)
  })

  it('should not re-render on unrelated prop changes', () => {
    const { rerender } = render(<MintActionButton amount={100} />)
    const renderCount = getRenderCount()

    rerender(<MintActionButton amount={100} unrelatedProp="changed" />)

    expect(getRenderCount()).toBe(renderCount) // No re-render
  })
})
```

### Load Tests

```typescript
import { check } from 'k6'
import http from 'k6/http'

export default function() {
  const res = http.get('http://localhost:3001/api/rate')

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  })
}
```

## Monitoring

### Client-Side Metrics

```typescript
// Track component render time
import { useEffect, useRef } from 'react'

function useRenderTime(componentName: string) {
  const renderStart = useRef(performance.now())

  useEffect(() => {
    const renderTime = performance.now() - renderStart.current

    if (renderTime > 50) {
      console.warn(`${componentName} slow render: ${renderTime}ms`)
      // Send to monitoring service
    }
  })
}
```

### Server-Side Metrics

```typescript
// Track API endpoint performance
import { createScopedLogger } from '@/lib/logger'

const logger = createScopedLogger('api-performance')

function withPerformanceLogging(handler: Function) {
  return async (req, res) => {
    const start = Date.now()

    try {
      const result = await handler(req, res)
      const duration = Date.now() - start

      logger.info('API call completed', {
        endpoint: req.url,
        method: req.method,
        duration,
        status: res.statusCode
      })

      return result
    } catch (error) {
      logger.error('API call failed', {
        endpoint: req.url,
        duration: Date.now() - start,
        error
      })
      throw error
    }
  }
}
```

## Best Practices Summary

1. ✅ Keep components under 150 lines
2. ✅ Keep cyclomatic complexity under 20
3. ✅ Extract complex logic into custom hooks
4. ✅ Memoize expensive calculations with `useMemo`
5. ✅ Memoize callbacks with `useCallback`
6. ✅ Memoize components with `memo`
7. ✅ Use code splitting for large pages
8. ✅ Implement caching for frequently accessed data
9. ✅ Use guard clauses instead of nested conditions
10. ✅ Monitor performance metrics in production

## Resources

- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Web Vitals](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Caching Guide](./CACHING-GUIDE.md)

## Related Documentation

- [Refactoring Guide](../REFACTORING-GUIDE.md)
- [Caching Guide](./CACHING-GUIDE.md)
- [Testing Strategy](./TESTING-STRATEGY.md)
