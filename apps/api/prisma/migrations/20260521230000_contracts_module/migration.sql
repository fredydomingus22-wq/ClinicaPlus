-- Contracts module (Sprint 1)
CREATE TYPE "ContractStatus" AS ENUM (
  'DRAFT',
  'REVIEW',
  'PENDING_SIGNATURE',
  'ACTIVE',
  'SUSPENDED',
  'TERMINATED',
  'EXPIRED'
);

CREATE TYPE "ContractPaymentType" AS ENUM (
  'ONE_TIME',
  'INSTALLMENTS',
  'RECURRING'
);

CREATE TYPE "ContractEventType" AS ENUM (
  'CREATED',
  'UPDATED',
  'STATUS_CHANGED'
);

CREATE TABLE "contracts" (
  "id" TEXT NOT NULL,
  "clinicaId" TEXT NOT NULL,
  "pacienteId" TEXT NOT NULL,
  "numero" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
  "dataInicio" TIMESTAMP(3) NOT NULL,
  "dataFim" TIMESTAMP(3) NOT NULL,
  "moeda" TEXT NOT NULL DEFAULT 'AOA',
  "valorTotal" INTEGER NOT NULL DEFAULT 0,
  "valorEntrada" INTEGER NOT NULL DEFAULT 0,
  "clausulaRescisao" TEXT,
  "observacoes" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contract_service_items" (
  "id" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "descricao" TEXT NOT NULL,
  "quantidade" INTEGER NOT NULL DEFAULT 1,
  "precoUnitario" INTEGER NOT NULL DEFAULT 0,
  "desconto" INTEGER NOT NULL DEFAULT 0,
  "subtotal" INTEGER NOT NULL DEFAULT 0,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contract_service_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contract_payment_plans" (
  "id" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "tipo" "ContractPaymentType" NOT NULL,
  "parcelas" INTEGER NOT NULL DEFAULT 1,
  "periodicidade" TEXT,
  "diaVencimento" INTEGER,
  "jurosMora" INTEGER NOT NULL DEFAULT 0,
  "multa" INTEGER NOT NULL DEFAULT 0,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contract_payment_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contract_events" (
  "id" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "clinicaId" TEXT NOT NULL,
  "actorId" TEXT,
  "type" "ContractEventType" NOT NULL,
  "payload" JSONB,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contract_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contracts_clinicaId_numero_key" ON "contracts"("clinicaId", "numero");
CREATE INDEX "contracts_clinicaId_status_idx" ON "contracts"("clinicaId", "status");
CREATE INDEX "contracts_clinicaId_pacienteId_idx" ON "contracts"("clinicaId", "pacienteId");

CREATE INDEX "contract_service_items_contractId_idx" ON "contract_service_items"("contractId");

CREATE UNIQUE INDEX "contract_payment_plans_contractId_key" ON "contract_payment_plans"("contractId");
CREATE INDEX "contract_payment_plans_tipo_idx" ON "contract_payment_plans"("tipo");

CREATE INDEX "contract_events_contractId_criadoEm_idx" ON "contract_events"("contractId", "criadoEm");
CREATE INDEX "contract_events_clinicaId_criadoEm_idx" ON "contract_events"("clinicaId", "criadoEm");

ALTER TABLE "contracts"
  ADD CONSTRAINT "contracts_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contracts"
  ADD CONSTRAINT "contracts_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "contract_service_items"
  ADD CONSTRAINT "contract_service_items_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contract_payment_plans"
  ADD CONSTRAINT "contract_payment_plans_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contract_events"
  ADD CONSTRAINT "contract_events_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_events"
  ADD CONSTRAINT "contract_events_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
