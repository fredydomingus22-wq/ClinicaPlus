#!/usr/bin/env bash
# setup.sh — First-time ClinicaPlus project bootstrap
# Run from the repo root: bash scripts/setup.sh

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

echo ""
echo "  ClinicaPlus — Project Bootstrap"
echo "  ================================"
echo ""

# ── 1. Prerequisites ──────────────────────────────────────────────────
info "Checking prerequisites..."

command -v node >/dev/null 2>&1 || error "Node.js not found. Install Node.js 20+ from nodejs.org"
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
[[ "$NODE_VERSION" -lt 20 ]] && error "Node.js 20+ required. Found: $(node --version)"
success "Node.js $(node --version)"

command -v pnpm >/dev/null 2>&1 || {
  warn "pnpm not found. Installing..."
  npm install -g pnpm@9
}
success "pnpm $(pnpm --version)"

command -v git >/dev/null 2>&1 || error "git not found."
success "git $(git --version | cut -d' ' -f3)"

# ── 2. Install dependencies ────────────────────────────────────────────
info "Installing dependencies..."
pnpm install
success "Dependencies installed"

# ── 3. Environment files ───────────────────────────────────────────────
info "Setting up environment files..."

if [[ ! -f apps/api/.env ]]; then
  cp apps/api/.env.example apps/api/.env
  warn "Created apps/api/.env from example. You MUST fill in the values before continuing."
  warn "Required: DATABASE_URL, DIRECT_URL (both from Supabase), JWT_SECRET, JWT_REFRESH_SECRET"
else
  success "apps/api/.env already exists"
fi

if [[ ! -f apps/web/.env ]]; then
  cp apps/web/.env.example apps/web/.env
  success "Created apps/web/.env (defaults are fine for local dev)"
else
  success "apps/web/.env already exists"
fi

# ── 4. Validate API env vars ───────────────────────────────────────────
info "Validating environment variables..."

source apps/api/.env 2>/dev/null || true

MISSING=()
[[ -z "${DATABASE_URL:-}" ]] && MISSING+=("DATABASE_URL")
[[ -z "${DIRECT_URL:-}" ]]   && MISSING+=("DIRECT_URL")
[[ -z "${JWT_SECRET:-}" ]]   && MISSING+=("JWT_SECRET")
[[ -z "${JWT_REFRESH_SECRET:-}" ]] && MISSING+=("JWT_REFRESH_SECRET")

if [[ ${#MISSING[@]} -gt 0 ]]; then
  error "Missing required env vars in apps/api/.env: ${MISSING[*]}\nFill them in then run this script again."
fi

[[ "${JWT_SECRET}" == "${JWT_REFRESH_SECRET}" ]] && \
  error "JWT_SECRET and JWT_REFRESH_SECRET must be different values."

[[ ${#JWT_SECRET} -lt 64 ]] && \
  error "JWT_SECRET must be at least 64 characters. Generate with: openssl rand -base64 64"

success "Environment variables OK"

# ── 5. Build shared packages ───────────────────────────────────────────
info "Building shared packages..."
pnpm build --filter=@clinicaplus/types --filter=@clinicaplus/utils
success "Shared packages built"

# ── 6. Database setup ──────────────────────────────────────────────────
info "Setting up database..."
pnpm db:generate
success "Prisma client generated"

pnpm db:migrate
success "Migrations applied"

echo ""
read -rp "  Seed the database with demo data? (y/N): " SEED_ANSWER
if [[ "$SEED_ANSWER" =~ ^[Yy]$ ]]; then
  pnpm db:seed
  success "Database seeded"
  echo ""
  echo "  Demo credentials:"
  echo "    Admin:          admin@demo.ao        / Demo1234!"
  echo "    Médico:         carlos@demo.ao        / Demo1234!"
  echo "    Recepcionista:  beatriz@demo.ao       / Demo1234!"
  echo "    Paciente:       joao@demo.ao          / Demo1234!"
fi

# ── 7. Done ────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}  Setup complete!${NC}"
echo ""
echo "  Next steps:"
echo "    pnpm dev                   start API (:3001) + Web (:5173)"
echo "    pnpm db:studio             open Prisma Studio"
echo "    pnpm test --filter=api     run API tests"
echo ""
