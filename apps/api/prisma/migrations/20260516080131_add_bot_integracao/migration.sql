-- CreateEnum
CREATE TYPE "ProvedorBot" AS ENUM ('TYPEBOT', 'DIALOGFLOW', 'N8N', 'DIFY');

-- CreateEnum
CREATE TYPE "WaTipoIntegracao" AS ENUM ('BAILEYS', 'META_CLOUD');

-- AlterTable
ALTER TABLE "wa_instancias" ADD COLUMN     "metaAccessToken" TEXT,
ADD COLUMN     "metaPhoneNumberId" TEXT,
ADD COLUMN     "metaWabaId" TEXT,
ADD COLUMN     "tipoIntegracao" "WaTipoIntegracao" NOT NULL DEFAULT 'BAILEYS';

-- CreateTable
CREATE TABLE "bot_integracoes" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "instanciaId" TEXT,
    "provedor" "ProvedorBot" NOT NULL DEFAULT 'TYPEBOT',
    "apiUrl" TEXT,
    "flowId" TEXT,
    "apiToken" TEXT,
    "variaveisGlobais" JSONB NOT NULL DEFAULT '{}',
    "triggerKeyword" TEXT,
    "expireTime" INTEGER NOT NULL DEFAULT 20,
    "unknownMessage" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_integracoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bot_integracoes_instanciaId_key" ON "bot_integracoes"("instanciaId");

-- CreateIndex
CREATE INDEX "bot_integracoes_clinicaId_idx" ON "bot_integracoes"("clinicaId");

-- CreateIndex
CREATE INDEX "wa_instancias_tipoIntegracao_idx" ON "wa_instancias"("tipoIntegracao");

-- AddForeignKey
ALTER TABLE "bot_integracoes" ADD CONSTRAINT "bot_integracoes_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_integracoes" ADD CONSTRAINT "bot_integracoes_instanciaId_fkey" FOREIGN KEY ("instanciaId") REFERENCES "wa_instancias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
