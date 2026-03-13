# Fase 7 — Deploy (Railway + Vercel + Supabase CI/CD)

Skill de referência: `SKILL-deployment.md`
Verificação final: `bash scripts/health-check.sh prod` — todos os checks verdes.

---

## Prompt 7.1 — Preparar repositório e Supabase produção

```
Lê o ficheiro SKILL-deployment.md completo.

1. Verifica que o repositório está limpo para deploy:
   - pnpm build — zero erros
   - pnpm typecheck — zero erros
   - pnpm test --run — zero falhas
   - pnpm lint — zero erros
   - git status — sem ficheiros não committed
   - .gitignore inclui: .env, .env.local, .env.*.local, node_modules, dist, .turbo, coverage, *.log

   Se algum falhar, resolve antes de continuar.

2. Cria os ficheiros de configuração de deploy:

   a) apps/api/railway.json:
      Build: pnpm install --frozen-lockfile && pnpm build
      Start: node dist/server.js
      Health: /health (timeout 30s)
      Restart: ON_FAILURE, max 3 retries

   b) apps/web/vercel.json já existe — verifica que tem:
      rewrite: /* → /index.html
      cache header para /assets/*: max-age=31536000, immutable

   c) apps/api/Dockerfile (backup se Railway NIXPACKS falhar):
      FROM node:20-alpine
      instala pnpm, copia workspace, instala deps, build, expõe 3001, CMD node dist/server.js

3. Confirma que apps/api/package.json tem:
   "engines": { "node": ">=20", "pnpm": ">=9" }
   "scripts": { "start": "node dist/server.js" }

4. Instrução manual para o humano (não podes fazer isto automaticamente):

   SUPABASE PRODUÇÃO:
   a) Vai a supabase.com → New project
   b) Nome: clinicaplus-prod, Região: eu-central-1
   c) Guarda a password da base de dados
   d) Vai a Project Settings → Database → Connection String
   e) Copia Transaction (port 6543) → será PROD_DATABASE_URL
   f) Copia Session (port 5432) → será PROD_DIRECT_URL
   
   Quando tiveres estas strings, executa:
   bash scripts/migrate.sh deploy
   (com as vars de produção no .env ou como env vars temporárias)

5. Aplica a migration inicial em produção:
   DATABASE_URL=<prod-6543> DIRECT_URL=<prod-5432> pnpm --filter=api exec prisma migrate deploy
   
   Reporta o output.
```

---

## Prompt 7.2 — Configurar Railway (API) e Vercel (Web)

```
Lê SKILL-deployment.md (secções 3 e 4).

Estas são instruções para o humano executar nas dashboards de Railway e Vercel.
Cria o ficheiro DEPLOYMENT-STEPS.md na raiz do projecto com todas as instruções:

# Deployment Steps

## Railway — API

### 1. Criar service
- Vai a railway.app → New Project → Deploy from GitHub
- Selecciona o repo clinicaplus
- Root directory: apps/api
- Build command: pnpm install --frozen-lockfile && pnpm build
- Start command: node dist/server.js

### 2. Environment Variables (Railway → Variables)
Adiciona exactamente estas variáveis:

DATABASE_URL        = [supabase prod port 6543]
DIRECT_URL          = [supabase prod port 5432]
JWT_SECRET          = [gera com: openssl rand -base64 64]
JWT_REFRESH_SECRET  = [gera com: openssl rand -base64 64 — DIFERENTE do anterior]
PORT                = 3001
NODE_ENV            = production
FRONTEND_URL        = https://clinica-plus-web.vercel.app
RESEND_API_KEY      = [da dashboard resend.com]

### 3. Health check
- Railway → Settings → Health Check Path: /health
- Railway → Settings → Health Check Timeout: 30

### 4. Custom domain
- Railway → Settings → Domains → Add custom domain
- DNS: clinica-plus-web.vercel.app CNAME → [railway-domain.up.railway.app]

---

## Vercel — Web

### 1. Criar projecto
- vercel.com → New Project → Import from GitHub → clinicaplus
- Root directory: apps/web
- Build command: pnpm build
- Output directory: dist
- Install command: pnpm install --frozen-lockfile
- Node.js version: 20.x

### 2. Environment Variables (Vercel → Settings → Environment Variables)
VITE_API_URL   = https://clinicaplus-api.up.railway.app
VITE_APP_ENV   = production

### 3. Custom domain
- Vercel → Settings → Domains → clinica-plus-web.vercel.app

---

## Verificação pós-deploy

bash scripts/health-check.sh prod

---

Depois de criar o ficheiro, executa:
   git add DEPLOYMENT-STEPS.md && git commit -m "docs: add deployment steps"

Reporta o caminho do ficheiro criado.
```

---

## Prompt 7.3 — Configurar GitHub Actions CI/CD

```
Lê SKILL-deployment.md (secção 5 — GitHub Actions).

1. Cria .github/workflows/ci.yml com o conteúdo exacto de SKILL-deployment.md:
   - Job "validate": typecheck + lint + tests com env vars de teste
   - Job "migrate-and-deploy": só em push para main, após validate passar
     Corre prisma migrate deploy com vars de produção.
   - Railway e Vercel fazem deploy automático via GitHub integration.

2. Cria .github/workflows/pr-check.yml (mais rápido, para PRs):
   - Só corre typecheck + lint + unit tests (sem integration — mais rápido)
   - Commenta no PR com o resultado

3. Lista de GitHub Secrets necessários — adiciona ao DEPLOYMENT-STEPS.md:
   TEST_DATABASE_URL       → Supabase dev, port 6543
   TEST_DIRECT_URL         → Supabase dev, port 5432
   TEST_JWT_SECRET         → qualquer string 64+ chars para testes
   TEST_JWT_REFRESH_SECRET → idem, diferente
   PROD_DATABASE_URL       → Supabase prod, port 6543
   PROD_DIRECT_URL         → Supabase prod, port 5432

4. Optimiza o CI com Turborepo remote cache:
   Adiciona ao ci.yml job "validate":
   env:
     TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
     TURBO_TEAM:  ${{ secrets.TURBO_TEAM }}
   
   E adiciona TURBO_TOKEN e TURBO_TEAM à lista de secrets.

5. Verifica o YAML é válido:
   cat .github/workflows/ci.yml | python3 -c "import sys, yaml; yaml.safe_load(sys.stdin)" && echo "YAML válido"

6. Commit e push:
   git add .github/
   git commit -m "ci: add GitHub Actions CI/CD pipeline"
   git push origin main

Reporta o output do push.
```

---

## Prompt 7.4 — Verificação final de produção

```
Com o deploy completo (Railway a correr, Vercel deployed, DNS propagado):

1. Corre o health check completo:
   bash scripts/health-check.sh prod

2. Testa o fluxo completo de login em produção:
   curl -X POST https://clinicaplus-api.up.railway.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@demo.ao","password":"Demo1234!","clinicaSlug":"multipla-luanda"}' \
     -c /tmp/cookies.txt -v

   (Se o seed não foi executado em produção, executa-o:
    bash scripts/seed.sh — com vars de produção no .env ou como env temporárias)

3. Verifica os headers de segurança:
   curl -I https://clinicaplus-api.up.railway.app/health
   # Deve mostrar: X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security

4. Verifica CORS:
    curl -X OPTIONS https://clinicaplus-api.up.railway.app/api/auth/login \
     -H "Origin: https://clinica-plus-web.vercel.app" \
     -H "Access-Control-Request-Method: POST" -v
    # Deve retornar Access-Control-Allow-Origin: https://clinica-plus-web.vercel.app

5. Verifica que frontend faz load:
    curl -s https://clinica-plus-web.vercel.app | grep -c "ClinicaPlus"

6. Verifica deep link (React Router):
    curl -s https://clinica-plus-web.vercel.app/login | head -5
   # Deve retornar o index.html (não 404)

7. Cria o relatório de deploy em DEPLOYMENT-REPORT.md:
   Data e hora do deploy
   Versão (git SHA)
   Resultados do health check
   URLs de produção
   Problemas encontrados e resolvidos
   Próximos passos (monitoring, alertas)

Reporta o output de cada comando e o conteúdo do relatório.
```

**Verificação:**
```bash
bash scripts/health-check.sh prod   # all green
curl https://clinicaplus-api.up.railway.app/health   # {"status":"ok"}
# GitHub Actions CI badge verde no README
```

---

## Checkpoint Fase 7

Antes de avançar para a Fase 8, confirma:

- [x] `bash scripts/health-check.sh prod` — todos os checks verdes
- [x] Login via curl em produção funciona e retorna accessToken (verificado via browser e infra)
- [x] Cookie httpOnly visível nos headers (Set-Cookie com httpOnly)
- [x] Headers de segurança presentes (Helmet a funcionar)
- [x] CORS correcto: só aceita origem de clinica-plus-web.vercel.app
- [x] Frontend faz load em clinica-plus-web.vercel.app
- [x] Deep link /login não retorna 404
- [x] GitHub Actions CI pipeline verde
- [x] Railway health check verde no dashboard
- [x] DEPLOYMENT-STEPS.md e DEPLOYMENT-REPORT.md committed
