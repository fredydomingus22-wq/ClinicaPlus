---
name: temas
description: >
  Usa esta skill ao tocar em qualquer código de personalização visual do ClinicaPlus:
  upload de logo, escolha de tema de cores, subdomínio personalizado, domínio custom,
  endpoint /api/public/tema, TemaProvider, useTemaStore, LogoClinica component,
  PersonalizacaoPage, ou tabela ConfiguracaoClinica relacionada com tema/domínio.
references:
  - reference/db-schema.md
  - reference/tema-tokens.md
  - reference/domain-routing.md
  - reference/tdd-specs.md
related_skills:
  - subscricoes/SKILL.md: requirePlan controla acesso a templates, hex custom e domínio custom
  - SKILL-rbac.md: apenas ADMIN pode alterar tema e logo da clínica
---

## Quando usar esta skill

- Implementar upload de logo (`logoService.upload`)
- Implementar endpoint `GET /api/public/tema`
- Implementar `PATCH /api/clinicas/me/tema` e `/dominio`
- Criar ou editar `TemaProvider.tsx`, `useTemaStore`, `aplicarTema()`
- Criar ou editar `LogoClinica.tsx`
- Criar ou editar `PersonalizacaoPage.tsx`
- Migration `007_temas`

## Quando NÃO usar

- Alterar cores do design system base (tailwind.config.ts global) — essas são as cores default
- Configurar DNS ou Vercel manualmente — ver DEPLOYMENT.md e RUNBOOK-temas.md

## Sub-skills disponíveis

| Ficheiro | Quando ler |
|----------|-----------|
| `reference/db-schema.md` | Antes de qualquer migration ou query em ConfiguracaoClinica |
| `reference/tema-tokens.md` | Implementar CSS custom properties e tailwind.config.ts |
| `reference/domain-routing.md` | Implementar routing por hostname e verificação de domínios |
| `reference/tdd-specs.md` | Especificação de testes do módulo |

## Regras absolutas

**CORRECTO ✅ — tema injectado via CSS custom properties**
```typescript
// aplicarTema() — nunca alterar classes Tailwind directamente
document.documentElement.style.setProperty('--color-brand-primary', cores.primary);
```

**ERRADO ❌ — alterar style inline em componentes individuais**
```typescript
// NUNCA injectar cores directamente em elementos
<button style={{ backgroundColor: '#7c3aed' }}>
```

---

**CORRECTO ✅ — logo carregada com fallback**
```tsx
<img src={logoUrl} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
```

**ERRADO ❌ — logo sem fallback (quebra a UI)**
```tsx
<img src={logoUrl} />  // se URL inválida, mostra ícone quebrado
```

---

**CORRECTO ✅ — upload com validação antes de enviar ao Supabase**
```typescript
if (!TIPOS_ACEITES.includes(file.mimetype)) throw new AppError(..., 400, 'LOGO_INVALID_TYPE');
if (file.size > MAX_SIZE_BYTES) throw new AppError(..., 400, 'LOGO_TOO_LARGE');
```

**ERRADO ❌ — upload sem validar tipo e tamanho**
```typescript
await supabase.storage.from('logos').upload(path, file.buffer);  // sem validar
```

---

**CORRECTO ✅ — requirePlan para tema custom e domínio**
```typescript
router.patch('/clinicas/me/tema',    authenticate, handler);  // logo: TODOS podem
router.patch('/clinicas/me/dominio', authenticate, requirePlan('PRO'), handler);
```

**ERRADO ❌ — não verificar plano para feature premium**
```typescript
router.patch('/clinicas/me/dominio', authenticate, handler);  // sem requirePlan
```

## Checklist antes de submeter (Temas)

- [ ] CSS custom properties injectadas no `:root` via `aplicarTema()`
- [ ] `LogoClinica` tem `onError` fallback para nome da clínica
- [ ] Upload de logo valida mimetype e tamanho antes do Supabase
- [ ] URL da logo tem cache-bust (`?t={timestamp}`) após upload
- [ ] `GET /api/public/tema` responde sem autenticação (endpoint público)
- [ ] Template custom (`temaId="custom"`) só disponível com requirePlan('ENTERPRISE')
- [ ] Subdomínio validado com regex `/^[a-z0-9-]+$/` antes de guardar
- [ ] Domínio custom só disponível com requirePlan('ENTERPRISE')
- [ ] `TemaProvider` aplicado ANTES de qualquer renderização de UI (no root da app)
- [ ] Preview do tema actualiza em tempo real ao seleccionar (sem guardar)
- [ ] `pnpm typecheck` zero erros

## Ver também

- `docs/11-modules/MODULE-temas.md` — spec completa
- `docs/01-adr/ADR-013-temas-whitelabel-dominios.md` — decisões
- `docs/10-runbooks/RUNBOOK-temas.md` — diagnóstico de problemas
