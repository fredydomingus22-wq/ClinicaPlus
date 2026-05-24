-- Remove credenciais por clínica (AGT) — decisão: credenciais globais via env (Basic Auth)
-- Fonte de verdade: documentação AGT + skill agt-faturacao-electronica (autenticação Basic Auth global do produtor).

ALTER TABLE "clinicas" DROP COLUMN IF EXISTS "agtApiToken";

