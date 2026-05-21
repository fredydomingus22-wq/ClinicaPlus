-- AlterEnum
ALTER TYPE "EstadoAgendamento" ADD VALUE 'ATRASADO';

-- AlterTable
ALTER TABLE "clinicas" ADD COLUMN     "agtPrivateKey" TEXT,
ADD COLUMN     "agtPublicKey" TEXT,
ADD COLUMN     "logotipoUrl" TEXT,
ADD COLUMN     "tipoEntidade" TEXT DEFAULT 'EMPRESA';

-- AlterTable
ALTER TABLE "fatura_snapshots" ADD COLUMN     "serieDocFiscal" TEXT NOT NULL DEFAULT 'CPLS';

-- AlterTable
ALTER TABLE "faturas" ADD COLUMN     "serieDocFiscal" TEXT NOT NULL DEFAULT 'CPLS';

-- AlterTable
ALTER TABLE "pacientes" ADD COLUMN     "avatarUrl" TEXT;

-- AlterTable
ALTER TABLE "utilizadores" ADD COLUMN     "avatarUrl" TEXT;

-- CreateIndex
CREATE INDEX "faturas_clinicaId_serieDocFiscal_tipoDocFiscal_estado_idx" ON "faturas"("clinicaId", "serieDocFiscal", "tipoDocFiscal", "estado");
