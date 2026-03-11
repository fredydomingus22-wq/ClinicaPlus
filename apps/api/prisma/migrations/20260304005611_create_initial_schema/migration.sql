-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('PACIENTE', 'RECEPCIONISTA', 'MEDICO', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "Plano" AS ENUM ('BASICO', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "EstadoAgendamento" AS ENUM ('PENDENTE', 'CONFIRMADO', 'EM_PROGRESSO', 'CONCLUIDO', 'CANCELADO', 'NAO_COMPARECEU');

-- CreateEnum
CREATE TYPE "TipoAgendamento" AS ENUM ('CONSULTA', 'EXAME', 'RETORNO');

-- CreateTable
CREATE TABLE "clinicas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "telefone" TEXT,
    "email" TEXT NOT NULL,
    "endereco" TEXT,
    "cidade" TEXT,
    "provincia" TEXT,
    "plano" "Plano" NOT NULL DEFAULT 'BASICO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utilizadores" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "papel" "Papel" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utilizadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "utilizadorId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pacientes" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "numeroPaciente" TEXT NOT NULL,
    "utilizadorId" TEXT,
    "nome" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "genero" TEXT NOT NULL,
    "tipoSangue" TEXT,
    "alergias" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "telefone" TEXT,
    "email" TEXT,
    "endereco" TEXT,
    "provincia" TEXT,
    "seguroSaude" BOOLEAN NOT NULL DEFAULT false,
    "seguradora" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pacientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicos" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "utilizadorId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "especialidade" TEXT NOT NULL,
    "ordem" TEXT,
    "telefoneDireto" TEXT,
    "horario" JSONB NOT NULL,
    "duracaoConsulta" INTEGER NOT NULL DEFAULT 30,
    "preco" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamentos" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "duracao" INTEGER NOT NULL DEFAULT 30,
    "tipo" "TipoAgendamento" NOT NULL DEFAULT 'CONSULTA',
    "estado" "EstadoAgendamento" NOT NULL DEFAULT 'PENDENTE',
    "motivoConsulta" TEXT,
    "observacoes" TEXT,
    "triagem" JSONB,
    "notasConsulta" TEXT,
    "diagnostico" TEXT,
    "canceladoPor" TEXT,
    "canceladoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receitas" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "diagnostico" TEXT NOT NULL,
    "medicamentos" JSONB NOT NULL,
    "observacoes" TEXT,
    "dataEmissao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataValidade" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receitas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lembretes_agendamento" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "agendadoPara" TIMESTAMP(3) NOT NULL,
    "enviadoEm" TIMESTAMP(3),
    "sucesso" BOOLEAN,
    "erro" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lembretes_agendamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes_clinica" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "lembrete24h" BOOLEAN NOT NULL DEFAULT true,
    "lembrete2h" BOOLEAN NOT NULL DEFAULT true,
    "horasAntecedencia" INTEGER NOT NULL DEFAULT 24,
    "moedaSimbolo" TEXT NOT NULL DEFAULT 'Kz',
    "fusoHorario" TEXT NOT NULL DEFAULT 'Africa/Luanda',
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_clinica_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinicas_slug_key" ON "clinicas"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "clinicas_email_key" ON "clinicas"("email");

-- CreateIndex
CREATE INDEX "clinicas_slug_idx" ON "clinicas"("slug");

-- CreateIndex
CREATE INDEX "utilizadores_clinicaId_idx" ON "utilizadores"("clinicaId");

-- CreateIndex
CREATE INDEX "utilizadores_clinicaId_papel_idx" ON "utilizadores"("clinicaId", "papel");

-- CreateIndex
CREATE UNIQUE INDEX "utilizadores_clinicaId_email_key" ON "utilizadores"("clinicaId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_utilizadorId_idx" ON "refresh_tokens"("utilizadorId");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_utilizadorId_key" ON "pacientes"("utilizadorId");

-- CreateIndex
CREATE INDEX "pacientes_clinicaId_idx" ON "pacientes"("clinicaId");

-- CreateIndex
CREATE INDEX "pacientes_clinicaId_nome_idx" ON "pacientes"("clinicaId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_clinicaId_numeroPaciente_key" ON "pacientes"("clinicaId", "numeroPaciente");

-- CreateIndex
CREATE UNIQUE INDEX "medicos_utilizadorId_key" ON "medicos"("utilizadorId");

-- CreateIndex
CREATE INDEX "medicos_clinicaId_idx" ON "medicos"("clinicaId");

-- CreateIndex
CREATE INDEX "medicos_clinicaId_especialidade_idx" ON "medicos"("clinicaId", "especialidade");

-- CreateIndex
CREATE INDEX "agendamentos_clinicaId_idx" ON "agendamentos"("clinicaId");

-- CreateIndex
CREATE INDEX "agendamentos_clinicaId_dataHora_idx" ON "agendamentos"("clinicaId", "dataHora");

-- CreateIndex
CREATE INDEX "agendamentos_clinicaId_medicoId_dataHora_idx" ON "agendamentos"("clinicaId", "medicoId", "dataHora");

-- CreateIndex
CREATE INDEX "agendamentos_clinicaId_pacienteId_idx" ON "agendamentos"("clinicaId", "pacienteId");

-- CreateIndex
CREATE INDEX "agendamentos_clinicaId_estado_idx" ON "agendamentos"("clinicaId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "receitas_agendamentoId_key" ON "receitas"("agendamentoId");

-- CreateIndex
CREATE INDEX "receitas_clinicaId_idx" ON "receitas"("clinicaId");

-- CreateIndex
CREATE INDEX "receitas_clinicaId_pacienteId_idx" ON "receitas"("clinicaId", "pacienteId");

-- CreateIndex
CREATE INDEX "lembretes_agendamento_clinicaId_idx" ON "lembretes_agendamento"("clinicaId");

-- CreateIndex
CREATE INDEX "lembretes_agendamento_agendadoPara_enviadoEm_idx" ON "lembretes_agendamento"("agendadoPara", "enviadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_clinica_clinicaId_key" ON "configuracoes_clinica"("clinicaId");

-- AddForeignKey
ALTER TABLE "utilizadores" ADD CONSTRAINT "utilizadores_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_utilizadorId_fkey" FOREIGN KEY ("utilizadorId") REFERENCES "utilizadores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_utilizadorId_fkey" FOREIGN KEY ("utilizadorId") REFERENCES "utilizadores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicos" ADD CONSTRAINT "medicos_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicos" ADD CONSTRAINT "medicos_utilizadorId_fkey" FOREIGN KEY ("utilizadorId") REFERENCES "utilizadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receitas" ADD CONSTRAINT "receitas_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receitas" ADD CONSTRAINT "receitas_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "agendamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receitas" ADD CONSTRAINT "receitas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receitas" ADD CONSTRAINT "receitas_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lembretes_agendamento" ADD CONSTRAINT "lembretes_agendamento_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lembretes_agendamento" ADD CONSTRAINT "lembretes_agendamento_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "agendamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracoes_clinica" ADD CONSTRAINT "configuracoes_clinica_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
