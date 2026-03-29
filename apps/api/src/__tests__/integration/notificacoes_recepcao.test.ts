import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, authHeader } from '../helpers/request';
import { factories } from '../helpers/factories';
import { prisma } from '../../lib/prisma';

describe('Receptionist Notifications Integration', () => {
  const app = createTestApp();
  let ctx: Awaited<ReturnType<typeof factories.setupClinicaCompleta>>;

  beforeAll(async () => {
    ctx = await factories.setupClinicaCompleta();
  }, 120000);

  afterAll(async () => {
    if (ctx?.clinica?.id) {
      await factories.cleanupClinica(ctx.clinica.id);
    }
  });

  it('notifies receptionist and doctor when new appointment is created', async () => {
    const dataHoraValue = new Date();
    dataHoraValue.setHours(dataHoraValue.getHours() + 25); // Tomorrow
    
    const res = await app.post('/api/agendamentos')
      .set(authHeader(ctx.adminToken))
      .send({ 
        pacienteId: ctx.paciente.id, 
        medicoId: ctx.medico.id, 
        dataHora: dataHoraValue.toISOString(), 
        tipo: 'CONSULTA', 
        motivoConsulta: 'Teste Notificacoes',
        estado: 'CONFIRMADO' 
      });

    expect(res.status).toBe(201);
    
    // Wait for fire-and-forget notifications
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 1. Check if notification for Receptionist exists
    const notificacoesRecep = await prisma.notificacao.findMany({
      where: {
        utilizadorId: ctx.recepcaoUser!.id,
        titulo: { contains: 'Novo Agendamento' }
      }
    });

    expect(notificacoesRecep.length).toBeGreaterThan(0);
    expect(notificacoesRecep[0]?.mensagem).toContain(ctx.paciente!.nome);

    // 2. Check if notification for Doctor exists
    const notificacoesMedico = await prisma.notificacao.findMany({
      where: {
        utilizadorId: ctx.medicoUser!.id,
        titulo: { contains: 'Novo Agendamento' }
      }
    });

    expect(notificacoesMedico.length).toBeGreaterThan(0);

    // 3. Check if LembreteAgendamento was created in DB
    const lembretes = await prisma.lembreteAgendamento.findMany({
      where: { agendamentoId: res.body.data.id }
    });
    
    // At least one (24h or 2h) should be created depending on config (defaults to both true)
    expect(lembretes.length).toBeGreaterThan(0);
  });

  it('notifies receptionist when appointment is confirmed', async () => {
    // Create a pending appointment
    const createRes = await app.post('/api/agendamentos')
      .set(authHeader(ctx.adminToken))
      .send({ 
        pacienteId: ctx.paciente.id, 
        medicoId: ctx.medico.id, 
        dataHora: new Date(Date.now() + 86400000).toISOString(), 
        tipo: 'CONSULTA' 
      });
    
    const agId = createRes.body.data.id;

    // Update to CONFIRMADO
    const res = await app.patch(`/api/agendamentos/${agId}/estado`)
      .set(authHeader(ctx.adminToken))
      .send({ estado: 'CONFIRMADO' });

    expect(res.status).toBe(200);

    // Wait for fire-and-forget notifications
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check notification for Receptionist
    const notificacoes = await prisma.notificacao.findMany({
      where: {
        utilizadorId: ctx.recepcaoUser!.id,
        titulo: { contains: 'Agendamento Confirmado' }
      }
    });

    expect(notificacoes.length).toBeGreaterThan(0);
  });
});
