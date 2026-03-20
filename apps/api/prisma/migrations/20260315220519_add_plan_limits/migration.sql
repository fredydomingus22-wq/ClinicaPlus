-- CreateTable
CREATE TABLE "plano_limites" (
    "plano" "Plano" NOT NULL,
    "maxMedicos" INTEGER NOT NULL,
    "maxConsultasMes" INTEGER NOT NULL,
    "maxPacientes" INTEGER NOT NULL,
    "apiKeyPermitido" BOOLEAN NOT NULL DEFAULT false,
    "maxApiKeys" INTEGER NOT NULL DEFAULT 0,
    "webhookPermitido" BOOLEAN NOT NULL DEFAULT false,
    "maxWebhooks" INTEGER NOT NULL DEFAULT 0,
    "relatoriosHist" BOOLEAN NOT NULL DEFAULT false,
    "exportPermitido" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "plano_limites_pkey" PRIMARY KEY ("plano")
);
