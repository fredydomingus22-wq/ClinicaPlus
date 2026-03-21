# MODULE — Temas, White-label e Domínios Personalizados

> ADR de referência: ADR-013  
> Plano: BASICO (logo only) | PRO (templates) | ENTERPRISE (custom hex + domínio próprio)  
> Lê também: MODULE-subscricoes.md (requirePlan), DEPLOYMENT.md (Railway/Vercel domains)

---

## 1. Schema Prisma — migration_007_temas

```prisma
// ─── Configuração de tema por clínica ─────────────────────────────────────────
// Adicionar/actualizar campos em ConfiguracaoClinica existente

// Se ConfiguracaoClinica não existe ainda, criar. Se já existe, adicionar campos:
model ConfiguracaoClinica {
  clinicaId   String   @id
  clinica     Clinica  @relation(fields: [clinicaId], references: [id])

  // ── CAMPOS JÁ EXISTENTES (da v1 / migration_005) ──────────────────────────
  logoUrl         String?   // URL CDN da logo (Supabase Storage)
  enderecoFatura  String?
  nif             String?
  iban            String?
  faturaAuto      Boolean   @default(false)
  corPrimaria     String?   // DEPRECATED — migrado para tema.corPrimaria abaixo

  // ── NOVOS CAMPOS (migration_007) ──────────────────────────────────────────
  // Identificador do template de tema
  // "azul-clinico" | "verde-saude" | "roxo-moderno" | "laranja-energia" |
  // "cinzento-premium" | "custom"
  temaId          String    @default("azul-clinico")

  // Apenas preenchido se temaId = "custom" e plano ENTERPRISE
  temaCustomCores Json?
  // Shape: {
  //   primary:    string,  // ex: "#7c3aed"
  //   secondary:  string,  // ex: "#5b21b6"
  //   accent:     string,  // ex: "#a78bfa"
  //   background: string,  // ex: "#faf5ff"
  //   surface:    string,  // ex: "#ede9fe"
  //   text:       string,  // ex: "#1e1b4b"
  // }

  // Domínio personalizado (subdomínio *.clinicaplus.ao)
  // null = usa slug da clínica (slug.clinicaplus.ao)
  // "nutrimacho" = nutrimacho.clinicaplus.ao
  subdominio      String?   @unique   // só letras minúsculas, números e hífens

  // Domínio completamente custom (ENTERPRISE only)
  // ex: "sistema.nutrimacho.ao"
  dominioCustom   String?   @unique

  // Favicon personalizado (URL Supabase Storage)
  faviconUrl      String?

  // Nome da aplicação (aparece no título da tab do browser)
  // null = usa nome da clínica
  nomeApp         String?

  criadoEm        DateTime  @default(now())
  actualizadoEm   DateTime  @updatedAt

  @@map("configuracoes_clinica")
}
```

---

## 2. Templates de tema — definição completa

```typescript
// packages/types/src/tema.ts

export interface TemaCores {
  primary:    string;  // cor principal (botões, links, badges activos)
  secondary:  string;  // cor secundária (hover states, borders)
  accent:     string;  // cor de destaque (badges, highlights)
  background: string;  // fundo da página
  surface:    string;  // cards, modals, sidebars
  text:       string;  // texto principal
}

export const TEMAS_PREDEFINIDOS: Record<string, { nome: string; cores: TemaCores; preview: string }> = {
  'azul-clinico': {
    nome:    'Azul Clínico',
    preview: '#2563eb',
    cores: {
      primary:    '#2563eb',
      secondary:  '#1d4ed8',
      accent:     '#3b82f6',
      background: '#f8faff',
      surface:    '#ffffff',
      text:       '#0f172a',
    },
  },
  'verde-saude': {
    nome:    'Verde Saúde',
    preview: '#059669',
    cores: {
      primary:    '#059669',
      secondary:  '#047857',
      accent:     '#10b981',
      background: '#f0fdf9',
      surface:    '#ffffff',
      text:       '#064e3b',
    },
  },
  'roxo-moderno': {
    nome:    'Roxo Moderno',
    preview: '#7c3aed',
    cores: {
      primary:    '#7c3aed',
      secondary:  '#6d28d9',
      accent:     '#a78bfa',
      background: '#faf5ff',
      surface:    '#ffffff',
      text:       '#1e1b4b',
    },
  },
  'laranja-energia': {
    nome:    'Laranja Energia',
    preview: '#d97706',
    cores: {
      primary:    '#d97706',
      secondary:  '#b45309',
      accent:     '#f59e0b',
      background: '#fffbeb',
      surface:    '#ffffff',
      text:       '#451a03',
    },
  },
  'cinzento-premium': {
    nome:    'Cinzento Premium',
    preview: '#334155',
    cores: {
      primary:    '#334155',
      secondary:  '#1e293b',
      accent:     '#64748b',
      background: '#f8fafc',
      surface:    '#ffffff',
      text:       '#0f172a',
    },
  },
};
```

---

## 3. Como o tema é aplicado no frontend

```typescript
// apps/web/src/lib/tema.ts

/** Injectar CSS custom properties no :root a partir das cores do tema */
export function aplicarTema(cores: TemaCores) {
  const root = document.documentElement;
  root.style.setProperty('--color-brand-primary',    cores.primary);
  root.style.setProperty('--color-brand-secondary',  cores.secondary);
  root.style.setProperty('--color-brand-accent',     cores.accent);
  root.style.setProperty('--color-brand-bg',         cores.background);
  root.style.setProperty('--color-brand-surface',    cores.surface);
  root.style.setProperty('--color-brand-text',       cores.text);
}

// apps/web/src/stores/tema.store.ts
// O tema é carregado uma vez no boot da aplicação
export const useTemaStore = create<TemaStore>((set) => ({
  cores:  TEMAS_PREDEFINIDOS['azul-clinico'].cores,
  temaId: 'azul-clinico',
  logoUrl: null,
  nomeApp: 'ClinicaPlus',
  setTema: (tema) => {
    aplicarTema(tema.cores);
    document.title = tema.nomeApp ?? 'ClinicaPlus';
    if (tema.faviconUrl) {
      const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')!;
      if (link) link.href = tema.faviconUrl;
    }
    set(tema);
  },
}));
```

```typescript
// apps/web/src/providers/TemaProvider.tsx
// Carregado no boot — antes de qualquer renderização de UI

export function TemaProvider({ children }: { children: React.ReactNode }) {
  const { setTema } = useTemaStore();

  useEffect(() => {
    // Detectar slug a partir do subdomain ou path
    const hostname = window.location.hostname;
    const subdomain = extrairSubdomain(hostname);  // "nutrimacho" de "nutrimacho.clinicaplus.ao"

    const carregarTema = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/public/tema?domain=${hostname}`);
        if (!res.ok) return;
        const tema = await res.json();
        setTema({
          cores:    tema.data.cores,
          temaId:   tema.data.temaId,
          logoUrl:  tema.data.logoUrl,
          nomeApp:  tema.data.nomeApp ?? tema.data.nomeClinica,
          faviconUrl: tema.data.faviconUrl,
        });
      } catch {
        // Falha silenciosa — usa tema default
      }
    };

    carregarTema();
  }, []);

  return <>{children}</>;
}

function extrairSubdomain(hostname: string): string | null {
  // "nutrimacho.clinicaplus.ao" → "nutrimacho"
  // "clinicaplus.ao" ou "localhost" → null
  const parts = hostname.split('.');
  if (parts.length >= 3 && hostname.endsWith('clinicaplus.ao')) {
    return parts[0];
  }
  return null;  // domínio custom — enviar hostname completo para API resolver
}
```

```css
/* apps/web/src/styles/global.css — tokens usados pelo design system */
:root {
  --color-brand-primary:   #2563eb;  /* fallback default */
  --color-brand-secondary: #1d4ed8;
  --color-brand-accent:    #3b82f6;
  --color-brand-bg:        #f8faff;
  --color-brand-surface:   #ffffff;
  --color-brand-text:      #0f172a;
}

/* Todos os componentes usam estes tokens via Tailwind classes customizadas */
/* tailwind.config.ts: */
/*   colors: { brand: { primary: 'var(--color-brand-primary)', ... } } */
```

---

## 4. Upload de logo — service e endpoint

```typescript
// apps/api/src/services/logo.service.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);
const BUCKET = 'logos';
const MAX_SIZE_BYTES = 2 * 1024 * 1024;  // 2MB
const TIPOS_ACEITES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];

export const logoService = {

  async upload(clinicaId: string, file: Express.Multer.File): Promise<string> {
    // Validações
    if (!TIPOS_ACEITES.includes(file.mimetype)) {
      throw new AppError('Formato inválido. Use PNG, JPG, SVG ou WebP.', 400, 'LOGO_INVALID_TYPE');
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new AppError('Logo muito grande. Máximo 2MB.', 400, 'LOGO_TOO_LARGE');
    }

    const ext = file.originalname.split('.').pop() ?? 'png';
    const path = `${clinicaId}/logo.${ext}`;

    // Upload para Supabase Storage
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: true,  // sobrepõe logo anterior
      });

    if (error) throw new AppError(`Upload falhou: ${error.message}`, 502, 'LOGO_UPLOAD_FAILED');

    // URL pública CDN
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const logoUrl = `${data.publicUrl}?t=${Date.now()}`;  // cache-bust

    // Guardar URL na ConfiguracaoClinica
    await prisma.configuracaoClinica.upsert({
      where:  { clinicaId },
      create: { clinicaId, logoUrl },
      update: { logoUrl },
    });

    return logoUrl;
  },

  async remover(clinicaId: string) {
    // Listar e remover todos os ficheiros do tenant
    const { data: files } = await supabase.storage.from(BUCKET).list(clinicaId);
    if (files?.length) {
      const paths = files.map(f => `${clinicaId}/${f.name}`);
      await supabase.storage.from(BUCKET).remove(paths);
    }

    await prisma.configuracaoClinica.update({
      where: { clinicaId },
      data:  { logoUrl: null },
    });
  },
};
```

---

## 5. Routing por domínio — endpoint público e middleware

```typescript
// apps/api/src/routes/public-tema.ts
// Endpoint público — sem autenticação — chamado pelo frontend no boot

router.get('/api/public/tema', async (req, res) => {
  const domain = req.query.domain as string;
  if (!domain) return res.json({ data: null });

  // Tentar resolver por domínio custom primeiro
  let config = await prisma.configuracaoClinica.findFirst({
    where: { dominioCustom: domain },
    include: { clinica: { select: { nome: true, slug: true } } },
  });

  // Se não encontrou, tentar por subdomínio
  if (!config) {
    const subdomain = domain.split('.')[0];
    config = await prisma.configuracaoClinica.findFirst({
      where: {
        OR: [
          { subdominio: subdomain },
          { clinica: { slug: subdomain } },  // fallback para slug
        ],
      },
      include: { clinica: { select: { nome: true, slug: true } } },
    });
  }

  if (!config) return res.json({ data: null });  // domínio não registado = tema default

  // Resolver cores
  let cores = TEMAS_PREDEFINIDOS[config.temaId]?.cores
           ?? TEMAS_PREDEFINIDOS['azul-clinico'].cores;

  if (config.temaId === 'custom' && config.temaCustomCores) {
    cores = config.temaCustomCores as TemaCores;
  }

  res.json({
    data: {
      temaId:        config.temaId,
      cores,
      logoUrl:       config.logoUrl,
      faviconUrl:    config.faviconUrl,
      nomeApp:       config.nomeApp,
      nomeClinica:   config.clinica.nome,
      clinicaSlug:   config.clinica.slug,
    },
  });
});
```

```typescript
// apps/api/src/middleware/tenantDomain.ts
// Middleware que resolve clinicaId a partir do hostname (para rotas autenticadas)
// Complementa o tenantMiddleware existente

export async function tenantDomainMiddleware(req: Request, res: Response, next: NextFunction) {
  const hostname = req.headers['x-forwarded-host'] as string ?? req.hostname;

  // Se já tem clinicaId do JWT — não precisa de resolver por domínio
  if (req.clinica) return next();

  const config = await prisma.configuracaoClinica.findFirst({
    where: {
      OR: [
        { dominioCustom: hostname },
        { subdominio: hostname.split('.')[0] },
      ],
    },
    select: { clinicaId: true },
  });

  if (config) {
    req.resolvedClinicaId = config.clinicaId;
  }

  next();
}
```

---

## 6. Endpoints da API

```
# Público (sem auth) — boot do frontend
GET  /api/public/tema?domain={hostname}   → cores, logo, nome, favicon

# Configuração (ADMIN)
GET  /api/clinicas/me/configuracao        → configuração completa
PATCH /api/clinicas/me/tema               → { temaId, temaCustomCores? }
POST  /api/clinicas/me/logo               → upload (multipart/form-data)
DELETE /api/clinicas/me/logo              → remover logo
PATCH /api/clinicas/me/dominio            → { subdominio?, dominioCustom? }
PATCH /api/clinicas/me/configuracao       → campos gerais (nomeApp, favicon)
```

---

## 7. Página de personalização no painel — especificação UI

```
CONFIGURAÇÕES → Personalização

┌─────────────────────────────────────────────────────────────────────────┐
│  IDENTIDADE VISUAL                                                       │
│                                                                         │
│  Logo da Clínica                                                        │
│  ┌──────────────────┐                                                   │
│  │  [Logo actual]   │  [Fazer upload]  [Remover]                        │
│  │  ou placeholder  │  PNG, JPG, SVG, WebP • Máx 2MB                   │
│  └──────────────────┘                                                   │
│                                                                         │
│  Favicon  (ícone do browser)                          [PRO]             │
│  ┌──────────────────┐                                                   │
│  │  [Favicon actual]│  [Fazer upload]                                   │
│  └──────────────────┘                                                   │
│                                                                         │
│  Nome na tab do browser                               [PRO]             │
│  [________________________]  (default: nome da clínica)                 │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  TEMA DE CORES                                        [PRO para mudar]  │
│                                                                         │
│  ○ [●] Azul Clínico (default)  ○ Verde Saúde  ○ Roxo Moderno           │
│  ○ Laranja Energia  ○ Cinzento Premium  ○ Personalizado [ENTERPRISE]   │
│                                                                         │
│  [Preview do tema seleccionado — mini painel com as cores aplicadas]   │
│                                                                         │
│  Se "Personalizado" seleccionado:                                       │
│  Cor principal:  [#______]  [picker]                                    │
│  Cor secundária: [#______]  [picker]                                    │
│  Cor de destaque:[#______]  [picker]                                    │
│                                                                         │
│                              [Guardar tema]                             │
├─────────────────────────────────────────────────────────────────────────┤
│  DOMÍNIO PERSONALIZADO                                                  │
│                                                                         │
│  Subdomínio                                           [PRO]             │
│  https:// [______________] .clinicaplus.ao                              │
│  Disponível: ✅  /  Já em uso: ❌                                       │
│                                                                         │
│  Domínio próprio                                      [ENTERPRISE]      │
│  https:// [______________________________]                              │
│  CNAME: app.clinicaplus.ao  [Copiar]                                    │
│  Estado: ● Verificado  /  ⏳ A verificar (pode demorar até 48h)         │
│                                                                         │
│                              [Guardar domínio]                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Componentes React

```typescript
// apps/web/src/components/LogoClinica.tsx
// Usado no header do painel e portal do paciente

interface LogoClinicaProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LogoClinica({ size = 'md', className }: LogoClinicaProps) {
  const { logoUrl, nomeApp } = useTemaStore();
  const sizes = { sm: 'h-6', md: 'h-8', lg: 'h-12' };

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={nomeApp ?? 'ClinicaPlus'}
        className={cn(sizes[size], 'object-contain', className)}
        onError={(e) => {
          // Fallback para nome se logo não carrega
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  // Fallback: nome da clínica estilizado
  return (
    <span className={cn('font-bold text-brand-primary', {
      'text-sm': size === 'sm',
      'text-base': size === 'md',
      'text-xl': size === 'lg',
    }, className)}>
      {nomeApp ?? 'ClinicaPlus'}
    </span>
  );
}
```

```typescript
// apps/web/src/pages/configuracoes/PersonalizacaoPage.tsx — estrutura

export function PersonalizacaoPage() {
  const { clinica } = useAuthStore();
  const { data: config } = useQuery({ queryKey: ['clinica-config'], queryFn: fetchConfig });

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-xl font-semibold">Personalização</h1>

      {/* Secção 1: Logo */}
      <LogoSection logoUrl={config?.logoUrl} />

      {/* Secção 2: Tema */}
      <PlanGate planoMinimo="PRO" fallback={<TemaLockedSection />}>
        <TemaSection temaId={config?.temaId} customCores={config?.temaCustomCores} />
      </PlanGate>

      {/* Secção 3: Domínio */}
      <PlanGate planoMinimo="PRO" fallback={<DominioLockedSection />}>
        <DominioSection subdominio={config?.subdominio} />
      </PlanGate>

      {/* Domínio custom — só ENTERPRISE */}
      <PlanGate planoMinimo="ENTERPRISE">
        <DominioCustomSection dominioCustom={config?.dominioCustom} />
      </PlanGate>
    </div>
  );
}
```

---

## 9. Configuração Railway e Vercel para subdomínios

### Vercel — wildcard domain

```bash
# No dashboard Vercel → Settings → Domains:
# Adicionar: *.clinicaplus.ao
# Isto requer suporte para wildcard no plano Pro do Vercel

# O Next.js / Vite frontend resolve o tenant a partir do hostname:
# middleware.ts (Next.js) ou TemaProvider.tsx (Vite/React)
```

### DNS (Cloudflare / registo)

```
# Registar em DNS:
A     clinicaplus.ao          → IP do Vercel/Railway
CNAME *.clinicaplus.ao        → cname.vercel-dns.com  (wildcard)
CNAME app.clinicaplus.ao      → cname.vercel-dns.com  (para domínios custom)
```

### Para domínio custom de ENTERPRISE

```bash
# A clínica configura no seu DNS:
CNAME sistema.nutrimacho.ao → app.clinicaplus.ao

# No Vercel, adicionar o domínio custom manualmente:
# API: POST https://api.vercel.com/v10/projects/{id}/domains
# Body: { "name": "sistema.nutrimacho.ao" }
# Ou via CLI: vercel domains add sistema.nutrimacho.ao
```

---

## 10. Checklist de verificação — módulo temas

### Database
- [ ] Migration `007_temas` aplicada: campos `temaId`, `temaCustomCores`, `subdominio`, `dominioCustom`, `faviconUrl`, `nomeApp` adicionados
- [ ] `@@unique` em `subdominio` e `dominioCustom` activo
- [ ] Campo `corPrimaria` legado migrado para `temaId = "azul-clinico"`

### Backend
- [ ] `GET /api/public/tema` responde sem autenticação
- [ ] Logo upload: rejeita ficheiros > 2MB (400)
- [ ] Logo upload: rejeita tipos inválidos (400)
- [ ] Upload para Supabase Storage com `upsert: true` (substitui logo anterior)
- [ ] URL retornada tem cache-bust (`?t={timestamp}`)
- [ ] `subdominio` validado como `/^[a-z0-9-]+$/` antes de guardar
- [ ] `dominioCustom` disponível apenas para ENTERPRISE (requirePlan)

### Frontend
- [ ] `TemaProvider` chama `/api/public/tema` no boot
- [ ] CSS custom properties injectadas no `:root` antes de renderizar UI
- [ ] `LogoClinica` exibe logo ou fallback com nome da clínica
- [ ] Fallback activado se logo falha a carregar (onerror)
- [ ] Preview do tema actualiza em tempo real ao seleccionar template
- [ ] Picker de cor disponível apenas se temaId = "custom" e plano ENTERPRISE
- [ ] Verificação de disponibilidade de subdomínio: debounce 500ms + spinner
- [ ] `PersonalizacaoPage` com todas as secções e `PlanGate` correctos

### DNS e Infra
- [ ] Wildcard `*.clinicaplus.ao` configurado no Vercel
- [ ] DNS wildcard CNAME configurado
- [ ] Endpoint de tema responde correctamente para `nutrimacho.clinicaplus.ao`
- [ ] Endpoint de tema responde correctamente para domínio custom

### Testes
- [ ] `GET /api/public/tema?domain=slug.clinicaplus.ao` retorna cores correctas
- [ ] `GET /api/public/tema?domain=unknown.clinicaplus.ao` retorna `{ data: null }`
- [ ] Upload logo com ficheiro válido → URL CDN retornada
- [ ] Upload logo com ficheiro > 2MB → 400
- [ ] Mudar tema para PRO com plano BASICO → 402
- [ ] `pnpm typecheck` zero erros
