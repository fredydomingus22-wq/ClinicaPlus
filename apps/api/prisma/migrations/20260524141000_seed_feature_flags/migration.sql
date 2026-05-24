-- Seed inicial de Feature Flags
-- Geridas pelo Super Admin via /superadmin/sistema/feature-flags

INSERT INTO "feature_flags" ("id", "codigo", "descricao", "activoPara", "clinicaIds", "activo", "atualizadoEm")
VALUES
  (gen_random_uuid(), 'whatsapp_bot', 'Bot WhatsApp (clinicaplus-intel) — marcações automáticas via WhatsApp', 'PRO', ARRAY[]::TEXT[], true, NOW()),
  (gen_random_uuid(), 'ia_noshow', 'Predictor de no-show com ML — alerta antecipado de faltas', 'PRO', ARRAY[]::TEXT[], false, NOW()),
  (gen_random_uuid(), 'relatorios_avancados', 'Relatórios PRO — histórico ilimitado, export CSV, análise por médico', 'PRO', ARRAY[]::TEXT[], true, NOW()),
  (gen_random_uuid(), 'temas_whitelabel', 'Temas e branding personalizado (white-label) por clínica', 'ENTERPRISE', ARRAY[]::TEXT[], false, NOW())
ON CONFLICT ("codigo") DO NOTHING;
