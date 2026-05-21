ALTER TABLE "pagamentos" ADD COLUMN IF NOT EXISTS "numeroRecibo" TEXT;
ALTER TABLE "pagamentos" ADD COLUMN IF NOT EXISTS "fiscalHash" TEXT;
ALTER TABLE "pagamentos" ADD COLUMN IF NOT EXISTS "documentoChave" TEXT;
