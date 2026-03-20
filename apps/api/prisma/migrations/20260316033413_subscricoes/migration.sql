/*
  Warnings:

  - You are about to drop the column `atualizadoEm` on the `subscricoes` table. All the data in the column will be lost.
  - You are about to drop the column `canceladoEm` on the `subscricoes` table. All the data in the column will be lost.
  - You are about to drop the column `dataFim` on the `subscricoes` table. All the data in the column will be lost.
  - You are about to drop the column `dataInicio` on the `subscricoes` table. All the data in the column will be lost.
  - You are about to drop the column `proximoFaturamento` on the `subscricoes` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `subscricoes` table. All the data in the column will be lost.
  - Added the required column `alteradoPor` to the `subscricoes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inicioEm` to the `subscricoes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `razao` to the `subscricoes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `validaAte` to the `subscricoes` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EstadoSubscricao" AS ENUM ('TRIAL', 'ACTIVA', 'GRACE_PERIOD', 'SUSPENSA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "RazaoMudancaPlano" AS ENUM ('UPGRADE_MANUAL', 'DOWNGRADE_MANUAL', 'DOWNGRADE_AUTO', 'TRIAL_EXPIRADO', 'REACTIVACAO', 'CORRECAO');

-- DropIndex
DROP INDEX "subscricoes_clinicaId_key";

-- AlterTable
ALTER TABLE "clinicas" ADD COLUMN     "subscricaoEstado" "EstadoSubscricao" NOT NULL DEFAULT 'TRIAL',
ADD COLUMN     "subscricaoValidaAte" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "subscricoes" DROP COLUMN "atualizadoEm",
DROP COLUMN "canceladoEm",
DROP COLUMN "dataFim",
DROP COLUMN "dataInicio",
DROP COLUMN "proximoFaturamento",
DROP COLUMN "status",
ADD COLUMN     "alteradoPor" TEXT NOT NULL,
ADD COLUMN     "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "estado" "EstadoSubscricao" NOT NULL DEFAULT 'TRIAL',
ADD COLUMN     "inicioEm" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "notas" TEXT,
ADD COLUMN     "planoAnterior" "Plano",
ADD COLUMN     "razao" "RazaoMudancaPlano" NOT NULL,
ADD COLUMN     "referenciaInterna" TEXT,
ADD COLUMN     "trialAte" TIMESTAMP(3),
ADD COLUMN     "validaAte" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "valorKz" INTEGER;

-- CreateTable
CREATE TABLE "subscricao_notificacoes" (
    "id" TEXT NOT NULL,
    "subscricaoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "enviadoEm" TIMESTAMP(3),
    "erro" TEXT,

    CONSTRAINT "subscricao_notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscricao_notificacoes_subscricaoId_tipo_key" ON "subscricao_notificacoes"("subscricaoId", "tipo");

-- CreateIndex
CREATE INDEX "subscricoes_clinicaId_estado_idx" ON "subscricoes"("clinicaId", "estado");

-- CreateIndex
CREATE INDEX "subscricoes_clinicaId_criadoEm_idx" ON "subscricoes"("clinicaId", "criadoEm" DESC);

-- CreateIndex
CREATE INDEX "subscricoes_validaAte_idx" ON "subscricoes"("validaAte");

-- AddForeignKey
ALTER TABLE "subscricao_notificacoes" ADD CONSTRAINT "subscricao_notificacoes_subscricaoId_fkey" FOREIGN KEY ("subscricaoId") REFERENCES "subscricoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
