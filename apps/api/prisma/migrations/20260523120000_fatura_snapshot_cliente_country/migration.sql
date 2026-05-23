-- AlterTable
ALTER TABLE "fatura_snapshots" ADD COLUMN IF NOT EXISTS "clienteCountry" TEXT NOT NULL DEFAULT 'AO';
