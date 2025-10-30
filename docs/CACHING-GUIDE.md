# Caching Guide

## Overview

The HBANK Protocol implements a flexible caching strategy that supports both Redis (production) and in-memory (development) backends. The caching layer improves performance by reducing redundant computations and external API calls.

## Architecture

### Cache Service Interface

All cache implementations follow the `ICacheService` interface, which provides:

- **get<T>(key)**: Retrieve a cached value
- **set<T>(key, value, ttl?)**: Store a value with optional TTL
- **delete(key)**: Remove a single entry
- **deletePattern(pattern)**: Remove multiple entries matching a pattern
- **exists(key)**: Check if a key exists
- **clear()**: Clear all entries
- **getStats()**: Get cache hit/miss statistics
- **disconnect()**: Close the cache connection

### Implementations

#### 1. InMemoryCacheService

**Use case**: Development and testing

**Features**:
- Simple Map-based storage
- TTL support with automatic cleanup
- Pattern matching for bulk deletions
- Zero external dependencies

**Configuration**:
```typescript
import { InMemoryCacheService } from '@/infrastructure/cache'

const cache = new InMemoryCacheService(
  60000 // Cleanup interval in milliseconds (default: 60s)
)
```

**Limitations**:
- Not suitable for distributed environments
- Data is lost on restart
- Limited to single process memory

#### 2. RedisCacheService

**Use case**: Production and staging environments

**Features**:
- Persistent storage
- Distributed caching across multiple instances
- High performance
- Automatic reconnection
- Production-grade reliability

**Configuration**:
```typescript
import { RedisCacheService } from '@/infrastructure/cache'

const cache = new RedisCacheService({
  host: 'localhost',      // or process.env.REDIS_HOST
  port: 6379,            // or process.env.REDIS_PORT
  password: 'secret',    // or process.env.REDIS_PASSWORD
  db: 0,                 // or process.env.REDIS_DB
  keyPrefix: 'hbank:',   // Prefix for all keys
  maxRetries: 3,         // Max connection retries
  enableOfflineQueue: true
})
```

**Environment Variables**:
- `REDIS_HOST`: Redis server host (default: localhost)
- `REDIS_PORT`: Redis server port (default: 6379)
- `REDIS_PASSWORD`: Redis password (optional)
- `REDIS_DB`: Redis database number (default: 0)

## Cache Key Builder

The `CacheKeyBuilder` utility provides standardized cache keys:

```typescript
import { CacheKeyBuilder } from '@/infrastructure/cache'

// Rate-related keys
CacheKeyBuilder.currentRate()              // "rate:current"
CacheKeyBuilder.rateHistory(10)            // "rate:history:10"

// TVL
CacheKeyBuilder.tvl()                       // "tvl:current"

// Token prices
CacheKeyBuilder.tokenPrice('0.0.123456')   // "token:price:0.0.123456"

// Wallet balances
CacheKeyBuilder.walletBalance(
  '0.0.123456',  // account ID
  '0.0.654321'   // token ID
)  // "wallet:balance:0.0.123456:0.0.654321"

// User operations
CacheKeyBuilder.userDeposits('0.0.123456')     // "user:deposits:0.0.123456"
CacheKeyBuilder.userWithdrawals('0.0.123456')  // "user:withdrawals:0.0.123456"

// Withdrawals
CacheKeyBuilder.instantWithdrawalMax()         // "withdrawal:instant:max"
```

## Usage Examples

### Basic Operations

```typescript
import { InMemoryCacheService, CacheKeyBuilder } from '@/infrastructure/cache'

const cache = new InMemoryCacheService()

// Store current rate with 5-minute TTL
await cache.set(
  CacheKeyBuilder.currentRate(),
  { rate: 1.05, timestamp: new Date() },
  300  // 5 minutes
)

// Retrieve cached rate
const cachedRate = await cache.get<{ rate: number; timestamp: Date }>(
  CacheKeyBuilder.currentRate()
)

if (cachedRate) {
  console.log('Cache hit:', cachedRate.rate)
} else {
  console.log('Cache miss - fetch from source')
}

// Delete specific key
await cache.delete(CacheKeyBuilder.currentRate())

// Delete all user-related data
await cache.deletePattern('user:*')

// Get cache statistics
const stats = cache.getStats()
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`)
```

### Integration with Services

Example: Caching in RateService

```typescript
import { ICacheService, CacheKeyBuilder } from '@/infrastructure/cache'

export class RateService {
  constructor(private cache: ICacheService) {}

  async getCurrentRate(): Promise<RateData> {
    const cacheKey = CacheKeyBuilder.currentRate()

    // Try cache first
    const cached = await this.cache.get<RateData>(cacheKey)
    if (cached) {
      return cached
    }

    // Cache miss - fetch from source
    const rate = await this.fetchRateFromConsensus()

    // Store in cache with 60-second TTL
    await this.cache.set(cacheKey, rate, 60)

    return rate
  }

  async publishRate(rate: RateData): Promise<void> {
    // Publish to Hedera
    await this.consensusService.publish(rate)

    // Invalidate cache
    await this.cache.delete(CacheKeyBuilder.currentRate())
  }
}
```

### Cache Invalidation Strategies

#### 1. Time-Based (TTL)

Best for: Data that changes periodically

```typescript
// Cache for 5 minutes
await cache.set(key, value, 300)
```

#### 2. Event-Based

Best for: Data that changes on specific events

```typescript
// On deposit completion, invalidate user cache
eventBus.subscribe('deposit.completed', async (event) => {
  await cache.delete(
    CacheKeyBuilder.userDeposits(event.userAccountId)
  )
  await cache.delete(CacheKeyBuilder.tvl())
})

// On rate published, invalidate rate cache
eventBus.subscribe('rate.published', async () => {
  await cache.delete(CacheKeyBuilder.currentRate())
  await cache.deletePattern('rate:history:*')
})
```

#### 3. Write-Through

Best for: Critical data that must stay synchronized

```typescript
async updateWalletBalance(accountId: string, tokenId: string, balance: number) {
  // Update database
  await db.updateBalance(accountId, tokenId, balance)

  // Update cache immediately
  const cacheKey = CacheKeyBuilder.walletBalance(accountId, tokenId)
  await cache.set(cacheKey, balance, 300)
}
```

## Recommended TTL Values

| Data Type | TTL | Reason |
|-----------|-----|--------|
| Current Rate | 60s | Updates every minute |
| Rate History | 300s (5m) | Historical data, changes slowly |
| TVL | 300s (5m) | Expensive calculation |
| Token Prices | 60s | External API, rate-limited |
| Wallet Balances | 30s | User-facing, needs freshness |
| User Deposits | 300s (5m) | Changes only on deposits |
| User Withdrawals | 300s (5m) | Changes only on withdrawals |
| Instant Withdrawal Max | 60s | Pool balance dependent |

## Cache Statistics

Monitor cache performance using built-in metrics:

```typescript
const stats = cache.getStats()

console.log({
  hits: stats.hits,           // Total cache hits
  misses: stats.misses,       // Total cache misses
  sets: stats.sets,           // Total writes
  deletes: stats.deletes,     // Total deletions
  errors: stats.errors,       // Total errors
  hitRate: stats.hitRate      // Hit rate (0-1)
})

// Reset statistics
cache.resetStats()
```

**Target Metrics**:
- Hit rate > 80% for frequently accessed data
- Hit rate > 60% for moderately accessed data
- Errors should be 0 in steady state

## Best Practices

### 1. Always Use CacheKeyBuilder

❌ **Don't**:
```typescript
await cache.set('current-rate', data)
```

✅ **Do**:
```typescript
await cache.set(CacheKeyBuilder.currentRate(), data)
```

### 2. Handle Cache Failures Gracefully

❌ **Don't**:
```typescript
const data = await cache.get(key)
return data  // Could be null!
```

✅ **Do**:
```typescript
const cached = await cache.get(key)
if (cached) return cached

// Fallback to source
const fresh = await fetchFromSource()
await cache.set(key, fresh, ttl)
return fresh
```

### 3. Set Appropriate TTLs

❌ **Don't**:
```typescript
// Never expires - can cause stale data
await cache.set(key, data)
```

✅ **Do**:
```typescript
// Explicit TTL based on data characteristics
await cache.set(key, data, 300)  // 5 minutes
```

### 4. Invalidate on Updates

❌ **Don't**:
```typescript
async updateData(id: string, data: any) {
  await db.update(id, data)
  // Cache now stale!
}
```

✅ **Do**:
```typescript
async updateData(id: string, data: any) {
  await db.update(id, data)
  await cache.delete(buildKey(id))
}
```

### 5. Use Pattern Deletion Carefully

❌ **Don't**:
```typescript
// Too broad - deletes everything
await cache.deletePattern('*')
```

✅ **Do**:
```typescript
// Specific pattern
await cache.deletePattern('user:123456:*')
```

## Testing

### Unit Tests with InMemoryCache

```typescript
import { InMemoryCacheService } from '@/infrastructure/cache'

describe('MyService', () => {
  let cache: InMemoryCacheService

  beforeEach(() => {
    cache = new InMemoryCacheService()
  })

  afterEach(async () => {
    await cache.disconnect()
  })

  it('should cache results', async () => {
    const service = new MyService(cache)

    // First call - cache miss
    await service.getData()
    expect(cache.getStats().misses).toBe(1)

    // Second call - cache hit
    await service.getData()
    expect(cache.getStats().hits).toBe(1)
  })
})
```

### Integration Tests with Redis

```typescript
import { RedisCacheService } from '@/infrastructure/cache'

describe('Integration: Caching', () => {
  let cache: RedisCacheService

  beforeAll(() => {
    cache = new RedisCacheService({
      host: 'localhost',
      port: 6379,
      db: 1  // Use separate DB for testing
    })
  })

  afterAll(async () => {
    await cache.clear()
    await cache.disconnect()
  })

  it('should persist across restarts', async () => {
    await cache.set('test-key', 'test-value')

    // Simulate restart
    await cache.disconnect()
    cache = new RedisCacheService({ db: 1 })

    const value = await cache.get('test-key')
    expect(value).toBe('test-value')
  })
})
```

## Troubleshooting

### Redis Connection Issues

**Symptom**: `Redis connection error` in logs

**Solutions**:
1. Verify Redis is running: `redis-cli ping` should return `PONG`
2. Check environment variables
3. Verify network connectivity
4. Check Redis logs

### High Cache Miss Rate

**Symptom**: Hit rate < 50%

**Solutions**:
1. Increase TTL values
2. Verify cache keys are consistent
3. Check if data is changing too frequently
4. Review invalidation logic

### Memory Issues (InMemoryCache)

**Symptom**: High memory usage

**Solutions**:
1. Reduce TTL values
2. Implement size limits
3. Switch to Redis for production
4. Monitor `cache.getSize()`

## Migration Guide

### Development to Production

When moving from InMemoryCache to Redis:

1. **Install Redis**:
```bash
# Docker
docker run -d --name redis -p 6379:6379 redis:latest

# Or use managed service (AWS ElastiCache, etc.)
```

2. **Update environment variables**:
```bash
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

3. **Update service initialization**:
```typescript
// Before (development)
const cache = new InMemoryCacheService()

// After (production)
const cache = process.env.NODE_ENV === 'production'
  ? new RedisCacheService()
  : new InMemoryCacheService()
```

4. **Test thoroughly** - Redis patterns work differently than in-memory

## Future Enhancements

Planned improvements for Phase 6:

1. **Cache warming**: Pre-populate cache on startup
2. **Distributed locking**: Prevent cache stampede
3. **Metrics export**: Prometheus/Datadog integration
4. **Cache versioning**: Handle cache schema changes
5. **Compression**: Reduce memory/network usage for large values
6. **Multi-tier caching**: L1 (memory) + L2 (Redis)

## Related Documentation

- [Event Sourcing](./EVENT-SOURCING.md) - Event-driven cache invalidation
- [Performance Optimization](./PERFORMANCE.md) - Caching best practices
- [Monitoring](./MONITORING.md) - Cache metrics and alerts
