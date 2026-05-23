-- Add item type + FK references for contract items
CREATE TYPE "ContractItemType" AS ENUM ('SERVICO', 'PRODUTO', 'TRATAMENTO');

ALTER TABLE "contract_service_items"
  ADD COLUMN "itemType" "ContractItemType" NOT NULL DEFAULT 'SERVICO',
  ADD COLUMN "produtoId" TEXT,
  ADD COLUMN "tipoTratamentoId" TEXT;

CREATE INDEX "contract_service_items_produtoId_idx" ON "contract_service_items"("produtoId");
CREATE INDEX "contract_service_items_tipoTratamentoId_idx" ON "contract_service_items"("tipoTratamentoId");

ALTER TABLE "contract_service_items"
  ADD CONSTRAINT "contract_service_items_produtoId_fkey"
  FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contract_service_items"
  ADD CONSTRAINT "contract_service_items_tipoTratamentoId_fkey"
  FOREIGN KEY ("tipoTratamentoId") REFERENCES "tipos_tratamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
