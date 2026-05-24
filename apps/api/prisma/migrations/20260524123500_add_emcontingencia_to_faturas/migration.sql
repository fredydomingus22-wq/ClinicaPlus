-- Adiciona coluna emContingencia à tabela faturas
-- Necessária para rastrear faturas emitidas em contingência

ALTER TABLE "faturas"
  ADD COLUMN IF NOT EXISTS "emContingencia" BOOLEAN NOT NULL DEFAULT false;
