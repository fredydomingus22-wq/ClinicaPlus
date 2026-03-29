import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server'; 
import { prisma } from '../../lib/prisma';
import { factories } from '../helpers/factories';
import jwt from 'jsonwebtoken';

const api = request(app);

describe('SuperAdmin Lifecycle', () => {

  let superAdminToken: string;
  let superAdmin: { id: string; papel: string } | null;

  beforeAll(async () => {
    // Garantir que a seed de flags existe
    await prisma.featureFlag.upsert({
      where: { codigo: 'whatsapp_bot' },
      create: { codigo: 'whatsapp_bot', descricao: 'Bot', activoPara: 'PRO', activo: true },
      update: {}
    });

    // Criar S.A. bypass MFA
    const email = 'test_superadmin@clinicaplus.test.ao';
    const found = await prisma.utilizador.findFirst({ where: { email, papel: 'SUPER_ADMIN' } });
    
    if (!found) {
      superAdmin = await prisma.utilizador.create({
        data: {
          email,
          nome: 'Super Admin Teste',
          papel: 'SUPER_ADMIN',
          passwordHash: '$2a$10$wE.I2K85LXYk8S6J6/nEou6zYdK/P16n2mI78/g.d0sM2T4y2V0eK', // TestPassword123!
          ativo: true,
          mfaActivatedAt: new Date()
        }
      });
    } else {
      superAdmin = found;
    }

    const { authService } = await import('../../services/auth.service');
    // Emita token forçado - cast necessário pois o S.A. teste não tem relações de médico/paciente
    const tokens = await authService._issueTokens(superAdmin as never, { expiresIn: '4h' });
    superAdminToken = tokens.accessToken;
  });

  afterAll(async () => {
    if (superAdmin) {
      await prisma.utilizador.delete({ where: { id: superAdmin.id } }).catch(() => {});
    }
  });

  describe('SuperAdmin — Suspensões', () => {
    it('suspender clínica sem motivo retorna 400', async () => {
      const clinica = await factories.createClinica();
      const res = await api.patch(`/api/superadmin/clinicas/${clinica.id}/suspender`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({});  // sem motivo
      
      expect(res.status).toBe(400);
      await factories.cleanupClinica(clinica.id);
    });
  });

  describe('SuperAdmin — Impersonation', () => {
    it('criar sessão de impersonation', async () => {
      const clinica = await factories.createClinica();
      const admin = await factories.createAdmin(clinica.id);
      
      const res = await api.post('/api/superadmin/impersonar')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ clinicaId: clinica.id, adminId: admin.id, motivo: 'Diagnóstico de erro reportado pelo cliente' });
      
      expect(res.status).toBe(201);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.expiresAt).toBeDefined();
      
      // Verificar se a sessão existe
      const session = await prisma.impersonationSession.findFirst({
        where: { targetAdminId: admin.id }
      });
      expect(session).toBeTruthy();
      expect(session?.motivo).toBe('Diagnóstico de erro reportado pelo cliente');

      await prisma.impersonationSession.deleteMany({ where: { targetAdminId: admin.id } });
      await factories.cleanupClinica(clinica.id);
    });

    it('token de impersonation expira após 30min', async () => {
      const clinica = await factories.createClinica();
      const admin = await factories.createAdmin(clinica.id);
      
      const res = await api.post('/api/superadmin/impersonar')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ clinicaId: clinica.id, adminId: admin.id, motivo: 'TTL Teste' });

      const token = res.body.data.token;
      const decoded = jwt.decode(token) as { exp: number; iat: number };
      const ttlMin = (decoded.exp - decoded.iat) / 60;
      
      expect(ttlMin).toBeCloseTo(30, 0);

      await prisma.impersonationSession.deleteMany({ where: { targetAdminId: admin.id } });
      await factories.cleanupClinica(clinica.id);
    });

    it('impersonar admin de outra clínica falha', async () => {
      const clinicaA = await factories.createClinica();
      const clinicaB = await factories.createClinica();
      const adminB = await factories.createAdmin(clinicaB.id);
      
      const res = await api.post('/api/superadmin/impersonar')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ clinicaId: clinicaA.id, adminId: adminB.id, motivo: 'Teste de segurança' });
      
      expect(res.status).toBe(404); // adminB não pertence a clinicaA

      await factories.cleanupClinica(clinicaA.id);
      await factories.cleanupClinica(clinicaB.id);
    });
  });

  describe('SuperAdmin — Observabilidade', () => {
    it('score VERMELHO com 10+ erros nas últimas 24h', async () => {
      const clinica = await factories.createClinica();

      // Criar 10 eventos de erro na db de "API_ERROR"
      await prisma.sistemaEvento.createMany({
        data: Array.from({ length: 10 }).map(() => ({
          clinicaId: clinica.id,
          tipo: 'API_ERROR',
          severidade: 'ERROR',
          mensagem: 'test error'
        }))
      });

      const res = await api.get('/api/superadmin/observabilidade/saude')
        .set('Authorization', `Bearer ${superAdminToken}`);
      
      expect(res.status).toBe(200);
      const dataItems = res.body.data || res.body.items || res.body; 
      // array can be mapped based on response config, adapt below
      const itemsList = Array.isArray(dataItems) ? dataItems : dataItems.items;
      const clinicaScore = itemsList.find((c: { clinicaId: string; score: string }) => c.clinicaId === clinica.id);
      
      expect(clinicaScore?.score).toBe('VERMELHO');

      await prisma.sistemaEvento.deleteMany({ where: { clinicaId: clinica.id } });
      await factories.cleanupClinica(clinica.id);
    });
  });

});
