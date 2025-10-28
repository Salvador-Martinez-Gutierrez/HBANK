#!/usr/bin/env python3
"""
Migrate console.log/warn/error/info/debug to Pino logger
This script safely migrates console statements to use the Pino-based logger
"""

import os
import re
from pathlib import Path

# File paths to migrate
FILES_TO_MIGRATE = [
    # API Routes (remaining)
    "src/app/api/account-balances/route.ts",
    "src/app/api/history/route.ts",
    "src/app/api/get-latest-rate/route.ts",
    "src/app/api/rate-history/route.ts",
    "src/app/api/publish-rate/route.ts",
    "src/app/api/portfolio/update-prices/route.ts",
    "src/app/api/withdraw/route.ts",
    "src/app/api/deposit/route.ts",
    # Services
    "src/services/portfolioPriceService.ts",
    "src/services/portfolioAuthService.ts",
    "src/services/portfolioWalletService.ts",
    "src/services/token.services.ts",
    "src/services/hederaService.ts",
    "src/services/telegramService.ts",
    "src/services/hederaRateService.ts",
    "src/services/withdrawService.ts",
    "src/services/saucerSwapService.ts",
    "src/services/defiService.ts",
    # Validation Services
    "src/features/withdrawals/services/WithdrawValidationService.ts",
    "src/features/deposits/services/DepositValidationService.ts",
    "src/features/rates/services/RateValidationService.ts",
    # Domain
    "src/domain/entities/Withdrawal.ts",
    "src/domain/entities/Deposit.ts",
    "src/domain/value-objects/AccountId.ts",
    "src/domain/value-objects/Rate.ts",
    "src/domain/value-objects/Money.ts",
    # Repositories
    "src/core/repositories/IRateRepository.ts",
    "src/core/repositories/IWithdrawRepository.ts",
    "src/core/repositories/IDepositRepository.ts",
    # Hooks
    "src/hooks/useSyncCooldown.ts",
    "src/hooks/useWalletOrder.ts",
    "src/hooks/useWalletCollapse.ts",
    "src/hooks/useHederaAuth.ts",
    "src/hooks/usePortfolioWallets.ts",
    "src/hooks/useRealTimeRate.ts",
    "src/hooks/useTVL.ts",
    "src/hooks/useTokenPriceRealtime.ts",
    "src/hooks/usePortfolioAuth.ts",
    "src/hooks/useWithdrawals.ts",
    "src/hooks/useProcessModal.ts",
    "src/hooks/useWithdrawSubmit.ts",
    "src/hooks/useHistory.ts",
    "src/hooks/useInstantWithdraw.ts",
    # Components
    "src/components/aggregated-portfolio-view.tsx",
    "src/components/base-wallet-button.tsx",
    "src/components/account-dialog.tsx",
    "src/components/withdraw-dialog.tsx",
    "src/components/process-modal.tsx",
    "src/components/add-wallet-dialog.tsx",
    # App components
    "src/app/(protocol)/earn/components/mint-action-button.tsx",
    "src/app/(protocol)/earn/components/trading-interface.tsx",
    "src/app/(protocol)/earn/components/redeem-action-button.tsx",
    "src/app/(protocol)/hcf-vault/components/hcf-trading-interface.tsx",
    # App hooks
    "src/app/(protocol)/earn/hooks/useAccountID.tsx",
    "src/app/(protocol)/earn/hooks/useTokenBalances.tsx",
    # Pages
    "src/app/(protocol)/portfolio/page.tsx",
    # Config
    "src/config/serverEnv.ts",
    # Providers
    "src/app/providers/wallet-provider.tsx",
]

def get_scope(filepath):
    """Generate appropriate scope name based on file path"""
    if "api/" in filepath:
        # Extract API route path
        match = re.search(r'src/app/api/([^/]+(?:/[^/]+)?)', filepath)
        if match:
            return f"api:{match.group(1).replace('/', ':')}"
        return "api:unknown"
    elif "services/" in filepath and "ValidationService" in filepath:
        name = Path(filepath).stem
        return f"validation:{name}"
    elif "services/" in filepath:
        name = Path(filepath).stem
        return f"service:{name}"
    elif "domain/entities/" in filepath:
        name = Path(filepath).stem
        return f"domain:entity:{name}"
    elif "domain/value-objects/" in filepath:
        name = Path(filepath).stem
        return f"domain:vo:{name}"
    elif "repositories/" in filepath:
        name = Path(filepath).stem
        return f"repository:{name}"
    elif "config/" in filepath:
        name = Path(filepath).stem
        return f"config:{name}"
    else:
        return None  # Use default logger

def migrate_file(filepath, base_dir):
    """Migrate a single file"""
    full_path = base_dir / filepath

    if not full_path.exists():
        print(f"⚠️  File not found: {filepath}")
        return False

    # Read file
    with open(full_path, 'r') as f:
        content = f.read()

    # Check if already migrated
    if "'@/lib/logger'" in content or '"@/lib/logger"' in content:
        print(f"⊙ Already migrated: {filepath}")
        return False

    # Check if has console statements
    if not re.search(r'console\.(log|error|warn|info|debug)', content):
        print(f"⊙ No console statements: {filepath}")
        return False

    print(f"→ Migrating: {filepath}")

    # Backup
    with open(str(full_path) + '.bak', 'w') as f:
        f.write(content)

    # Add import
    scope = get_scope(filepath)
    if scope:
        # Add scoped logger
        import_statement = f"import {{ createScopedLogger }} from '@/lib/logger'\n\nconst logger = createScopedLogger('{scope}')\n"
    else:
        # Add default logger
        import_statement = "import { logger } from '@/lib/logger'\n"

    # Find last import
    lines = content.split('\n')
    last_import_idx = -1
    for i, line in enumerate(lines):
        if line.strip().startswith('import ') and 'type' not in line:
            last_import_idx = i

    # Insert import after last import
    if last_import_idx >= 0:
        lines.insert(last_import_idx + 1, import_statement)
        content = '\n'.join(lines)
    else:
        # No imports found, add at beginning
        content = import_statement + '\n' + content

    # Replace console statements
    content = re.sub(r'console\.log\(', 'logger.info(', content)
    content = re.sub(r'console\.error\(', 'logger.error(', content)
    content = re.sub(r'console\.warn\(', 'logger.warn(', content)
    content = re.sub(r'console\.info\(', 'logger.info(', content)
    content = re.sub(r'console\.debug\(', 'logger.debug(', content)

    # Write back
    with open(full_path, 'w') as f:
        f.write(content)

    print(f"✓ Migrated: {filepath}")
    return True

def main():
    print("=" * 50)
    print("Console-to-Logger Migration Script (Python)")
    print("=" * 50)
    print()

    base_dir = Path(__file__).parent

    total = 0
    migrated = 0
    skipped = 0

    for filepath in FILES_TO_MIGRATE:
        total += 1
        if migrate_file(filepath, base_dir):
            migrated += 1
        else:
            skipped += 1

    print()
    print("=" * 50)
    print("Migration Summary")
    print("=" * 50)
    print(f"Total files: {total}")
    print(f"✓ Migrated: {migrated}")
    print(f"⊙ Skipped: {skipped}")
    print()

    if migrated > 0:
        print("⚠️  Review migrated files before committing!")
        print("Backup files (.bak) created for all modified files.")
        print()
        print("To remove backups after review:")
        print("  find src -name '*.bak' -delete")

if __name__ == "__main__":
    main()
