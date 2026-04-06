# MODULE — Gestão de Tratamentos e Exames Clínicos (Sprints I, II, III)

**ADR:** ADR-017
**Stack:** Prisma 5 · Express 4 · BullMQ · Supabase Storage · React 18 · TanStack Query v5

---

## Sprint I — Modelo de Dados e API Base (1 semana)

### I1. Schema Prisma

Em vez de criar uma tabela paralela, **estendemos o model `Exame` existente**. Para evitar duplicação de string livres criamos as tabelas `TipoTratamento` e `TipoExameClinica` que suportam os catálogos configuráveis por Tenant. 

> [!WARNING] Ativos Legados
> A equipa deve considerar deprecar num futuro próximo os campos `nome`, `tipo` e `status` no `Exame`. A API de leitura DEVE converter exames antigos na representação correta mapeando o texto neles inseridos até serem limpos.

```prisma
// packages/types/prisma/schema.prisma

// ─── CATÁLOGOS CONFIGURÁVEIS POR CLÍNICA (NOVO) ──────────────────────────────

model TipoTratamento {
  id          String   @id @default(cuid())
  clinicaId   String
  nome        String   // ex: "Fisioterapia"
  descricao   String?
  duracaoMin  Int?     // duração padrão da sessão (ex: 45)
  ativo       Boolean  @default(true)
  criadoEm    DateTime @default(now())
  
  clinica     Clinica  @relation(fields: [clinicaId], references: [id])
  planos      PlanoTratamento[]

  @@unique([clinicaId, nome])
  @@index([clinicaId])
  @@map("tipos_tratamento")
}

model TipoExameClinica {
  id          String   @id @default(cuid())
  clinicaId   String
  nome        String   // ex: "Hemograma Completo"
  descricao   String?
  ativo       Boolean  @default(true)
  criadoEm    DateTime @default(now())
  
  clinica     Clinica  @relation(fields: [clinicaId], references: [id])
  exames      Exame[]

  @@unique([clinicaId, nome])
  @@index([clinicaId])
  @@map("tipos_exame_clinica")
}

// ─── EXAMES CLÍNICOS (EXTENSÃO DO EXISTENTE) ────────────────────────────────

enum EstadoExame {
  PENDENTE    // solicitado, sem data de realização
  AGENDADO    // data de realização confirmada
  REALIZADO   // exame feito, sem laudo ainda
  LAUDADO     // laudo disponível
  CANCELADO
}

// Model Exame já existe! Adicionar apenas os OITO novos campos
model Exame {
  id               String       @id @default(cuid())
  clinicaId        String
  pacienteId       String
  medicoId         String
  agendamentoId    String?
  
  nome             String       // legado
  tipo             TipoExame    @default(LABORATORIO) // legado
  status           String       @default("PENDENTE")  // status antigo (legado)
  resultado        String?      // legado
  dataPedido       DateTime     @default(now())
  dataResultado    DateTime?
  
  // -- NOVOS CAMPOS DO MÓDULO (SPRINT I) --
  tipoExameId      String?           // NOVO: Link opcional para o catálogo
  descricao        String?           // NOVO: indicação clínica/observações
  estado           EstadoExame       @default(PENDENTE) // NOVO: máquina de estados tipada
  dataRealizacao   DateTime?         // NOVO
  laudoUrl         String?           // NOVO: URL do ficheiro no Supabase
  laudoNota        String?           // NOVO: texto complementar ao ficheiro
  
  criadoEm         DateTime     @default(now())
  atualizadoEm     DateTime     @updatedAt  // NOVO: tracking correto (caso falte no original)
  
  agendamento      Agendamento? @relation(fields: [agendamentoId], references: [id])
  clinica          Clinica      @relation(fields: [clinicaId], references: [id])
  medico           Medico       @relation(fields: [medicoId], references: [id])
  paciente         Paciente     @relation(fields: [pacienteId], references: [id])
  tipoCatalogo     TipoExameClinica? @relation(fields: [tipoExameId], references: [id]) // NOVO

  @@index([clinicaId])
  @@index([pacienteId])
  @@index([clinicaId, estado]) // NOVO
  @@map("exames")
}

// ─── PLANOS DE TRATAMENTO ────────────────────────────────────────────────────

enum EstadoPlano {
  ACTIVO
  SUSPENSO
  CONCLUIDO
  CANCELADO
}

model PlanoTratamento {
  id              String      @id @default(cuid())
  clinicaId       String
  pacienteId      String
  agendamentoOrigemId String?    
  medicoId        String      
  responsavelId   String?     
  
  tipoId          String      // Link obrigatório para o catálogo TipoTratamento
  descricao       String?     
  estado          EstadoPlano @default(ACTIVO)
  totalSessoes    Int         
  frequenciaSemana Int        
  dataInicio      DateTime
  dataFimPrevista DateTime
  dataFimReal     DateTime?   
  observacoes     String?
  
  criadoEm       DateTime    @default(now())
  atualizadoEm   DateTime    @updatedAt

  clinica        Clinica          @relation(fields: [clinicaId], references: [id])
  paciente       Paciente         @relation(fields: [pacienteId], references: [id])
  medico         Medico           @relation(fields: [medicoId], references: [id])
  agendamentoOrigem Agendamento?  @relation(name: "AgendamentoPlanoTratamento", fields: [agendamentoOrigemId], references: [id])
  tipoTratamento TipoTratamento   @relation(fields: [tipoId], references: [id])
  sessoes        SessaoTratamento[]

  @@index([clinicaId, pacienteId])
  @@index([clinicaId, estado])
  @@map("plano_tratamento")
}

// ─── SESSÕES DE TRATAMENTO ────────────────────────────────────────────────────

enum EstadoSessao {
  AGENDADO
  REALIZADO
  FALTOU
  CANCELADO
}

model SessaoTratamento {
  id             String       @id @default(cuid())
  clinicaId      String
  planoId        String
  agendamentoId  String?      @unique
  numeroSessao   Int
  estado         EstadoSessao @default(AGENDADO)
  dataHora       DateTime
  duracao        Int          
  notas          String?      
  
  criadoEm       DateTime     @default(now())
  atualizadoEm   DateTime     @updatedAt

  clinica      Clinica          @relation(fields: [clinicaId], references: [id])
  plano        PlanoTratamento  @relation(fields: [planoId], references: [id], onDelete: Cascade)
  agendamento  Agendamento?     @relation(fields: [agendamentoId], references: [id])

  @@index([clinicaId, planoId])
  @@index([clinicaId, dataHora])
  @@map("sessao_tratamento")
}

// ─── ADICIONAR NO MODEL EXISTENTE: AGENDAMENTO ────────────────────────────────
// No model Agendamento, adicionar as relações inversas para o Prisma não falhar:
// planosOrigem     PlanoTratamento[]  @relation("AgendamentoPlanoTratamento")
// sessoesTratamento SessaoTratamento[]
```

### I2. Migração e Cold Start (Seed)

Após rodar `pnpm db:migrate --name extend_exames`, criar um passo explícito de popular a base de dados (`seed.ts`) com alguns catálogos genéricos, caso a infraestrutura os não crie, para prevenir a "página em branco" na abertura da Clínica:

```typescript
// Exemplos Mínimos de Tratamento Base
await prisma.tipoTratamento.createMany({
  data: [
     { clinicaId, nome: 'Fisioterapia', duracaoMin: 45 },
     { clinicaId, nome: 'Acompanhamento Psicológico', duracaoMin: 60 }
  ]
})
```

A migração *DEVE* incluir uma directriz para migrar todos os registos pre-existentes em Produção: Atualizando o `estado` enumerado para `PENDENTE` em exames cujo antigo campo `status` indicava texto solto similar.

### I3. Tipos partilhados (Zod) — packages/types/src/tratamentos.ts

```typescript
import { z } from 'zod'

// ─── EXAME
export const EstadoExameSchema = z.enum(['PENDENTE', 'AGENDADO', 'REALIZADO', 'LAUDADO', 'CANCELADO'])
export type EstadoExame = z.infer<typeof EstadoExameSchema>

export const CriarExameSchema = z.object({
  pacienteId:    z.string().cuid(),
  medicoId:      z.string().cuid(),
  agendamentoId: z.string().cuid().optional(),
  tipoExameId:   z.string().cuid().optional(), // Usa catálogo novo, mas ainda é opcional perante legados.
  descricao:     z.string().max(500).optional(),
})
export type CriarExameDto = z.infer<typeof CriarExameSchema>

export const AtualizarExameSchema = z.object({
  estado:        EstadoExameSchema.optional(),
  dataRealizacao: z.coerce.date().optional(),
  laudoNota:     z.string().max(2000).optional(),
})

// ─── PLANO
export const EstadoPlanoSchema = z.enum(['ACTIVO', 'SUSPENSO', 'CONCLUIDO', 'CANCELADO'])

export const CriarPlanoSchema = z.object({
  pacienteId:       z.string().cuid(),
  agendamentoOrigemId: z.string().cuid().optional(),
  medicoId:         z.string().cuid(),
  responsavelId:    z.string().cuid().optional(),
  tipoId:           z.string().cuid(), // OBRIGATÓRIO (Link Catálogo TipoTratamento)
  descricao:        z.string().max(500).optional(),
  totalSessoes:     z.number().int().min(1).max(500),
  frequenciaSemana: z.number().int().min(1).max(7),
  dataInicio:       z.coerce.date(),
  duracaoSessaoMin: z.number().int().min(15).max(480),
  observacoes:      z.string().max(1000).optional(),
})

export const AtualizarPlanoSchema = z.object({
  estado:         EstadoPlanoSchema.optional(),
  observacoes:    z.string().max(1000).optional(),
  dataFimReal:    z.coerce.date().optional(),
})

// ─── SESSOES
export const EstadoSessaoSchema = z.enum(['AGENDADO', 'REALIZADO', 'FALTOU', 'CANCELADO'])
export type EstadoSessao = z.infer<typeof EstadoSessaoSchema>

export const AtualizarSessaoSchema = z.object({
  estado: EstadoSessaoSchema,
  notas: z.string().max(2000).optional()
})
```

### I4. Interface Misto dos Tipos / Catálogos no Zod
Replicaremos as representações DTOs em Schemas `ListarTipoExameClinica`, com leitura base para apresentar no Frontend.

### I5. Refactoring do Endpoints Base e Service Exames existentes
Ao atualizar o serviço `exames.service.ts` pré-existente: 
O método `listByPaciente` que estava configurado deve expandir os mappings. Adicionar proteção de falhas para os exames "legados" que não possuem `tipoExameId` ou que conservavam nome em texto plano na DB.
*A API de leitura DEVE converter exames antigos na representação correta (mock do Catálogo) para evitar crashes*

---

## Sprint II — Laudos e Sessões Automatizadas (1 semana)

### II1. Upload de laudos via Supabase Storage
A API gera uma signed upload URL via endpoint (o upload recai na bucket privada gerida via signedUploadURL que o front-end solicita).

### II2. Criação assíncrona de sessões via BullMQ
Criar sessões através da Job `criarSessoesWorker.ts` e do `criarSessoesQueue.add` de forma assíncrona perante a `sessoes`.

---

## Sprint III — Histórico Clínico e Dashboard (1 semana)

Navegação em Master-Detail com Tabs de (Consultas/Exames/Tratamentos). O Select form `<select>` consumirá o hook `useTiposExame` para evitar inserção de tipologias livres, substituindo o text input pelas options fornecidas. 
