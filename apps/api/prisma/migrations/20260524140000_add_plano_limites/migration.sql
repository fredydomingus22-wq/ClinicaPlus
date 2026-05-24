-- Cria tabela plano_limites com limites por plano
-- Necessária para verificar limites de recursos por plano (BASICO, PRO, ENTERPRISE)

CREATE TABLE IF NOT EXISTS "plano_limites" (
    "plano" TEXT NOT NULL PRIMARY KEY,
    "maxMedicos" INTEGER NOT NULL,
    "maxConsultasMes" INTEGER NOT NULL,
    "maxPacientes" INTEGER NOT NULL,
    "apiKeyPermitido" BOOLEAN NOT NULL DEFAULT false,
    "maxApiKeys" INTEGER NOT NULL DEFAULT 0,
    "webhookPermitido" BOOLEAN NOT NULL DEFAULT false,
    "maxWebhooks" INTEGER NOT NULL DEFAULT 0,
    "relatoriosHist" BOOLEAN NOT NULL DEFAULT false,
    "exportPermitido" BOOLEAN NOT NULL DEFAULT false
);

-- Inserir dados iniciais para os três planos
INSERT INTO "plano_limites" ("plano", "maxMedicos", "maxConsultasMes", "maxPacientes", "apiKeyPermitido", "maxApiKeys", "webhookPermitido", "maxWebhooks", "relatoriosHist", "exportPermitido")
VALUES
    ('BASICO', 2, 100, 500, false, 0, false, 0, false, false),
    ('PRO', 10, -1, -1, true, 3, true, 5, true, true),
    ('ENTERPRISE', -1, -1, -1, true, -1, true, -1, true, true)
ON CONFLICT ("plano") DO NOTHING;
