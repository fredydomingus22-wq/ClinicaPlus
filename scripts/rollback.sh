#!/usr/bin/env bash
# rollback.sh — Guided rollback procedure for production incidents.
# Run from repo root: bash scripts/rollback.sh

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

echo ""
echo -e "${RED}  ╔══════════════════════════════════════╗${NC}"
echo -e "${RED}  ║  ClinicaPlus — ROLLBACK PROCEDURE   ║${NC}"
echo -e "${RED}  ╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}  Use this script when a production deployment causes issues.${NC}"
echo -e "${YELLOW}  Always roll back the migration BEFORE rolling back the API.${NC}"
echo ""

echo "  What needs to be rolled back?"
echo "  1) Frontend only  (Vercel)"
echo "  2) API only       (Railway)"
echo "  3) Migration only (Supabase)"
echo "  4) Full rollback  (migration + API + frontend)"
echo "  5) Show rollback checklist"
echo ""
echo -n "  Choice [1-5]: "
read -r CHOICE

case "$CHOICE" in
  1)
    echo ""
    echo -e "${BLUE}  FRONTEND ROLLBACK (Vercel)${NC}"
    echo "  ─────────────────────────────────────────"
    echo "  1. Go to: https://vercel.com → your project → Deployments"
    echo "  2. Find the last working deployment (before the broken one)"
    echo "  3. Click the three dots menu → 'Promote to Production'"
    echo "  4. Wait ~30 seconds"
    echo "  5. Verify: curl https://app.clinicaplus.ao/login"
    echo ""
    echo -n "  After completing the above, run health check? (y/N): "
    read -r RUN_HC
    [[ "$RUN_HC" =~ ^[Yy]$ ]] && bash "$(dirname "$0")/health-check.sh" prod
    ;;

  2)
    echo ""
    echo -e "${BLUE}  API ROLLBACK (Railway)${NC}"
    echo "  ─────────────────────────────────────────"
    echo "  1. Go to: https://railway.app → clinicaplus → API service → Deployments"
    echo "  2. Find the last successful deployment"
    echo "  3. Click 'Redeploy'"
    echo "  4. Wait ~60 seconds for container to start"
    echo "  5. Verify: curl https://api.clinicaplus.ao/health"
    echo ""
    echo -e "${YELLOW}  Note: If the migration was already applied, the rolled-back API${NC}"
    echo -e "${YELLOW}  must be compatible with the current schema.${NC}"
    echo ""
    echo -n "  After completing the above, run health check? (y/N): "
    read -r RUN_HC
    [[ "$RUN_HC" =~ ^[Yy]$ ]] && bash "$(dirname "$0")/health-check.sh" prod
    ;;

  3)
    echo ""
    echo -e "${RED}  MIGRATION ROLLBACK (Supabase)${NC}"
    echo "  ─────────────────────────────────────────"
    echo -e "${YELLOW}  WARNING: This requires knowing the exact migration name to roll back.${NC}"
    echo ""
    echo "  List recent migrations:"
    pnpm --filter=api exec prisma migrate status 2>/dev/null || echo "  (run from repo root with prod env vars)"
    echo ""
    echo -n "  Enter the migration name to roll back (e.g. 20260301_add_column): "
    read -r MIGRATION_NAME
    [[ -z "$MIGRATION_NAME" ]] && echo "Aborted." && exit 0
    echo ""
    echo -e "${RED}  This marks migration '$MIGRATION_NAME' as rolled back in Prisma's tracking table.${NC}"
    echo -e "${RED}  You must also manually revert the schema changes in Supabase Studio.${NC}"
    echo ""
    echo -n "  Confirm rollback of '$MIGRATION_NAME'? (yes/no): "
    read -r CONFIRM
    [[ "$CONFIRM" != "yes" ]] && echo "Aborted." && exit 0
    pnpm --filter=api exec prisma migrate resolve --rolled-back "$MIGRATION_NAME"
    echo ""
    echo -e "${GREEN}  Migration marked as rolled back.${NC}"
    echo "  Next: Redeploy the previous API version (option 2)."
    ;;

  4)
    echo ""
    echo -e "${RED}  FULL ROLLBACK — Follow this order exactly:${NC}"
    echo ""
    echo "  Step 1: Identify the last working commit"
    echo "          git log --oneline -10"
    echo ""
    echo "  Step 2: Roll back migration (if schema changed)"
    echo "          bash scripts/rollback.sh → choose option 3"
    echo ""
    echo "  Step 3: Roll back API (Railway)"
    echo "          Railway → Deployments → last good deploy → Redeploy"
    echo ""
    echo "  Step 4: Roll back Frontend (Vercel)"
    echo "          Vercel → Deployments → last good build → Promote"
    echo ""
    echo "  Step 5: Verify"
    echo "          bash scripts/health-check.sh prod"
    echo ""
    echo -e "${YELLOW}  Estimated downtime: 2–5 minutes if steps are followed in order.${NC}"
    ;;

  5)
    echo ""
    echo "  ROLLBACK CHECKLIST"
    echo "  ───────────────────────────────────────────────────────────"
    echo "  [ ] 1. Identify the breaking commit (git log, Railway deploy time)"
    echo "  [ ] 2. Assess: did a migration run? (check Railway deploy logs)"
    echo "  [ ] 3. If migration ran: mark it rolled-back (option 3)"
    echo "  [ ] 4. Roll back API to previous Railway deploy"
    echo "  [ ] 5. Roll back Frontend to previous Vercel build"
    echo "  [ ] 6. Run health-check.sh prod"
    echo "  [ ] 7. Notify stakeholders of rollback and estimated fix time"
    echo "  [ ] 8. Create a post-mortem issue in GitHub"
    echo "  [ ] 9. Fix issue in a branch, test in staging, then re-deploy"
    echo ""
    ;;

  *)
    echo "Invalid choice." && exit 1
    ;;
esac

echo ""
