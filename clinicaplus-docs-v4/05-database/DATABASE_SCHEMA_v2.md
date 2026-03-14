# ClinicaPlus v2 — Database Schema (Delta)

Apenas o que é **adicionado**. Nenhuma tabela ou coluna existente é removida ou renomeada.
Schema base: `05-database/DATABASE_SCHEMA.md` (v1).

---

## Estratégia de Migração

```
migration_001_financial       Fatura, ItemFatura, Pagamento, SeguroPagamento
migration_002_platform        ApiKey, Webhook, WebhookEntrega, PlanoLimite
migration_003_rbac            Permissao, RolePermissao, UtilizadorPermissao
migration_004_audit           AuditLog
migration_005_config_extend   colunas opcionais em ConfiguracaoClinica
```

Todas são additive. Podem ser aplicadas na ordem acima sem risco de breaking change.

---

## migration_001 — Módulo Financeiro

```prisma
enum EstadoFatura {
  RASCUNHO
  EMITIDA
  PAGA
  ANULADA
}

enum TipoFatura {
  PARTICULAR
  SEGURO
}

enum MetodoPagamento {
  DINHEIRO
  TRANSFERENCIA_BANCARIA
  TPA
  SEGURO
}

enum EstadoSeguro {
  PENDENTE
  SUBMETIDO
  APROVADO
  REJEITADO
  REEMBOLSADO
}

model Fatura {
  id            String       @id @default(cuid())
  clinicaId     String
  numeroFatura  String       // F-2026-00042 — gerado por FaturaNumberService
  agendamentoId String?      @unique
  pacienteId    String
  medicoId      String?
  tipo          TipoFatura   @default(PARTICULAR)
  estado        EstadoFatura @default(RASCUNHO)
  subtotal      Int          // inteiro Kwanza
  desconto      Int          @default(0)
  total         Int          // subtotal - desconto
  notas         String?
  dataEmissao   DateTime?
  dataVencimento DateTime?
  criadoEm      DateTime     @default(now())
  atualizadoEm  DateTime     @updatedAt

  clinica     Clinica       @relation(fields: [clinicaId], references: [id])
  agendamento Agendamento?  @relation(fields: [agendamentoId], references: [id])
  paciente    Paciente      @relation(fields: [pacienteId], references: [id])
  medico      Medico?       @relation(fields: [medicoId], references: [id])
  itens       ItemFatura[]
  pagamentos  Pagamento[]

  @@index([clinicaId])
  @@index([clinicaId, estado])
  @@index([clinicaId, pacienteId])
  @@index([clinicaId, dataEmissao])
  @@map("faturas")
}

model ItemFatura {
  id          String @id @default(cuid())
  faturaId    String
  descricao   String
  quantidade  Int    @default(1)
  precoUnit   Int    // inteiro Kwanza
  desconto    Int    @default(0)
  total       Int    // (precoUnit * quantidade) - desconto

  fatura Fatura @relation(fields: [faturaId], references: [id], onDelete: Cascade)
  @@map("itens_fatura")
}

model Pagamento {
  id         String          @id @default(cuid())
  clinicaId  String
  faturaId   String
  metodo     MetodoPagamento
  valor      Int             // inteiro Kwanza
  referencia String?
  notas      String?
  criadoEm  DateTime         @default(now())
  criadoPor  String          // utilizadorId

  fatura Fatura          @relation(fields: [faturaId], references: [id])
  seguro SeguroPagamento?

  @@index([clinicaId])
  @@index([faturaId])
  @@map("pagamentos")
}

model SeguroPagamento {
  id                 String       @id @default(cuid())
  pagamentoId        String       @unique
  seguradora         String       // "ENSA" | "AAA Seguros" | "Medicel" | ...
  numeroBeneficiario String
  numeroAutorizacao  String?
  estado             EstadoSeguro @default(PENDENTE)
  valorSolicitado    Int          // Kwanza
  valorAprovado      Int?
  dataSubmissao      DateTime?
  dataResposta       DateTime?
  notasSeguradora    String?

  pagamento Pagamento @relation(fields: [pagamentoId], references: [id])
  @@map("seguros_pagamento")
}
```

**Regra de cálculo (obrigatória em código):**
```
ItemFatura.total = (precoUnit × quantidade) - desconto_item
Fatura.subtotal  = SUM(ItemFatura.total)
Fatura.total     = subtotal - desconto_global
Estado → PAGA quando SUM(Pagamento.valor) >= Fatura.total
```

---

## migration_002 — Plataforma

```prisma
enum EscopoApiKey {
  READ_PACIENTES
  WRITE_PACIENTES
  READ_AGENDAMENTOS
  WRITE_AGENDAMENTOS
  READ_RECEITAS
  READ_FATURAS
  WRITE_FATURAS
}

model ApiKey {
  id        String        @id @default(cuid())
  clinicaId String
  nome      String
  keyHash   String        @unique  // SHA-256 — NUNCA guardar o token
  prefixo   String        // primeiros 12 chars — para identificação na UI
  escopos   EscopoApiKey[]
  ativo     Boolean       @default(true)
  ultimoUso DateTime?
  expiresAt DateTime?
  criadoEm DateTime       @default(now())
  criadoPor String

  clinica Clinica @relation(fields: [clinicaId], references: [id])
  @@index([clinicaId])
  @@index([keyHash])
  @@map("api_keys")
}

model Webhook {
  id        String   @id @default(cuid())
  clinicaId String
  nome      String
  url       String
  secret    String   // HMAC secret — guardar encriptado com APP_SECRET
  eventos   String[] // ["agendamento.criado", "fatura.emitida", ...]
  ativo     Boolean  @default(true)
  criadoEm DateTime  @default(now())

  clinica  Clinica          @relation(fields: [clinicaId], references: [id])
  entregas WebhookEntrega[]
  @@index([clinicaId])
  @@map("webhooks")
}

model WebhookEntrega {
  id           String    @id @default(cuid())
  webhookId    String
  evento       String
  payload      Json
  statusHttp   Int?
  resposta     String?
  tentativas   Int       @default(0)
  sucesso      Boolean   @default(false)
  proximaTent  DateTime?
  criadoEm    DateTime   @default(now())
  concluidoEm DateTime?

  webhook Webhook @relation(fields: [webhookId], references: [id])
  @@index([webhookId])
  @@index([sucesso, proximaTent])
  @@map("webhook_entregas")
}

model PlanoLimite {
  plano              Plano   @id
  maxMedicos         Int     // -1 = ilimitado
  maxConsultasMes    Int
  maxPacientes       Int
  apiKeyPermitido    Boolean @default(false)
  maxApiKeys         Int     @default(0)
  webhookPermitido   Boolean @default(false)
  maxWebhooks        Int     @default(0)
  relatoriosHist     Boolean @default(false) // acesso a histórico > mês corrente
  exportPermitido    Boolean @default(false)

  @@map("plano_limites")
}

// Seed obrigatório de PlanoLimite:
// BASICO:     maxMedicos=2, maxConsultasMes=100, maxPacientes=500, apiKey=false
// PRO:        maxMedicos=10, maxConsultasMes=-1, maxPacientes=-1, apiKey=true, maxApiKeys=3
// ENTERPRISE: tudo -1 ou true
```

---

## migration_003 — RBAC Granular

```prisma
model Permissao {
  id        String @id @default(cuid())
  codigo    String @unique // "fatura:void", "paciente:delete"
  descricao String
  modulo    String         // "financeiro", "pacientes", "configuracao"

  rolePermissoes       RolePermissao[]
  utilizadorPermissoes UtilizadorPermissao[]
  @@map("permissoes")
}

model RolePermissao {
  papel       Papel
  permissaoId String
  permissao   Permissao @relation(fields: [permissaoId], references: [id])

  @@id([papel, permissaoId])
  @@map("role_permissoes")
}

model UtilizadorPermissao {
  utilizadorId String
  permissaoId  String
  tipo         String   // "GRANT" | "DENY"
  criadoPor    String
  criadoEm    DateTime  @default(now())

  utilizador Utilizador @relation(fields: [utilizadorId], references: [id])
  permissao  Permissao  @relation(fields: [permissaoId], references: [id])

  @@id([utilizadorId, permissaoId])
  @@map("utilizador_permissoes")
}
```

---

## migration_004 — Audit Log

```prisma
model AuditLog {
  id        String    @id @default(cuid())
  clinicaId String?
  actorId   String    // utilizadorId | "apikey:{id}" | "sistema"
  actorTipo String    // "UTILIZADOR" | "API_KEY" | "SISTEMA"
  accao     String    // "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "EXPORT"
  recurso   String    // "fatura" | "pagamento" | "apikey" | "permissao"
  recursoId String?
  ip        String?
  antes     Json?     // snapshot antes (UPDATE/DELETE)
  depois    Json?     // snapshot depois (CREATE/UPDATE)
  metadata  Json?
  criadoEm DateTime   @default(now())

  @@index([clinicaId, criadoEm])
  @@index([actorId, criadoEm])
  @@index([recurso, recursoId])
  @@map("audit_logs")
}
```

---

## migration_005 — Estender ConfiguracaoClinica

Colunas opcionais adicionadas à tabela existente (sem breaking change):

```prisma
// Adicionar a model ConfiguracaoClinica:
logoUrl         String?
enderecoFatura  String?  // endereço que aparece no cabeçalho das faturas
nif             String?  // Número de Identificação Fiscal
iban            String?
faturaAuto      Boolean  @default(false) // criar fatura ao concluir consulta
corPrimaria     String?  // hex, ex: "#2563eb"
```
