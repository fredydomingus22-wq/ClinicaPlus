-- Adiciona colunas de metadados de contingência à sequencia_doc_fiscal
-- (necessárias antes da migration 20260521234500 que usa estas colunas)

ALTER TABLE "sequencia_doc_fiscal"
  ADD COLUMN IF NOT EXISTS "isContingency" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "startTS" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "endTS" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "isRegistered" BOOLEAN NOT NULL DEFAULT false;
