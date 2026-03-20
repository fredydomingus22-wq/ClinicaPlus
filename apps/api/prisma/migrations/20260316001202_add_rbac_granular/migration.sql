/*
  Warnings:

  - Added the required column `url` to the `webhook_entregas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "webhook_entregas" ADD COLUMN     "url" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "webhooks" ADD COLUMN     "sucesso" BOOLEAN,
ADD COLUMN     "ultimoStatus" INTEGER;

-- CreateTable
CREATE TABLE "permissoes" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,

    CONSTRAINT "permissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissoes" (
    "papel" "Papel" NOT NULL,
    "permissaoId" TEXT NOT NULL,

    CONSTRAINT "role_permissoes_pkey" PRIMARY KEY ("papel","permissaoId")
);

-- CreateTable
CREATE TABLE "utilizador_permissoes" (
    "utilizadorId" TEXT NOT NULL,
    "permissaoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "criadoPor" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "utilizador_permissoes_pkey" PRIMARY KEY ("utilizadorId","permissaoId")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT,
    "actorId" TEXT NOT NULL,
    "actorTipo" TEXT NOT NULL,
    "accao" TEXT NOT NULL,
    "recurso" TEXT NOT NULL,
    "recursoId" TEXT,
    "ip" TEXT,
    "antes" JSONB,
    "depois" JSONB,
    "metadata" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permissoes_codigo_key" ON "permissoes"("codigo");

-- CreateIndex
CREATE INDEX "audit_logs_clinicaId_criadoEm_idx" ON "audit_logs"("clinicaId", "criadoEm");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_criadoEm_idx" ON "audit_logs"("actorId", "criadoEm");

-- CreateIndex
CREATE INDEX "audit_logs_recurso_recursoId_idx" ON "audit_logs"("recurso", "recursoId");

-- AddForeignKey
ALTER TABLE "role_permissoes" ADD CONSTRAINT "role_permissoes_permissaoId_fkey" FOREIGN KEY ("permissaoId") REFERENCES "permissoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utilizador_permissoes" ADD CONSTRAINT "utilizador_permissoes_utilizadorId_fkey" FOREIGN KEY ("utilizadorId") REFERENCES "utilizadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utilizador_permissoes" ADD CONSTRAINT "utilizador_permissoes_permissaoId_fkey" FOREIGN KEY ("permissaoId") REFERENCES "permissoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
