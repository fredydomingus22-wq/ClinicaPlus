-- AlterTable
ALTER TABLE "configuracoes_clinica" ADD COLUMN     "agendamentoOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preTriagem" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "prontuarioCustom" BOOLEAN NOT NULL DEFAULT false;
