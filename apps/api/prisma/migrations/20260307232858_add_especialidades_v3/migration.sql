/*
  Warnings:

  - You are about to drop the column `especialidade` on the `medicos` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "medicos_clinicaId_especialidade_idx";

-- AlterTable
ALTER TABLE "medicos" DROP COLUMN "especialidade",
ADD COLUMN     "especialidadeId" TEXT;

-- CreateTable
CREATE TABLE "especialidades" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "especialidades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "especialidades_clinicaId_idx" ON "especialidades"("clinicaId");

-- CreateIndex
CREATE UNIQUE INDEX "especialidades_clinicaId_nome_key" ON "especialidades"("clinicaId", "nome");

-- CreateIndex
CREATE INDEX "medicos_clinicaId_especialidadeId_idx" ON "medicos"("clinicaId", "especialidadeId");

-- AddForeignKey
ALTER TABLE "medicos" ADD CONSTRAINT "medicos_especialidadeId_fkey" FOREIGN KEY ("especialidadeId") REFERENCES "especialidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "especialidades" ADD CONSTRAINT "especialidades_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
