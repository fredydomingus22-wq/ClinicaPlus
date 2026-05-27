"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const request_1 = require("../helpers/request");
const factories_1 = require("../helpers/factories");
const prisma_1 = require("../../lib/prisma");
(0, vitest_1.describe)('Receptionist Notifications Integration', () => {
    const app = (0, request_1.createTestApp)();
    let ctx;
    (0, vitest_1.beforeAll)(async () => {
        ctx = await factories_1.factories.setupClinicaCompleta();
    }, 120000);
    (0, vitest_1.afterAll)(async () => {
        if (ctx?.clinica?.id) {
            await factories_1.factories.cleanupClinica(ctx.clinica.id);
        }
    });
    (0, vitest_1.it)('notifies receptionist and doctor when new appointment is created', async () => {
        const dataHoraValue = new Date();
        dataHoraValue.setHours(dataHoraValue.getHours() + 25); // Tomorrow
        const res = await app.post('/api/agendamentos')
            .set((0, request_1.authHeader)(ctx.adminToken))
            .send({
            pacienteId: ctx.paciente.id,
            medicoId: ctx.medico.id,
            dataHora: dataHoraValue.toISOString(),
            tipo: 'CONSULTA',
            motivoConsulta: 'Teste Notificacoes',
            estado: 'CONFIRMADO'
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        // Wait for fire-and-forget notifications
        await new Promise(resolve => setTimeout(resolve, 5000));
        // 1. Check if notification for Receptionist exists
        const notificacoesRecep = await prisma_1.prisma.notificacao.findMany({
            where: {
                utilizadorId: ctx.recepcaoUser.id,
                titulo: { contains: 'Novo Agendamento' }
            }
        });
        (0, vitest_1.expect)(notificacoesRecep.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(notificacoesRecep[0]?.mensagem).toContain(ctx.paciente.nome);
        // 2. Check if notification for Doctor exists
        const notificacoesMedico = await prisma_1.prisma.notificacao.findMany({
            where: {
                utilizadorId: ctx.medicoUser.id,
                titulo: { contains: 'Novo Agendamento' }
            }
        });
        (0, vitest_1.expect)(notificacoesMedico.length).toBeGreaterThan(0);
        // 3. Check if LembreteAgendamento was created in DB
        const lembretes = await prisma_1.prisma.lembreteAgendamento.findMany({
            where: { agendamentoId: res.body.data.id }
        });
        // At least one (24h or 2h) should be created depending on config (defaults to both true)
        (0, vitest_1.expect)(lembretes.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('notifies receptionist when appointment is confirmed', async () => {
        // Create a pending appointment
        const createRes = await app.post('/api/agendamentos')
            .set((0, request_1.authHeader)(ctx.adminToken))
            .send({
            pacienteId: ctx.paciente.id,
            medicoId: ctx.medico.id,
            dataHora: new Date(Date.now() + 86400000).toISOString(),
            tipo: 'CONSULTA'
        });
        const agId = createRes.body.data.id;
        // Update to CONFIRMADO
        const res = await app.patch(`/api/agendamentos/${agId}/estado`)
            .set((0, request_1.authHeader)(ctx.adminToken))
            .send({ estado: 'CONFIRMADO' });
        (0, vitest_1.expect)(res.status).toBe(200);
        // Wait for fire-and-forget notifications
        await new Promise(resolve => setTimeout(resolve, 5000));
        // Check notification for Receptionist
        const notificacoes = await prisma_1.prisma.notificacao.findMany({
            where: {
                utilizadorId: ctx.recepcaoUser.id,
                titulo: { contains: 'Agendamento Confirmado' }
            }
        });
        (0, vitest_1.expect)(notificacoes.length).toBeGreaterThan(0);
    });
});
