<div align="center">

# 🏦 HBANK

### **The Onchain Neobank on Hedera Hashgraph**

Onchain Finance & Real-World Assets (RWA)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org/)
[![Hedera SDK](https://img.shields.io/badge/Hedera%20SDK-2.64-7a3ff2?logo=hedera)](https://hedera.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase)](https://supabase.com/)

<img src="public/hb_logo-no-bg.png" alt="Hbank Protocol" width="120" />

[🚀 Launch App](https://hbank.cash)• [🔈 Pitch](https://drive.google.com/file/d/1Ho4N9kTXHvQ7RiAvBBnApqd_rFIz1Myp/view?usp=sharing)  • [📖 Docs](https://hbank.gitbook.io/hbank-docs/) • [🐦 Twitter](https://twitter.com/hbankcash)

</div>

---

## 🎯 **What is Hbank?**

HBank is the fully onchain, self-custodial neobank built on Hedera Hashgraph. We provide a complete suite of financial services including liquid yield tokens for earning passive income, a multi-wallet portfolio tracker, crypto swaps through aggregated liquidity, and a credit card for seamless spending. Unlike traditional neobanks, you maintain full custody of your assets with complete transparency and verifiability on-chain.

---

## ⚡ **Core Products**

### 🏦 **hUSD Vault (/earn) - Liquid Yield Tokens** (TESTNET)

**What it does:**
- Deposit USDC and receive **hUSD** (yield-bearing asset) at current exchange rate
- Earn **13.33% APY** from DeFi strategy allocations (current mocked APY)
- Withdraw anytime via **Instant (0.5% fee)** or **Standard (48h, free)** methods

**Decentralization Mechanisms:**
```
✅ Scheduled Transactions (HTS)
   └─ All deposits use Hedera Scheduled Transactions requiring multi-party signatures
   └─ User must sign their transaction, server provides counter-signature

✅ Rate Publishing (HCS Topic ID: 0.0.6908395)
   └─ Exchange rates published to Hedera Consensus Service (HCS) public topic
   └─ All rate changes are immutably recorded on-chain with timestamps
   └─ Anyone can verify historical rates and calculations

✅ On-Chain Withdrawal Requests (HCS Topic ID: 0.0.6908400)
   └─ Standard withdrawals are published to HCS withdrawal topic
   └─ 48-hour timelock enforced on-chain before processing
   └─ Complete audit trail of all withdrawal requests/results

✅ Multi-Wallet Treasury System
   └─ Separate wallets for deposits, emissions, instant/standard withdrawals
   └─ Transparent wallet balances viewable on /earn/transparency page
```

**Technical Implementation:**
- **Deposit Flow**: `initializeDeposit()` → Creates HTS scheduled transaction → User signs → `completeTreasurySignature()` → Atomic swap (USDC ↔ hUSD)
- **Rate Management**: `HederaRateService` fetches latest rates from HCS topic, validates sequence numbers for consistency
- **Withdrawal Processing**: `WithdrawService` publishes requests to HCS, automated cron processes after timelock

### 📊 **Portfolio Tracker (/portfolio) - Multi-Wallet Asset Tracking** (TESTNET + MAINNET)

**What it does:**
- Add up to 5 mainnet Hedera wallet addresses (0.0.xxxxx format)
- Track **fungible tokens** with real-time prices from SaucerSwap
- Monitor **DeFi positions**: SaucerSwap V1 pools/farms, Bonzo Finance lending
- View **NFT collections** with IPFS metadata resolution
- Aggregate view across all wallets or individual wallet breakdown

**Decentralization Mechanisms:**
```
✅ Signature-Based Authentication (No Passwords)
   └─ Portfolio access secured by signing a nonce with your Hedera wallet
   └─ Zero-knowledge proof: server verifies signature without storing private keys
   └─ JWT tokens with short expiration for session management

✅ Direct On-Chain Data Fetching
   └─ All balance data fetched from Validation Cloud Hedera Mirror Node
   └─ No intermediary databases for critical balance information
   └─ Real-time sync with mainnet state

✅ Open APIs for DeFi Data
   └─ SaucerSwap public API for DEX positions
   └─ Bonzo Finance API for lending positions
   └─ Transparent third-party data sources, verifiable by anyone

✅ Client-Side Price Updates
   └─ WebSocket connections for real-time price feeds
   └─ Prices update every 10 seconds without backend intervention
```

**Technical Implementation:**
- **Authentication**: `usePortfolioAuth()` → Generates nonce → User signs with wallet → `portfolioAuthService` verifies ED25519 signature
- **Wallet Sync**: `syncWalletTokens()` → Queries Hedera Mirror Node `/accounts/{id}` → Categorizes fungible/NFT/LP tokens → Fetches DeFi positions
- **NFT Metadata**: IPFS URIs decoded from base64 → Fetched via IPFS gateway → Images and properties displayed
- **DeFi Tracking**: Detects LP tokens (ssLP prefix) → Queries pool reserves → Calculates user's share of liquidity

---

## 🛠️ **Technology Stack**

<div align="center">

### **Frontend Architecture**

|                                   Technology                                    |                Purpose                 |
| :-----------------------------------------------------------------------------: | :------------------------------------: |
|     ![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)      |       React framework with SSR/ISR        |
|        ![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)        |            UI component library            |
| ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript) |          Type-safe development          |
|  ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38B2AC?logo=tailwind-css)  |         Utility-first CSS styling         |
|     ![Radix UI](https://img.shields.io/badge/Radix%20UI-Components-161618)     | Accessible component primitives |

### **Blockchain Integration - Hedera SDK**

|                             Technology                             |                       Purpose                        |
| :----------------------------------------------------------------: | :--------------------------------------------------: |
| ![Hedera SDK](https://img.shields.io/badge/Hedera%20SDK-2.64-7a3ff2) | **Core blockchain interactions** |
|       `@hashgraph/sdk` <br/> **HTS (Token Service)**       | Create/transfer fungible tokens (USDC, hUSD) |
|         `ScheduleCreateTransaction` <br/> **HTS**         | Multi-signature atomic swaps for deposits |
|    `TopicMessageSubmitTransaction` <br/> **HCS**    | Publish rates & withdrawals to public topics |
|         `AccountBalanceQuery` <br/> **Queries**         | Check token balances before transactions |
|  `@buidlerlabs/hashgraph-react-wallets`   | HashPack, Kabila, Blade wallet integration |

### **Backend & Database**

|                                Technology                                 |                   Purpose                    |
| :-----------------------------------------------------------------------: | :------------------------------------------: |
| ![Next.js API](https://img.shields.io/badge/Next.js%20API-Routes-black) |   Serverless API endpoints (Vercel Edge)   |
|  ![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E)   | User data, wallet tracking, portfolio state |
|   ![Zod](https://img.shields.io/badge/Zod-Validation-3068B7?logo=zod)   |         Runtime schema validation         |
|      ![Jose](https://img.shields.io/badge/Jose-JWT-000000?logo=jwt)      |           JWT token management            |

### **Data Sources**

|                           Source                           |                       Purpose                        |
| :--------------------------------------------------------: | :--------------------------------------------------: |
|       **Hedera Mirror Node** <br/> Validation Cloud       | Token balances, transaction history (mainnet data) |
|         **SaucerSwap API** <br/> GraphQL + REST         |   Token prices, LP pool reserves, farm positions   |
| **Bonzo Finance API** <br/> REST | Lending/borrowing positions, APY data |
|           **IPFS Gateways** <br/> ipfs.io           |          NFT metadata & image resolution          |

</div>

---

## 📁 **Project Architecture**

```
HBANK-PROTOCOL/
│
├── 📱 src/app/                        # Next.js App Router
│   ├── (protocol)/                   # Protected routes group
│   │   ├── earn/                     # hUSD Vault Page
│   │   │   ├── page.tsx              # Main trading interface
│   │   │   ├── components/
│   │   │   │   ├── trading-interface.tsx      # Mint/Redeem UI
│   │   │   │   ├── mint-action-button.tsx     # Deposit flow handler
│   │   │   │   └── redeem-action-button.tsx   # Withdrawal handler
│   │   │   ├── transparency/         # On-chain verification page
│   │   │   │   └── components/
│   │   │   │       ├── wallet-tracking-card.tsx  # Treasury balances
│   │   │   │       └── instant-redemption-card.tsx # Capacity display
│   │   │   └── hooks/
│   │   │       ├── useRealTimeRate.tsx        # HCS rate subscription
│   │   │       └── useTokenBalances.tsx       # User balances
│   │   │
│   │   └── portfolio/                # Multi-Wallet Tracker
│   │       ├── page.tsx              # Portfolio dashboard
│   │       └── components/           # (uses shared components/)
│   │
│   └── providers/
│       └── wallet-provider.tsx       # Hedera wallet context
│
├── 📦 components/                     # Shared React components
│   ├── connect-wallet-button.tsx     # Multi-wallet connection
│   ├── wallet-card.tsx               # Individual wallet display
│   ├── aggregated-portfolio-view.tsx # Cross-wallet aggregation
│   ├── asset-sections.tsx            # Token/DeFi/NFT sections
│   └── deposit-dialog.tsx            # Deposit modal with rate lock
│
├── 🔧 services/                       # Business logic layer
│   ├── hederaService.ts              # 🌟 Core Hedera SDK wrapper
│   │   ├── publishRate()             # HCS rate publishing
│   │   ├── scheduleDeposit()         # HTS scheduled transactions
│   │   ├── createScheduledHUSDTransfer()  # Withdrawal scheduling
│   │   └── verifyHUSDTransfer()      # Mirror Node verification
│   │
│   ├── depositService.ts             # Deposit workflow orchestration
│   │   ├── initializeDeposit()       # Create scheduled tx
│   │   └── completeTreasurySignature() # Counter-sign & execute
│   │
│   ├── withdrawService.ts            # Withdrawal HCS publishing
│   ├── instantWithdrawService.ts     # Instant withdrawal logic
│   ├── hederaRateService.ts          # 🌟 HCS rate topic reader
│   │
│   ├── portfolioWalletService.ts     # Wallet CRUD operations
│   │   └── syncWalletTokens()        # 🌟 Mirror Node sync
│   │       ├── Fetches from Validation Cloud
│   │       ├── Categorizes fungible/LP/NFT
│   │       ├── Resolves IPFS metadata
│   │       └── Syncs DeFi positions
│   │
│   ├── portfolioAuthService.ts       # Signature-based auth
│   ├── saucerSwapService.ts          # DEX data aggregation
│   └── defiService.ts                # Multi-protocol DeFi queries
│
├── 🌐 pages/api/                      # Next.js API routes
│   ├── deposit/
│   │   ├── init.ts                   # POST /api/deposit/init
│   │   └── user-signed.ts            # POST /api/deposit/user-signed
│   ├── withdraw/
│   │   └── instant/
│   │       └── index.ts              # POST /api/withdraw/instant
│   ├── publish-rate.ts               # POST /api/publish-rate (HCS)
│   ├── portfolio/
│   │   ├── auth.ts                   # POST /api/portfolio/auth
│   │   ├── wallets.ts                # GET/POST/DELETE wallets
│   │   ├── sync-tokens.ts            # POST /api/portfolio/sync-tokens
│   │   └── sync-all-wallets.ts       # POST batch sync
│   └── auth/
│       ├── nonce.ts                  # GET /api/auth/nonce
│       └── verify.ts                 # POST /api/auth/verify
│
├── 🔐 lib/                            # Utility libraries
│   ├── hedera-auth.ts                # ED25519 signature verification
│   ├── jwt.ts                        # JWT token management
│   ├── supabase-admin.ts             # Admin database client
│   └── errors.ts                     # Standardized API errors
│
├── 🧪 __tests__/                      # Jest test suite (95%+ coverage)
│   ├── api/
│   │   ├── deposit.test.ts
│   │   └── withdraw.test.ts
│   └── services/
│       ├── hederaService.test.ts
│       └── instantWithdrawService.test.ts
│
└── 📄 Configuration Files
    ├── next.config.ts                # Next.js configuration
    ├── tsconfig.json                 # TypeScript strict mode
    └── jest.config.js                # Test runner setup
```

---

## 🚀 **Testing**

### **Prerequisites**

```
Hedera Testnet Account
Hedera Wallet: HashPack, Kabila, or Blade
Testnet Hbar
Testnet USDC
```
## 📖 **How It Works**

### **🏦 hUSD Vault - Deposit Flow**

```
1. User connects Hedera wallet (HashPack/Kabila/Blade)
2. Enter USDC amount to deposit
3. System fetches latest rate from HCS topic
4. Frontend displays:
   - USDC amount to deposit
   - hUSD amount to receive (calculated: USDC / rate)
   - Exchange rate with sequence number
5. User clicks "Deposit"
   ├── Backend creates ScheduledTransaction
   ├── User signs transaction in wallet
   └── Backend counter-signs to execute
6. Atomic swap occurs:
   ├── 100 USDC: User → Deposit Wallet
   └── 98.7 hUSD: Emissions Wallet → User
7. Transaction completes, balances update
```

### **💸 hUSD Vault - Withdrawal Flow**

**Instant Withdrawal (0.5% fee):**
```
1. User selects "Instant" mode
2. System checks instant withdrawal capacity
   └── Queries Instant Withdraw Wallet balance
3. If sufficient capacity:
   ├── User signs transfer: hUSD → Treasury
   ├── Backend sends USDC immediately
   └── 0.5% fee deducted from USDC amount
4. Transaction settles in ~3 seconds
```

**Standard Withdrawal (free, 48h):**
```
1. User selects "Standard" mode
2. User signs hUSD transfer to Treasury
3. Backend publishes to HCS withdrawal topic:
   {
     type: "withdraw_request",
     requestId: "uuid",
     user: "0.0.12345",
     amountHUSD: 100.0,
     unlockAt: "2025-01-17T10:00:00Z"  // +48 hours
   }
4. After 48 hours:
   ├── Automated cron job checks HCS topic
   ├── Finds unlocked withdrawals
   ├── Sends USDC from Standard Withdraw Wallet
   └── Publishes result to HCS:
      {
        type: "withdraw_result",
        requestId: "uuid",
        status: "completed",
        txId: "0.0.xxxx@123456.789"
      }
5. User receives full USDC amount (no fee)
```

### **📊 Portfolio Tracker - Wallet Sync Flow**

```
1. User authenticates with Hedera wallet signature
2. Adds mainnet wallet addresses (0.0.xxxxx format)
3. Clicks "Sync Wallet"
   ├── Backend queries Validation Cloud Mirror Node:
   │   GET /api/v1/accounts/{accountId}?transactions=false
   ├── Receives response:
   │   {
   │     balance: { balance: 50000000000, tokens: [...] },
   │     account: "0.0.12345"
   │   }
4. System categorizes tokens:
   ├── HBAR: Native balance
   ├── Fungible tokens: USDC, SAUCE, HBAR, etc.
   ├── LP tokens: ssLP-USDC-HBAR (detected by name prefix)
   └── NFTs: NON_FUNGIBLE_UNIQUE token type
5. Fetches prices from SaucerSwap API
6. For LP tokens:
   ├── Queries pool reserves
   ├── Calculates user's share: userLpBalance / totalLpSupply
   └── Displays underlying assets (e.g., "50 USDC + 100 HBAR")
7. For NFTs:
   ├── Decodes base64 IPFS metadata URI
   ├── Fetches JSON from IPFS gateway
   └── Displays image + properties
8. Stores in Supabase:
   ├── wallets (wallet addresses)
   ├── wallet_tokens (fungible balances)
   ├── wallet_defi (LP pools, farms, lending)
   └── wallet_nfts (NFT metadata)
9. Frontend displays:
   ├── Total portfolio value (USD)
   ├── Breakdown by asset type
   └── Real-time price updates (WebSocket)
```

---

## 🛣️ **Roadmap**

### ✅ **Completed (Current Version)**

- [x] hUSD Vault prove of concept with scheduled transactions
- [x] HCS rate publishing & verification
- [x] Instant & standard withdrawals
- [x] Multi-wallet portfolio tracking
- [x] NFT metadata resolution (IPFS)
- [x] DeFi position tracking (SaucerSwap, Bonzo)
- [x] Signature-based authentication
- [x] Real-time price updates
- [x] Transparency dashboard

### 🚀 **Coming Soon**

- [ ] Portfolio Tracker Mainnet deployment
- [ ] Portfolio Tracker Integrations (Saucerswap V2, NFT prices,...)
- [ ] Portfolio Tracker UI update
- [ ] Trade Module

---

## 👥 **Team Hashgraph Certifications**

- **Salva**: [Hedera Developer Certificate](https://certs.hashgraphdev.com/2cbba283-23d3-47fa-abbd-a6021c076168.pdf)
- **Sergio**: [Hedera Developer Certificate](https://certs.hashgraphdev.com/9b560c43-72ee-4b15-ba21-769b2a9f59f6.pdf)

---

<div align="center">

### **🏦 Built with Transparency on Hedera Hashgraph**

⭐ **Star us on GitHub** to support decentralized finance!

[🌐 App](https://hbank.cash) | [🚀 App](https://hbank.cas/earn) | [📖 Docs](https://hbank.gitbook.io/hbank-docs/) |

---

**© 2025 Hbank Cash. All rights reserved.**
*Powered by Hedera Hashgraph*

</div>
