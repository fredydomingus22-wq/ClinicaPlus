-- Contracts MVP phase 2: installments, clauses, signatures, amendments

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContractInstallmentStatus') THEN
    CREATE TYPE "ContractInstallmentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContractSignerType') THEN
    CREATE TYPE "ContractSignerType" AS ENUM ('CLINIC', 'PATIENT', 'GUARDIAN');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContractSignatureStatus') THEN
    CREATE TYPE "ContractSignatureStatus" AS ENUM ('PENDING', 'SIGNED', 'REJECTED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContractAmendmentStatus') THEN
    CREATE TYPE "ContractAmendmentStatus" AS ENUM ('DRAFT', 'APPLIED', 'CANCELLED');
  END IF;
END $$;

ALTER TYPE "ContractEventType" ADD VALUE IF NOT EXISTS 'PAYMENT_RECORDED';
ALTER TYPE "ContractEventType" ADD VALUE IF NOT EXISTS 'SIGNATURE_RECORDED';
ALTER TYPE "ContractEventType" ADD VALUE IF NOT EXISTS 'AMENDMENT_CREATED';

ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "categoria" TEXT NOT NULL DEFAULT 'GENERAL';

CREATE TABLE IF NOT EXISTS "contract_installments" (
  "id" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "numero" INTEGER NOT NULL,
  "vencimento" TIMESTAMP(3) NOT NULL,
  "valor" INTEGER NOT NULL,
  "status" "ContractInstallmentStatus" NOT NULL DEFAULT 'PENDING',
  "pagoEm" TIMESTAMP(3),
  "metodoPagamento" TEXT,
  "referencia" TEXT,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contract_installments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "contract_installments_contractId_numero_key"
  ON "contract_installments"("contractId", "numero");
CREATE INDEX IF NOT EXISTS "contract_installments_contractId_status_idx"
  ON "contract_installments"("contractId", "status");

ALTER TABLE "contract_installments"
  ADD CONSTRAINT "contract_installments_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "contract_clauses" (
  "id" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "conteudo" TEXT NOT NULL,
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contract_clauses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "contract_clauses_contractId_ordem_idx"
  ON "contract_clauses"("contractId", "ordem");

ALTER TABLE "contract_clauses"
  ADD CONSTRAINT "contract_clauses_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "contract_signatures" (
  "id" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "signerType" "ContractSignerType" NOT NULL,
  "signerName" TEXT NOT NULL,
  "signerDoc" TEXT,
  "status" "ContractSignatureStatus" NOT NULL DEFAULT 'PENDING',
  "signedAt" TIMESTAMP(3),
  "provider" TEXT,
  "evidenceJson" JSONB,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contract_signatures_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "contract_signatures_contractId_status_idx"
  ON "contract_signatures"("contractId", "status");

ALTER TABLE "contract_signatures"
  ADD CONSTRAINT "contract_signatures_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "contract_amendments" (
  "id" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "numero" INTEGER NOT NULL,
  "motivo" TEXT NOT NULL,
  "deltaJson" JSONB NOT NULL,
  "status" "ContractAmendmentStatus" NOT NULL DEFAULT 'DRAFT',
  "effectiveDate" TIMESTAMP(3) NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contract_amendments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "contract_amendments_contractId_numero_key"
  ON "contract_amendments"("contractId", "numero");
CREATE INDEX IF NOT EXISTS "contract_amendments_contractId_status_idx"
  ON "contract_amendments"("contractId", "status");

ALTER TABLE "contract_amendments"
  ADD CONSTRAINT "contract_amendments_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
