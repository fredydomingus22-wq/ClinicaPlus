-- Migration para corrigir migration falhada anteriormente
-- Usa verificações condicionais para evitar conflitos

-- Criar enum apenas se não existir
DO $$ BEGIN
    CREATE TYPE "TipoItemFatura" AS ENUM ('SERVICO', 'PRODUTO', 'TRATAMENTO', 'EXAME', 'MEDICO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Adicionar colunas apenas se não existirem
DO $$ BEGIN
    ALTER TABLE "itens_fatura" ADD COLUMN "tipoItem" "TipoItemFatura" NOT NULL DEFAULT 'SERVICO';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "itens_fatura" ADD COLUMN "produtoId" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "itens_fatura" ADD COLUMN "tratamentoId" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "itens_fatura" ADD COLUMN "exameId" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "itens_fatura" ADD COLUMN "medicoId" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "itens_fatura" ADD COLUMN "motivoIsencao" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "itens_fatura" ADD COLUMN "taxaIva" DOUBLE PRECISION NOT NULL DEFAULT 0;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Adicionar foreign keys apenas se não existirem
DO $$ BEGIN
    ALTER TABLE "itens_fatura" ADD CONSTRAINT "itens_fatura_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "itens_fatura" ADD CONSTRAINT "itens_fatura_tratamentoId_fkey" FOREIGN KEY ("tratamentoId") REFERENCES "tipos_tratamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "itens_fatura" ADD CONSTRAINT "itens_fatura_exameId_fkey" FOREIGN KEY ("exameId") REFERENCES "tipos_exame_clinica"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "itens_fatura" ADD CONSTRAINT "itens_fatura_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
