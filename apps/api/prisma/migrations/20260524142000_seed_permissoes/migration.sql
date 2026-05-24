-- Seed inicial de Permissões Granulares e Matrix de Papéis
-- Define permissões e mapeia para papéis (RECEPCIONISTA, MEDICO, ADMIN)

-- 1. Inserir Permissões
INSERT INTO "permissoes" ("id", "codigo", "descricao", "modulo")
VALUES
  -- Pacientes
  (gen_random_uuid(), 'paciente:read', 'Ler dados de pacientes', 'pacientes'),
  (gen_random_uuid(), 'paciente:create', 'Criar novos pacientes', 'pacientes'),
  (gen_random_uuid(), 'paciente:update', 'Actualizar pacientes', 'pacientes'),
  (gen_random_uuid(), 'paciente:delete', 'Eliminar pacientes', 'pacientes'),
  
  -- Agendamentos
  (gen_random_uuid(), 'agendamento:read', 'Ver agenda', 'agendamentos'),
  (gen_random_uuid(), 'agendamento:create', 'Marcar consultas', 'agendamentos'),
  (gen_random_uuid(), 'agendamento:update', 'Reagendar consultas', 'agendamentos'),
  (gen_random_uuid(), 'agendamento:cancel', 'Cancelar consultas', 'agendamentos'),
  
  -- Financeiro
  (gen_random_uuid(), 'fatura:read', 'Ver faturas', 'financeiro'),
  (gen_random_uuid(), 'fatura:create', 'Emitir faturas', 'financeiro'),
  (gen_random_uuid(), 'fatura:void', 'Anular faturas', 'financeiro'),
  (gen_random_uuid(), 'pagamento:create', 'Registar pagamentos', 'financeiro'),
  (gen_random_uuid(), 'relatorio:read', 'Ver relatórios financeiros', 'financeiro'),
  (gen_random_uuid(), 'relatorio:export', 'Exportar dados financeiros', 'financeiro'),
  
  -- Médicos
  (gen_random_uuid(), 'medico:read', 'Ver lista de médicos', 'medicos'),
  (gen_random_uuid(), 'medico:create', 'Registar médicos', 'medicos'),
  (gen_random_uuid(), 'medico:update', 'Actualizar dados médicos', 'medicos'),
  (gen_random_uuid(), 'medico:deactivate', 'Desactivar médicos', 'medicos'),
  
  -- Configuração & Utilizadores
  (gen_random_uuid(), 'configuracao:read', 'Ver definições da clínica', 'configuracao'),
  (gen_random_uuid(), 'configuracao:update', 'Alterar definições da clínica', 'configuracao'),
  (gen_random_uuid(), 'utilizador:read', 'Ver utilizadores', 'utilizadores'),
  (gen_random_uuid(), 'utilizador:invite', 'Convidar novos utilizadores', 'utilizadores'),
  (gen_random_uuid(), 'utilizador:deactivate', 'Desactivar utilizadores', 'utilizadores'),
  (gen_random_uuid(), 'utilizador:permissions', 'Gerir permissões granulares', 'utilizadores'),
  
  -- Plataforma
  (gen_random_uuid(), 'apikey:manage', 'Gerir chaves de API', 'plataforma'),
  (gen_random_uuid(), 'webhook:manage', 'Gerir webhooks', 'plataforma'),
  (gen_random_uuid(), 'whatsapp:manage', 'Gerir Bots de WhatsApp (Typebot, N8N)', 'plataforma'),
  (gen_random_uuid(), 'auditlog:read', 'Ver logs de auditoria', 'plataforma'),
  
  -- Tratamentos & Reabilitação
  (gen_random_uuid(), 'tratamento:read', 'Ver planos de tratamento e sessões', 'tratamentos'),
  (gen_random_uuid(), 'tratamento:create', 'Prescrever novos planos de tratamento', 'tratamentos'),
  (gen_random_uuid(), 'sessao:update', 'Registar realização ou falta em sessões', 'tratamentos')
ON CONFLICT ("codigo") DO NOTHING;

-- 2. Mapear Permissões para Papéis (RECEPCIONISTA)
-- Nota: Este script usa subqueries para obter os IDs das permissões recém-criadas
INSERT INTO "role_permissoes" ("papel", "permissaoId")
SELECT 'RECEPCIONISTA', id FROM "permissoes" WHERE codigo IN (
  'paciente:read', 'paciente:create', 'paciente:update',
  'agendamento:read', 'agendamento:create', 'agendamento:update', 'agendamento:cancel',
  'fatura:read', 'fatura:create', 'pagamento:create',
  'medico:read', 'configuracao:read',
  'tratamento:read'
)
ON CONFLICT DO NOTHING;

-- 3. Mapear Permissões para Papéis (MEDICO)
INSERT INTO "role_permissoes" ("papel", "permissaoId")
SELECT 'MEDICO', id FROM "permissoes" WHERE codigo IN (
  'paciente:read',
  'agendamento:read', 'agendamento:create', 'agendamento:update',
  'relatorio:read',
  'medico:read',
  'tratamento:read', 'tratamento:create', 'sessao:update'
)
ON CONFLICT DO NOTHING;

-- 4. Mapear Permissões para Papéis (ADMIN) - Todas as permissões + whatsapp:manage
INSERT INTO "role_permissoes" ("papel", "permissaoId")
SELECT 'ADMIN', id FROM "permissoes"
ON CONFLICT DO NOTHING;
