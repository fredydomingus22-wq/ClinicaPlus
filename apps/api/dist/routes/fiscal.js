"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SaftController_1 = require("../controllers/fiscal/SaftController");
const FiscalController_1 = require("../controllers/fiscal/FiscalController");
const authenticate_1 = require("../middleware/authenticate");
const tenant_1 = require("../middleware/tenant");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
// Todas as rotas fiscais requerem autenticação e contexto de clínica
router.use(authenticate_1.authenticate);
router.use(tenant_1.tenantMiddleware);
/**
 * @route GET /api/fiscal/stats
 * @desc Retorna estatísticas de submissão à AGT
 */
router.get('/stats', async (req, res) => {
    const clinicaId = req.clinica.id;
    const [total, entregues, pendentes, erro] = await Promise.all([
        prisma_1.prisma.fatura.count({ where: { clinicaId, estado: { in: ['EMITIDA', 'PAGA'] } } }),
        prisma_1.prisma.fatura.count({ where: { clinicaId, statusEnvio: 'ENTREGUE' } }),
        prisma_1.prisma.fatura.count({ where: { clinicaId, statusEnvio: 'PENDENTE' } }),
        prisma_1.prisma.fatura.count({ where: { clinicaId, statusEnvio: 'ERRO' } }),
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
router.get('/saft', SaftController_1.saftController.export);
/**
 * @route POST /api/fiscal/testar-conexao
 * @desc Verifica se as credenciais da AGT são válidas
 */
router.post('/testar-conexao', FiscalController_1.fiscalController.testarConexao);
/**
 * @route GET /api/fiscal/audit/hash-chain
 * @desc Valida a integridade da sequência de faturas
 */
router.get('/audit/hash-chain', FiscalController_1.fiscalController.auditHashChain);
/**
 * @route GET /api/fiscal/series
 * @desc Lista as séries de facturação registadas na AGT
 */
router.get('/series', FiscalController_1.fiscalController.listarSeriesAgt);
/**
 * @route POST /api/fiscal/series/solicitar
 * @desc Solicita uma nova série de facturação à AGT
 */
router.post('/series/solicitar', FiscalController_1.fiscalController.solicitarSerieAgt);
/**
 * @route POST /api/fiscal/submissao/estado
 * @desc Consulta estado assíncrono de submissão AGT por requestID
 */
router.post('/submissao/estado', FiscalController_1.fiscalController.consultarEstadoSubmissaoAgt);
/**
 * @route POST /api/fiscal/listar-facturas-agt
 * @desc Lista facturas registadas no servidor da AGT
 */
router.post('/listar-facturas-agt', FiscalController_1.fiscalController.listarFacturasAgt);
/**
 * @route GET /api/fiscal/consultar-factura-agt/:numero
 * @desc Consulta detalhes de uma factura específica na AGT
 */
router.get('/consultar-factura-agt/:numero', FiscalController_1.fiscalController.consultarFacturaAgt);
router.post('/consultar-factura-agt', FiscalController_1.fiscalController.consultarFacturaAgt);
/**
 * @route POST /api/fiscal/validar-documento-agt/:faturaId
 * @desc Valida um documento local contra a AGT
 */
router.post('/validar-documento-agt/:faturaId', FiscalController_1.fiscalController.validarDocumentoAgt);
exports.default = router;
