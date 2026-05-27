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
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const server_1 = require("../../server");
const prisma_1 = require("../../lib/prisma");
const factories_1 = require("../helpers/factories");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const api = (0, supertest_1.default)(server_1.app);
(0, vitest_1.describe)('SuperAdmin Lifecycle', () => {
    let superAdminToken;
    let superAdmin;
    (0, vitest_1.beforeAll)(async () => {
        // Garantir que a seed de flags existe
        await prisma_1.prisma.featureFlag.upsert({
            where: { codigo: 'whatsapp_bot' },
            create: { codigo: 'whatsapp_bot', descricao: 'Bot', activoPara: 'PRO', activo: true },
            update: {}
        });
        // Criar S.A. bypass MFA
        const email = 'test_superadmin@clinicaplus.test.ao';
        const found = await prisma_1.prisma.utilizador.findFirst({ where: { email, papel: 'SUPER_ADMIN' } });
        if (!found) {
            superAdmin = await prisma_1.prisma.utilizador.create({
                data: {
                    email,
                    nome: 'Super Admin Teste',
                    papel: 'SUPER_ADMIN',
                    passwordHash: '$2a$10$wE.I2K85LXYk8S6J6/nEou6zYdK/P16n2mI78/g.d0sM2T4y2V0eK', // TestPassword123!
                    ativo: true,
                    mfaActivatedAt: new Date()
                }
            });
        }
        else {
            superAdmin = found;
        }
        const { authService } = await Promise.resolve().then(() => __importStar(require('../../services/auth.service')));
        // Emita token forçado - cast necessário pois o S.A. teste não tem relações de médico/paciente
        const tokens = await authService._issueTokens(superAdmin, { expiresIn: '4h' });
        superAdminToken = tokens.accessToken;
    });
    (0, vitest_1.afterAll)(async () => {
        if (superAdmin) {
            await prisma_1.prisma.utilizador.delete({ where: { id: superAdmin.id } }).catch(() => { });
        }
    });
    (0, vitest_1.describe)('SuperAdmin — Suspensões', () => {
        (0, vitest_1.it)('suspender clínica sem motivo retorna 400', async () => {
            const clinica = await factories_1.factories.createClinica();
            const res = await api.patch(`/api/superadmin/clinicas/${clinica.id}/suspender`)
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({}); // sem motivo
            (0, vitest_1.expect)(res.status).toBe(400);
            await factories_1.factories.cleanupClinica(clinica.id);
        });
    });
    (0, vitest_1.describe)('SuperAdmin — Impersonation', () => {
        (0, vitest_1.it)('criar sessão de impersonation', async () => {
            const clinica = await factories_1.factories.createClinica();
            const admin = await factories_1.factories.createAdmin(clinica.id);
            const res = await api.post('/api/superadmin/impersonar')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({ clinicaId: clinica.id, adminId: admin.id, motivo: 'Diagnóstico de erro reportado pelo cliente' });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.data.token).toBeDefined();
            (0, vitest_1.expect)(res.body.data.expiresAt).toBeDefined();
            // Verificar se a sessão existe
            const session = await prisma_1.prisma.impersonationSession.findFirst({
                where: { targetAdminId: admin.id }
            });
            (0, vitest_1.expect)(session).toBeTruthy();
            (0, vitest_1.expect)(session?.motivo).toBe('Diagnóstico de erro reportado pelo cliente');
            await prisma_1.prisma.impersonationSession.deleteMany({ where: { targetAdminId: admin.id } });
            await factories_1.factories.cleanupClinica(clinica.id);
        });
        (0, vitest_1.it)('token de impersonation expira após 30min', async () => {
            const clinica = await factories_1.factories.createClinica();
            const admin = await factories_1.factories.createAdmin(clinica.id);
            const res = await api.post('/api/superadmin/impersonar')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({ clinicaId: clinica.id, adminId: admin.id, motivo: 'TTL Teste' });
            const token = res.body.data.token;
            const decoded = jsonwebtoken_1.default.decode(token);
            const ttlMin = (decoded.exp - decoded.iat) / 60;
            (0, vitest_1.expect)(ttlMin).toBeCloseTo(30, 0);
            await prisma_1.prisma.impersonationSession.deleteMany({ where: { targetAdminId: admin.id } });
            await factories_1.factories.cleanupClinica(clinica.id);
        });
        (0, vitest_1.it)('impersonar admin de outra clínica falha', async () => {
            const clinicaA = await factories_1.factories.createClinica();
            const clinicaB = await factories_1.factories.createClinica();
            const adminB = await factories_1.factories.createAdmin(clinicaB.id);
            const res = await api.post('/api/superadmin/impersonar')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({ clinicaId: clinicaA.id, adminId: adminB.id, motivo: 'Teste de segurança' });
            (0, vitest_1.expect)(res.status).toBe(404); // adminB não pertence a clinicaA
            await factories_1.factories.cleanupClinica(clinicaA.id);
            await factories_1.factories.cleanupClinica(clinicaB.id);
        });
    });
    (0, vitest_1.describe)('SuperAdmin — Observabilidade', () => {
        (0, vitest_1.it)('score VERMELHO com 10+ erros nas últimas 24h', async () => {
            const clinica = await factories_1.factories.createClinica();
            // Criar 10 eventos de erro na db de "API_ERROR"
            await prisma_1.prisma.sistemaEvento.createMany({
                data: Array.from({ length: 10 }).map(() => ({
                    clinicaId: clinica.id,
                    tipo: 'API_ERROR',
                    severidade: 'ERROR',
                    mensagem: 'test error'
                }))
            });
            const res = await api.get('/api/superadmin/observabilidade/saude')
                .set('Authorization', `Bearer ${superAdminToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            const dataItems = res.body.data || res.body.items || res.body;
            // array can be mapped based on response config, adapt below
            const itemsList = Array.isArray(dataItems) ? dataItems : dataItems.items;
            const clinicaScore = itemsList.find((c) => c.clinicaId === clinica.id);
            (0, vitest_1.expect)(clinicaScore?.score).toBe('VERMELHO');
            await prisma_1.prisma.sistemaEvento.deleteMany({ where: { clinicaId: clinica.id } });
            await factories_1.factories.cleanupClinica(clinica.id);
        });
    });
});
