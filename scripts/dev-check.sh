#!/usr/bin/env bash
# dev-check.sh — Run before every commit or PR.
# Validates types, lint, tests, and consistency rules.
# Run from repo root: bash scripts/dev-check.sh

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
PASS=0; FAIL=0

check() {
  local label="$1"; shift
  echo -n "  Checking $label... "
  if "$@" > /tmp/check_out.txt 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}FAIL${NC}"
    echo "  ── Output ──"
    cat /tmp/check_out.txt | head -30
    echo "  ────────────"
    FAIL=$((FAIL + 1))
  fi
}

warn_check() {
  local label="$1"; shift
  echo -n "  Checking $label... "
  if "$@" > /tmp/check_out.txt 2>&1; then
    echo -e "${GREEN}PASS${NC}"
  else
    echo -e "${YELLOW}WARN${NC} (not blocking)"
    cat /tmp/check_out.txt | head -10
  fi
}

echo ""
echo "  ClinicaPlus — Pre-Commit Validation"
echo "  ====================================="
echo ""

# ── Build shared packages first ───────────────────────────────────────
echo -e "${BLUE}[1/5] Building shared packages${NC}"
check "types build"  pnpm build --filter=@clinicaplus/types
check "utils build"  pnpm build --filter=@clinicaplus/utils
echo ""

# ── TypeScript ────────────────────────────────────────────────────────
echo -e "${BLUE}[2/5] TypeScript${NC}"
check "typecheck (all)"  pnpm typecheck
echo ""

# ── Lint ──────────────────────────────────────────────────────────────
echo -e "${BLUE}[3/5] Lint${NC}"
check "eslint (all)"  pnpm lint
echo ""

# ── Consistency rules ─────────────────────────────────────────────────
echo -e "${BLUE}[4/5] Consistency rules${NC}"

echo -n "  Checking no console.log in src... "
if grep -r "console\.log" apps/api/src apps/web/src --include="*.ts" --include="*.tsx" -l 2>/dev/null | grep -v ".test." | grep -q .; then
  echo -e "${RED}FAIL${NC}"
  echo "  Files with console.log:"
  grep -r "console\.log" apps/api/src apps/web/src --include="*.ts" --include="*.tsx" -l | grep -v ".test."
  FAIL=$((FAIL + 1))
else
  echo -e "${GREEN}PASS${NC}"
  PASS=$((PASS + 1))
fi

echo -n "  Checking no localStorage token storage... "
if grep -rn "localStorage.*[Tt]oken\|sessionStorage.*[Tt]oken" apps/web/src --include="*.ts" --include="*.tsx" -l 2>/dev/null | grep -q .; then
  echo -e "${RED}FAIL${NC}"
  grep -rn "localStorage.*[Tt]oken\|sessionStorage.*[Tt]oken" apps/web/src --include="*.ts" --include="*.tsx"
  FAIL=$((FAIL + 1))
else
  echo -e "${GREEN}PASS${NC}"
  PASS=$((PASS + 1))
fi

echo -n "  Checking no unscoped Prisma queries (missing clinicaId)... "
# Heuristic: findMany/findFirst/count without clinicaId in same block
UNSAFE=$(grep -rn "prisma\.\w*\.(findMany\|findFirst\|count\|updateMany\|deleteMany)" apps/api/src --include="*.ts" | grep -v "\.test\." | grep -v "clinicaId\|superadmin\|RefreshToken\|Clinica\b" | grep -v "//.*cross-tenant" | head -5)
if [[ -n "$UNSAFE" ]]; then
  echo -e "${YELLOW}WARN${NC} — Review these queries manually:"
  echo "$UNSAFE"
else
  echo -e "${GREEN}PASS${NC}"
  PASS=$((PASS + 1))
fi

echo -n "  Checking no English strings in JSX... "
ENGLISH=$(grep -rn '"[A-Z][a-z].*"' apps/web/src/pages --include="*.tsx" | grep -v "className\|import\|from\|type\|interface\|//\|@\|VITE_\|aria-\|test\|Test\|Error\|console" | head -5)
if [[ -n "$ENGLISH" ]]; then
  echo -e "${YELLOW}WARN${NC} — Possible English strings (verify manually):"
  echo "$ENGLISH"
else
  echo -e "${GREEN}PASS${NC}"
  PASS=$((PASS + 1))
fi

echo ""

# ── Tests ─────────────────────────────────────────────────────────────
echo -e "${BLUE}[5/5] Tests${NC}"
check "unit + integration tests"  pnpm test --run --filter=api
echo ""

# ── Summary ───────────────────────────────────────────────────────────
echo "  Results: ${GREEN}${PASS} passed${NC}  ${RED}${FAIL} failed${NC}"
echo ""

if [[ $FAIL -gt 0 ]]; then
  echo -e "${RED}  ✗ Pre-commit check failed. Fix the issues above before committing.${NC}"
  echo ""
  exit 1
else
  echo -e "${GREEN}  ✓ All checks passed. Safe to commit.${NC}"
  echo ""
fi
