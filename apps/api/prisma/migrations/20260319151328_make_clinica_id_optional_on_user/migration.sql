-- DropForeignKey
ALTER TABLE "utilizadores" DROP CONSTRAINT "utilizadores_clinicaId_fkey";

-- AlterTable
ALTER TABLE "utilizadores" ALTER COLUMN "clinicaId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "utilizadores" ADD CONSTRAINT "utilizadores_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
