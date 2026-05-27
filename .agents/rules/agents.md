---
trigger: always_on
---

# ClinicaPlus — Agent Instructions

This file is read by Claude Code (and any AI agent) before every task.
Follow these rules exactly. Do not deviate without explicit instruction from the developer.

---

## 1. What This Project Is

ClinicaPlus is a **multi-tenant SaaS** for private clinic management in Angola.
It handles scheduling, pre-triage, consultations, prescriptions, and patient self-service.

**Monorepo layout:**
```
clinicaplus/
├── apps/
│   ├── api/          # Node.js + Express + Prisma — deployed to Railway
│   └── web/          # React + Vite — deployed to Vercel
├── packages/
│   ├── types/        # Shared TypeScript types (zod schemas + inferred types)
│   ├── ui/           # Shared React component library (design system)
│   └── utils/        # Shared pure utilities (date, formatting, constants)
├── CLAUDE.md
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## 2. Tech Stack (Non-Negotiable)

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 20 LTS |
| API Framework | Express.js | 4.x |
| ORM | Prisma | 5.x |
| Database | PostgreSQL via Supabase | 15+ |
| Frontend | React + Vite | React 18, Vite 5 |
| Styling | Tailwind CSS | 3.x |
| Server state | TanStack Query | v5 |
| Client state | Zustand | v4 |
| Forms | React Hook Form + Zod | |
| Language | TypeScript everywhere | 5.x strict |
| Monorepo | Turborepo + pnpm workspaces | Turbo 2.x |
| Auth | JWT (access 15min + refresh 7d) | |
| Email | Resend | |
| Package manager | pnpm | 9.x |

Do NOT introduce new dependencies without asking. If a task requires a new package, stop and ask first.

---

## 3. Commands

```bash
pnpm install                          # Install all
pnpm dev                              # Run all (API :3001, Web :5173)
pnpm dev --filter=api                 # API only
pnpm dev --filter=web                 # Web only
pnpm build                            # Build all
pnpm test                             # Test all
pnpm test --filter=api                # Test API only
pnpm typecheck                        # Type-check all
pnpm lint                             # Lint all
pnpm db:migrate                       # Apply migrations
pnpm db:generate                      # Generate Prisma client
pnpm db:studio                        # Open Prisma Studio
pnpm db:seed                          # Seed test data
pnpm db:reset                         # DANGER: destroys all data
```

---

## 4. Environment Variables

### apps/api/.env
```
DATABASE_URL=postgresql://...         # Supabase — Transaction mode port 6543
DIRECT_URL=postgresql://...           # Supabase — Direct port 5432 (migrations only)
JWT_SECRET=                           # min 64 chars
JWT_REFRESH_SECRET=                   # different from JWT_SECRET
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
RESEND_API_KEY=re_...
```

### apps/web/.env
```
VITE_API_URL=http://localhost:3001
VITE_APP_ENV=development
```

---

## 5. Code Rules

### TypeScript
- Strict mode. No `any`. Use `unknown` and narrow.
- All API response shapes defined in `packages/types/src/`.
- Zod schemas are the single source of truth — infer TS types from them.
- No `as` assertions without an explanatory comment.

### Backend (apps/api)
- Route files export only a Router. Business logic lives in services.
- Services are pure — no req/res inside.
- All DB access through Prisma. No raw SQL except in migrations.
- Every write must include `clinicaId` tenant guard.
- Throw `AppError` — global handler formats responses.
- Never return raw Prisma objects. Map to response DTOs.

### Frontend (apps/web)
- All data fetching via TanStack Query. No useEffect for fetching.
- All forms via React Hook Form + Zod resolver.
- No sensitive data in localStorage. Tokens in httpOnly cookies.
- Components in `packages/ui` are pure (no fetching, no business logic).
- All user-facing text in Portuguese (pt-AO).

### Both
- No console.log in committed code. Use the logger.
- All dates stored/transmitted in UTC. Display in Africa/Luanda timezone.
- Monetary amounts as integer Kwanza (no floats).
- Every public function has a JSDoc comment.

---

## 6. Multitenancy Rules (Critical)

Every query touching tenant data MUST include clinicaId from req.clinica.id.

```typescript
// CORRECT
const pacientes = await prisma.paciente.findMany({
  where: { clinicaId: req.clinica.id }
});

// WRONG — leaks across tenants
const pacientes = await prisma.paciente.findMany();
```

Super Admin bypass requires explicit eslint-disable comment explaining why.

---

## 7. Git Conventions

Types: feat / fix / chore / refactor / test / docs
Scopes: api / web / db / auth / ui / types / deploy / infra

Examples:
  feat(api): add slot availability endpoint
  fix(web): prevent double-submit on booking form
  chore(deps): upgrade prisma to 5.9

Branch: feat/slug, fix/slug, chore/slug
Never commit directly to main.

---

## 8. When Stuck

1. Check 01-adr/ before proposing architecture alternatives.
2. Check packages/types/src/ before creating new schemas.
3. Check packages/ui/src/ before building new components.
4. If ambiguous: output numbered clarifying questions, do not guess.
5. If a task requires changing an ADR, flag it explicitly.
