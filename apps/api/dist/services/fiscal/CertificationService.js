"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificationService = void 0;
const server_1 = require("@clinicaplus/utils/server");
class CertificationService extends server_1.CertificationService {
    constructor(keys) {
        super(keys);
    }
    verificarAssinatura(params) {
        if (super.verificarAssinatura(params))
            return true;
        if (!process.env.AGT_PUBLIC_KEY)
            return false;
        const fallback = new server_1.CertificationService({
            tenantPublicKey: process.env.AGT_PUBLIC_KEY,
        });
        return fallback.verificarAssinatura(params);
    }
    /**
     * Obtém o hash do documento anterior na mesma série para construir a cadeia.
     * Requer transação activa para garantir precisão atómica.
     *
     * @param clinicaId ID da Clínica
     * @param serieDocFiscal Série (ex: CPLS)
     * @param tipoDocFiscal Tipo (ex: FT, NC)
     * @param tx Objeto PrismaTransaction proxy
     * @returns O hash do documento anterior ou string vazia se for o primeiro
     */
    async obterHashAnterior(clinicaId, serieDocFiscal, tipoDocFiscal, tx) {
        const lastDoc = await tx.fatura.findFirst({
            where: {
                clinicaId,
                serieDocFiscal,
                tipoDocFiscal,
                estado: { not: 'RASCUNHO' }
            },
            orderBy: {
                numeroFatura: 'desc'
            },
            select: {
                fiscalHash: true
            }
        });
        return lastDoc?.fiscalHash || '';
    }
    /**
     * Obtém o hash do recibo (RC) anterior.
     */
    async obterHashAnteriorRecibo(clinicaId, serieDocFiscal, tx) {
        const lastRC = await tx.pagamento.findFirst({
            where: {
                clinicaId,
                fatura: { serieDocFiscal },
                numeroRecibo: { not: null }
            },
            orderBy: {
                numeroRecibo: 'desc'
            },
            select: {
                fiscalHash: true
            }
        });
        return lastRC?.fiscalHash || '';
    }
}
exports.CertificationService = CertificationService;
