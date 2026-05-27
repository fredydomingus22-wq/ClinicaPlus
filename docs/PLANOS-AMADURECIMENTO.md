# Planos de Amadurecimento - ClinicaPlus

## Visão Geral

**Score Atual:** 66/100 (Médio-Alto)
- Segurança: 65/100
- Performance: 70/100
- Acessibilidade: 55/100
- UI/UX: 68/100
- Arquitetura: 75/100

**Objetivo:** Alcançar 85/100 em 6 meses

---

## 1. Plano de Amadurecimento - Segurança

**Score Atual:** 65/100 → **Alvo:** 85/100

### Estado Atual (Análise)

**O que funciona bem:**
- ✅ JWT_SECRET validado com min(64) caracteres
- ✅ HMAC middleware para API keys
- ✅ Password hashing com bcrypt
- ✅ Redis locks distribuídos (Redlock) implementados
- ✅ Rate limiting em endpoints críticos
- ✅ RLS (Row Level Security) no Supabase
- ✅ Graceful shutdown implementado
- ✅ Workers isolados (recentemente)

**O que precisa melhorar:**
- ⚠️ Credenciais AGT globais (Basic Auth) em variáveis de ambiente
- ⚠️ Chaves privadas AGT armazenadas em DB sem encriptação
- ⚠️ HMAC middleware bypass em NODE_ENV=test
- ⚠️ `access_credentials.md` contém credenciais de dev no repo
- ⚠️ `docker-compose.yml` com secrets hardcoded
- ⚠️ Falta validação de CORS em WebSocket
- ⚠️ Falta rate limiting em WebSocket

### Fases de Implementação

#### Fase 1: Bloqueadores Críticos (Semana 1-2)

**1.1 Remover credenciais de dev do repo**
- Arquivos afetados:
  - `access_credentials.md` (remover ou mover para .gitignore)
  - `docker-compose.yml` (substituir secrets por ${VAR})
- Impacto: Alto (segurança)
- Risco: Baixo (apenas arquivos de config)
- Ação:
  ```bash
  # Adicionar ao .gitignore
  echo "access_credentials.md" >> .gitignore
  echo "*.env.local" >> .gitignore
  
  # Atualizar docker-compose.yml
  # Substituir secrets por ${VAR_NAME}
  ```

**1.2 Corrigir HMAC bypass em NODE_ENV=test**
- Arquivo: `apps/api/src/middleware/apiKeyAuth.ts`
- Problema: Bypass de validação em testes
- Impacto: Alto (segurança em testes)
- Risco: Baixo (apenas testes quebrados)
- Ação:
  ```typescript
  // Remover ou refatorar bypass
  // Usar secrets de teste reais em vez de bypass
  ```

**1.3 Adicionar validação de CORS no WebSocket**
- Arquivo: `apps/api/src/lib/socket.ts`
- Impacto: Médio (segurança WebSocket)
- Risco: Baixo (config adicional)
- Ação:
  ```typescript
  // Adicionar validação mais estrita
  // Usar whitelist de domínios
  ```

#### Fase 2: Proteção de Dados Sensíveis (Semana 3-4)

**2.1 Encriptar chaves privadas AGT no DB**
- Arquivos afetados:
  - `apps/api/src/services/faturas.service.ts`
  - `apps/api/src/services/fiscal/ContingencySyncService.ts`
- Impacto: Alto (proteção de dados)
- Risco: Médio (migração de dados existentes)
- Ação:
  ```typescript
  // Usar encryptSecret() para chaves privadas
  // Criar migration para encriptar dados existentes
  // Atualizar decryptSecret() para desencriptar
  ```

**2.2 Implementar tokens por clínica para AGT**
- Arquivo: `apps/api/src/services/fiscal/ContingencySyncService.ts`
- Impacto: Alto (isolamento de credenciais)
- Risco: Médio (mudança de arquitetura)
- Ação:
  ```typescript
  // Armazenar credenciais por clínica em DB
  // Encriptar com AES-GCM
  // Usar tenant-specific keys
  ```

#### Fase 3: Hardening de WebSocket (Semana 5-6)

**3.1 Adicionar rate limiting no WebSocket**
- Arquivo: `apps/api/src/lib/socket.ts`
- Impacto: Médio (prevenir abuse)
- Risco: Baixo (config adicional)
- Ação:
  ```typescript
  // Implementar rate limiting por socket
  // Usar Redis para rate limiting distribuído
  ```

**3.2 Adicionar autenticação mais forte no WebSocket**
- Arquivo: `apps/api/src/lib/socket.ts`
- Impacto: Médio (segurança WebSocket)
- Risco: Baixo (melhoria de validação)
- Ação:
  ```typescript
  // Validar token a cada 5 minutos
  // Revogar tokens expirados
  ```

#### Fase 4: Auditoria e Monitoramento (Semana 7-8)

**4.1 Implementar auditoria de acesso**
- Arquivo: `apps/api/src/services/auditLog.service.ts`
- Impacto: Alto (compliance)
- Risco: Baixo (feature nova)
- Ação:
  ```typescript
  // Logar todos os acessos a dados sensíveis
  // Logar mudanças de permissões
  ```

**4.2 Implementar alertas de segurança**
- Arquivo: `apps/api/src/services/notification.service.ts`
- Impacto: Médio (detecção de ameaças)
- Risco: Baixo (feature nova)
- Ação:
  ```typescript
  // Alertar em múltiplas falhas de login
  // Alertar em acesso de IPs suspeitos
  ```

### Resumo do Plano de Segurança

| Fase | Duração | Impacto | Risco | Score Esperado |
|------|---------|---------|-------|----------------|
| Fase 1 | 2 semanas | Alto | Baixo | 70/100 |
| Fase 2 | 2 semanas | Alto | Médio | 75/100 |
| Fase 3 | 2 semanas | Médio | Baixo | 80/100 |
| Fase 4 | 2 semanas | Alto | Baixo | 85/100 |

---

## 2. Plano de Amadurecimento - Performance

**Score Atual:** 70/100 → **Alvo:** 85/100

### Estado Atual (Análise)

**O que funciona bem:**
- ✅ BullMQ para jobs assíncronos
- ✅ Redis para cache/pub/sub
- ✅ Prisma ORM com connection pooling
- ✅ React Query para cache client-side
- ✅ Workers isolados (recentemente implementado)
- ✅ Puppeteer concurrency limitada (2)
- ✅ Turborepo para build caching

**O que precisa melhorar:**
- ⚠️ Muitos `console.log` em produção (logs não estruturados)
- ⚠️ `SELECT *` em Prisma (overfetching de dados)
- ⚠️ `useEffect` sem dependências otimizadas (re-renders)
- ⚠️ Falta lazy loading de componentes pesados
- ⚠️ Falta pagination em algumas listas
- ⚠️ Falta cache de queries frequentes

### Fases de Implementação

#### Fase 1: Otimização de Logs (Semana 1)

**1.1 Substituir console.log por logger**
- Arquivos afetados: ~50 arquivos
- Impacto: Médio (logs estruturados)
- Risco: Baixo (refactoring simples)
- Ação:
  ```typescript
  // Substituir console.log por logger.info
  // Substituir console.error por logger.error
  // Já iniciado em alguns arquivos
  ```

**1.2 Configurar Pino para produção**
- Arquivo: `apps/api/src/lib/logger.ts`
- Impacto: Médio (logs estruturados)
- Risco: Baixo (config adicional)
- Ação:
  ```typescript
  // Configurar níveis de log
  // Adicionar transport para produção
  // Integrar com serviço de logs (ex: Datadog)
  ```

#### Fase 2: Otimização de Queries (Semana 2-3)

**2.1 Selecionar campos específicos em Prisma**
- Arquivos afetados: ~30 arquivos
- Impacto: Alto (redução de payload)
- Risco: Baixo (refactoring simples)
- Ação:
  ```typescript
  // Substituir findMany({}) por findMany({ select: { ... } })
  // Priorizar queries mais frequentes
  // Exemplo:
  // Antes: prisma.paciente.findMany({ where: { clinicaId } })
  // Depois: prisma.paciente.findMany({ where: { clinicaId }, select: { id: true, nome: true } })
  ```

**2.2 Adicionar pagination em todas as listas**
- Arquivos afetados: ~20 arquivos
- Impacto: Alto (redução de payload)
- Risco: Baixo (refactoring simples)
- Ação:
  ```typescript
  // Adicionar take e skip em findMany
  // Implementar cursor-based pagination para grandes datasets
  // Exemplo:
  // prisma.agendamento.findMany({ 
  //   where: { clinicaId },
  //   take: 50,
  //   skip: (page - 1) * 50
  // })
  ```

#### Fase 3: Otimização de React (Semana 4-5)

**3.1 Otimizar dependências de useEffect**
- Arquivos afetados: ~40 arquivos
- Impacto: Médio (redução de re-renders)
- Risco: Baixo (refactoring simples)
- Ação:
  ```typescript
  // Adicionar dependências corretas
  // Usar useMemo/useCallback quando necessário
  // Exemplo:
  // Antes: useEffect(() => { ... }, [])
  // Depois: useEffect(() => { ... }, [userId, clinicaId])
  ```

**3.2 Implementar lazy loading de componentes**
- Arquivos afetados: ~10 componentes pesados
- Impacto: Médio (redução de bundle inicial)
- Risco: Baixo (React.lazy é estável)
- Ação:
  ```typescript
  // Usar React.lazy para componentes pesados
  // Exemplo:
  // const OdontogramaTab = React.lazy(() => import('./OdontogramaTab'))
  // <Suspense fallback={<Loading />}>
  //   <OdontogramaTab />
  // </Suspense>
  ```

#### Fase 4: Cache de Queries (Semana 6)

**4.1 Implementar cache de queries frequentes**
- Arquivo: `apps/api/src/services/cache.service.ts` (novo)
- Impacto: Alto (redução de load no DB)
- Risco: Baixo (feature nova)
- Ação:
  ```typescript
  // Usar Redis para cache de queries frequentes
  // Exemplo: especialidades, tipos de tratamento
  // TTL de 5-10 minutos
  ```

**4.2 Implementar cache de responses HTTP**
- Arquivo: `apps/api/src/middleware/cache.ts` (novo)
- Impacto: Médio (redução de load)
- Risco: Baixo (feature nova)
- Ação:
  ```typescript
  // Usar HTTP cache headers
  // Cache de responses GET não sensíveis
  // Exemplo: dados públicos de clínica
  ```

### Resumo do Plano de Performance

| Fase | Duração | Impacto | Risco | Score Esperado |
|------|---------|---------|-------|----------------|
| Fase 1 | 1 semana | Médio | Baixo | 73/100 |
| Fase 2 | 2 semanas | Alto | Baixo | 78/100 |
| Fase 3 | 2 semanas | Médio | Baixo | 82/100 |
| Fase 4 | 1 semana | Alto | Baixo | 85/100 |

---

## 3. Plano de Amadurecimento - Acessibilidade

**Score Atual:** 55/100 → **Alvo:** 75/100

### Estado Atual (Análise)

**O que funciona bem:**
- ✅ `aria-label` em botões e ícones
- ✅ `aria-invalid` em formulários
- ✅ `aria-describedby` para mensagens de erro
- ✅ `role="alert"` para notificações
- ✅ `aria-hidden` em ícones decorativos
- ✅ Labels em campos de formulário

**O que precisa melhorar:**
- ⚠️ Falta `aria-live` para notificações dinâmicas
- ⚠️ Falta skip links para navegação por teclado
- ⚠️ Falta focus management em modais
- ⚠️ Contraste de cores não verificado
- ⚠️ Falta focus visible em elementos interativos
- ⚠️ Falta headings semânticos

### Fases de Implementação

#### Fase 1: Navegação por Teclado (Semana 1-2)

**1.1 Adicionar skip links**
- Arquivo: `apps/web/src/App.tsx`
- Impacto: Médio (navegação por teclado)
- Risco: Baixo (feature nova)
- Ação:
  ```tsx
  // Adicionar skip links no topo da página
  <a href="#main-content" className="sr-only focus:not-sr-only">
    Pular para conteúdo principal
  </a>
  ```

**1.2 Adicionar focus visible**
- Arquivo: `apps/web/src/index.css`
- Impacto: Médio (navegação por teclado)
- Risco: Baixo (CSS adicional)
- Ação:
  ```css
  /* Adicionar focus visible */
  *:focus-visible {
    outline: 2px solid #0ea5e9;
    outline-offset: 2px;
  }
  ```

#### Fase 2: Notificações Dinâmicas (Semana 3)

**2.1 Adicionar aria-live para notificações**
- Arquivo: `apps/web/src/components/layout/NotificationsPanel.tsx`
- Impacto: Médio (screen readers)
- Risco: Baixo (atributo adicional)
- Ação:
  ```tsx
  // Adicionar aria-live="polite"
  <div aria-live="polite" aria-atomic="true">
    {notifications.map(...)}
  </div>
  ```

**2.2 Adicionar aria-live para toasts**
- Arquivo: `apps/web/src/components/ui/toast.tsx`
- Impacto: Médio (screen readers)
- Risco: Baixo (atributo adicional)
- Ação:
  ```tsx
  // Adicionar aria-live="assertive" para erros
  // Adicionar aria-live="polite" para info
  ```

#### Fase 3: Focus Management (Semana 4)

**3.1 Adicionar focus trap em modais**
- Arquivo: `apps/web/src/components/ui/dialog.tsx`
- Impacto: Médio (navegação por teclado)
- Risco: Baixo (feature nova)
- Ação:
  ```tsx
  // Usar focus-trap-react
  import { FocusTrap } from 'focus-trap-react'
  <FocusTrap>
    <DialogContent>...</DialogContent>
  </FocusTrap>
  ```

**3.2 Adicionar focus restoration**
- Arquivo: `apps/web/src/components/ui/dialog.tsx`
- Impacto: Médio (navegação por teclado)
- Risco: Baixo (feature nova)
- Ação:
  ```tsx
  // Salvar elemento com focus antes de abrir modal
  // Restaurar focus ao fechar modal
  ```

#### Fase 4: Contraste e Semântica (Semana 5-6)

**4.1 Verificar contraste de cores**
- Ferramenta: axe DevTools ou WAVE
- Impacto: Alto (WCAG AA compliance)
- Risco: Baixo (ajuste de cores)
- Ação:
  ```css
  /* Ajustar cores para WCAG AA (4.5:1) */
  /* Usar ferramenta para verificar */
  ```

**4.2 Adicionar headings semânticos**
- Arquivos afetados: ~20 páginas
- Impacto: Médio (screen readers)
- Risco: Baixo (refactoring simples)
- Ação:
  ```tsx
  // Usar h1-h6 de forma semântica
  // Não usar heading apenas para estilo
  // Exemplo:
  <h1>Dashboard</h1>
  <h2>Métricas</h2>
  <h3>Agendamentos</h3>
  ```

### Resumo do Plano de Acessibilidade

| Fase | Duração | Impacto | Risco | Score Esperado |
|------|---------|---------|-------|----------------|
| Fase 1 | 2 semanas | Médio | Baixo | 60/100 |
| Fase 2 | 1 semana | Médio | Baixo | 65/100 |
| Fase 3 | 1 semana | Médio | Baixo | 70/100 |
| Fase 4 | 2 semanas | Alto | Baixo | 75/100 |

---

## 4. Plano de Amadurecimento - UI/UX

**Score Atual:** 68/100 → **Alvo:** 85/100

### Estado Atual (Análise)

**O que funciona bem:**
- ✅ Design consistente com Tailwind
- ✅ shadcn/ui components reutilizáveis
- ✅ Loading states em formulários
- ✅ Error handling com mensagens claras
- ✅ Mobile drawer responsivo
- ✅ Dashboard com métricas visuais
- ✅ Dark mode implementado

**O que precisa melhorar:**
- ⚠️ Falta skeleton loading
- ⚠️ Falta empty states
- ⚠️ Falta tooltips em ações complexas
- ⚠️ Falta undo/confirm actions
- ⚠️ Falta progress indicators em operações longas
- ⚠️ Falta onboarding para novos utilizadores

### Fases de Implementação

#### Fase 1: Loading States (Semana 1-2)

**1.1 Implementar skeleton loading**
- Arquivos afetados: ~15 páginas
- Impacto: Médio (perceção de performance)
- Risco: Baixo (componente novo)
- Ação:
  ```tsx
  // Criar Skeleton component
  // Usar em listas e cards
  // Exemplo:
  <Skeleton className="h-4 w-[250px]" />
  <Skeleton className="h-4 w-[200px]" />
  ```

**1.2 Adicionar progress indicators**
- Arquivos afetados: ~5 operações longas
- Impacto: Médio (feedback ao utilizador)
- Risco: Baixo (componente novo)
- Ação:
  ```tsx
  // Usar Progress component do shadcn/ui
  // Para operações como upload de ficheiros
  // Geração de PDFs
  ```

#### Fase 2: Empty States (Semana 3)

**2.1 Implementar empty states**
- Arquivos afetados: ~20 páginas
- Impacto: Alto (UX em listas vazias)
- Risco: Baixo (componente novo)
- Ação:
  ```tsx
  // Criar EmptyState component
  // Com ilustração, título e CTA
  // Exemplo:
  <EmptyState
    icon={Inbox}
    title="Sem agendamentos"
    description="Crie o primeiro agendamento"
    action={<Button>Criar Agendamento</Button>}
  />
  ```

#### Fase 3: Tooltips e Help (Semana 4)

**3.1 Adicionar tooltips em ícones**
- Arquivos afetados: ~30 componentes
- Impacto: Médio (clariade de ações)
- Risco: Baixo (componente novo)
- Ação:
  ```tsx
  // Usar Tooltip component do shadcn/ui
  // Para ícones sem labels
  // Exemplo:
  <Tooltip content="Editar">
    <Edit className="h-4 w-4" />
  </Tooltip>
  ```

**3.2 Adicionar help text em formulários**
- Arquivos afetados: ~15 formulários
- Impacto: Médio (clariade de campos)
- Risco: Baixo (texto adicional)
- Ação:
  ```tsx
  // Adicionar help text abaixo de campos
  // Exemplo:
  <Input />
  <p className="text-sm text-neutral-500">
    Este campo é obrigatório para faturação
  </p>
  ```

#### Fase 4: Undo e Confirm (Semana 5-6)

**4.1 Implementar undo para ações destrutivas**
- Arquivos afetados: ~10 ações
- Impacto: Alto (prevenção de erros)
- Risco: Médio (feature nova)
- Ação:
  ```tsx
  // Criar Toast com ação de undo
  // Exemplo:
  toast({
    title: "Agendamento removido",
    action: <Button onClick={undo}>Desfazer</Button>
  })
  ```

**4.2 Adicionar confirm dialogs**
- Arquivos afetados: ~15 ações
- Impacto: Alto (prevenção de erros)
- Risco: Baixo (componente existente)
- Ação:
  ```tsx
  // Usar AlertDialog do shadcn/ui
  // Para ações destrutivas
  // Exemplo:
  <AlertDialog>
    <AlertDialogTrigger>
      <Button variant="destructive">Remover</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogTitle>Confirmar remoção?</AlertDialogTitle>
      <AlertDialogAction onClick={confirm}>Confirmar</AlertDialogAction>
    </AlertDialogContent>
  </AlertDialog>
  ```

#### Fase 5: Onboarding (Semana 7-8)

**5.1 Criar onboarding para novos utilizadores**
- Arquivo: `apps/web/src/pages/onboarding/OnboardingPage.tsx` (novo)
- Impacto: Alto (adoção de utilizadores)
- Risco: Baixo (feature nova)
- Ação:
  ```tsx
  // Criar tour guiado
  // Destacar features principais
  // Usar react-joyride ou similar
  ```

### Resumo do Plano de UI/UX

| Fase | Duração | Impacto | Risco | Score Esperado |
|------|---------|---------|-------|----------------|
| Fase 1 | 2 semanas | Médio | Baixo | 72/100 |
| Fase 2 | 1 semana | Alto | Baixo | 76/100 |
| Fase 3 | 1 semana | Médio | Baixo | 79/100 |
| Fase 4 | 2 semanas | Alto | Médio | 82/100 |
| Fase 5 | 2 semanas | Alto | Baixo | 85/100 |

---

## 5. Plano de Amadurecimento - Arquitetura

**Score Atual:** 75/100 → **Alvo:** 90/100

### Estado Atual (Análise)

**O que funciona bem:**
- ✅ Monorepo com Turborepo
- ✅ Separação API/Web/Worker
- ✅ Shared packages (@clinicaplus/types, utils, events)
- ✅ Prisma ORM com schema centralizado
- ✅ Strict TypeScript
- ✅ Graceful shutdown implementado
- ✅ Locks distribuídos (Redlock)
- ✅ Workers isolados (recentemente implementado)
- ✅ Clean architecture (middleware, services, routes)

**O que precisa melhorar:**
- ⚠️ Scheduler em node-cron (não ideal para produção)
- ⚠️ Dependências worker desalinhadas com api/web
- ⚠️ Scripts com `cd` em prebuild
- ⚠️ Falta API versioning
- ⚠️ Falta circuit breakers para serviços externos
- ⚠️ Falta health checks detalhados

### Fases de Implementação

#### Fase 1: Dependências e Scripts (Semana 1)

**1.1 Alinhar dependências worker com api/web**
- Arquivo: `apps/worker/package.json`
- Impacto: Alto (consistência)
- Risco: Baixo (update de dependências)
- Ação:
  ```bash
  # Alinhar versões de dependências críticas
  # Exemplo: @prisma/client, ioredis, bullmq
  pnpm update @prisma/client ioredis bullmq
  ```

**1.2 Remover `cd` de scripts**
- Arquivo: `package.json` (root)
- Impacto: Médio (consistência)
- Risco: Baixo (refactoring simples)
- Ação:
  ```json
  // Usar Turborepo filters em vez de cd
  // Antes: "prebuild": "cd apps/api && pnpm build"
  // Depois: "prebuild": "turbo run build --filter=api"
  ```

#### Fase 2: Scheduler (Semana 2-3)

**2.1 Migrar scheduler para BullMQ repeatable jobs**
- Arquivo: `apps/worker/src/workers/scheduler.worker.ts` (novo)
- Impacto: Alto (resiliência)
- Risco: Médio (mudança de arquitetura)
- Ação:
  ```typescript
  // Substituir node-cron por BullMQ repeatable jobs
  // Jobs persistem no Redis
  // Resiliente a restarts
  // Ver plano em docs/PLANO-MIGRACAO-WORKERS.md
  ```

**2.2 Mover scheduler do API para worker**
- Arquivo: `apps/api/src/server.ts`
- Impacto: Alto (separação de responsabilidades)
- Risco: Médio (mudança de arquitetura)
- Ação:
  ```typescript
  // Remover schedulerService.start() do API
  // Mover lógica para worker
  // Ver plano em docs/PLANO-MIGRACAO-WORKERS.md
  ```

#### Fase 3: API Versioning (Semana 4)

**3.1 Implementar API versioning**
- Arquivo: `apps/api/src/routes/v1/index.ts` (novo)
- Impacto: Alto (evolução de API)
- Risco: Baixo (refactoring de rotas)
- Ação:
  ```typescript
  // Criar estrutura de versioning
  // /v1/agendamentos
  // /v2/agendamentos (quando necessário)
  // Manter backward compatibility
  ```

#### Fase 4: Circuit Breakers (Semana 5)

**4.1 Implementar circuit breakers para serviços externos**
- Arquivo: `apps/api/src/lib/circuitBreaker.ts` (novo)
- Impacto: Alto (resiliência)
- Risco: Baixo (feature nova)
- Ação:
  ```typescript
  // Usar opossum para circuit breakers
  // Para Evolution API, AGT, Resend
  // Exemplo:
  const breaker = new CircuitBreaker(evolutionApiCall, options)
  ```

#### Fase 5: Health Checks (Semana 6)

**5.1 Implementar health checks detalhados**
- Arquivo: `apps/api/src/routes/health.ts` (novo)
- Impacto: Alto (monitoramento)
- Risco: Baixo (feature nova)
- Ação:
  ```typescript
  // Verificar status de:
  // - PostgreSQL
  // - Redis
  // - Workers (via Redis)
  // - Serviços externos (Evolution, AGT)
  // Retornar status detalhado
  ```

### Resumo do Plano de Arquitetura

| Fase | Duração | Impacto | Risco | Score Esperado |
|------|---------|---------|-------|----------------|
| Fase 1 | 1 semana | Alto | Baixo | 78/100 |
| Fase 2 | 2 semanas | Alto | Médio | 82/100 |
| Fase 3 | 1 semana | Alto | Baixo | 85/100 |
| Fase 4 | 1 semana | Alto | Baixo | 88/100 |
| Fase 5 | 1 semana | Alto | Baixo | 90/100 |

---

## Cronograma Consolidado

### Trimestre 1 (Meses 1-3)

**Mês 1:**
- Segurança Fase 1 (bloqueadores críticos)
- Performance Fase 1 (logs)
- Arquitetura Fase 1 (dependências)

**Mês 2:**
- Segurança Fase 2 (proteção de dados)
- Performance Fase 2 (queries)
- Arquitetura Fase 2 (scheduler)

**Mês 3:**
- Segurança Fase 3 (WebSocket)
- Performance Fase 3 (React)
- Arquitetura Fase 3 (API versioning)

### Trimestre 2 (Meses 4-6)

**Mês 4:**
- Segurança Fase 4 (auditoria)
- Performance Fase 4 (cache)
- Acessibilidade Fase 1 (navegação)
- UI/UX Fase 1 (loading)

**Mês 5:**
- Acessibilidade Fase 2 (notificações)
- Acessibilidade Fase 3 (focus)
- UI/UX Fase 2 (empty states)
- UI/UX Fase 3 (tooltips)

**Mês 6:**
- Acessibilidade Fase 4 (contraste)
- UI/UX Fase 4 (undo/confirm)
- UI/UX Fase 5 (onboarding)
- Arquitetura Fase 4-5 (circuit breakers, health checks)

---

## Priorização por Impacto vs Esforço

| Dimensão | Impacto | Esforço | Prioridade |
|----------|---------|---------|------------|
| Segurança Fase 1 | Alto | Baixo | 🔴 Crítica |
| Performance Fase 2 | Alto | Baixo | 🔴 Crítica |
| Arquitetura Fase 1 | Alto | Baixo | 🔴 Crítica |
| UI/UX Fase 2 | Alto | Baixo | 🟡 Alta |
| Performance Fase 1 | Médio | Baixo | 🟡 Alta |
| Acessibilidade Fase 1 | Médio | Baixo | 🟡 Alta |
| Segurança Fase 2 | Alto | Médio | 🟡 Alta |
| Arquitetura Fase 2 | Alto | Médio | 🟡 Alta |
| UI/UX Fase 4 | Alto | Médio | 🟢 Média |
| Performance Fase 3 | Médio | Baixo | 🟢 Média |
| Acessibilidade Fase 4 | Alto | Baixo | 🟢 Média |
| Segurança Fase 3 | Médio | Baixo | 🟢 Média |
| Arquitetura Fase 3 | Alto | Baixo | 🟢 Média |
| UI/UX Fase 1 | Médio | Baixo | 🟢 Média |
| Acessibilidade Fase 2 | Médio | Baixo | 🟢 Baixa |
| Acessibilidade Fase 3 | Médio | Baixo | 🟢 Baixa |
| UI/UX Fase 3 | Médio | Baixo | 🟢 Baixa |
| UI/UX Fase 5 | Alto | Baixo | 🟢 Baixa |
| Segurança Fase 4 | Alto | Baixo | 🟢 Baixa |
| Performance Fase 4 | Alto | Baixo | 🟢 Baixa |
| Arquitetura Fase 4 | Alto | Baixo | 🟢 Baixa |
| Arquitetura Fase 5 | Alto | Baixo | 🟢 Baixa |

---

## Recomendação de Execução

**Iniciar com prioridades críticas (🔴):**
1. Segurança Fase 1 (remover credenciais, corrigir HMAC bypass)
2. Performance Fase 2 (otimizar queries, pagination)
3. Arquitetura Fase 1 (alinhar dependências, remover cd)

**Seguir com prioridades altas (🟡):**
4. UI/UX Fase 2 (empty states)
5. Performance Fase 1 (logs)
6. Acessibilidade Fase 1 (skip links)
7. Segurança Fase 2 (encriptar chaves AGT)
8. Arquitetura Fase 2 (migrar scheduler)

**Completar com prioridades médias/baixas (🟢):**
9. Fases restantes conforme cronograma

---

## Métricas de Sucesso

**Métricas por Dimensão:**

**Segurança:**
- Zero credenciais em repo
- Zero bypass de autenticação
- 100% de dados sensíveis encriptados
- Zero vulnerabilidades críticas em SAST/DAST

**Performance:**
- Tempo de resposta P95 < 500ms
- Bundle size < 500KB (gzipped)
- Zero console.log em produção
- 100% de queries com pagination

**Acessibilidade:**
- WCAG AA compliance (95%+)
- Zero erros em axe DevTools
- Skip links em todas as páginas
- Focus trap em todos os modais

**UI/UX:**
- 100% de listas com empty states
- 100% de ações destrutivas com confirm
- 100% de ícones sem labels com tooltips
- Onboarding implementado

**Arquitetura:**
- Zero scripts com cd
- Dependências alinhadas 100%
- API versioning implementado
- Circuit breakers em serviços externos
- Health checks detalhados

---

## Conclusão

Este plano proporciona um caminho claro para amadurecer o projeto ClinicaPlus de 66/100 para 85/100 em 6 meses, focando em não quebrar o projeto ao priorizar mudanças de baixo risco e alto impacto primeiro.

**Próximo passo:** Iniciar com Fase 1 de Segurança (bloqueadores críticos).
