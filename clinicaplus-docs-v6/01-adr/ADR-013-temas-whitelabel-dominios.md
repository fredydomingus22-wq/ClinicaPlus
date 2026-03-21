# ADR-013 — Temas, White-label e Domínios Personalizados

**Data:** 2026-03-18  
**Status:** ACEITE  
**Decisores:** ClinicaPlus Core Team  
**Contexto:** Personalização visual por tenant  

---

## Contexto

Cada clínica tem identidade própria — cores, logo, nome. O painel e o portal do paciente mostram actualmente a identidade do ClinicaPlus. Para adopção enterprise e para o argumento de venda ("é o sistema da sua clínica"), cada tenant precisa de:

1. **Logo própria** visível no painel e portal do paciente
2. **Tema de cores** personalizado (5 templates + custom)
3. **Domínio personalizado** — `nutrimacho.clinicaplus.ao` aponta para o tenant `nutrimacho`

---

## Decisões

### D1 — Temas: CSS Custom Properties injectadas server-side

**Abordagem:** A API retorna um objecto `tema` no endpoint `GET /clinicas/me`. O frontend injeta as cores como CSS custom properties no `:root`. O Tailwind usa esses tokens via classes semânticas (`bg-brand-primary`, `text-brand-accent`).

**5 templates pré-definidos + custom:**
- `azul-clinico` (default) — azul #2563eb
- `verde-saude` — verde esmeralda #059669
- `roxo-moderno` — violeta #7c3aed
- `laranja-energia` — âmbar #d97706
- `cinzento-premium` — slate escuro #334155
- `custom` — admin define hex manualmente

**Porquê não Tailwind config em runtime:** o Tailwind é compilado em build time. CSS custom properties são o único mecanismo seguro para theming dinâmico por tenant sem rebuild.

### D2 — Logo: upload para Supabase Storage

Logo é uma imagem enviada pelo admin (PNG/JPG/SVG, máx 2MB). Armazenada no Supabase Storage bucket `logos`, com path `/{clinicaId}/logo.{ext}`. URL pública CDN. Não armazenar a imagem na DB — só a URL.

**Exibição:** logo aparece no header do painel (admin/médico/recepcionista), no portal do paciente, e no cabeçalho de faturas PDF.

### D3 — Domínios personalizados: subdomain routing no Railway

**Arquitectura:**
```
*.clinicaplus.ao  →  wildcard DNS para Railway (Vercel frontend)
nutrimacho.clinicaplus.ao  →  Frontend lê subdomain do hostname
                           →  GET /api/clinicas/by-domain?domain=nutrimacho
                           →  carrega tema + logo desta clínica
```

O frontend detecta o subdomain via `window.location.hostname`. Se for `*.clinicaplus.ao`, extrai o slug. Se for domínio custom (ex: `sistema.nutrimacho.ao`), envia o hostname completo — a API resolve pelo campo `dominioCustom`.

**Domínios completamente custom (`sistema.nutrimacho.ao`):** clínica configura CNAME para `app.clinicaplus.ao`. O Railway/Vercel resolve via SNI. Disponível apenas em ENTERPRISE.

### D4 — Tema em cascata: PlanoLimite controla acesso

| Plano | Logo | Templates | Custom hex | Domínio *.clinicaplus.ao | Domínio custom |
|-------|------|-----------|------------|--------------------------|----------------|
| BASICO | ✅ | ❌ (só default) | ❌ | ❌ | ❌ |
| PRO | ✅ | ✅ (5 templates) | ❌ | ✅ | ❌ |
| ENTERPRISE | ✅ | ✅ | ✅ (custom hex) | ✅ | ✅ |

---

## Alternativas rejeitadas

| Alternativa | Porquê não |
|-------------|-----------|
| CSS-in-JS por tenant | Bundle size, SSR complexity, sem benefício sobre CSS vars |
| Tailwind preset por tenant | Requer build por tenant — inviável em SaaS multi-tenant |
| iframe do portal numa URL custom | Má experiência, SEO inexistente, não é white-label real |
| Serviço de proxy externo (Cloudflare Workers) | Complexidade desnecessária, custo adicional |

---

## Consequências

**Fica mais fácil:**
- Clínicas com identidade forte (grupos, hospitais privados) adoptam mais facilmente
- Argumento de venda ENTERPRISE: "o sistema tem a cara da vossa clínica"
- Faturas PDF com logo da clínica — mais profissional

**Fica mais difícil:**
- Routing de domínios custom requer configuração no Railway/Vercel por clínica
- Upload de logo requer validação de tipo/tamanho para evitar abuso
- Testes precisam de simular diferentes subdomains

**Migração de dados:**
- `corPrimaria String? // já existe na ConfiguracaoClinica` — expandir para objecto `tema`
- `logoUrl String? // já existe na ConfiguracaoClinica` — manter, adicionar campos
