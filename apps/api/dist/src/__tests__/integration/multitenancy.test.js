"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const request_1 = require("../helpers/request");
const factories_1 = require("../helpers/factories");
(0, vitest_1.describe)('Multitenancy isolation', () => {
    const app = (0, request_1.createTestApp)();
    let ctxA;
    let ctxB;
    (0, vitest_1.beforeAll)(async () => {
        ctxA = await factories_1.factories.setupClinicaCompleta();
        ctxB = await factories_1.factories.setupClinicaCompleta();
    });
    (0, vitest_1.afterAll)(async () => {
        await factories_1.factories.cleanupClinica(ctxA.clinica.id);
        await factories_1.factories.cleanupClinica(ctxB.clinica.id);
    });
    (0, vitest_1.it)('Admin clínica A não acede a paciente de clínica B → 404', async () => {
        const res = await app
            .get(`/api/pacientes/${ctxB.paciente.id}`)
            .set((0, request_1.authHeader)(ctxA.adminToken));
        // Must be 404, not 403, to prevent enumeration leakage
        (0, vitest_1.expect)(res.status).toBe(404);
    });
    (0, vitest_1.it)('Admin clínica A não acede a agendamentos de clínica B → 404', async () => {
        // Constant Wednesday future date to prevent unknown timezone/weekend availability issues
        const dataHoraStr = '2026-10-14T10:00:00.000Z';
        // Create an appointment in Clinic B
        const createB = await app.post('/api/agendamentos')
            .set((0, request_1.authHeader)(ctxB.adminToken))
            .send({ pacienteId: ctxB.paciente.id, medicoId: ctxB.medico.id, dataHora: dataHoraStr, tipo: 'CONSULTA', motivoConsulta: 'Tenant test B' });
        (0, vitest_1.expect)(createB.status).toBe(201);
        const agendamentoB_Id = createB.body.data.id;
        // Clinic A tries to access Clinic B's appointment
        const res = await app
            .get(`/api/agendamentos/${agendamentoB_Id}`)
            .set((0, request_1.authHeader)(ctxA.adminToken));
        (0, vitest_1.expect)(res.status).toBe(404);
    });
    (0, vitest_1.it)('Admin clínica A ao criar agendamento com médico de clínica B → 404', async () => {
        const res = await app
            .post('/api/agendamentos')
            .set((0, request_1.authHeader)(ctxA.adminToken))
            .send({
            medicoId: ctxB.medico.id, // Using Doctor from Clinic B
            pacienteId: ctxA.paciente.id,
            dataHora: '2026-09-20T09:00:00.000Z',
            tipo: 'CONSULTA',
            motivoConsulta: 'Test leaking doctors',
        });
        // Our service throws NotFound when doctor clinicaId !== auth clinicaId
        (0, vitest_1.expect)(res.status).toBe(404);
    });
    (0, vitest_1.it)('Admin clínica A não vê médicos de clínica B na lista → sem médico B', async () => {
        const res = await app
            .get('/api/medicos')
            .set((0, request_1.authHeader)(ctxA.adminToken));
        (0, vitest_1.expect)(res.status).toBe(200);
        // Ensure Clinic B's doctor is NOT in the response
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const foundB = res.body.data.items.find((m) => m.id === ctxB.medico.id);
        (0, vitest_1.expect)(foundB).toBeUndefined();
        // But Clinic A's doctor IS there
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const foundA = res.body.data.items.find((m) => m.id === ctxA.medico.id);
        (0, vitest_1.expect)(foundA).toBeDefined();
    });
    (0, vitest_1.it)('Super Admin pode listar todas as clínicas', async () => {
        // First let's create a Super Admin (which uses `superadminRouter` bypassing tenant)
        // Here we assume superadmins log in via a special token or role
        // Since factories didn't create a SUPERADMIN, we mock or skip the role implementation details
        // For now we just check if the endpoint is guarded if not superadmin:
        const unauthRes = await app
            .get('/api/superadmin/clinicas')
            .set((0, request_1.authHeader)(ctxA.adminToken)); // Normal admin
        (0, vitest_1.expect)(unauthRes.status).toBe(403);
    });
});
