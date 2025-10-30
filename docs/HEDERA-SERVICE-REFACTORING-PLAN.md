# HederaService Refactoring Plan

## Current State

**File:** `src/services/hederaService.ts`
**Lines:** 988 lines
**Issues:**
- Single class handling 6+ different responsibilities
- Difficult to test individual components
- No dependency injection
- Hard to mock for testing

## Identified Responsibilities

### 1. Client Management (HederaClientService)
**Methods:**
- `constructor()` - Client initialization
- `createClientForWallet()` - Wallet-specific client creation
- `getWalletCredentials()` - Credential management

**Responsibility:** Managing Hedera client instances and configurations

### 2. Balance Queries (HederaBalanceService)
**Methods:**
- `checkBalance()` - Query account token balance

**Responsibility:** Querying balances from Hedera network

### 3. Rate Operations (HederaRateService)
**Methods:**
- `publishRate()` - Publish rate to consensus service
- `getCurrentRate()` - Retrieve current rate from topic

**Responsibility:** Managing exchange rate on Hedera Consensus Service

### 4. Deposit Operations (HederaDepositService)
**Methods:**
- `scheduleDeposit()` - Create scheduled deposit transaction
- `createScheduledHUSDTransfer()` - Schedule HUSD transfer

**Responsibility:** Handling deposit-related blockchain operations

### 5. Withdrawal Operations (HederaWithdrawalService)
**Methods:**
- `publishWithdrawRequest()` - Publish withdrawal request
- `publishWithdrawResult()` - Publish withdrawal result
- `transferHUSDToTreasury()` - Move HUSD to treasury
- `transferUSDCToUser()` - Transfer USDC to user
- `rollbackHUSDToUser()` - Rollback failed withdrawal

**Responsibility:** Handling withdrawal-related blockchain operations

### 6. Verification & Mirror Node (HederaMirrorNodeService)
**Methods:**
- `verifyScheduleTransactionExecuted()` - Verify scheduled transaction
- `verifyHUSDTransfer()` - Verify HUSD transfer
- `performHUSDTransferCheck()` - Detailed transfer verification
- `checkTransactionInMirrorNode()` - Query mirror node

**Responsibility:** Verifying transactions via mirror node

## Refactoring Strategy

### Phase 1: Extract Client Factory (Priority: High)
**Why First:** Other services depend on client creation

**Create:** `src/infrastructure/hedera/HederaClientFactory.ts`
```typescript
@injectable()
export class HederaClientFactory {
    constructor() {
        // Load environment configuration
    }

    createMainClient(): Client
    createClientForWallet(walletId: string, walletKey: string): Client
    getWalletCredentials(walletType: WalletType): WalletCredentials
}
```

**Benefits:**
- Centralized client configuration
- Easy to mock for testing
- Single source of truth for credentials

### Phase 2: Extract Balance Service (Priority: High)
**Why:** Simple, clear responsibility

**Create:** `src/infrastructure/hedera/HederaBalanceService.ts`
```typescript
@injectable()
export class HederaBalanceService {
    constructor(
        @inject(TYPES.HederaClientFactory) private clientFactory: HederaClientFactory
    ) {}

    async checkBalance(accountId: string, tokenId: string): Promise<number>
}
```

### Phase 3: Extract Mirror Node Service (Priority: High)
**Why:** Used by multiple other services

**Create:** `src/infrastructure/hedera/HederaMirrorNodeService.ts`
```typescript
@injectable()
export class HederaMirrorNodeService {
    async checkTransactionInMirrorNode(txId: string): Promise<boolean>
    async verifyScheduleTransactionExecuted(scheduleId: string): Promise<boolean>
    async verifyHUSDTransfer(params: VerificationParams): Promise<boolean>
}
```

### Phase 4: Extract Rate Service (Priority: Medium)
**Create:** `src/infrastructure/hedera/HederaRateService.ts`
```typescript
@injectable()
export class HederaRateService {
    constructor(
        @inject(TYPES.HederaClientFactory) private clientFactory: HederaClientFactory,
        @inject(TYPES.EventBus) private eventBus: IEventBus
    ) {}

    async publishRate(rate: number, totalUsd: number, husdSupply: number): Promise<void>
    async getCurrentRate(): Promise<number>
}
```

**Integration:** Publish `RatePublished` event

### Phase 5: Extract Deposit Service (Priority: Medium)
**Create:** `src/infrastructure/hedera/HederaDepositService.ts`
```typescript
@injectable()
export class HederaDepositService {
    constructor(
        @inject(TYPES.HederaClientFactory) private clientFactory: HederaClientFactory,
        @inject(TYPES.HederaMirrorNodeService) private mirrorNode: HederaMirrorNodeService,
        @inject(TYPES.EventBus) private eventBus: IEventBus
    ) {}

    async scheduleDeposit(userId: string, amountUsdc: number): Promise<ScheduleResult>
    async createScheduledHUSDTransfer(params: ScheduleParams): Promise<ScheduleResult>
}
```

**Integration:** Publish `DepositScheduled` event

### Phase 6: Extract Withdrawal Service (Priority: Medium)
**Create:** `src/infrastructure/hedera/HederaWithdrawalService.ts`
```typescript
@injectable()
export class HederaWithdrawalService {
    constructor(
        @inject(TYPES.HederaClientFactory) private clientFactory: HederaClientFactory,
        @inject(TYPES.HederaMirrorNodeService) private mirrorNode: HederaMirrorNodeService,
        @inject(TYPES.EventBus) private eventBus: IEventBus
    ) {}

    async publishWithdrawRequest(params: WithdrawParams): Promise<void>
    async publishWithdrawResult(params: ResultParams): Promise<void>
    async transferHUSDToTreasury(amount: number): Promise<TransferResult>
    async transferUSDCToUser(userId: string, amount: number): Promise<TransferResult>
    async rollbackHUSDToUser(userId: string, amount: number): Promise<void>
}
```

**Integration:** Publish `WithdrawalCompleted`, `WithdrawalFailed` events

## Implementation Order

1. ✅ Create directory structure
2. ✅ Extract HederaClientFactory (needed by all)
3. ✅ Extract HederaBalanceService (simple, no dependencies)
4. ✅ Extract HederaMirrorNodeService (needed by deposit/withdrawal)
5. ✅ Extract HederaRateService (medium complexity)
6. ✅ Extract HederaDepositService (depends on mirror node)
7. ✅ Extract HederaWithdrawalService (most complex)
8. ✅ Update DI container bindings
9. ✅ Deprecate old HederaService
10. ✅ Update all service consumers

## Migration Strategy

### Step 1: Create New Services (No Breaking Changes)
- Create new services alongside existing HederaService
- Don't remove old code yet
- Bind new services to DI container

### Step 2: Update High-Level Services
- Update services to use new Hedera services via DI
- Test thoroughly
- Keep old HederaService as fallback

### Step 3: Remove Old Service
- Once all consumers migrated, delete HederaService
- Remove from DI container
- Update documentation

## Testing Strategy

### Unit Tests
Each new service should have comprehensive unit tests:

```typescript
describe('HederaBalanceService', () => {
    let service: HederaBalanceService
    let mockClientFactory: HederaClientFactory

    beforeEach(() => {
        mockClientFactory = {
            createMainClient: jest.fn(() => mockClient)
        }
        service = new HederaBalanceService(mockClientFactory)
    })

    it('should query balance correctly', async () => {
        // Test implementation
    })
})
```

### Integration Tests
Test services together:

```typescript
describe('Hedera Deposit Flow', () => {
    it('should complete full deposit flow', async () => {
        // Test using real Hedera testnet
    })
})
```

## Benefits

### 1. **Single Responsibility Principle**
Each service has one clear purpose

### 2. **Testability**
- Easy to mock dependencies
- Isolated unit tests
- Fast test execution

### 3. **Maintainability**
- Smaller files (< 200 lines each)
- Clear boundaries
- Easier to understand

### 4. **Reusability**
- Services can be used independently
- No circular dependencies
- Clear API contracts

### 5. **Event-Driven**
- Automatic audit logging
- Business metrics tracking
- Easy to add new handlers

## Risks & Mitigations

### Risk 1: Breaking Existing Functionality
**Mitigation:**
- Keep old service until migration complete
- Comprehensive testing
- Gradual rollout

### Risk 2: Missing Dependencies
**Mitigation:**
- Map all dependencies upfront
- Create interfaces first
- Use DI to manage complexity

### Risk 3: Performance Impact
**Mitigation:**
- Profile before/after
- Use singleton scope in DI
- Cache where appropriate

## Success Criteria

- ✅ All services < 200 lines
- ✅ All services have unit tests
- ✅ All services use DI
- ✅ All services publish events
- ✅ Zero breaking changes for API consumers
- ✅ Build passes
- ✅ All existing tests pass

## Timeline

- **Phase 1 (Client Factory):** 30 minutes
- **Phase 2 (Balance Service):** 20 minutes
- **Phase 3 (Mirror Node Service):** 40 minutes
- **Phase 4 (Rate Service):** 30 minutes
- **Phase 5 (Deposit Service):** 45 minutes
- **Phase 6 (Withdrawal Service):** 60 minutes
- **Testing & Integration:** 60 minutes

**Total Estimated:** ~5 hours

## Next Steps

1. Create `src/infrastructure/hedera/` directory
2. Start with HederaClientFactory
3. Add unit tests for each service
4. Bind to DI container
5. Update consumers progressively
