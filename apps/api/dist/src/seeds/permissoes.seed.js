"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedPermissoes = seedPermissoes;
const client_1 = require("@prisma/client");
const logger_1 = require("../lib/logger");
/**
 * Seed granular permissions and their default mappings to roles.
 */
async function seedPermissoes(prisma) {
    logger_1.logger.info('Seeding permissions matrix...');
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
        { codigo: 'whatsapp:manage', descricao: 'Gerir Bots de WhatsApp (Typebot, N8N)', modulo: 'plataforma' },
        { codigo: 'auditlog:read', descricao: 'Ver logs de auditoria', modulo: 'plataforma' },
        // Tratamentos & Reabilitação
        { codigo: 'tratamento:read', descricao: 'Ver planos de tratamento e sessões', modulo: 'tratamentos' },
        { codigo: 'tratamento:create', descricao: 'Prescrever novos planos de tratamento', modulo: 'tratamentos' },
        { codigo: 'sessao:update', descricao: 'Registar realização ou falta em sessões', modulo: 'tratamentos' },
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
    const matrix = [
        {
            papel: client_1.Papel.RECEPCIONISTA,
            codigos: [
                'paciente:read', 'paciente:create', 'paciente:update',
                'agendamento:read', 'agendamento:create', 'agendamento:update', 'agendamento:cancel',
                'fatura:read', 'fatura:create', 'pagamento:create',
                'medico:read', 'configuracao:read',
                'tratamento:read' // Recepcionista só lê, não prescreve nem marca sessões como feitas
            ],
        },
        {
            papel: client_1.Papel.MEDICO,
            codigos: [
                'paciente:read',
                'agendamento:read', 'agendamento:create', 'agendamento:update',
                'relatorio:read',
                'medico:read',
                'tratamento:read', 'tratamento:create', 'sessao:update' // Médico tem controlo total clínico
            ],
        },
        {
            papel: client_1.Papel.ADMIN,
            codigos: [...permissoes.map(p => p.codigo), 'whatsapp:manage'], // ADMIN has everything by default
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
    logger_1.logger.info(`Permission matrix seeded: ${permissoes.length} permissions processed.`);
}
