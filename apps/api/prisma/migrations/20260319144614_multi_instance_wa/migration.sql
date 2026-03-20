/*
  Warnings:

  - The `subscricaoEstado` column on the `clinicas` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `atualizadoEm` on the `faturas_assinatura` table. All the data in the column will be lost.
  - You are about to drop the column `criadoEm` on the `faturas_assinatura` table. All the data in the column will be lost.
  - The `estado` column on the `subscricoes` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `clinica_faturas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subscricao_notificacoes` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[clinicaId]` on the table `subscricoes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `atualizadoEm` to the `subscricoes` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WaEstadoInstancia" AS ENUM ('DESCONECTADO', 'AGUARDA_QR', 'CONECTADO', 'ERRO');

-- CreateEnum
CREATE TYPE "WaTipoAutomacao" AS ENUM ('MARCACAO_CONSULTA', 'LEMBRETE_24H', 'LEMBRETE_2H', 'CONFIRMACAO_CANCELAMENTO', 'BOAS_VINDAS', 'BEM_VINDO', 'LEMBRETE', 'FAQ');

-- CreateEnum
CREATE TYPE "WaEstadoConversa" AS ENUM ('AGUARDA_INPUT', 'EM_FLUXO_MARCACAO', 'AGUARDA_CONFIRMACAO', 'CONCLUIDA', 'EXPIRADA', 'ESPECIALIDADE', 'MEDICO', 'HORARIO', 'CONFIRMAR', 'FINALIZADA', 'ESCALADA');

-- CreateEnum
CREATE TYPE "WaDirecao" AS ENUM ('ENTRADA', 'SAIDA', 'IN', 'OUT');

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_clinicaId_fkey";

-- DropForeignKey
ALTER TABLE "clinica_faturas" DROP CONSTRAINT "clinica_faturas_agendamentoId_fkey";

-- DropForeignKey
ALTER TABLE "clinica_faturas" DROP CONSTRAINT "clinica_faturas_clinicaId_fkey";

-- DropForeignKey
ALTER TABLE "clinica_faturas" DROP CONSTRAINT "clinica_faturas_medicoId_fkey";

-- DropForeignKey
ALTER TABLE "clinica_faturas" DROP CONSTRAINT "clinica_faturas_pacienteId_fkey";

-- DropForeignKey
ALTER TABLE "itens_fatura" DROP CONSTRAINT "itens_fatura_faturaId_fkey";

-- DropForeignKey
ALTER TABLE "pagamentos" DROP CONSTRAINT "pagamentos_faturaId_fkey";

-- DropForeignKey
ALTER TABLE "subscricao_notificacoes" DROP CONSTRAINT "subscricao_notificacoes_subscricaoId_fkey";

-- DropIndex
DROP INDEX "subscricoes_clinicaId_criadoEm_idx";

-- DropIndex
DROP INDEX "subscricoes_clinicaId_estado_idx";

-- DropIndex
DROP INDEX "subscricoes_validaAte_idx";

-- AlterTable
ALTER TABLE "agendamentos" ADD COLUMN     "canal" TEXT DEFAULT 'PRESENCIAL';

-- AlterTable
ALTER TABLE "clinicas" DROP COLUMN "subscricaoEstado",
ADD COLUMN     "subscricaoEstado" TEXT DEFAULT 'TRIAL';

-- AlterTable
ALTER TABLE "faturas_assinatura" DROP COLUMN "atualizadoEm",
DROP COLUMN "criadoEm",
ALTER COLUMN "moeda" SET DEFAULT 'AOA',
ALTER COLUMN "status" SET DEFAULT 'PENDENTE';

-- AlterTable
ALTER TABLE "pacientes" ADD COLUMN     "origem" TEXT DEFAULT 'DIRECTO';

-- AlterTable
ALTER TABLE "subscricoes" ADD COLUMN     "atualizadoEm" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "canceladoEm" TIMESTAMP(3),
ADD COLUMN     "dataFim" TIMESTAMP(3),
ALTER COLUMN "alteradoPor" SET DEFAULT 'SISTEMA',
DROP COLUMN "estado",
ADD COLUMN     "estado" TEXT NOT NULL DEFAULT 'TRIAL',
ALTER COLUMN "inicioEm" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "razao" SET DEFAULT 'UPGRADE_MANUAL',
ALTER COLUMN "validaAte" DROP NOT NULL;

-- AlterTable
ALTER TABLE "webhook_entregas" ALTER COLUMN "url" DROP NOT NULL;

-- DropTable
DROP TABLE "clinica_faturas";

-- DropTable
DROP TABLE "subscricao_notificacoes";

-- DropEnum
DROP TYPE "EstadoSubscricao";

-- CreateTable
CREATE TABLE "faturas" (
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

    CONSTRAINT "faturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wa_instancias" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "evolutionName" TEXT NOT NULL,
    "evolutionToken" TEXT,
    "estado" "WaEstadoInstancia" NOT NULL DEFAULT 'DESCONECTADO',
    "numeroTelefone" TEXT,
    "qrCodeBase64" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wa_instancias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wa_automacoes" (
    "id" TEXT NOT NULL,
    "tipo" "WaTipoAutomacao" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "n8nWorkflowId" TEXT,
    "n8nWebhookPath" TEXT,
    "configuracao" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "n8nWebhookUrl" TEXT,
    "waInstanciaId" TEXT NOT NULL,

    CONSTRAINT "wa_automacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wa_conversas" (
    "id" TEXT NOT NULL,
    "instanciaId" TEXT NOT NULL,
    "numeroWhatsapp" TEXT NOT NULL,
    "pacienteId" TEXT,
    "estado" "WaEstadoConversa" NOT NULL DEFAULT 'AGUARDA_INPUT',
    "etapaFluxo" TEXT,
    "contexto" JSONB,
    "ultimaMensagemEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clinicaId" TEXT NOT NULL,

    CONSTRAINT "wa_conversas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wa_mensagens" (
    "id" TEXT NOT NULL,
    "conversaId" TEXT NOT NULL,
    "direcao" "WaDirecao" NOT NULL,
    "conteudo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'text',
    "evolutionMsgId" TEXT,
    "entregue" BOOLEAN NOT NULL DEFAULT false,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wa_mensagens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "faturas_agendamentoId_key" ON "faturas"("agendamentoId");

-- CreateIndex
CREATE INDEX "faturas_clinicaId_idx" ON "faturas"("clinicaId");

-- CreateIndex
CREATE INDEX "faturas_clinicaId_estado_idx" ON "faturas"("clinicaId", "estado");

-- CreateIndex
CREATE INDEX "faturas_clinicaId_pacienteId_idx" ON "faturas"("clinicaId", "pacienteId");

-- CreateIndex
CREATE INDEX "faturas_clinicaId_dataEmissao_idx" ON "faturas"("clinicaId", "dataEmissao");

-- CreateIndex
CREATE UNIQUE INDEX "wa_instancias_evolutionName_key" ON "wa_instancias"("evolutionName");

-- CreateIndex
CREATE INDEX "wa_instancias_clinicaId_idx" ON "wa_instancias"("clinicaId");

-- CreateIndex
CREATE INDEX "wa_automacoes_clinicaId_idx" ON "wa_automacoes"("clinicaId");

-- CreateIndex
CREATE UNIQUE INDEX "wa_automacoes_waInstanciaId_tipo_key" ON "wa_automacoes"("waInstanciaId", "tipo");

-- CreateIndex
CREATE INDEX "wa_conversas_instanciaId_estado_idx" ON "wa_conversas"("instanciaId", "estado");

-- CreateIndex
CREATE INDEX "wa_conversas_pacienteId_idx" ON "wa_conversas"("pacienteId");

-- CreateIndex
CREATE UNIQUE INDEX "wa_conversas_instanciaId_numeroWhatsapp_key" ON "wa_conversas"("instanciaId", "numeroWhatsapp");

-- CreateIndex
CREATE INDEX "wa_mensagens_conversaId_criadoEm_idx" ON "wa_mensagens"("conversaId", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "subscricoes_clinicaId_key" ON "subscricoes"("clinicaId");

-- AddForeignKey
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "agendamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wa_instancias" ADD CONSTRAINT "wa_instancias_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wa_automacoes" ADD CONSTRAINT "wa_automacoes_waInstanciaId_fkey" FOREIGN KEY ("waInstanciaId") REFERENCES "wa_instancias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wa_conversas" ADD CONSTRAINT "wa_conversas_instanciaId_fkey" FOREIGN KEY ("instanciaId") REFERENCES "wa_instancias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wa_conversas" ADD CONSTRAINT "wa_conversas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wa_mensagens" ADD CONSTRAINT "wa_mensagens_conversaId_fkey" FOREIGN KEY ("conversaId") REFERENCES "wa_conversas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
