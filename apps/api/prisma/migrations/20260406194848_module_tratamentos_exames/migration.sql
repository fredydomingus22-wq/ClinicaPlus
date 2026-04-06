/*
  Warnings:

  - The `subscricaoEstado` column on the `clinicas` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `canceladoEm` on the `subscricoes` table. All the data in the column will be lost.
  - You are about to drop the column `dataFim` on the `subscricoes` table. All the data in the column will be lost.
  - The `estado` column on the `subscricoes` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `criadoEm` on the `wa_conversas` table. All the data in the column will be lost.
  - You are about to drop the column `ultimaMensagemEm` on the `wa_conversas` table. All the data in the column will be lost.
  - Made the column `configuracao` on table `wa_automacoes` required. This step will fail if there are existing NULL values in that column.
  - Made the column `evolutionToken` on table `wa_instancias` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "EstadoSubscricao" AS ENUM ('TRIAL', 'ACTIVA', 'GRACE_PERIOD', 'SUSPENSA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoExame" AS ENUM ('PENDENTE', 'AGENDADO', 'REALIZADO', 'LAUDADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoPlano" AS ENUM ('ACTIVO', 'SUSPENSO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoSessao" AS ENUM ('AGENDADO', 'REALIZADO', 'FALTOU', 'CANCELADO');

-- AlterEnum
ALTER TYPE "WaTipoAutomacao" ADD VALUE 'IA_ASSISTANT';

-- DropForeignKey
ALTER TABLE "wa_conversas" DROP CONSTRAINT "wa_conversas_instanciaId_fkey";

-- DropForeignKey
ALTER TABLE "wa_mensagens" DROP CONSTRAINT "wa_mensagens_conversaId_fkey";

-- DropIndex
DROP INDEX "subscricoes_clinicaId_key";

-- DropIndex
DROP INDEX "wa_automacoes_clinicaId_idx";

-- AlterTable
ALTER TABLE "agendamentos" ADD COLUMN     "confirmado_wa" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "clinicas" ADD COLUMN     "motivoSuspensao" TEXT,
ADD COLUMN     "notasInternas" TEXT,
ADD COLUMN     "suspensaEm" TIMESTAMP(3),
DROP COLUMN "subscricaoEstado",
ADD COLUMN     "subscricaoEstado" "EstadoSubscricao" NOT NULL DEFAULT 'TRIAL';

-- AlterTable
ALTER TABLE "configuracoes_clinica" ADD COLUMN     "seguradoras" TEXT[] DEFAULT ARRAY['ENSA', 'AAA Seguros', 'Medicel', 'Codil', 'Nossa Seguros', 'SAS', 'IMPAR']::TEXT[];

-- AlterTable
ALTER TABLE "exames" ADD COLUMN     "dataRealizacao" TIMESTAMP(3),
ADD COLUMN     "descricao" TEXT,
ADD COLUMN     "estado" "EstadoExame" NOT NULL DEFAULT 'PENDENTE',
ADD COLUMN     "laudoNota" TEXT,
ADD COLUMN     "laudoUrl" TEXT,
ADD COLUMN     "tipoExameId" TEXT;

-- AlterTable
ALTER TABLE "pacientes" ADD COLUMN     "perfil_wa" JSONB;

-- AlterTable
ALTER TABLE "subscricoes" DROP COLUMN "canceladoEm",
DROP COLUMN "dataFim",
DROP COLUMN "estado",
ADD COLUMN     "estado" "EstadoSubscricao" NOT NULL DEFAULT 'TRIAL';

-- AlterTable
ALTER TABLE "utilizadores" ADD COLUMN     "mfaActivatedAt" TIMESTAMP(3),
ADD COLUMN     "mfaPending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfaSecret" TEXT;

-- AlterTable
ALTER TABLE "wa_automacoes" ALTER COLUMN "configuracao" SET NOT NULL,
ALTER COLUMN "configuracao" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "wa_conversas" DROP COLUMN "criadoEm",
DROP COLUMN "ultimaMensagemEm",
ADD COLUMN     "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expira_em" TIMESTAMP(3),
ADD COLUMN     "ultima_mensagem_em" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "wa_instancias" ADD COLUMN     "qrExpiresAt" TIMESTAMP(3),
ALTER COLUMN "evolutionToken" SET NOT NULL;

-- CreateTable
CREATE TABLE "subscricao_notificacoes" (
    "id" TEXT NOT NULL,
    "subscricaoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "enviadoEm" TIMESTAMP(3),
    "erro" TEXT,

    CONSTRAINT "subscricao_notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "impersonation_sessions" (
    "id" TEXT NOT NULL,
    "superAdminId" TEXT NOT NULL,
    "targetClinicaId" TEXT NOT NULL,
    "targetAdminId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "terminadaEm" TIMESTAMP(3),
    "ip" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,

    CONSTRAINT "impersonation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sistema_eventos" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT,
    "tipo" TEXT NOT NULL,
    "severidade" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "metadata" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sistema_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "activoPara" TEXT NOT NULL,
    "clinicaIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_tratamento" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "duracaoMin" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_tratamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_exame_clinica" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_exame_clinica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plano_tratamento" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "agendamentoOrigemId" TEXT,
    "medicoId" TEXT NOT NULL,
    "responsavelId" TEXT,
    "tipoId" TEXT NOT NULL,
    "descricao" TEXT,
    "estado" "EstadoPlano" NOT NULL DEFAULT 'ACTIVO',
    "totalSessoes" INTEGER NOT NULL,
    "frequenciaSemana" INTEGER NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFimPrevista" TIMESTAMP(3) NOT NULL,
    "dataFimReal" TIMESTAMP(3),
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plano_tratamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessao_tratamento" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "agendamentoId" TEXT,
    "numeroSessao" INTEGER NOT NULL,
    "estado" "EstadoSessao" NOT NULL DEFAULT 'AGENDADO',
    "dataHora" TIMESTAMP(3) NOT NULL,
    "duracao" INTEGER NOT NULL,
    "notas" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessao_tratamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscricao_notificacoes_subscricaoId_tipo_key" ON "subscricao_notificacoes"("subscricaoId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "impersonation_sessions_token_key" ON "impersonation_sessions"("token");

-- CreateIndex
CREATE INDEX "impersonation_sessions_superAdminId_idx" ON "impersonation_sessions"("superAdminId");

-- CreateIndex
CREATE INDEX "impersonation_sessions_targetClinicaId_idx" ON "impersonation_sessions"("targetClinicaId");

-- CreateIndex
CREATE INDEX "impersonation_sessions_expiresAt_idx" ON "impersonation_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "sistema_eventos_clinicaId_criadoEm_idx" ON "sistema_eventos"("clinicaId", "criadoEm");

-- CreateIndex
CREATE INDEX "sistema_eventos_tipo_severidade_criadoEm_idx" ON "sistema_eventos"("tipo", "severidade", "criadoEm");

-- CreateIndex
CREATE INDEX "sistema_eventos_criadoEm_idx" ON "sistema_eventos"("criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_codigo_key" ON "feature_flags"("codigo");

-- CreateIndex
CREATE INDEX "tipos_tratamento_clinicaId_idx" ON "tipos_tratamento"("clinicaId");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_tratamento_clinicaId_nome_key" ON "tipos_tratamento"("clinicaId", "nome");

-- CreateIndex
CREATE INDEX "tipos_exame_clinica_clinicaId_idx" ON "tipos_exame_clinica"("clinicaId");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_exame_clinica_clinicaId_nome_key" ON "tipos_exame_clinica"("clinicaId", "nome");

-- CreateIndex
CREATE INDEX "plano_tratamento_clinicaId_pacienteId_idx" ON "plano_tratamento"("clinicaId", "pacienteId");

-- CreateIndex
CREATE INDEX "plano_tratamento_clinicaId_estado_idx" ON "plano_tratamento"("clinicaId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "sessao_tratamento_agendamentoId_key" ON "sessao_tratamento"("agendamentoId");

-- CreateIndex
CREATE INDEX "sessao_tratamento_clinicaId_planoId_idx" ON "sessao_tratamento"("clinicaId", "planoId");

-- CreateIndex
CREATE INDEX "sessao_tratamento_clinicaId_dataHora_idx" ON "sessao_tratamento"("clinicaId", "dataHora");

-- CreateIndex
CREATE INDEX "clinicas_suspensaEm_idx" ON "clinicas"("suspensaEm");

-- CreateIndex
CREATE INDEX "exames_clinicaId_estado_idx" ON "exames"("clinicaId", "estado");

-- CreateIndex
CREATE INDEX "subscricoes_clinicaId_estado_idx" ON "subscricoes"("clinicaId", "estado");

-- CreateIndex
CREATE INDEX "subscricoes_clinicaId_criadoEm_idx" ON "subscricoes"("clinicaId", "criadoEm" DESC);

-- CreateIndex
CREATE INDEX "subscricoes_validaAte_idx" ON "subscricoes"("validaAte");

-- CreateIndex
CREATE INDEX "wa_automacoes_waInstanciaId_idx" ON "wa_automacoes"("waInstanciaId");

-- CreateIndex
CREATE INDEX "wa_conversas_ultima_mensagem_em_idx" ON "wa_conversas"("ultima_mensagem_em");

-- AddForeignKey
ALTER TABLE "subscricao_notificacoes" ADD CONSTRAINT "subscricao_notificacoes_subscricaoId_fkey" FOREIGN KEY ("subscricaoId") REFERENCES "subscricoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exames" ADD CONSTRAINT "exames_tipoExameId_fkey" FOREIGN KEY ("tipoExameId") REFERENCES "tipos_exame_clinica"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wa_conversas" ADD CONSTRAINT "wa_conversas_instanciaId_fkey" FOREIGN KEY ("instanciaId") REFERENCES "wa_instancias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wa_mensagens" ADD CONSTRAINT "wa_mensagens_conversaId_fkey" FOREIGN KEY ("conversaId") REFERENCES "wa_conversas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_superAdminId_fkey" FOREIGN KEY ("superAdminId") REFERENCES "utilizadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_targetAdminId_fkey" FOREIGN KEY ("targetAdminId") REFERENCES "utilizadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_targetClinicaId_fkey" FOREIGN KEY ("targetClinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_tratamento" ADD CONSTRAINT "tipos_tratamento_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_exame_clinica" ADD CONSTRAINT "tipos_exame_clinica_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plano_tratamento" ADD CONSTRAINT "plano_tratamento_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plano_tratamento" ADD CONSTRAINT "plano_tratamento_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plano_tratamento" ADD CONSTRAINT "plano_tratamento_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plano_tratamento" ADD CONSTRAINT "plano_tratamento_agendamentoOrigemId_fkey" FOREIGN KEY ("agendamentoOrigemId") REFERENCES "agendamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plano_tratamento" ADD CONSTRAINT "plano_tratamento_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "tipos_tratamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessao_tratamento" ADD CONSTRAINT "sessao_tratamento_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessao_tratamento" ADD CONSTRAINT "sessao_tratamento_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "plano_tratamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessao_tratamento" ADD CONSTRAINT "sessao_tratamento_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "agendamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
