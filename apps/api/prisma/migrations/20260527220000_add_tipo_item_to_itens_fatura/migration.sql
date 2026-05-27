-- CreateEnum
CREATE TYPE "TipoItemFatura" AS ENUM ('SERVICO', 'PRODUTO', 'TRATAMENTO', 'EXAME', 'MEDICO');

-- AlterTable
ALTER TABLE "itens_fatura" ADD COLUMN "tipoItem" "TipoItemFatura" NOT NULL DEFAULT 'SERVICO';

-- AlterTable
ALTER TABLE "itens_fatura" ADD COLUMN "produtoId" TEXT;

-- AlterTable
ALTER TABLE "itens_fatura" ADD COLUMN "tratamentoId" TEXT;

-- AlterTable
ALTER TABLE "itens_fatura" ADD COLUMN "exameId" TEXT;

-- AlterTable
ALTER TABLE "itens_fatura" ADD COLUMN "medicoId" TEXT;

-- AlterTable
ALTER TABLE "itens_fatura" ADD COLUMN "motivoIsencao" TEXT;

-- AlterTable
ALTER TABLE "itens_fatura" ADD COLUMN "taxaIva" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "itens_fatura" ADD CONSTRAINT "itens_fatura_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_fatura" ADD CONSTRAINT "itens_fatura_tratamentoId_fkey" FOREIGN KEY ("tratamentoId") REFERENCES "tipos_tratamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_fatura" ADD CONSTRAINT "itens_fatura_exameId_fkey" FOREIGN KEY ("exameId") REFERENCES "tipos_exame_clinica"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_fatura" ADD CONSTRAINT "itens_fatura_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
