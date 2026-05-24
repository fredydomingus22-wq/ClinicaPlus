# Recuperar migração falhada `20260521234500_fix_tipo_documento_fiscal_remove_vd`

## Sintoma

```
Error: P3009 / P3018
The `20260521234500_fix_tipo_documento_fiscal_remove_vd` migration ... failed
```

## Causas

1. Migração original usava `BEGIN/COMMIT` interno e gerava conflito na constraint `(clinicaId, tipoDoc, serie, anoFiscal)`.
2. Versão simplificada (`20260521234500`) referenciava colunas (`isContingency`, `startTS`, `endTS`, `isRegistered`) que ainda **não existiam** em produção porque foram adicionadas pelo schema Prisma mas nunca migradas.

## Passos (produção Supabase)

1. Use a **connection string directa** (porta 5432), não o pooler em modo transaction.

2. Marque a migração falhada como revertida usando Prisma Migrate:

```bash
cd apps/api
pnpm exec prisma migrate resolve --rolled-back 20260521234500_fix_tipo_documento_fiscal_remove_vd
```

3. Push do código corrigido para `main` (já inclui a migration `20260521234000` que adiciona as colunas + `20260521234500` simplificada).

4. Redeploy da API/worker no Railway. O `start-with-migrate.sh` vai correr `prisma migrate deploy` que agora aplica:
   - `20260521234000` — adiciona as colunas
   - `20260521234500` — converte VD→FT e remove VD do enum (sem crash)

5. Se não conseguir executar o Prisma CLI em produção, use este SQL no Supabase SQL Editor como alternativa operacional:

```sql
-- Equivalente operacional ao migrate resolve --rolled-back
-- Preferir sempre o Prisma CLI quando possível.
UPDATE "_prisma_migrations"
SET "rolled_back_at" = NOW()
WHERE "migration_name" = '20260521234500_fix_tipo_documento_fiscal_remove_vd'
  AND "finished_at" IS NULL
  AND "rolled_back_at" IS NULL;
```

6. Não aplique manualmente a migration `20260521234000`, a menos que o ambiente de deploy não consiga correr `prisma migrate deploy`. Se for necessário, use:

```sql

-- Adicionar colunas de contingência que o schema Prisma espera mas ainda não existem
ALTER TABLE "sequencia_doc_fiscal"
  ADD COLUMN IF NOT EXISTS "isContingency" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "startTS" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "endTS" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "isRegistered" BOOLEAN NOT NULL DEFAULT false;
```

7. Se `deploy` ainda falhar, inspecione tipos órfãos:

```sql
SELECT typname FROM pg_type WHERE typname LIKE 'TipoDocumentoFiscal%';
```

## Nota

A remoção de `VD` pode já ter sido feita pela migração `20260520091023_fix_pagamentos_numero_recibo`. A versão corrigida de `20260521234500` é **idempotente** e ignora o bloco de enum se `VD` já não existir.

## Segundo erro observado: `20260522000500_contract_items_fk_type`

Depois de recuperar `20260521234500`, o deploy pode avançar e falhar em:

```
Error: P3018
Migration name: 20260522000500_contract_items_fk_type
ERROR: relation "produtos" does not exist
```

Isto acontecia porque o `schema.prisma` já tinha o módulo de inventário (`categorias_produto`, `produtos`, `estoque_lotes`, `estoque_movimentacoes`), mas não existia uma migration anterior a criar essas tabelas. A migration `20260522000500` foi corrigida para criar o módulo de inventário antes de adicionar a FK de `contract_service_items.produtoId`.

Para recuperar este novo estado falhado, use:

```bash
cd apps/api
pnpm exec prisma migrate resolve --rolled-back 20260522000500_contract_items_fk_type
pnpm exec prisma migrate deploy
```

Se não conseguir executar o Prisma CLI em produção, alternativa operacional:

```sql
UPDATE "_prisma_migrations"
SET "rolled_back_at" = NOW()
WHERE "migration_name" = '20260522000500_contract_items_fk_type'
  AND "finished_at" IS NULL
  AND "rolled_back_at" IS NULL;
```

## Migrações pendentes (não aplicadas em produção)

As seguintes migrações existem localmente mas podem não ter sido aplicadas em produção:

1. `20260521234000_add_contingencia_cols_sequencia_doc_fiscal` — adiciona colunas de contingência (idempotente)
2. `20260522140000_add_odontograma` — cria tabela odontogramas
3. `20260523120000_fatura_snapshot_cliente_country` — adiciona coluna clienteCountry (idempotente)
4. `20260524123000_remove_agt_api_token` — remove coluna agtApiToken (idempotente)
5. `20260524123500_add_emcontingencia_to_faturas` — adiciona coluna emContingencia em faturas (idempotente)

### Procedimento de emergência (se `prisma migrate deploy` falhar)

Se o deploy da API falhar com erro de migração não aplicada, execute este SQL no Supabase SQL Editor:

```sql
-- Migration 20260521234000: adicionar colunas de contingência
ALTER TABLE "sequencia_doc_fiscal"
  ADD COLUMN IF NOT EXISTS "isContingency" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "startTS" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "endTS" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "isRegistered" BOOLEAN NOT NULL DEFAULT false;

-- Migration 20260522140000: criar tabela odontogramas
CREATE TABLE IF NOT EXISTS "odontogramas" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "marcacoes" JSONB NOT NULL DEFAULT '[]',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "odontogramas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "odontogramas_agendamentoId_key" ON "odontogramas"("agendamentoId");
CREATE INDEX IF NOT EXISTS "odontogramas_clinicaId_pacienteId_idx" ON "odontogramas"("clinicaId", "pacienteId");

ALTER TABLE "odontogramas"
  ADD CONSTRAINT IF NOT EXISTS "odontogramas_clinicaId_fkey"
  FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "odontogramas"
  ADD CONSTRAINT IF NOT EXISTS "odontogramas_pacienteId_fkey"
  FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "odontogramas"
  ADD CONSTRAINT IF NOT EXISTS "odontogramas_medicoId_fkey"
  FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "odontogramas"
  ADD CONSTRAINT IF NOT EXISTS "odontogramas_agendamentoId_fkey"
  FOREIGN KEY ("agendamentoId") REFERENCES "agendamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migration 20260523120000: adicionar coluna clienteCountry
ALTER TABLE "fatura_snapshots"
  ADD COLUMN IF NOT EXISTS "clienteCountry" TEXT NOT NULL DEFAULT 'AO';

-- Migration 20260524123000: remover coluna agtApiToken
ALTER TABLE "clinicas"
  DROP COLUMN IF EXISTS "agtApiToken";

-- Migration 20260524123500: adicionar coluna emContingencia
ALTER TABLE "faturas"
  ADD COLUMN IF NOT EXISTS "emContingencia" BOOLEAN NOT NULL DEFAULT false;
```

Após aplicar manualmente, marque as migrações como aplicadas na tabela `_prisma_migrations`:

```sql
INSERT INTO "_prisma_migrations" ("migration_name", "started_at", "finished_at", "applied_steps_count")
VALUES
  ('20260521234000_add_contingencia_cols_sequencia_doc_fiscal', NOW(), NOW(), 1),
  ('20260522140000_add_odontograma', NOW(), NOW(), 1),
  ('20260523120000_fatura_snapshot_cliente_country', NOW(), NOW(), 1),
  ('20260524123000_remove_agt_api_token', NOW(), NOW(), 1),
  ('20260524123500_add_emcontingencia_to_faturas', NOW(), NOW(), 1)
ON CONFLICT ("migration_name") DO NOTHING;
```

### Alternativa: usar Prisma CLI em produção

Se tiver acesso ao Prisma CLI no ambiente de produção, execute:

```bash
cd apps/api
pnpm exec prisma migrate deploy
```

Isto aplicará todas as migrações pendentes automaticamente de forma segura.
