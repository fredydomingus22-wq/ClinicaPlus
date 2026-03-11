-- DropIndex
DROP INDEX "notificacoes_utilizadorId_idx";

-- CreateTable
CREATE TABLE "contactos_clinica" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "descricao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contactos_clinica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_logs" (
    "id" TEXT NOT NULL,
    "nivel" TEXT NOT NULL DEFAULT 'INFO',
    "mensagem" TEXT NOT NULL,
    "acao" TEXT,
    "utilizadorId" TEXT,
    "detalhes" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_settings" (
    "id" TEXT NOT NULL DEFAULT 'global_settings',
    "modoManutencao" BOOLEAN NOT NULL DEFAULT false,
    "registoNovasClinicas" BOOLEAN NOT NULL DEFAULT true,
    "maxUploadSizeMb" INTEGER NOT NULL DEFAULT 5,
    "mensagemSistema" TEXT,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contactos_clinica_clinicaId_idx" ON "contactos_clinica"("clinicaId");

-- CreateIndex
CREATE INDEX "system_logs_nivel_idx" ON "system_logs"("nivel");

-- CreateIndex
CREATE INDEX "system_logs_acao_idx" ON "system_logs"("acao");

-- AddForeignKey
ALTER TABLE "contactos_clinica" ADD CONSTRAINT "contactos_clinica_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_utilizadorId_fkey" FOREIGN KEY ("utilizadorId") REFERENCES "utilizadores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
