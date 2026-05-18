import { Router } from 'express';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { config } from '../lib/config';

const router = Router();

// Middleware para proteger o webhook com secret do Typebot
router.use((req, res, next) => {
  const token = req.headers['x-typebot-secret'];
  if (!token || token !== config.JWT_SECRET) {
    return next(new AppError('Acesso não autorizado', 401));
  }
  next();
});

// Middleware para resolver a Instância Múltipla e Atribuir a Clínica
router.use(async (req, res, next) => {
  try {
    const evolutionInstance = req.body?.evolutionInstance || req.query?.evolutionInstance;
    
    if (!evolutionInstance) {
      throw new AppError('Instance name não fornecida', 400);
    }

    const instancia = await prisma.waInstancia.findFirst({
      where: { evolutionName: String(evolutionInstance) }
    });

    if (!instancia) {
      throw new AppError('Instância não encontrada ou desvinculada', 404);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req.clinica = { id: instancia.clinicaId } as any;
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/typebot/especialidades
 * Devolve a lista de especialidades da Clínica para o Typebot construir botões dinâmicos.
 */
router.get('/especialidades', async (req, res, next) => {
  try {
    const especialidades = await prisma.especialidade.findMany({
      where: { clinicaId: req.clinica.id },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' }
    });
    // O Typebot lida melhor com arrays limpos ou objectos standard
    res.status(200).json({ success: true, data: especialidades });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/typebot/medicos
 * Requer ?especialidadeId=...
 */
router.get('/medicos', async (req, res, next) => {
  try {
    const clinicaId = req.clinica.id;
    const { especialidadeId } = req.query;

    const medicos = await prisma.medico.findMany({
      where: { 
        clinicaId, 
        ativo: true,
        ...(especialidadeId && { especialidadeId: String(especialidadeId) }) 
      },
      select: {
        id: true,
        utilizador: {
          select: { nome: true }
        },
        especialidadeId: true
      }
    });

    const list = medicos.map(m => ({
      id: m.id,
      nome: m.utilizador?.nome || 'Médico',
      especialidadeId: m.especialidadeId
    }));

    res.status(200).json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/typebot/horarios
 * Requer ?medicoId=... & ?data=YYYY-MM-DD
 * (Mock inicial para o bot não rebentar enquanto integramos com o calendário)
 */
router.get('/horarios', async (req, res, next) => {
  try {
    // Retorna horários fictícios / disponíveis padronizados para o Typebot escolher
    res.status(200).json({ 
      success: true, 
      data: [
        { id: 'h1', slot: '09:00' },
        { id: 'h2', slot: '10:00' },
        { id: 'h3', slot: '11:00' },
        { id: 'h4', slot: '14:00' },
        { id: 'h5', slot: '16:00' }
      ]
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/typebot/agendamento
 * Recebe o payload do Typebot para concluir a operação de Agendamento
 */
router.post('/agendamento', async (req, res, next) => {
  try {
    const clinicaId = req.clinica.id;
    const payload = req.body;
    
    logger.info({ clinicaId, payload }, 'Received Typebot agendamento finalization');
    
    // Opcional: invocar o AgendamentoService.create(payload) aqui.
    res.status(200).json({ success: true, message: "Webhook Agendamento processado com sucesso" });
  } catch (err) {
    next(err);
  }
});

export default router;
