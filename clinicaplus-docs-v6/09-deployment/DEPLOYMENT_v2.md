# ClinicaPlus v2 — Deployment (Delta)

Delta em relação a `09-deployment/DEPLOYMENT.md` (v1). Dois novos serviços: Upstash Redis e Railway Worker.

---

## 1. Upstash Redis — Setup

1. **upstash.com** → Create Database
2. Nome: `clinicaplus-prod` | Region: `eu-west-1`
3. TLS: **enabled** (obrigatório)
4. Copiar `REDIS_URL` (formato `rediss://default:<pass>@<host>.upstash.io:6379`)
5. Adicionar `REDIS_URL` nas variáveis do Railway API e do Railway Worker

**Tier recomendado:** Pay-as-you-go ($0.20/100k comandos). Free tier (10k/dia) só para desenvolvimento.

---

## 2. Railway Worker — Novo Service

```
Railway → Project → New Service → Deploy from GitHub repo
Root directory: apps/worker
Build command: pnpm install --frozen-lockfile && pnpm build
Start command: node dist/index.js
```

**Variáveis do Worker (Railway → Variables):**
```
DATABASE_URL     = [supabase port 6543]
DIRECT_URL       = [supabase port 5432]
REDIS_URL        = [upstash redis]
RESEND_API_KEY   = [resend.com]
NODE_ENV         = production
ALERT_EMAIL      = dev@clinicaplus.ao
```

O Worker **não** precisa de: `JWT_SECRET`, `PORT`, `FRONTEND_URL`, `CORS_ORIGIN`.

---

## 3. Variáveis Novas no API Service

```
REDIS_URL                = [upstash redis]
WEBHOOK_SIGNING_SECRET   = [openssl rand -base64 64]
API_KEY_SALT             = [openssl rand -base64 32]
```

---

## 4. GitHub Actions — Actualizar ci.yml

```yaml
# Adicionar ao job migrate-and-deploy, após pnpm db:migrate:
- name: Seed plan limits
  run: pnpm --filter=api exec ts-node prisma/seeds/planLimits.ts
  # Idempotente — safe para correr em cada deploy
  env:
    DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
    DIRECT_URL:   ${{ secrets.PROD_DIRECT_URL }}
```

---

## 5. Verificação Pós-Deploy v2

```bash
# Ao health check existente, verificar o novo campo:
curl https://api.clinicaplus.ao/health
# Esperado:
# { "status": "ok", "database": "connected", "redis": "connected", "uptime": ... }

# Se "redis": "disconnected":
# 1. Verificar REDIS_URL no Railway API Variables
# 2. Verificar se Upstash está acessível (dashboard.upstash.com)
# 3. API continua a funcionar — Redis é degradação graciosa, não crítica para REST
```

---

## 6. Rollback v2

O rollback v2 é idêntico ao v1 (reverter Railway deploy + Railway Worker deploy separadamente). As migrations são additive — não há rollback de schema em v2. Se uma migration causar problema, aplicar migration de fix forward.
