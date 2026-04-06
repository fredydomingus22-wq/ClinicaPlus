# ROLES & TASKS: Sprints I, II e III — Módulo de Tratamentos e Exames Clínicos

Este documento contém o guião cirúrgico passo-a-passo. Agentes AI e Programadores devem ler cada instrução à letra e implementar as especificações estritas sem atalhos.

---

# SPRINT I — Modelo de Dados e Arquitetura Base (Backend)

## Leituras e Preparação
Ler `docs/11-modules/MODULE-tratamentos.md` e a `SKILL.md` associada. O desrespeito pelas transições de Estado da Máquina de Estados e a omissão de catálogos configuráveis provocará *Rollback* da Pull Request.

---

## Passo I1 — Schema Prisma e Relações
No ficheiro `packages/types/prisma/schema.prisma`:
1. **Não destrua** o `model Exame` existente. Adicione os campos: `tipoExameId String?`, `descricao String?`, `estado EstadoExame @default(PENDENTE)`, `dataRealizacao DateTime?`, `laudoUrl String?` e `laudoNota String?`.
2. Crie as novas tabelas de Catálogo: `TipoTratamento` e `TipoExameClinica` (ver `MODULE-tratamentos.md` para campos exactos como `ativo Boolean` e `duracaoMin`).
3. Crie `PlanoTratamento` e `SessaoTratamento`.
4. **CRÍTICO:** Vá ao pré-existente `model Agendamento` e adicione obrigatoriamente as relações inversas:
   - `planosOrigem PlanoTratamento[] @relation("AgendamentoPlanoTratamento")`
   - `sessoesTratamento SessaoTratamento[]`
*(Sem o ponto 4 o código Prisma não compila).*

## Passo I2 — Migração & Seed (Cold-Start)
1. Execute o comando: `pnpm db:migrate --name module_tratamentos_exames`.
2. Em `apps/api/prisma/seed.ts` (ou ficheiro de setup análogo), inclua lógica que injete **Tipos de Exames Nacionais** (Raio-X, Hemograma, Ecografia) e **Tipos de Tratamentos Genéricos** (Fisioterapia Geral, Psicoterapia) vinculados ao `clinicaId` padrão.
*(Isto garante que a UI não quebra mostrando listas `Select` vazias).*

## Passo I3 — Especificação rigorosa Zod (DTOs)
Crie o ficheiro `packages/types/src/tratamentos.ts` estritamente tipado:
- `CriarExameSchema`: O campo `tipoExameId` deve ser `.string().cuid()`, (mas `optional` temporariamente devido à legacy).
- `CriarPlanoSchema`: O campo `tipoId` (Catálogo de tratamento) é **obrigatório**. `agendamentoOrigemId` deve aceitar `cuid()`. Validações estritas: `totalSessoes` max 500, `frequenciaSemana` max 7.
- Compile com `pnpm typecheck`.

## Passo I4 — Serviços e Rotas (Catálogos Masters)
Crie os ficheiros `config-tratamentos.routes.ts` e `config-tratamentos.service.ts` em `apps/api/src/modules/tratamentos/` (ou em controllers).
- **CRUD GET/POST:** `api/clinica/config/tipos-exames` e `api/clinica/config/tipos-tratamento`.
- Regras: Validação `clinicaId` via Tenant global. Impedir criação de dois catálogos com o mesmo `nome` na mesma clínica (lidar com violação SQL `UniqueConstraint`).

## Passo I5 — Refacturação de "Exames" Antigos
Em `apps/api/src/services/exames.service.ts`:
- O endpoint de leitura passará a popular as views com o enum seguro `estado` em vez do string raw `status`. Fazer cast automático de legados no output.
- Em `PATCH /api/clinica/exames/:id`: Implementar barreira tipada. Exigir `AtualizarExameSchema` e aplicar a lógica `assertTransicaoValida(actual, destino)` do manual de skill.
  
## Passo I6 — Serviços Mestre (Planos e Sessões)
Implementar `planos.service.ts` e `sessoes.service.ts`.
- **Criar Plano:** Abrir *Database Transaction*, criar o plano -> despoletar BullMQ Job -> retornar `200 Created` imediatamente após gravar o payload na DB (para dar feedback rápido na UI).
- **Marcar Sessão:** Se sessão atualizar para `REALIZADO`, contar sessões. Se `sessoesRealizadas === totalSessoes`, forçar disparo autônomo atualizando o respectivo `PlanoTratamento` para `estado = CONCLUIDO`.

> ⚠️ **CHECKPOINT OBRIGATÓRIO (SPRINT I):** PARE AQUI! O Agente deve reportar ao utilizador que a API Base e Catálogos estão prontos e a passar nos testes. Peça permissão explícita antes de iniciar o Sprint II.

---

# SPRINT II — Laudos e Filas de Trabalho (Supabase & BullMQ)

## Passo II1 — Bucket & Uploads (Exames)
1. **Infraestrutura:** Criar bucket `laudos` no Supabase Storage. Marcar como Privado.
2. **API:** Implementar `POST /api/clinica/exames/:id/laudo-upload-url`. Utilizar o Client RPC da Supabase para originar um `signedUrl` de upload com Validade de 15 minutos e devolver ao frontend.
3. **Webhook/Callback API:** Implementar `POST /exames/:id/laudo-confirmar` para gravar o `path` resultante de volta no model SQL e avançar a máquina de estados para `LAUDADO`.

## Passo II2 — O Worker (Planos)
1. Localizar pasta global `apps/worker/src/`.
2. Em `criarSessoes.worker.ts`, ouvir a Queue `criar-sessoes-plano`.
3. **Regra de Idempotência:** Passar na infra do Redis o UUID único usando o formato `jobId: planoId_creation_job`.
4. O Worker vai calcular `dataInicio` e alocar perante o calendário (usando utilitários de Data/Hora existentes em `packages/utils/date.ts`) explodindo os loops das sessoes e gravando-as no Prisma com o estado `AGENDADO`.

> ⚠️ **CHECKPOINT OBRIGATÓRIO (SPRINT II):** PARE AQUI! Certifique-se que o Supabase Bucket foi efetivamente ativado e o Worker não tem crashes no Node. Reporte ao utilizador e peça autorização para avançar para a UI (Sprint III).

---

# SPRINT III — Componentização UI e Integração de Frontend

Atenção especial nesta secção às lógicas React, Validação Hook Forms, e Componentização TailwindCSS de alta acessibilidade. Tudo ficará alojado em `apps/web/src/`.

## Passo III1 — Estado Global de Dados e APIs (TanStack e Axios)
1. Crie os objectos em `api/tratamentos.api.ts` com métodos axios consumindo as Base URL do backend.
2. Crie `hooks/useTratamentos.ts`. 
   - Exporte `useTiposExameClinica` (com `staleTime: 60000` / cache longo).
   - Exporte `useHistoricoClinico` (chama o aggregator `Promise.all` da API e divide em objectos segregados `consultas`, `exames`, `planos`).

## Passo III2 — Formulário: CriarExameForm (UI)
Crie `<CriarExameForm>` como Form base (integrável num Radix UI Dialog ou Sheet).
- **Controlos de View:** `zodResolver(CriarExameSchema)`.
- Instanciar a dropdown com a classe: `w-full rounded-md border-neutral-300 py-2.5 text-neutral-800 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500`.
- **Regra UI Limitativa:** Use renderização condicional. Se a query de `useTiposExameClinica` devolver `< 1`, o formulário não deve permitir submissão e deve renderizar o badge global: `<div className="text-amber-700 bg-amber-50">Não tem exames no Catálogo. Clique aqui para configurar primeiro.</div>`.
- Botões Inferiores em Layout Row: `Cancelar (Variant Ghost)` e `Guardar (Variant Solid Primary)`. Disable logic se `isPending`.

## Passo III3 — Componente: ExamesTab e Status Badges
- Criar a secção de Layout `ExamesTab.tsx`.
- Requer Mapeamento Cromatico de Tailwind:
  - `PENDENTE` -> `bg-neutral-100 text-neutral-700`
  - `AGENDADO` -> `bg-blue-100 text-blue-700`
  - `REALIZADO` -> `bg-emerald-100 text-emerald-800`
  - `LAUDADO` -> `bg-green-600 text-white shadow-sm`
  - `CANCELADO` -> `bg-red-50 text-red-600 line-through decoration-red-200`
- Incluir na Row do exame o Action Button Subtil "Inserir Laudo" (se `estado === REALIZADO`), disparando a rotina de SignedUrl + `input[type="file" hidden]`.

## Passo III4 — Componente: PlanosTab e Progresso
- Crie `PlanoTratamentoCard.tsx`. Deve exibir cabeçalho generoso (H3 text-lg font-semibold) com o `TipoTratamento.nome`.
- **Barra de Progresso (UI Exigência):** Renderizar a `PlanoProgressBar.tsx`. Uma Track Cinza `bg-neutral-200 h-2 rounded-full`. A div preenchida calcula matematicamente: `(sessoesRealizadas / totalSessoes) * 100` e devolve um preenchimento em Flex `w-[cálculo%] bg-primary-600 transition-all duration-500 ease-in-out`.
- Acima da barra exibir texto small: `Concluído X de Y Sessões`.

## Passo III5 — Integração Core no Timeline Histórico Clínico
- Na página de Perfis (`/admin/pacientes/:id`), crie o link lateral para a route `/historico`.
- Integre `HistoricoClinicoPage.tsx`. Use estrutura de abas `<Tabs.Root defaultValue="exames">` (utilizando Shadcn/Radix components caso instalados no Workspace em `packages/ui` ou implementações normais de Tailwind de botões Border Bottom na tab ativa).
- **Empty States Gracioso:** Evitar ecrãs brancos vazios se um paciente for novo. Mostrar `<EmptyState icon={FileCheckIcon} title="Sem Histórico" description="Crie a primeira anotação utilizando o botão acima" />`.

## Passo III6 — Gatekeeping e Testes
- Rode `pnpm test --filter=web`.
- Confirme que os modais encerram no Evento `OnSuccess` do hook mutate, acompanhados de Exibição de Toast Alert (usando Sonner/react-hot-toast "Marcado com Sucesso"). 
- Todos os Labels de FrontEnd devem estar em standard "pt-AO" sem jargão puramente britânico.

> ✅ **CHECKPOINT FINAL:** O Agente deve reportar que o Módulo de Tratamentos está globalmente concluído (Back-end + Worker + UI) e pronto para Revisão de Integração!
