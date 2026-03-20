import { PrismaClient, Papel } from '@prisma/client';

const prisma = new PrismaClient();

const permissoes = [
  // Módulo: pacientes
  { codigo: 'paciente:read', descricao: 'Visualizar pacientes', modulo: 'pacientes' },
  { codigo: 'paciente:create', descricao: 'Criar pacientes', modulo: 'pacientes' },
  { codigo: 'paciente:update', descricao: 'Atualizar pacientes', modulo: 'pacientes' },
  { codigo: 'paciente:delete', descricao: 'Eliminar pacientes', modulo: 'pacientes' },

  // Módulo: agendamentos
  { codigo: 'agendamento:read', descricao: 'Visualizar agendamentos', modulo: 'agendamentos' },
  { codigo: 'agendamento:create', descricao: 'Criar agendamentos', modulo: 'agendamentos' },
  { codigo: 'agendamento:update', descricao: 'Atualizar agendamentos', modulo: 'agendamentos' },
  { codigo: 'agendamento:cancel', descricao: 'Cancelar agendamentos', modulo: 'agendamentos' },

  // Módulo: financeiro
  { codigo: 'fatura:read', descricao: 'Visualizar faturas', modulo: 'financeiro' },
  { codigo: 'fatura:create', descricao: 'Criar faturas', modulo: 'financeiro' },
  { codigo: 'fatura:void', descricao: 'Anular faturas', modulo: 'financeiro' },
  { codigo: 'pagamento:create', descricao: 'Registar pagamentos', modulo: 'financeiro' },
  { codigo: 'relatorio:read', descricao: 'Visualizar relatórios', modulo: 'financeiro' },
  { codigo: 'relatorio:export', descricao: 'Exportar relatórios', modulo: 'financeiro' },

  // Módulo: medicos
  { codigo: 'medico:read', descricao: 'Visualizar médicos', modulo: 'medicos' },
  { codigo: 'medico:create', descricao: 'Criar médicos', modulo: 'medicos' },
  { codigo: 'medico:update', descricao: 'Atualizar médicos', modulo: 'medicos' },
  { codigo: 'medico:deactivate', descricao: 'Desativar médicos', modulo: 'medicos' },

  // Módulo: configuracao
  { codigo: 'configuracao:read', descricao: 'Visualizar configurações', modulo: 'configuracao' },
  { codigo: 'configuracao:update', descricao: 'Atualizar configurações', modulo: 'configuracao' },

  // Módulo: utilizadores
  { codigo: 'utilizador:read', descricao: 'Visualizar utilizadores', modulo: 'utilizadores' },
  { codigo: 'utilizador:invite', descricao: 'Convidar utilizadores', modulo: 'utilizadores' },
  { codigo: 'utilizador:deactivate', descricao: 'Desativar utilizadores', modulo: 'utilizadores' },
  { codigo: 'utilizador:permissions', descricao: 'Gerir permissões', modulo: 'utilizadores' },

  // Módulo: plataforma
  { codigo: 'apikey:manage', descricao: 'Gerir API Keys', modulo: 'plataforma' },
  { codigo: 'webhook:manage', descricao: 'Gerir Webhooks', modulo: 'plataforma' },
  { codigo: 'auditlog:read', descricao: 'Visualizar logs de auditoria', modulo: 'plataforma' },
  { codigo: 'whatsapp:manage', descricao: 'Gerir instâncias e automações de WhatsApp', modulo: 'plataforma' },
];

const rolePerms: { papel: Papel; codigo: string }[] = [
  // RECEPCIONISTA
  { papel: 'RECEPCIONISTA', codigo: 'paciente:read' },
  { papel: 'RECEPCIONISTA', codigo: 'paciente:create' },
  { papel: 'RECEPCIONISTA', codigo: 'paciente:update' },
  { papel: 'RECEPCIONISTA', codigo: 'agendamento:read' },
  { papel: 'RECEPCIONISTA', codigo: 'agendamento:create' },
  { papel: 'RECEPCIONISTA', codigo: 'agendamento:update' },
  { papel: 'RECEPCIONISTA', codigo: 'fatura:read' },
  { papel: 'RECEPCIONISTA', codigo: 'fatura:create' },
  { papel: 'RECEPCIONISTA', codigo: 'pagamento:create' },

  // MEDICO
  { papel: 'MEDICO', codigo: 'paciente:read' },
  { papel: 'MEDICO', codigo: 'agendamento:read' },
  { papel: 'MEDICO', codigo: 'relatorio:read' },

  // ADMIN
  { papel: 'ADMIN', codigo: 'paciente:read' },
  { papel: 'ADMIN', codigo: 'paciente:create' },
  { papel: 'ADMIN', codigo: 'paciente:update' },
  { papel: 'ADMIN', codigo: 'paciente:delete' },
  { papel: 'ADMIN', codigo: 'agendamento:read' },
  { papel: 'ADMIN', codigo: 'agendamento:create' },
  { papel: 'ADMIN', codigo: 'agendamento:update' },
  { papel: 'ADMIN', codigo: 'agendamento:cancel' },
  { papel: 'ADMIN', codigo: 'fatura:read' },
  { papel: 'ADMIN', codigo: 'fatura:create' },
  { papel: 'ADMIN', codigo: 'fatura:void' },
  { papel: 'ADMIN', codigo: 'pagamento:create' },
  { papel: 'ADMIN', codigo: 'relatorio:read' },
  { papel: 'ADMIN', codigo: 'relatorio:export' },
  { papel: 'ADMIN', codigo: 'medico:read' },
  { papel: 'ADMIN', codigo: 'medico:create' },
  { papel: 'ADMIN', codigo: 'medico:update' },
  { papel: 'ADMIN', codigo: 'medico:deactivate' },
  { papel: 'ADMIN', codigo: 'configuracao:read' },
  { papel: 'ADMIN', codigo: 'configuracao:update' },
  { papel: 'ADMIN', codigo: 'utilizador:read' },
  { papel: 'ADMIN', codigo: 'utilizador:invite' },
  { papel: 'ADMIN', codigo: 'utilizador:deactivate' },
  { papel: 'ADMIN', codigo: 'utilizador:permissions' },
  { papel: 'ADMIN', codigo: 'apikey:manage' },
  { papel: 'ADMIN', codigo: 'webhook:manage' },
  { papel: 'ADMIN', codigo: 'auditlog:read' },
  { papel: 'ADMIN', codigo: 'whatsapp:manage' },
];

async function main() {
  console.log('🌱 Seed de Permissões iniciado...');

  // 1. Criar Permissões
  for (const p of permissoes) {
    await prisma.permissao.upsert({
      where: { codigo: p.codigo },
      create: p,
      update: { descricao: p.descricao, modulo: p.modulo },
    });
  }

  // 2. Criar RolePermissoes (Matriz Base)
  // Super Admin tem tudo (lógica de bypass no service, mas bom ter no DB)
  const allPermissoes = await prisma.permissao.findMany();
  for (const p of allPermissoes) {
    await prisma.rolePermissao.upsert({
      where: { papel_permissaoId: { papel: 'SUPER_ADMIN', permissaoId: p.id } },
      create: { papel: 'SUPER_ADMIN', permissaoId: p.id },
      update: {},
    });
  }

  for (const rp of rolePerms) {
    const permissao = await prisma.permissao.findUnique({ where: { codigo: rp.codigo } });
    if (!permissao) continue;

    await prisma.rolePermissao.upsert({
      where: { papel_permissaoId: { papel: rp.papel, permissaoId: permissao.id } },
      create: { papel: rp.papel, permissaoId: permissao.id },
      update: {},
    });
  }

  console.log('✅ Seed de Permissões concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
