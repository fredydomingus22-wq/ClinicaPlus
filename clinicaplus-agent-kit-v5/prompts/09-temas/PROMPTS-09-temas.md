# Task: Sprint 09 — Temas, White-label e Domínios Personalizados (TDD)

## METODOLOGIA: TEST-DRIVEN DEVELOPMENT
RED → GREEN → REFACTOR. Testes antes do código. Sempre.

---

## LEITURA OBRIGATÓRIA

1. `docs/CLAUDE.md`
2. `docs/01-adr/ADR-013-temas-whitelabel-dominios.md`
3. `docs/11-modules/MODULE-temas.md`
4. `kit/skills/temas/SKILL.md`
5. `kit/skills/temas/reference/tdd-specs.md`
6. `kit/skills/tdd/SKILL.md`
7. `kit/skills/subscricoes/SKILL.md` → tabela de features por plano para temas

Confirma que leste todos com: "Li os 7 ficheiros. A avançar para Passo 0."

---

## PASSO 0 — Verificar o que já existe

Antes de criar qualquer ficheiro:

```bash
# Verificar se ConfiguracaoClinica já existe no schema
grep -n "ConfiguracaoClinica\|logo_url\|cor_primaria" prisma/schema.prisma

# Verificar se já existe endpoint de configuração
grep -rn "clinicas/me" apps/api/src/routes/

# Verificar se já existe upload middleware (multer)
grep -rn "multer\|upload" apps/api/src/
```

Reporta o que encontraste. Em particular:
- `ConfiguracaoClinica` já existe? Quais campos tem?
- Já existe middleware de upload de ficheiros?
- Já existe `GET /api/clinicas/me`?

---

## PASSO 1 — Migration (additive — zero breaking changes)

### 1a. Adicionar campos ao schema

Se `ConfiguracaoClinica` já existe, adiciona APENAS os campos novos.
Se não existe, cria o model completo.

Campos a adicionar (de `MODULE-temas.md §1`):
- `temaId String @default("azul-clinico")`
- `temaCustomCores Json?`
- `subdominio String? @unique`
- `dominioCustom String? @unique`
- `faviconUrl String?`
- `nomeApp String?`

Se `corPrimaria` já existe: manter (deprecated) — não remover.

### 1b. Packages necessários

```bash
# Para upload de ficheiros
pnpm add multer @types/multer --filter=api

# Para Supabase Storage (verificar se já instalado)
pnpm add @supabase/supabase-js --filter=api  # provavelmente já existe
```

### 1c. Variáveis de ambiente novas

Verificar se já existem em `.env.example`. Se não:
```env
SUPABASE_SERVICE_KEY=...   # diferente da anon key — tem permissão de escrita no Storage
```

### 1d. Aplicar migration

```bash
pnpm prisma migrate dev --name temas_whitelabel
pnpm prisma generate
```

### Checkpoint 1
```bash
pnpm typecheck --filter=api   # zero erros
```

---

## PASSO 2 — TDD: packages/types/src/tema.ts

### RED — testes de tipos e validação
Cria `packages/types/src/tema.test.ts`:
```typescript
it('TEMAS_PREDEFINIDOS deve conter exactamente 5 temas')
it('cada tema deve ter os 6 campos de cores obrigatórios')
it('temaId "azul-clinico" deve ter primary=#2563eb')
```
Confirma que FALHAM.

### GREEN — implementa
Cria `packages/types/src/tema.ts` com `TemaCores`, `TEMAS_PREDEFINIDOS` exactamente
como em `MODULE-temas.md §2`.

---

## PASSO 3 — TDD: logoService.ts

### RED — escreve TODOS os testes antes
Cria `apps/api/src/services/logo.service.test.ts` com TODOS os casos
de `kit/skills/temas/reference/tdd-specs.md` secção "logoService.ts".
Mock: `vi.mock('@supabase/supabase-js')`.
Confirma que FALHAM.

### GREEN — implementa
Cria `apps/api/src/services/logo.service.ts` exactamente como em `MODULE-temas.md §4`.

VERIFICAR:
- `upsert: true` no upload (substituir logo anterior)
- `MAX_SIZE_BYTES = 2 * 1024 * 1024` (2MB)
- `TIPOS_ACEITES` inclui png, jpeg, svg+xml, webp
- Cache-bust `?t={Date.now()}` na URL retornada

### Checkpoint 3
```bash
pnpm test --run --filter=api -- logo.service
```

---

## PASSO 4 — TDD: Endpoint público GET /api/public/tema

### RED — testes de integração
Cria `apps/api/src/routes/public-tema.test.ts` com TODOS os casos
de `tdd-specs.md` secção "GET /api/public/tema".
Confirma que FALHAM.

### GREEN — implementa
Cria `apps/api/src/routes/public-tema.ts` com a lógica de `MODULE-temas.md §5`.

GARANTIR:
- Sem middleware de autenticação (endpoint público)
- Resolve por `dominioCustom` PRIMEIRO, depois por `subdominio`, depois por `slug`
- Se `temaId = "custom"` e `temaCustomCores` não null → usa custom cores
- Se domínio desconhecido → `{ data: null }` (200, não 404)

Regista em `app.ts`:
```typescript
import publicTemaRouter from './routes/public-tema';
app.use('/api/public', publicTemaRouter);
```

### Checkpoint 4
```bash
pnpm test --run --filter=api -- public-tema
```

---

## PASSO 5 — TDD: Endpoints autenticados de configuração

### RED — testes de integração
Cria `apps/api/src/routes/clinica-config.test.ts` com casos de `tdd-specs.md`:
- `PATCH /api/clinicas/me/tema`
- `POST /api/clinicas/me/logo`
- `DELETE /api/clinicas/me/logo`
- `PATCH /api/clinicas/me/dominio`
Confirma que FALHAM.

### GREEN — adicionar rotas (NÃO recriar o router de clinicas existente)
No router de clinicas existente (`apps/api/src/routes/clinicas.ts`), ADICIONA:

```typescript
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2.1 * 1024 * 1024 } });

// LOGO
router.post('/me/logo',    authenticate, requirePermission('configuracao', 'edit'), upload.single('logo'), uploadLogo);
router.delete('/me/logo',  authenticate, requirePermission('configuracao', 'edit'), removerLogo);

// TEMA
router.patch('/me/tema',   authenticate, requirePermission('configuracao', 'edit'), actualizarTema);

// DOMÍNIO
router.patch('/me/dominio', authenticate, requirePlan('PRO'), requirePermission('configuracao', 'edit'), actualizarDominio);
```

GARANTIR:
- `PATCH /me/tema` com `temaId="custom"` + plano PRO → 402
- `PATCH /me/dominio` com `dominioCustom` + plano PRO → 402
- `POST /me/logo` verifica tipo e tamanho antes de chamar logoService

---

## PASSO 6 — Frontend: TemaProvider + useTemaStore

### RED — component tests
Cria `apps/web/src/providers/TemaProvider.test.tsx` com casos de `tdd-specs.md`
secção "TemaProvider.tsx".
Confirma que FALHAM.

### GREEN — implementa

Cria `apps/web/src/lib/tema.ts`:
```typescript
// aplicarTema(cores: TemaCores): void
// Injeta CSS custom properties no :root
```

Cria `apps/web/src/stores/tema.store.ts`:
```typescript
// Zustand store: { cores, temaId, logoUrl, nomeApp, faviconUrl, setTema }
```

Cria `apps/web/src/providers/TemaProvider.tsx`:
```typescript
// Lê hostname, chama /api/public/tema, chama store.setTema()
// Falha silenciosa se endpoint não responde
```

### Integrar no App.tsx ou main.tsx
```tsx
// Envolver a aplicação:
<TemaProvider>
  <App />
</TemaProvider>
// TemaProvider deve ser o mais externo possível
```

---

## PASSO 7 — Frontend: LogoClinica component

### RED → GREEN → REFACTOR
Testes: secção "LogoClinica.tsx" de tdd-specs.md.

Cria `apps/web/src/components/LogoClinica.tsx` como em `MODULE-temas.md §8`.

VERIFICAR:
- `onError` handler que esconde img e mostra fallback
- Tamanhos `sm | md | lg` via prop
- Usa `nomeApp` do `useTemaStore` como fallback text

Adicionar `<LogoClinica>` ao:
- Header do painel admin/médico/recepcionista (substituir logo hardcoded se existir)
- Header do portal do paciente

---

## PASSO 8 — Frontend: PersonalizacaoPage

### RED → GREEN → REFACTOR
Cria `apps/web/src/pages/configuracoes/PersonalizacaoPage.tsx` seguindo
o wireframe de `MODULE-temas.md §7`.

Secções:
1. **Logo** — upload drag-and-drop + preview + remover (todos os planos)
2. **Tema** — 5 cards de template com preview de cor (PRO via PlanGate)
3. **Cor custom** — colour picker hex (ENTERPRISE via PlanGate aninhado)
4. **Subdomínio** — input com verificação de disponibilidade (PRO via PlanGate)
5. **Domínio custom** — input + instrução CNAME (ENTERPRISE via PlanGate)

GARANTIR:
- Preview do tema actualiza em tempo real ao seleccionar (sem guardar)
- Verificação de disponibilidade de subdomínio: debounce 500ms
- Após guardar tema → `aplicarTema()` chamado imediatamente (preview)
- Após upload logo → logo actualiza no header sem refresh

Adicionar rota `/configuracoes/personalizacao` ao router.

---

## PASSO 9 — tailwind.config.ts

Adicionar suporte a CSS custom properties:

```typescript
// tailwind.config.ts
colors: {
  brand: {
    primary:   'var(--color-brand-primary)',
    secondary: 'var(--color-brand-secondary)',
    accent:    'var(--color-brand-accent)',
    bg:        'var(--color-brand-bg)',
    surface:   'var(--color-brand-surface)',
    text:      'var(--color-brand-text)',
  },
},
```

Adicionar ao `apps/web/src/styles/global.css`:
```css
:root {
  --color-brand-primary:   #2563eb;
  --color-brand-secondary: #1d4ed8;
  --color-brand-accent:    #3b82f6;
  --color-brand-bg:        #f8faff;
  --color-brand-surface:   #ffffff;
  --color-brand-text:      #0f172a;
}
```

---

## CHECKPOINT FINAL

```bash
pnpm typecheck                       # zero erros
pnpm test --run                      # todos verdes
pnpm test --run --coverage --filter=api
# logo.service:   ≥ 85% lines
# public-tema:    ≥ 85% lines
pnpm lint                            # zero warnings
```

### Checklist manual obrigatório

**Database:**
- [ ] `temaId`, `subdominio`, `dominioCustom` presentes em ConfiguracaoClinica no Prisma Studio

**API:**
- [ ] `GET /api/public/tema?domain=test.clinicaplus.ao` responde sem autenticação
- [ ] `GET /api/public/tema?domain=unknown.clinicaplus.ao` retorna `{ data: null }`
- [ ] `POST /api/clinicas/me/logo` com PNG válido → URL CDN retornada
- [ ] `POST /api/clinicas/me/logo` com PDF → 400
- [ ] `POST /api/clinicas/me/logo` com 3MB → 400
- [ ] `PATCH /api/clinicas/me/tema` com temaId="custom" e plano PRO → 402
- [ ] `PATCH /api/clinicas/me/dominio` com dominioCustom e plano PRO → 402

**Frontend:**
- [ ] Abrir `/configuracoes/personalizacao` sem erros na consola
- [ ] Seleccionar template "Verde Saúde" → header muda de cor imediatamente
- [ ] Upload logo → logo aparece no header sem refresh
- [ ] Sections de tema e domínio mostram PlanGate para plano BASICO
- [ ] Color picker só visível para ENTERPRISE
- [ ] `<LogoClinica>` no header — mostra logo da clínica se configurada

---

## SE ENCONTRARES CONFLITOS

- `ConfiguracaoClinica` tem campos que conflituam → PARA e reporta quais
- Router de clinicas já tem `PATCH /me/configuracao` → PARA e reporta — NÃO duplicar rota
- `multer` já instalado com configuração diferente → PARA e reporta — adaptar
- Tailwind já tem config de `brand` colors com valores diferentes → PARA e reporta
