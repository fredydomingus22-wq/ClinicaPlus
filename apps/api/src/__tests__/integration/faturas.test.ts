import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server';
import { EstadoFatura, TipoFatura, MetodoPagamento } from '@prisma/client';
import { factories } from '../helpers/factories';

describe('Faturas & Pagamentos API', () => {
  let ctx: Awaited<ReturnType<typeof factories.setupClinicaCompleta>>;

  beforeAll(async () => {
    ctx = await factories.setupClinicaCompleta();
  });

  afterAll(async () => {
    if (ctx) {
      // apagar as faturas/pagamentos criadas pelo teste antes de apagar a clinica
      await factories.cleanupClinica(ctx.clinica.id);
    }
  });

  let faturaId: string;

  it('1. POST /api/faturas -> deve criar uma fatura em RASCUNHO com itens', async () => {
    const payload = {
      pacienteId: ctx.paciente.id,
      tipo: TipoFatura.PARTICULAR,
      desconto: 500,
      itens: [
        { descricao: 'Consulta', quantidade: 1, precoUnit: 10000, desconto: 0 },
        { descricao: 'Exame', quantidade: 2, precoUnit: 5000, desconto: 1000 },
      ],
    };

    const res = await request(app)
      .post('/api/faturas')
      .set('Authorization', `Bearer ${ctx.adminToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.estado).toBe(EstadoFatura.RASCUNHO);
    expect(res.body.data.numeroFatura).toMatch(/^F-\d{4}-\d{5}$/);
    
    // Subtotal = (1*10000) + (2*5000 - 1000) = 10000 + 9000 = 19000
    // Total final = Subtotal (19000) - Desconto Fatura (500) = 18500
    expect(res.body.data.subtotal).toBe(19000);
    expect(res.body.data.total).toBe(18500);

    faturaId = res.body.data.id;
  });

  it('2. PATCH /api/faturas/:id/emitir -> deve emitir a fatura', async () => {
    const res = await request(app)
      .patch(`/api/faturas/${faturaId}/emitir`)
      .set('Authorization', `Bearer ${ctx.adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.estado).toBe(EstadoFatura.EMITIDA);
    expect(res.body.data.dataEmissao).toBeDefined();
  });

  it('3. POST /api/faturas/:id/pagamentos -> pagamento parcial', async () => {
    const payload = {
      metodo: MetodoPagamento.TPA,
      valor: 8500,
      referencia: 'TPA-123',
    };

    const res = await request(app)
      .post(`/api/faturas/${faturaId}/pagamentos`)
      .set('Authorization', `Bearer ${ctx.adminToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.valor).toBe(8500);

    // Fatura ainda deve estar EMITIDA
    const faturaRes = await request(app)
      .get(`/api/faturas/${faturaId}`)
      .set('Authorization', `Bearer ${ctx.adminToken}`);
    expect(faturaRes.body.data.estado).toBe(EstadoFatura.EMITIDA);
  });

  it('4. POST /api/faturas/:id/pagamentos -> pagamento total muda estado para PAGA', async () => {
    const payload = {
      metodo: MetodoPagamento.DINHEIRO,
      valor: 10000, // Total = 18500, pago 8500, faltam 10000
    };

    const res = await request(app)
      .post(`/api/faturas/${faturaId}/pagamentos`)
      .set('Authorization', `Bearer ${ctx.adminToken}`)
      .send(payload);

    expect(res.status).toBe(201);

    // Fatura deve ter mudado automaticamente para PAGA
    const faturaRes = await request(app)
      .get(`/api/faturas/${faturaId}`)
      .set('Authorization', `Bearer ${ctx.adminToken}`);
    
    expect(faturaRes.body.data.estado).toBe(EstadoFatura.PAGA);
  });

  it('5. PATCH /api/faturas/:id/anular -> deve falhar sem motivo', async () => {
    const res = await request(app)
      .patch(`/api/faturas/${faturaId}/anular`)
      .set('Authorization', `Bearer ${ctx.adminToken}`)
      .send({}); // sem motivo

    expect(res.status).toBe(400); // Bad Request (Zod validation)
  });

  it('6. PATCH /api/faturas/:id/anular -> deve anular com sucesso', async () => {
    const res = await request(app)
      .patch(`/api/faturas/${faturaId}/anular`)
      .set('Authorization', `Bearer ${ctx.adminToken}`)
      .send({ motivo: 'Erro na facturação' });

    expect(res.status).toBe(200);
    expect(res.body.data.estado).toBe(EstadoFatura.ANULADA);
  });
});
