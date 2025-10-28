#!/bin/bash

# Complete Logger Migration Script
# This script completes the migration of console.log/warn/error/debug/info to Pino logger
# for all remaining files in the HBANK Protocol project.

set -e  # Exit on error

echo "======================================"
echo "Console-to-Logger Migration Script"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL=0
MIGRATED=0
SKIPPED=0
FAILED=0

# Function to add logger import and migrate a file
migrate_file() {
    local filepath="$1"
    local scope_type="$2"
    local scope_name="$3"

    if [ ! -f "$filepath" ]; then
        echo -e "${RED}✗${NC} File not found: $filepath"
        ((FAILED++))
        return 1
    fi

    ((TOTAL++))

    # Check if file already has logger import
    if grep -q "from '@/lib/logger'" "$filepath" || grep -q 'from "@/lib/logger"' "$filepath"; then
        echo -e "${YELLOW}⊙${NC} Already has logger: $filepath"
        ((SKIPPED++))
        return 0
    fi

    # Check if file has console statements
    if ! grep -q "console\.\(log\|error\|warn\|info\|debug\)" "$filepath"; then
        echo -e "${YELLOW}⊙${NC} No console statements: $filepath"
        ((SKIPPED++))
        return 0
    fi

    echo -e "${GREEN}→${NC} Migrating: $filepath"

    # Create backup
    cp "$filepath" "$filepath.bak"

    # Create temp file for modifications
    local tmpfile=$(mktemp)

    # Add import based on scope type
    if [ "$scope_type" = "scoped" ]; then
        # Find last import line
        awk -v scope="$scope_name" '
        BEGIN { found_import = 0; import_line = 0 }
        /^import / { import_line = NR; found_import = 1 }
        found_import && !/^import / && NF > 0 && !/^$/ && !added {
            print "import { createScopedLogger } from '\''@/lib/logger'\''"
            print ""
            print "const logger = createScopedLogger('\''" scope "'\'')"
            added = 1
        }
        { print }
        END {
            if (!added && found_import) {
                # Should not reach here in normal cases
            }
        }
        ' "$filepath" > "$tmpfile"
    else
        # Use default logger
        awk '
        BEGIN { found_import = 0; import_line = 0 }
        /^import / { import_line = NR; found_import = 1 }
        found_import && !/^import / && NF > 0 && !/^$/ && !added {
            print "import { logger } from '\''@/lib/logger'\''"
            added = 1
        }
        { print }
        ' "$filepath" > "$tmpfile"
    fi

    # Replace console statements (simple replacements)
    sed -i.sed '
        s/console\.log(/logger.info(/g
        s/console\.error(/logger.error(/g
        s/console\.warn(/logger.warn(/g
        s/console\.info(/logger.info(/g
        s/console\.debug(/logger.debug(/g
    ' "$tmpfile"

    # Move temp file to original
    mv "$tmpfile" "$filepath"
    rm -f "$filepath.sed"

    echo -e "${GREEN}✓${NC} Migrated: $filepath"
    ((MIGRATED++))
}

# API Routes (remaining ones not yet migrated)
echo "Migrating API Routes..."
migrate_file "src/app/api/account-balances/route.ts" "scoped" "api:account-balances"
migrate_file "src/app/api/history/route.ts" "scoped" "api:history"
migrate_file "src/app/api/get-latest-rate/route.ts" "scoped" "api:get-latest-rate"
migrate_file "src/app/api/rate-history/route.ts" "scoped" "api:rate-history"
migrate_file "src/app/api/publish-rate/route.ts" "scoped" "api:publish-rate"
migrate_file "src/app/api/portfolio/update-prices/route.ts" "scoped" "api:portfolio:update-prices"
migrate_file "src/app/api/withdraw/route.ts" "scoped" "api:withdraw"
migrate_file "src/app/api/deposit/route.ts" "scoped" "api:deposit"

echo ""
echo "Migrating Services..."
migrate_file "src/services/portfolioPriceService.ts" "scoped" "service:portfolioPriceService"
migrate_file "src/services/portfolioAuthService.ts" "scoped" "service:portfolioAuthService"
migrate_file "src/services/portfolioWalletService.ts" "scoped" "service:portfolioWalletService"
migrate_file "src/services/token.services.ts" "scoped" "service:token"
migrate_file "src/services/hederaService.ts" "scoped" "service:hedera"
migrate_file "src/services/telegramService.ts" "scoped" "service:telegram"
migrate_file "src/services/hederaRateService.ts" "scoped" "service:hederaRate"
migrate_file "src/services/withdrawService.ts" "scoped" "service:withdraw"
migrate_file "src/services/saucerSwapService.ts" "scoped" "service:saucerSwap"
migrate_file "src/services/defiService.ts" "scoped" "service:defi"

echo ""
echo "Migrating Validation Services..."
migrate_file "src/features/withdrawals/services/WithdrawValidationService.ts" "scoped" "validation:WithdrawValidation"
migrate_file "src/features/deposits/services/DepositValidationService.ts" "scoped" "validation:DepositValidation"
migrate_file "src/features/rates/services/RateValidationService.ts" "scoped" "validation:RateValidation"

echo ""
echo "Migrating Domain Entities..."
migrate_file "src/domain/entities/Withdrawal.ts" "scoped" "domain:entity:Withdrawal"
migrate_file "src/domain/entities/Deposit.ts" "scoped" "domain:entity:Deposit"

echo ""
echo "Migrating Domain Value Objects..."
migrate_file "src/domain/value-objects/AccountId.ts" "scoped" "domain:vo:AccountId"
migrate_file "src/domain/value-objects/Rate.ts" "scoped" "domain:vo:Rate"
migrate_file "src/domain/value-objects/Money.ts" "scoped" "domain:vo:Money"

echo ""
echo "Migrating Repository Interfaces..."
migrate_file "src/core/repositories/IRateRepository.ts" "scoped" "repository:IRateRepository"
migrate_file "src/core/repositories/IWithdrawRepository.ts" "scoped" "repository:IWithdrawRepository"
migrate_file "src/core/repositories/IDepositRepository.ts" "scoped" "repository:IDepositRepository"

echo ""
echo "Migrating Hooks..."
migrate_file "src/hooks/useSyncCooldown.ts" "default" ""
migrate_file "src/hooks/useWalletOrder.ts" "default" ""
migrate_file "src/hooks/useWalletCollapse.ts" "default" ""
migrate_file "src/hooks/useHederaAuth.ts" "default" ""
migrate_file "src/hooks/usePortfolioWallets.ts" "default" ""
migrate_file "src/hooks/useRealTimeRate.ts" "default" ""
migrate_file "src/hooks/useTVL.ts" "default" ""
migrate_file "src/hooks/useTokenPriceRealtime.ts" "default" ""
migrate_file "src/hooks/usePortfolioAuth.ts" "default" ""
migrate_file "src/hooks/useWithdrawals.ts" "default" ""
migrate_file "src/hooks/useProcessModal.ts" "default" ""
migrate_file "src/hooks/useWithdrawSubmit.ts" "default" ""
migrate_file "src/hooks/useHistory.ts" "default" ""
migrate_file "src/hooks/useInstantWithdraw.ts" "default" ""

echo ""
echo "Migrating Components..."
migrate_file "src/components/aggregated-portfolio-view.tsx" "default" ""
migrate_file "src/components/base-wallet-button.tsx" "default" ""
migrate_file "src/components/account-dialog.tsx" "default" ""
migrate_file "src/components/withdraw-dialog.tsx" "default" ""
migrate_file "src/components/process-modal.tsx" "default" ""
migrate_file "src/components/add-wallet-dialog.tsx" "default" ""

echo ""
echo "Migrating App Components..."
migrate_file "src/app/(protocol)/earn/components/mint-action-button.tsx" "default" ""
migrate_file "src/app/(protocol)/earn/components/trading-interface.tsx" "default" ""
migrate_file "src/app/(protocol)/earn/components/redeem-action-button.tsx" "default" ""
migrate_file "src/app/(protocol)/hcf-vault/components/hcf-trading-interface.tsx" "default" ""

echo ""
echo "Migrating App Hooks..."
migrate_file "src/app/(protocol)/earn/hooks/useAccountID.tsx" "default" ""
migrate_file "src/app/(protocol)/earn/hooks/useTokenBalances.tsx" "default" ""

echo ""
echo "Migrating Pages..."
migrate_file "src/app/(protocol)/portfolio/page.tsx" "default" ""

echo ""
echo "Migrating Config..."
migrate_file "src/config/serverEnv.ts" "scoped" "config:serverEnv"

echo ""
echo "Migrating Providers..."
migrate_file "src/app/providers/wallet-provider.tsx" "default" ""

echo ""
echo "======================================"
echo "Migration Summary"
echo "======================================"
echo -e "Total files processed: $TOTAL"
echo -e "${GREEN}Successfully migrated: $MIGRATED${NC}"
echo -e "${YELLOW}Skipped (already done or no console): $SKIPPED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $MIGRATED -gt 0 ]; then
    echo "⚠️  IMPORTANT: Review the migrated files before committing!"
    echo "Backup files (.bak) have been created for all modified files."
    echo ""
    echo "To remove backup files after verification:"
    echo "  find src -name '*.bak' -delete"
fi

exit 0
