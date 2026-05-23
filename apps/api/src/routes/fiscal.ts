import { Router } from 'express';
import { saftController } from '../controllers/fiscal/SaftController';
import { fiscalController } from '../controllers/fiscal/FiscalController';
import { authenticate } from '../middleware/authenticate';
import { tenantMiddleware } from '../middleware/tenant';
import { prisma } from '../lib/prisma';

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

/**
 * @route GET /api/fiscal/series
 * @desc Lista as séries de facturação registadas na AGT
 */
router.get('/series', fiscalController.listarSeriesAgt);

/**
 * @route POST /api/fiscal/series/solicitar
 * @desc Solicita uma nova série de facturação à AGT
 */
router.post('/series/solicitar', fiscalController.solicitarSerieAgt);

/**
 * @route POST /api/fiscal/submissao/estado
 * @desc Consulta estado assíncrono de submissão AGT por requestID
 */
router.post('/submissao/estado', fiscalController.consultarEstadoSubmissaoAgt);

/**
 * @route POST /api/fiscal/listar-facturas-agt
 * @desc Lista facturas registadas no servidor da AGT
 */
router.post('/listar-facturas-agt', fiscalController.listarFacturasAgt);

/**
 * @route GET /api/fiscal/consultar-factura-agt/:numero
 * @desc Consulta detalhes de uma factura específica na AGT
 */
router.get('/consultar-factura-agt/:numero', fiscalController.consultarFacturaAgt);
router.post('/consultar-factura-agt', fiscalController.consultarFacturaAgt);

/**
 * @route POST /api/fiscal/validar-documento-agt/:faturaId
 * @desc Valida um documento local contra a AGT
 */
router.post('/validar-documento-agt/:faturaId', fiscalController.validarDocumentoAgt);

export default router;
