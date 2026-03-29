import { PrismaClient, Papel } from '@prisma/client';
import { logger } from '../lib/logger';

/**
 * Seed granular permissions and their default mappings to roles.
 */
export async function seedPermissoes(prisma: PrismaClient): Promise<void> {
  logger.info('Seeding permissions matrix...');

  const permissoes = [
    // Pacientes
    { codigo: 'paciente:read', descricao: 'Ler dados de pacientes', modulo: 'pacientes' },
    { codigo: 'paciente:create', descricao: 'Criar novos pacientes', modulo: 'pacientes' },
    { codigo: 'paciente:update', descricao: 'Actualizar pacientes', modulo: 'pacientes' },
    { codigo: 'paciente:delete', descricao: 'Eliminar pacientes', modulo: 'pacientes' },

    // Agendamentos
    { codigo: 'agendamento:read', descricao: 'Ver agenda', modulo: 'agendamentos' },
    { codigo: 'agendamento:create', descricao: 'Marcar consultas', modulo: 'agendamentos' },
    { codigo: 'agendamento:update', descricao: 'Reagendar consultas', modulo: 'agendamentos' },
    { codigo: 'agendamento:cancel', descricao: 'Cancelar consultas', modulo: 'agendamentos' },

    // Financeiro
    { codigo: 'fatura:read', descricao: 'Ver faturas', modulo: 'financeiro' },
    { codigo: 'fatura:create', descricao: 'Emitir faturas', modulo: 'financeiro' },
    { codigo: 'fatura:void', descricao: 'Anular faturas', modulo: 'financeiro' },
    { codigo: 'pagamento:create', descricao: 'Registar pagamentos', modulo: 'financeiro' },
    { codigo: 'relatorio:read', descricao: 'Ver relatórios financeiros', modulo: 'financeiro' },
    { codigo: 'relatorio:export', descricao: 'Exportar dados financeiros', modulo: 'financeiro' },

    // Médicos
    { codigo: 'medico:read', descricao: 'Ver lista de médicos', modulo: 'medicos' },
    { codigo: 'medico:create', descricao: 'Registar médicos', modulo: 'medicos' },
    { codigo: 'medico:update', descricao: 'Actualizar dados médicos', modulo: 'medicos' },
    { codigo: 'medico:deactivate', descricao: 'Desactivar médicos', modulo: 'medicos' },

    // Configuração & Utilizadores
    { codigo: 'configuracao:read', descricao: 'Ver definições da clínica', modulo: 'configuracao' },
    { codigo: 'configuracao:update', descricao: 'Alterar definições da clínica', modulo: 'configuracao' },
    { codigo: 'utilizador:read', descricao: 'Ver utilizadores', modulo: 'utilizadores' },
    { codigo: 'utilizador:invite', descricao: 'Convidar novos utilizadores', modulo: 'utilizadores' },
    { codigo: 'utilizador:deactivate', descricao: 'Desactivar utilizadores', modulo: 'utilizadores' },
    { codigo: 'utilizador:permissions', descricao: 'Gerir permissões granulares', modulo: 'utilizadores' },

    // Plataforma
    { codigo: 'apikey:manage', descricao: 'Gerir chaves de API', modulo: 'plataforma' },
    { codigo: 'webhook:manage', descricao: 'Gerir webhooks', modulo: 'plataforma' },
    { codigo: 'auditlog:read', descricao: 'Ver logs de auditoria', modulo: 'plataforma' },
  ];

  // 1. Upsert Permissions
  for (const p of permissoes) {
    await prisma.permissao.upsert({
      where: { codigo: p.codigo },
      create: p,
      update: { descricao: p.descricao, modulo: p.modulo },
    });
  }

  // 2. Define Matrix Mapping
  const matrix: { papel: Papel; codigos: string[] }[] = [
    {
      papel: Papel.RECEPCIONISTA,
      codigos: [
        'paciente:read', 'paciente:create', 'paciente:update',
        'agendamento:read', 'agendamento:create', 'agendamento:update', 'agendamento:cancel',
        'fatura:read', 'fatura:create', 'pagamento:create',
        'medico:read', 'configuracao:read'
      ],
    },
    {
      papel: Papel.MEDICO,
      codigos: [
        'paciente:read',
        'agendamento:read', 'agendamento:create', 'agendamento:update',
        'relatorio:read',
        'medico:read'
      ],
    },
    {
      papel: Papel.ADMIN,
      codigos: permissoes.map(p => p.codigo), // ADMIN has everything by default
    },
  ];

  // 3. Populate RolePermissao
  for (const entry of matrix) {
    for (const codigo of entry.codigos) {
      const permissao = await prisma.permissao.findUniqueOrThrow({ where: { codigo } });
      
      await prisma.rolePermissao.upsert({
        where: {
          papel_permissaoId: {
            papel: entry.papel,
            permissaoId: permissao.id,
          },
        },
        create: {
          papel: entry.papel,
          permissaoId: permissao.id,
        },
        update: {},
      });
    }
  }

  logger.info(`Permission matrix seeded: ${permissoes.length} permissions processed.`);
}
