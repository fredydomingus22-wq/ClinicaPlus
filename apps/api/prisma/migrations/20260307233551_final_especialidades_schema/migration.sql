/*
  Warnings:

  - Made the column `especialidadeId` on table `medicos` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "medicos" DROP CONSTRAINT "medicos_especialidadeId_fkey";

-- AlterTable
ALTER TABLE "medicos" ALTER COLUMN "especialidadeId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "medicos" ADD CONSTRAINT "medicos_especialidadeId_fkey" FOREIGN KEY ("especialidadeId") REFERENCES "especialidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
