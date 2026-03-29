import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed inicial de Feature Flags — migration_009_superadmin
 * Geridas pelo Super Admin via /superadmin/sistema/feature-flags
 */
export async function seedFeatureFlags(): Promise<void> {
  await prisma.featureFlag.createMany({
    data: [
      {
        codigo: 'whatsapp_bot',
        descricao: 'Bot WhatsApp (clinicaplus-intel) — marcações automáticas via WhatsApp',
        activoPara: 'PRO',
        clinicaIds: [],
        activo: true,
      },
      {
        codigo: 'ia_noshow',
        descricao: 'Predictor de no-show com ML — alerta antecipado de faltas',
        activoPara: 'PRO',
        clinicaIds: [],
        activo: false,
      },
      {
        codigo: 'relatorios_avancados',
        descricao: 'Relatórios PRO — histórico ilimitado, export CSV, análise por médico',
        activoPara: 'PRO',
        clinicaIds: [],
        activo: true,
      },
      {
        codigo: 'temas_whitelabel',
        descricao: 'Temas e branding personalizado (white-label) por clínica',
        activoPara: 'ENTERPRISE',
        clinicaIds: [],
        activo: false,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Feature flags seeded');
}
