-- Remove agtApiToken do schema (alinhamento com decisão de usar Basic Auth global)
-- Esta migração alinha o banco de produção com o schema atual

ALTER TABLE "clinicas" DROP COLUMN IF EXISTS "agtApiToken";
