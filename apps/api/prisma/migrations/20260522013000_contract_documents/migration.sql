CREATE TABLE "contract_documents" (
  "id" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "clinicaId" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "mimeType" TEXT,
  "tamanhoBytes" INTEGER,
  "url" TEXT NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contract_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contract_documents_contractId_criadoEm_idx" ON "contract_documents"("contractId", "criadoEm");
CREATE INDEX "contract_documents_clinicaId_criadoEm_idx" ON "contract_documents"("clinicaId", "criadoEm");

ALTER TABLE "contract_documents"
  ADD CONSTRAINT "contract_documents_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contract_documents"
  ADD CONSTRAINT "contract_documents_clinicaId_fkey"
  FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
