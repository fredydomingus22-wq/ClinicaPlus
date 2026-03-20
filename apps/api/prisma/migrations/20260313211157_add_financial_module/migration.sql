/*
  Warnings:

  - You are about to drop the `faturas` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "EstadoFatura" AS ENUM ('RASCUNHO', 'EMITIDA', 'PAGA', 'ANULADA');

-- CreateEnum
CREATE TYPE "TipoFatura" AS ENUM ('PARTICULAR', 'SEGURO');

-- CreateEnum
CREATE TYPE "MetodoPagamento" AS ENUM ('DINHEIRO', 'TRANSFERENCIA_BANCARIA', 'TPA', 'SEGURO');

-- CreateEnum
CREATE TYPE "EstadoSeguro" AS ENUM ('PENDENTE', 'SUBMETIDO', 'APROVADO', 'REJEITADO', 'REEMBOLSADO');

-- DropForeignKey
ALTER TABLE "faturas" DROP CONSTRAINT "faturas_clinicaId_fkey";

-- AlterTable
ALTER TABLE "configuracoes_clinica" ADD COLUMN     "corPrimaria" TEXT,
ADD COLUMN     "enderecoFatura" TEXT,
ADD COLUMN     "faturaAuto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "iban" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "nif" TEXT;

-- DropTable
DROP TABLE "faturas";

-- CreateTable
CREATE TABLE "faturas_assinatura" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "valor" INTEGER NOT NULL,
    "moeda" TEXT NOT NULL DEFAULT 'Kz',
    "status" TEXT NOT NULL DEFAULT 'PAGO',
    "dataEmissao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataPagamento" TIMESTAMP(3),
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "urlPdf" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faturas_assinatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinica_faturas" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "numeroFatura" TEXT NOT NULL,
    "agendamentoId" TEXT,
    "pacienteId" TEXT NOT NULL,
    "medicoId" TEXT,
    "tipo" "TipoFatura" NOT NULL DEFAULT 'PARTICULAR',
    "estado" "EstadoFatura" NOT NULL DEFAULT 'RASCUNHO',
    "subtotal" INTEGER NOT NULL,
    "desconto" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "notas" TEXT,
    "dataEmissao" TIMESTAMP(3),
    "dataVencimento" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinica_faturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_fatura" (
    "id" TEXT NOT NULL,
    "faturaId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "precoUnit" INTEGER NOT NULL,
    "desconto" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,

    CONSTRAINT "itens_fatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "faturaId" TEXT NOT NULL,
    "metodo" "MetodoPagamento" NOT NULL,
    "valor" INTEGER NOT NULL,
    "referencia" TEXT,
    "notas" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoPor" TEXT NOT NULL,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seguros_pagamento" (
    "id" TEXT NOT NULL,
    "pagamentoId" TEXT NOT NULL,
    "seguradora" TEXT NOT NULL,
    "numeroBeneficiario" TEXT NOT NULL,
    "numeroAutorizacao" TEXT,
    "estado" "EstadoSeguro" NOT NULL DEFAULT 'PENDENTE',
    "valorSolicitado" INTEGER NOT NULL,
    "valorAprovado" INTEGER,
    "dataSubmissao" TIMESTAMP(3),
    "dataResposta" TIMESTAMP(3),
    "notasSeguradora" TEXT,

    CONSTRAINT "seguros_pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "faturas_assinatura_numero_key" ON "faturas_assinatura"("numero");

-- CreateIndex
CREATE INDEX "faturas_assinatura_clinicaId_idx" ON "faturas_assinatura"("clinicaId");

-- CreateIndex
CREATE UNIQUE INDEX "clinica_faturas_agendamentoId_key" ON "clinica_faturas"("agendamentoId");

-- CreateIndex
CREATE INDEX "clinica_faturas_clinicaId_idx" ON "clinica_faturas"("clinicaId");

-- CreateIndex
CREATE INDEX "clinica_faturas_clinicaId_estado_idx" ON "clinica_faturas"("clinicaId", "estado");

-- CreateIndex
CREATE INDEX "clinica_faturas_clinicaId_pacienteId_idx" ON "clinica_faturas"("clinicaId", "pacienteId");

-- CreateIndex
CREATE INDEX "clinica_faturas_clinicaId_dataEmissao_idx" ON "clinica_faturas"("clinicaId", "dataEmissao");

-- CreateIndex
CREATE INDEX "pagamentos_clinicaId_idx" ON "pagamentos"("clinicaId");

-- CreateIndex
CREATE INDEX "pagamentos_faturaId_idx" ON "pagamentos"("faturaId");

-- CreateIndex
CREATE UNIQUE INDEX "seguros_pagamento_pagamentoId_key" ON "seguros_pagamento"("pagamentoId");

-- AddForeignKey
ALTER TABLE "faturas_assinatura" ADD CONSTRAINT "faturas_assinatura_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinica_faturas" ADD CONSTRAINT "clinica_faturas_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinica_faturas" ADD CONSTRAINT "clinica_faturas_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "agendamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinica_faturas" ADD CONSTRAINT "clinica_faturas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinica_faturas" ADD CONSTRAINT "clinica_faturas_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_fatura" ADD CONSTRAINT "itens_fatura_faturaId_fkey" FOREIGN KEY ("faturaId") REFERENCES "clinica_faturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_faturaId_fkey" FOREIGN KEY ("faturaId") REFERENCES "clinica_faturas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguros_pagamento" ADD CONSTRAINT "seguros_pagamento_pagamentoId_fkey" FOREIGN KEY ("pagamentoId") REFERENCES "pagamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
