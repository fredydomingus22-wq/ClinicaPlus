"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.factories = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const faker_1 = require("@faker-js/faker");
const prisma = new client_1.PrismaClient();
const HASH = bcryptjs_1.default.hashSync('TestPassword123!', 10); // pre-hashed for speed
exports.factories = {
    async createClinica(overrides = {}) {
        return prisma.clinica.create({
            data: {
                nome: faker_1.faker.company.name(),
                slug: faker_1.faker.internet.domainWord() + '-' + Date.now(),
                email: faker_1.faker.internet.email(),
                provincia: 'Luanda',
                plano: 'PRO',
                ...overrides,
            },
        });
    },
    async createAdmin(clinicaId, overrides = {}) {
        return prisma.utilizador.create({
            data: {
                clinicaId,
                nome: faker_1.faker.person.fullName(),
                email: faker_1.faker.internet.email(),
                passwordHash: HASH,
                papel: 'ADMIN',
                ...overrides,
            },
        });
    },
    async createMedico(clinicaId, overrides = {}) {
        const user = await exports.factories.createAdmin(clinicaId, { papel: 'MEDICO', ...overrides });
        // Create a default specialty for the doctor
        const especialidade = await prisma.especialidade.create({
            data: {
                clinicaId,
                nome: 'Clínica Geral',
                ativo: true
            }
        });
        const medico = await prisma.medico.create({
            data: {
                clinicaId,
                utilizadorId: user.id,
                nome: user.nome,
                especialidadeId: especialidade.id,
                duracaoConsulta: 30,
                preco: 3000,
                horario: {
                    segunda: { ativo: true, inicio: '08:00', fim: '17:00' },
                    terca: { ativo: true, inicio: '08:00', fim: '17:00' },
                    quarta: { ativo: true, inicio: '08:00', fim: '17:00' },
                    quinta: { ativo: true, inicio: '08:00', fim: '17:00' },
                    sexta: { ativo: true, inicio: '08:00', fim: '13:00' },
                    sabado: { ativo: false },
                    domingo: { ativo: false },
                },
            },
            include: { especialidade: true }
        });
        return { user, medico };
    },
    async createPaciente(clinicaId, overrides = {}) {
        const numero = `P-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
        return prisma.paciente.create({
            data: {
                clinicaId,
                numeroPaciente: numero,
                nome: faker_1.faker.person.fullName(),
                dataNascimento: faker_1.faker.date.birthdate({ min: 18, max: 80, mode: 'age' }),
                genero: 'M',
                alergias: [],
                ...overrides,
            },
        });
    },
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    async setupClinicaCompleta() {
        // Seed basic permissions needed for tests
        await exports.factories.seedPermissions();
        const clinica = await exports.factories.createClinica({
            nif: '5417234567',
            razaoSocial: 'Clinica Teste SAC',
            enderecoPostal: 'Rua Direta do Sambizanga, Luanda, Angola',
            cidade: 'Luanda',
            provincia: 'Luanda',
            serieDocFiscal: 'TEST',
            // Para testes de compliance fiscal (hash chain / assinaturas), usamos as chaves
            // do ambiente quando presentes (não encriptadas nos fixtures).
            agtPrivateKey: process.env.AGT_PRIVATE_KEY ?? null,
            agtPublicKey: process.env.AGT_PUBLIC_KEY ?? null,
        });
        const admin = await exports.factories.createAdmin(clinica.id);
        const { user: medicoUser, medico } = await exports.factories.createMedico(clinica.id);
        const paciente = await exports.factories.createPaciente(clinica.id, {
            nif: '999999999',
            endereco: 'Luanda, Angola'
        });
        // Generate auth tokens
        const { authService } = await Promise.resolve().then(() => __importStar(require('../../services/auth.service')));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { accessToken } = await authService._issueTokens(admin);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { accessToken: medicoToken } = await authService._issueTokens(medicoUser);
        // Also create a Paciente user token for role-guard testing
        const pacienteUser = await prisma.utilizador.create({
            data: {
                clinicaId: clinica.id,
                nome: paciente.nome,
                email: faker_1.faker.internet.email(),
                passwordHash: HASH,
                papel: 'PACIENTE',
            }
        });
        // Link patient to user manually since factory didn't do it
        await prisma.paciente.update({
            where: { id: paciente.id },
            data: { utilizadorId: pacienteUser.id }
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { accessToken: pacienteToken } = await authService._issueTokens(pacienteUser);
        // Also create a REPCIONISTA user token for role-guard testing
        const recepcaoUser = await prisma.utilizador.create({
            data: {
                clinicaId: clinica.id,
                nome: 'Rececao Clinica',
                email: faker_1.faker.internet.email(),
                passwordHash: HASH,
                papel: 'RECEPCIONISTA',
            }
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { accessToken: recepcaoToken } = await authService._issueTokens(recepcaoUser);
        // Create default clinic config
        await prisma.configuracaoClinica.create({
            data: {
                clinicaId: clinica.id,
                lembrete24h: true,
                lembrete2h: true,
                horasAntecedencia: 24,
                moedaSimbolo: 'Kz',
                fusoHorario: 'Africa/Luanda',
                nif: '5417234567',
                seguradoras: ["ENSA", "AAA Seguros"]
            }
        });
        return {
            clinica,
            admin,
            adminToken: accessToken,
            medicoUser,
            medicoToken,
            medico,
            pacienteUser,
            pacienteToken,
            paciente,
            recepcaoUser,
            recepcaoToken
        };
    },
    async seedPermissions() {
        const perms = [
            { codigo: 'fatura:void', descricao: 'Anular faturas', modulo: 'financeiro' },
            { codigo: 'relatorio:export', descricao: 'Exportar relatórios', modulo: 'financeiro' },
            { codigo: 'paciente:delete', descricao: 'Eliminar pacientes', modulo: 'pacientes' },
            { codigo: 'apikey:manage', descricao: 'Gerir API Keys', modulo: 'plataforma' },
            { codigo: 'webhook:manage', descricao: 'Gerir Webhooks', modulo: 'plataforma' },
        ];
        for (const p of perms) {
            const dbPerm = await prisma.permissao.upsert({
                where: { codigo: p.codigo },
                create: p,
                update: {},
            });
            // Atribuir ao ADMIN por padrão nos testes
            await prisma.rolePermissao.upsert({
                where: { papel_permissaoId: { papel: 'ADMIN', permissaoId: dbPerm.id } },
                create: { papel: 'ADMIN', permissaoId: dbPerm.id },
                update: {},
            });
        }
    },
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    createExameData(pacienteId, agendamentoId, medicoId) {
        return {
            pacienteId,
            agendamentoId,
            medicoId,
            tipo: 'FISICO',
            nome: 'Exame Físico',
            dataRealizacao: new Date(),
            status: 'REALIZADO',
            notas: faker_1.faker.lorem.paragraph(),
        };
    },
    async cleanupClinica(clinicaId) {
        try {
            // Delete in dependency order
            await prisma.receita.deleteMany({ where: { clinicaId } }).catch(() => { });
            await prisma.prontuario.deleteMany({ where: { clinicaId } }).catch(() => { });
            await prisma.exame.deleteMany({ where: { clinicaId } }).catch(() => { });
            await prisma.documento.deleteMany({ where: { clinicaId } }).catch(() => { });
            await prisma.lembreteAgendamento.deleteMany({ where: { clinicaId } }).catch(() => { });
            await prisma.agendamento.deleteMany({ where: { clinicaId } }).catch(() => { });
            await prisma.paciente.deleteMany({ where: { clinicaId } }).catch(() => { });
            await prisma.medico.deleteMany({ where: { clinicaId } }).catch(() => { });
            await prisma.especialidade.deleteMany({ where: { clinicaId } }).catch(() => { });
            await prisma.fatura.deleteMany({ where: { clinicaId } }).catch(() => { });
            await prisma.subscricao.deleteMany({ where: { clinicaId } }).catch(() => { });
            await prisma.configuracaoClinica.deleteMany({ where: { clinicaId } }).catch(() => { });
            // Clean up users and tokens
            await prisma.refreshToken.deleteMany({ where: { utilizador: { clinicaId } } }).catch(() => { });
            await prisma.utilizador.deleteMany({ where: { clinicaId } }).catch(() => { });
            await prisma.clinica.delete({ where: { id: clinicaId } }).catch(() => { });
        }
        catch {
            // Ignore cleanup errors
        }
    },
};
