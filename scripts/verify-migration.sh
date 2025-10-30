#!/bin/bash

# 🚀 Script de Verificación de Migración a Servicios Refactorizados
# Este script ayuda a verificar el progreso de la migración

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Emoji support
CHECK="✅"
CROSS="❌"
WARNING="⚠️"
INFO="ℹ️"

echo ""
echo "=========================================="
echo "🔍 Verificación de Migración - Hedera Services"
echo "=========================================="
echo ""

# Function to print colored output
print_success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

print_error() {
    echo -e "${RED}${CROSS} $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}${WARNING} $1${NC}"
}

print_info() {
    echo -e "${BLUE}${INFO} $1${NC}"
}

# Counter for results
total_checks=0
passed_checks=0
failed_checks=0
warnings=0

# Function to run check
run_check() {
    ((total_checks++))
    if eval "$1" > /dev/null 2>&1; then
        print_success "$2"
        ((passed_checks++))
        return 0
    else
        print_error "$2"
        ((failed_checks++))
        return 1
    fi
}

# Function to run warning check
run_warning_check() {
    local result=$(eval "$1" 2>&1)
    if [ -n "$result" ]; then
        print_warning "$2"
        echo "    Found: $result"
        ((warnings++))
    else
        print_success "$2"
    fi
}

echo "📋 PASO 1: Verificando estructura de archivos"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if refactored services exist
run_check "test -f src/infrastructure/hedera/HederaClientFactory.ts" "HederaClientFactory.ts existe"
run_check "test -f src/infrastructure/hedera/HederaBalanceService.ts" "HederaBalanceService.ts existe"
run_check "test -f src/infrastructure/hedera/HederaMirrorNodeService.ts" "HederaMirrorNodeService.ts existe"
run_check "test -f src/infrastructure/hedera/HederaRateService.ts" "HederaRateService.ts existe"
run_check "test -f src/infrastructure/hedera/HederaDepositService.ts" "HederaDepositService.ts existe"
run_check "test -f src/infrastructure/hedera/HederaWithdrawalService.ts" "HederaWithdrawalService.ts existe"
run_check "test -f src/infrastructure/hedera/index.ts" "index.ts (barrel export) existe"

echo ""
echo "📋 PASO 2: Verificando imports obsoletos"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for old HederaService usage in src/app
old_imports=$(grep -r "from '@/services/hederaService'" src/app 2>/dev/null | grep -v ".bak" | wc -l | tr -d ' ')
if [ "$old_imports" -eq 0 ]; then
    print_success "No hay imports de HederaService en /src/app"
else
    print_error "Encontrados $old_imports imports de HederaService en /src/app"
    echo "    Ejecuta: grep -r \"from '@/services/hederaService'\" src/app | grep -v \".bak\""
fi

# Check for new HederaService() usage
new_instances=$(grep -r "new HederaService()" src/app 2>/dev/null | grep -v ".bak" | wc -l | tr -d ' ')
if [ "$new_instances" -eq 0 ]; then
    print_success "No hay instancias 'new HederaService()' en /src/app"
else
    print_error "Encontradas $new_instances instancias de 'new HederaService()' en /src/app"
    echo "    Ejecuta: grep -r \"new HederaService()\" src/app | grep -v \".bak\""
fi

echo ""
echo "📋 PASO 3: Verificando migraciones de APIs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Function to check if API uses new services
check_api_migrated() {
    local file=$1
    local service_name=$2

    if [ ! -f "$file" ]; then
        print_warning "Archivo $file no existe"
        return 1
    fi

    if grep -q "from '@/services/hederaService'" "$file" 2>/dev/null; then
        print_error "$service_name - USA SERVICIO ANTIGUO"
        return 1
    elif grep -q "container.get" "$file" 2>/dev/null; then
        print_success "$service_name - MIGRADO (usa DI)"
        return 0
    elif grep -q "from '@/infrastructure/hedera'" "$file" 2>/dev/null; then
        print_success "$service_name - MIGRADO (import directo)"
        return 0
    else
        print_warning "$service_name - No detectado uso de servicios Hedera"
        return 2
    fi
}

check_api_migrated "src/app/api/tvl/route.ts" "/api/tvl"
check_api_migrated "src/app/api/wallet-balances/route.ts" "/api/wallet-balances"
check_api_migrated "src/app/api/process-withdrawals/route.ts" "/api/process-withdrawals"
check_api_migrated "src/app/api/withdraw/route.ts" "/api/withdraw"

echo ""
echo "📋 PASO 4: Verificando DI Container"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check DI container bindings
run_check "grep -q 'TYPES.HederaClientFactory' src/core/di/container.ts" "HederaClientFactory registrado en DI"
run_check "grep -q 'TYPES.HederaBalanceService' src/core/di/container.ts" "HederaBalanceService registrado en DI"
run_check "grep -q 'TYPES.HederaMirrorNodeService' src/core/di/container.ts" "HederaMirrorNodeService registrado en DI"
run_check "grep -q 'TYPES.HederaRateService' src/core/di/container.ts" "HederaRateService registrado en DI"
run_check "grep -q 'TYPES.HederaDepositService' src/core/di/container.ts" "HederaDepositService registrado en DI"
run_check "grep -q 'TYPES.HederaWithdrawalService' src/core/di/container.ts" "HederaWithdrawalService registrado en DI"

echo ""
echo "📋 PASO 5: Verificando archivos .bak"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

bak_files=$(find src -name "*.bak" 2>/dev/null | wc -l | tr -d ' ')
if [ "$bak_files" -eq 0 ]; then
    print_success "No hay archivos .bak pendientes de limpieza"
else
    print_warning "Encontrados $bak_files archivos .bak"
    echo "    Ejecuta: find src -name \"*.bak\""
    echo "    Para eliminar: find src -name \"*.bak\" -delete"
fi

echo ""
echo "📋 PASO 6: Verificando deprecación"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if grep -q "@deprecated" src/services/hederaService.ts 2>/dev/null; then
    print_success "HederaService está marcado como @deprecated"
else
    print_warning "HederaService NO está marcado como @deprecated"
    echo "    Agregar comentario @deprecated al inicio de la clase"
fi

echo ""
echo "📋 PASO 7: Compilación y calidad"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

print_info "Ejecutando type-check..."
if pnpm type-check > /dev/null 2>&1; then
    print_success "TypeScript: Sin errores"
else
    print_error "TypeScript: Hay errores de tipos"
    echo "    Ejecuta: pnpm type-check"
fi

print_info "Ejecutando lint..."
if pnpm lint > /dev/null 2>&1; then
    print_success "ESLint: Sin errores"
else
    print_warning "ESLint: Hay errores o warnings"
    echo "    Ejecuta: pnpm lint"
fi

echo ""
echo "=========================================="
echo "📊 RESUMEN"
echo "=========================================="
echo ""

migrated_count=0
if ! grep -q "from '@/services/hederaService'" src/app/api/tvl/route.ts 2>/dev/null; then
    ((migrated_count++))
fi
if ! grep -q "from '@/services/hederaService'" src/app/api/wallet-balances/route.ts 2>/dev/null; then
    ((migrated_count++))
fi
if ! grep -q "from '@/services/hederaService'" src/app/api/process-withdrawals/route.ts 2>/dev/null; then
    ((migrated_count++))
fi
if ! grep -q "from '@/services/hederaService'" src/app/api/withdraw/route.ts 2>/dev/null; then
    ((migrated_count++))
fi

total_apis=4
percentage=$((migrated_count * 100 / total_apis))

echo "APIs Migradas: $migrated_count/$total_apis ($percentage%)"
echo ""

if [ $migrated_count -eq $total_apis ] && [ "$old_imports" -eq 0 ] && [ "$new_instances" -eq 0 ]; then
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════╗"
    echo "║   ✅ MIGRACIÓN COMPLETADA AL 100%   ║"
    echo "╚═══════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    print_success "Todas las APIs han sido migradas exitosamente"
    print_success "No quedan referencias al servicio antiguo"
    echo ""
    print_info "Siguientes pasos:"
    echo "  1. Testear todos los endpoints manualmente"
    echo "  2. Ejecutar: pnpm build"
    echo "  3. Marcar HederaService como @deprecated"
    echo "  4. Eliminar archivos .bak"
    echo "  5. Actualizar documentación"
    echo "  6. Crear commit final"
    echo ""
elif [ $migrated_count -gt 0 ]; then
    echo -e "${YELLOW}"
    echo "╔═══════════════════════════════════════╗"
    echo "║   🔄 MIGRACIÓN EN PROGRESO ($percentage%)      ║"
    echo "╚═══════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    print_info "Progreso de migración:"

    if grep -q "from '@/services/hederaService'" src/app/api/tvl/route.ts 2>/dev/null; then
        echo "  ⬜ /api/tvl - PENDIENTE"
    else
        echo "  ✅ /api/tvl - MIGRADO"
    fi

    if grep -q "from '@/services/hederaService'" src/app/api/wallet-balances/route.ts 2>/dev/null; then
        echo "  ⬜ /api/wallet-balances - PENDIENTE"
    else
        echo "  ✅ /api/wallet-balances - MIGRADO"
    fi

    if grep -q "from '@/services/hederaService'" src/app/api/process-withdrawals/route.ts 2>/dev/null; then
        echo "  ⬜ /api/process-withdrawals - PENDIENTE"
    else
        echo "  ✅ /api/process-withdrawals - MIGRADO"
    fi

    if grep -q "from '@/services/hederaService'" src/app/api/withdraw/route.ts 2>/dev/null; then
        echo "  ⬜ /api/withdraw - PENDIENTE"
    else
        echo "  ✅ /api/withdraw - MIGRADO"
    fi

    echo ""
    print_info "Continúa con la guía: docs/MIGRATION-TO-REFACTORED-SERVICES.md"
    echo ""
else
    echo -e "${RED}"
    echo "╔═══════════════════════════════════════╗"
    echo "║   ⚠️  MIGRACIÓN NO INICIADA (0%)     ║"
    echo "╚═══════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    print_info "Para comenzar la migración:"
    echo "  1. Lee: docs/MIGRATION-TO-REFACTORED-SERVICES.md"
    echo "  2. Crea rama: git checkout -b migration/hedera-services"
    echo "  3. Sigue la guía paso a paso"
    echo ""
fi

echo "=========================================="
echo ""
