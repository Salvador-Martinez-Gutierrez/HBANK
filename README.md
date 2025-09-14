<div align="center">

# 🏦 Valora Protocol

### **The Next Generation DeFi Liquidity Protocol on Hedera**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14.0-black?logo=next.js)](https://nextjs.org/)
[![Hedera](https://img.shields.io/badge/Hedera-Hashgraph-7a3ff2?logo=hedera)](https://hedera.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)

<img src="public/hbabk-logo.png" alt="Valora Protocol" width="100" style="border-radius: 50%;" />

**Transform your USDC into yield-bearing hUSD tokens with complete transparency and security**

[🚀 Launch App](http://localhost:3000) • [💬 Discord](https://discord.gg) • [🐦 Twitter](https://twitter.com/valoraprotocol)

</div>

---

## 🌟 **Why Valora Protocol?**

<table>
<tr>
<td width="33%" align="center">

### ⚡ **Lightning Fast**

<img src="https://img.icons8.com/fluency/96/000000/lightning-bolt.png" width="60"/>

Powered by Hedera's 10,000+ TPS capability with instant finality

</td>
<td width="33%" align="center">

### 🔒 **Bank-Grade Security**

<img src="https://img.icons8.com/fluency/96/000000/security-shield-green.png" width="60"/>

aBFT consensus with enterprise-grade security standards

</td>
<td width="33%" align="center">

### 💎 **Transparent & Auditable**

<img src="https://img.icons8.com/fluency/96/000000/blockchain-technology.png" width="60"/>

Every transaction verifiable on-chain via HCS

</td>
</tr>
</table>

---

## 🎯 **Key Features**

### 🪙 **Liquid Yield Tokens**

> Convert USDC to hUSD - a yield-bearing token that automatically accrues value over time

### 📈 **Dynamic Exchange Rate**

> Real-time rate updates published to Hedera Consensus Service for complete transparency

### 🔄 **Seamless Integration**

> One-click deposits with support for major Hedera wallets

### 📱 **Modern Interface**

> Beautiful, responsive UI optimized for both desktop and mobile

---

## 🛠️ **Technology Stack**

<div align="center">

| Layer              | Technologies                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Frontend**       | ![Next.js](https://img.shields.io/badge/Next.js-black?style=flat&logo=next.js&logoColor=white) ![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/Tailwind-38B2AC?style=flat&logo=tailwind-css&logoColor=white) |
| **Blockchain**     | ![Hedera](https://img.shields.io/badge/Hedera-7a3ff2?style=flat&logo=hedera&logoColor=white) ![Smart Contracts](https://img.shields.io/badge/HTS-Smart%20Contracts-green)                                                                                                                                                                                                                                    |
| **Testing**        | ![Jest](https://img.shields.io/badge/Jest-323330?style=flat&logo=Jest&logoColor=white) ![Testing Library](https://img.shields.io/badge/Testing%20Library-E33332?style=flat&logo=testing-library&logoColor=white)                                                                                                                                                                                             |
| **Infrastructure** | ![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white) ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)                                                                                                                                                                                                                 |

</div>

---

## 🚀 **Quick Start**

### Prerequisites

```bash
✅ Node.js v18+
✅ pnpm (recommended) or npm
✅ Hedera Testnet Account
```

### 🔧 Installation

```bash
# Clone the repository
git clone https://github.com/valora-protocol/front-valora
cd front-valora-protocol

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Start development server
pnpm dev
```

### 🧪 Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test suite
pnpm test -- deposit.test.ts
```

---

## 📁 **Project Architecture**

```
FRONT-VALORA-PROTOCOL/
│
├── 📂 src/
│   ├── 📱 app/              # Next.js app router pages
│   │   ├── defi/           # DeFi dashboard
│   │   ├── portfolio/      # User portfolio
│   │   ├── transparency/   # Protocol transparency
│   │   └── vault/          # Vault management
│   ├── 🎨 components/       # Reusable UI components
│   ├── 🔧 services/         # Business logic & Hedera integration
│   └── 📚 lib/             # Utility functions
│
├── 🌐 pages/api/           # API endpoints
│   ├── deposit.ts          # USDC deposit handler
│   ├── publish-rate.ts     # Exchange rate publisher
│   └── get-latest-rate.ts  # Rate fetcher
│
├── 🧪 __tests__/           # Test suites
│   ├── api/               # API tests
│   └── services/          # Service tests
│
└── 📋 docs/
    ├── README_BACKEND.md   # Backend documentation
    └── EXAMPLES.md        # API usage examples
```

---

## 💡 **How It Works**

<div align="center">

```mermaid
graph LR
    A[👤 User] -->|Deposits USDC| B[🏦 Valora Protocol]
    B -->|Validates| C[✅ Smart Contract]
    C -->|Mints| D[💰 hUSD Tokens]
    D -->|Sends to| A
    B -->|Publishes Rate| E[📊 HCS Topic]
    E -->|Updates| F[📈 Exchange Rate]
```

</div>

### **Step-by-step Process:**

1. **🔗 Connect Wallet** - Link your Hedera-compatible wallet
2. **💵 Deposit USDC** - Enter amount and confirm transaction
3. **⚙️ Protocol Processing** - Smart contract validates and processes
4. **🪙 Receive hUSD** - Liquid yield tokens sent to your wallet
5. **📈 Earn Yield** - Automatic value accrual based on protocol performance

---

## 🔐 **Security & Audits**

### 🛡️ **Security Features**

-   ✅ **Multi-signature Treasury**
-   ✅ **Rate limiting on deposits**
-   ✅ **Automated security monitoring**
-   ✅ **Emergency pause functionality**
-   ✅ **Comprehensive test coverage (95%+)**

---

## 📈 **Roadmap**

### **Q4 2025** ✅

-   [x] Protocol launch on mainnet
-   [x] Initial liquidity provision
-   [x] Wallet integrations

---

## 📞 **Support & Community**

<div align="center">

| Platform    | Link                                                  |
| ----------- | ----------------------------------------------------- |
| **Discord** | [Join our community](https://discord.gg/valora)       |
| **Twitter** | [@ValoraProtocol](https://twitter.com/valoraprotocol) |

</div>

---

## 📜 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

### **Built with ❤️ by the Valora Team**

⭐ **Star us on GitHub** — it helps!

[🏠 Website](http://localhost:3000) • [🐛 Report Bug](https://github.com/valora-protocol/issues) • [✨ Request Feature](https://github.com/valora-protocol/issues)

</div>
