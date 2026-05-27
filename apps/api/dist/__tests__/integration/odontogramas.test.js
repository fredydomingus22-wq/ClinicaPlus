"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const request_1 = require("../helpers/request");
const factories_1 = require("../helpers/factories");
const types_1 = require("@clinicaplus/types");
const request = (0, request_1.createTestApp)();
(0, vitest_1.describe)('/api/odontogramas', () => {
    let ctx;
    let agendamentoId;
    (0, vitest_1.beforeAll)(async () => {
        ctx = await factories_1.factories.setupClinicaCompleta();
        const resAg = await request
            .post('/api/agendamentos')
            .set('Authorization', `Bearer ${ctx.adminToken}`)
            .send({
            pacienteId: ctx.paciente.id,
            medicoId: ctx.medico.id,
            dataHora: new Date(Date.now() + 86400000).toISOString(),
            duracao: 30,
            observacoes: 'Consulta odontograma test',
        });
        agendamentoId = resAg.body.data?.id ?? resAg.body.id;
    });
    (0, vitest_1.afterAll)(async () => {
        await factories_1.factories.cleanupClinica(ctx.clinica.id);
    });
    (0, vitest_1.it)('deve criar e obter odontograma por agendamento com marcação de cárie', async () => {
        const marcacoes = [
            { numeroDente: 16, face: types_1.DenteFace.O, status: types_1.DenteStatus.CARIE, observacao: 'Oclusal' },
        ];
        const createRes = await request
            .post('/api/odontogramas')
            .set('Authorization', `Bearer ${ctx.medicoToken}`)
            .send({
            agendamentoId,
            pacienteId: ctx.paciente.id,
            medicoId: ctx.medico.id,
            marcacoes,
        });
        (0, vitest_1.expect)(createRes.status).toBe(201);
        (0, vitest_1.expect)(createRes.body.marcacoes).toEqual(marcacoes);
        const getRes = await request
            .get(`/api/odontogramas/agendamento/${agendamentoId}`)
            .set('Authorization', `Bearer ${ctx.medicoToken}`);
        (0, vitest_1.expect)(getRes.status).toBe(200);
        (0, vitest_1.expect)(getRes.body.marcacoes[0].numeroDente).toBe(16);
        (0, vitest_1.expect)(getRes.body.marcacoes[0].status).toBe(types_1.DenteStatus.CARIE);
    });
    (0, vitest_1.it)('deve actualizar marcações via PATCH', async () => {
        const getRes = await request
            .get(`/api/odontogramas/agendamento/${agendamentoId}`)
            .set('Authorization', `Bearer ${ctx.medicoToken}`);
        const id = getRes.body.id;
        const marcacoes = [
            { numeroDente: 16, face: types_1.DenteFace.O, status: types_1.DenteStatus.TRATADO },
            { numeroDente: 11, face: types_1.DenteFace.G, status: types_1.DenteStatus.FRATURA },
        ];
        const patchRes = await request
            .patch(`/api/odontogramas/${id}`)
            .set('Authorization', `Bearer ${ctx.medicoToken}`)
            .send({ marcacoes });
        (0, vitest_1.expect)(patchRes.status).toBe(200);
        (0, vitest_1.expect)(patchRes.body.marcacoes).toHaveLength(2);
    });
});
