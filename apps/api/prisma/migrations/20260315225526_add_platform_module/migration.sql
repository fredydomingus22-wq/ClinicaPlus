-- CreateEnum
CREATE TYPE "EscopoApiKey" AS ENUM ('READ_PACIENTES', 'WRITE_PACIENTES', 'READ_AGENDAMENTOS', 'WRITE_AGENDAMENTOS', 'READ_RECEITAS', 'READ_FATURAS', 'WRITE_FATURAS');

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefixo" TEXT NOT NULL,
    "escopos" "EscopoApiKey"[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoUso" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoPor" TEXT NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "eventos" TEXT[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_entregas" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "evento" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "statusHttp" INTEGER,
    "resposta" TEXT,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "sucesso" BOOLEAN NOT NULL DEFAULT false,
    "proximaTent" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluidoEm" TIMESTAMP(3),

    CONSTRAINT "webhook_entregas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_clinicaId_idx" ON "api_keys"("clinicaId");

-- CreateIndex
CREATE INDEX "api_keys_keyHash_idx" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "webhooks_clinicaId_idx" ON "webhooks"("clinicaId");

-- CreateIndex
CREATE INDEX "webhook_entregas_webhookId_idx" ON "webhook_entregas"("webhookId");

-- CreateIndex
CREATE INDEX "webhook_entregas_sucesso_proximaTent_idx" ON "webhook_entregas"("sucesso", "proximaTent");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_entregas" ADD CONSTRAINT "webhook_entregas_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "webhooks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
