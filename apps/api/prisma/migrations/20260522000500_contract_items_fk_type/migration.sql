DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoProduto') THEN
    CREATE TYPE "TipoProduto" AS ENUM ('PRODUTO', 'SERVICO');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoMovimentacao') THEN
    CREATE TYPE "TipoMovimentacao" AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE', 'VENDA', 'ESTORNO', 'TRANSFERENCIA');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContractItemType') THEN
    CREATE TYPE "ContractItemType" AS ENUM ('SERVICO', 'PRODUTO', 'TRATAMENTO');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "categorias_produto" (
  "id" TEXT NOT NULL,
  "clinicaId" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "descricao" TEXT,
  "cor" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "categorias_produto_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "produtos" (
  "id" TEXT NOT NULL,
  "clinicaId" TEXT NOT NULL,
  "categoriaId" TEXT NOT NULL,
  "codigo" TEXT,
  "nome" TEXT NOT NULL,
  "descricao" TEXT,
  "precoCusto" INTEGER NOT NULL DEFAULT 0,
  "precoVenda" INTEGER NOT NULL DEFAULT 0,
  "taxaIva" DOUBLE PRECISION NOT NULL DEFAULT 14,
  "codigoIva" TEXT NOT NULL DEFAULT 'IVA',
  "motivoIsencao" TEXT,
  "tipo" "TipoProduto" NOT NULL DEFAULT 'PRODUTO',
  "gerenciaEstoque" BOOLEAN NOT NULL DEFAULT true,
  "estoqueMinimo" INTEGER NOT NULL DEFAULT 0,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "estoque_lotes" (
  "id" TEXT NOT NULL,
  "clinicaId" TEXT NOT NULL,
  "produtoId" TEXT NOT NULL,
  "numeroLote" TEXT NOT NULL,
  "dataValidade" TIMESTAMP(3),
  "quantidade" INTEGER NOT NULL DEFAULT 0,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "estoque_lotes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "estoque_movimentacoes" (
  "id" TEXT NOT NULL,
  "clinicaId" TEXT NOT NULL,
  "produtoId" TEXT NOT NULL,
  "loteId" TEXT,
  "utilizadorId" TEXT,
  "tipo" "TipoMovimentacao" NOT NULL,
  "quantidade" INTEGER NOT NULL,
  "motivo" TEXT,
  "documentoRef" TEXT,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "estoque_movimentacoes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "categorias_produto_clinicaId_idx" ON "categorias_produto"("clinicaId");
CREATE UNIQUE INDEX IF NOT EXISTS "categorias_produto_clinicaId_nome_key" ON "categorias_produto"("clinicaId", "nome");
CREATE INDEX IF NOT EXISTS "produtos_clinicaId_idx" ON "produtos"("clinicaId");
CREATE INDEX IF NOT EXISTS "produtos_categoriaId_idx" ON "produtos"("categoriaId");
CREATE UNIQUE INDEX IF NOT EXISTS "produtos_clinicaId_codigo_key" ON "produtos"("clinicaId", "codigo");
CREATE INDEX IF NOT EXISTS "estoque_lotes_clinicaId_idx" ON "estoque_lotes"("clinicaId");
CREATE INDEX IF NOT EXISTS "estoque_lotes_produtoId_idx" ON "estoque_lotes"("produtoId");
CREATE INDEX IF NOT EXISTS "estoque_lotes_dataValidade_idx" ON "estoque_lotes"("dataValidade");
CREATE INDEX IF NOT EXISTS "estoque_movimentacoes_clinicaId_idx" ON "estoque_movimentacoes"("clinicaId");
CREATE INDEX IF NOT EXISTS "estoque_movimentacoes_produtoId_idx" ON "estoque_movimentacoes"("produtoId");
CREATE INDEX IF NOT EXISTS "estoque_movimentacoes_loteId_idx" ON "estoque_movimentacoes"("loteId");

ALTER TABLE "contract_service_items"
  ADD COLUMN IF NOT EXISTS "itemType" "ContractItemType" NOT NULL DEFAULT 'SERVICO',
  ADD COLUMN IF NOT EXISTS "produtoId" TEXT,
  ADD COLUMN IF NOT EXISTS "tipoTratamentoId" TEXT;

CREATE INDEX IF NOT EXISTS "contract_service_items_produtoId_idx" ON "contract_service_items"("produtoId");
CREATE INDEX IF NOT EXISTS "contract_service_items_tipoTratamentoId_idx" ON "contract_service_items"("tipoTratamentoId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categorias_produto_clinicaId_fkey') THEN
    ALTER TABLE "categorias_produto"
      ADD CONSTRAINT "categorias_produto_clinicaId_fkey"
      FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'produtos_clinicaId_fkey') THEN
    ALTER TABLE "produtos"
      ADD CONSTRAINT "produtos_clinicaId_fkey"
      FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'produtos_categoriaId_fkey') THEN
    ALTER TABLE "produtos"
      ADD CONSTRAINT "produtos_categoriaId_fkey"
      FOREIGN KEY ("categoriaId") REFERENCES "categorias_produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'estoque_lotes_clinicaId_fkey') THEN
    ALTER TABLE "estoque_lotes"
      ADD CONSTRAINT "estoque_lotes_clinicaId_fkey"
      FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'estoque_lotes_produtoId_fkey') THEN
    ALTER TABLE "estoque_lotes"
      ADD CONSTRAINT "estoque_lotes_produtoId_fkey"
      FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'estoque_movimentacoes_clinicaId_fkey') THEN
    ALTER TABLE "estoque_movimentacoes"
      ADD CONSTRAINT "estoque_movimentacoes_clinicaId_fkey"
      FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'estoque_movimentacoes_produtoId_fkey') THEN
    ALTER TABLE "estoque_movimentacoes"
      ADD CONSTRAINT "estoque_movimentacoes_produtoId_fkey"
      FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'estoque_movimentacoes_loteId_fkey') THEN
    ALTER TABLE "estoque_movimentacoes"
      ADD CONSTRAINT "estoque_movimentacoes_loteId_fkey"
      FOREIGN KEY ("loteId") REFERENCES "estoque_lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contract_service_items_produtoId_fkey') THEN
    ALTER TABLE "contract_service_items"
      ADD CONSTRAINT "contract_service_items_produtoId_fkey"
      FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contract_service_items_tipoTratamentoId_fkey') THEN
    ALTER TABLE "contract_service_items"
      ADD CONSTRAINT "contract_service_items_tipoTratamentoId_fkey"
      FOREIGN KEY ("tipoTratamentoId") REFERENCES "tipos_tratamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
