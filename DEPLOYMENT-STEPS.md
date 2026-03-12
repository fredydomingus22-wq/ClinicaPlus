# Deployment Steps — ClinicaPlus

> **Stack:** Railway (API) · Vercel (Web) · Supabase (PostgreSQL)  
> **Prerequisite:** Criar projecto Supabase produção antes de começar.

---

## Supabase — Base de Dados Produção

1. Vai a [supabase.com](https://supabase.com) → **New project**
2. Nome: `clinicaplus-prod` | Região: `eu-central-1` | Guarda a password gerada
3. Vai a **Project Settings → Database → Connection String**:
   - **Transaction** (port 6543) → será `DATABASE_URL`
   - **Session** (port 5432) → será `DIRECT_URL`

4. Aplica as migrations (executa a partir da raiz do projecto):

```powershell
# PowerShell — substitui pelas URLs reais
$env:DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
$env:DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-1-eu-central-1.pooler.supabase.com:5432/postgres"
pnpm --filter=api exec prisma migrate deploy
```

---

## Railway — API

### 1. Criar Service

- [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
- Selecciona o repo → Root directory: `apps/api`

### 2. Environment Variables

`Railway → Service → Variables` — adiciona exactamente:

| Variable             | Value                                             |
| -------------------- | ------------------------------------------------- |
| `DATABASE_URL`       | Supabase prod — Transaction (port 6543)           |
| `DIRECT_URL`         | Supabase prod — Session (port 5432)               |
| `JWT_SECRET`         | `openssl rand -base64 64`                         |
| `JWT_REFRESH_SECRET` | `openssl rand -base64 64` (diferente do anterior) |
| `PORT`               | `3001`                                            |
| `NODE_ENV`           | `production`                                      |
| `FRONTEND_URL`       | `https://app.clinicaplus.ao` (ou URL do Vercel)   |
| `RESEND_API_KEY`     | `re_live_...` da dashboard Resend                 |

> **Gerar secrets (Windows PowerShell):**
>
> ```powershell
> [Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))
> # Corre duas vezes para JWT_SECRET e JWT_REFRESH_SECRET
> ```

### 3. Health Check

- Railway → Service → **Settings** → Health Check Path: `/health`
- Health Check Timeout: `30`

### 4. Build & Start (já configurado em `railway.json`)

```
Build:  pnpm install --frozen-lockfile && pnpm build
Start:  node dist/server.js
```

### 5. Domínio (opcional)

- Railway → Settings → **Domains** → Add custom domain
- DNS: `api.clinicaplus.ao  CNAME  →  <your-app>.up.railway.app`

---

## Vercel — Web

### 1. Criar Projecto

- [vercel.com](https://vercel.com) → **New Project** → Import from GitHub → `clinicaplus`
- **Root Directory:** `apps/web`
- **Build Command:** `pnpm build`
- **Output Directory:** `dist`
- **Install Command:** `pnpm install --frozen-lockfile`
- **Node.js Version:** `20.x`

### 2. Environment Variables

`Vercel → Settings → Environment Variables`:

| Variable       | Value                                            |
| -------------- | ------------------------------------------------ |
| `VITE_API_URL` | `https://api.clinicaplus.ao` (ou URL do Railway) |
| `VITE_APP_ENV` | `production`                                     |

### 3. Domínio (opcional)

- Vercel → Settings → **Domains** → `app.clinicaplus.ao`

---

## GitHub Secrets (para CI/CD automático)

`GitHub repo → Settings → Secrets and variables → Actions`:

| Secret                    | Value                              |
| ------------------------- | ---------------------------------- |
| `PROD_DATABASE_URL`       | Supabase prod — Transaction (6543) |
| `PROD_DIRECT_URL`         | Supabase prod — Session (5432)     |
| `TEST_DATABASE_URL`       | Supabase dev — Transaction (6543)  |
| `TEST_DIRECT_URL`         | Supabase dev — Session (5432)      |
| `TEST_JWT_SECRET`         | Qualquer string 64+ chars          |
| `TEST_JWT_REFRESH_SECRET` | Outra string 64+ chars (diferente) |
| `TURBO_TOKEN`             | Token do Vercel para Remote Cache  |
| `TURBO_TEAM`              | ID do Time no Vercel               |

---

## Verificação Pós-Deploy

```bash
# API health check
curl https://api.clinicaplus.ao/health
# Expected: {"status":"ok","timestamp":"...","version":"1.0.0"}

# Ou via scripts
bash scripts/health-check.sh prod
```

**Checklist:**

- [ ] `GET /health` retorna `{"status":"ok"}`
- [ ] Login funciona end-to-end
- [ ] Criação de agendamento funciona
- [ ] Emails são enviados (verifica Resend dashboard)
- [ ] Railway logs sem erros de startup
- [ ] Vercel deployment status → Ready

---

## Rollback Rápido

| Componente   | Procedimento                                                       |
| ------------ | ------------------------------------------------------------------ |
| **Frontend** | Vercel → Deployments → selecciona anterior → Promote to Production |
| **API**      | Railway → Deployments → selecciona anterior → Redeploy             |
| **DB**       | Supabase → Backups → selecciona timestamp → Restore (~5 min)       |
