import { Router } from 'express';
import { saftController } from '../controllers/fiscal/SaftController';
import { fiscalController } from '../controllers/fiscal/FiscalController';
import { authenticate } from '../middleware/authenticate';
import { tenantMiddleware } from '../middleware/tenant';
import { prisma } from '../lib/prisma';
import { agtApiClient } from '../services/fiscal/AgtApiClient'; // In case we need it directly

const router = Router();

// Todas as rotas fiscais requerem autenticação e contexto de clínica
router.use(authenticate);
router.use(tenantMiddleware);

/**
 * @route GET /api/fiscal/stats
 * @desc Retorna estatísticas de submissão à AGT
 */
router.get('/stats', async (req, res) => {
  const clinicaId = req.clinica.id;

  const [total, entregues, pendentes, erro] = await Promise.all([
    prisma.fatura.count({ where: { clinicaId, estado: { in: ['EMITIDA', 'PAGA'] } } }),
    prisma.fatura.count({ where: { clinicaId, statusEnvio: 'ENTREGUE' } }),
    prisma.fatura.count({ where: { clinicaId, statusEnvio: 'PENDENTE' } }),
    prisma.fatura.count({ where: { clinicaId, statusEnvio: 'ERRO' } }),
  ]);

  res.json({
    totalFaturas: total,
    faturasEntregues: entregues,
    faturasPendentes: pendentes,
    faturasErro: erro,
  });
});

/**
 * @route GET /api/fiscal/saft
 * @desc Exporta o ficheiro SAF-T AO v1.01_01
 */
router.get('/saft', saftController.export);

/**
 * @route POST /api/fiscal/testar-conexao
 * @desc Verifica se as credenciais da AGT são válidas
 */
router.post('/testar-conexao', fiscalController.testarConexao);

/**
 * @route GET /api/fiscal/audit/hash-chain
 * @desc Valida a integridade da sequência de faturas
 */
router.get('/audit/hash-chain', fiscalController.auditHashChain);

export default router;
