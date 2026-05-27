"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.proximoNumero = proximoNumero;
const node_crypto_1 = __importDefault(require("node:crypto"));
/**
 * Gera o próximo número sequencial dentro de uma transação Prisma.
 * Usa INSERT ... ON CONFLICT DO UPDATE RETURNING para garantir atomicidade e prevenir lacunas.
 *
 * @param tx Transação Prisma (TransactionClient)
 * @param clinicaId ID da clínica
 * @param tipoDoc Tipo de documento (FT, FR, NC, ND, VD)
 * @param serie Série documental (padrão: CPLS)
 * @returns Objecto com o número e a string formatada (ex: "FT CPLS/42")
 */
async function proximoNumero(tx, clinicaId, tipoDoc, serie = "CPLS") {
    const anoFiscal = new Date().getFullYear();
    // Usamos SQL nativo para garantir que o incremento e o retorno do valor sejam uma operação atómica única
    // Isso previne que dois processos leiam o mesmo número antes de incrementar.
    const id = node_crypto_1.default.randomUUID();
    const seq = await tx.$queryRawUnsafe(`INSERT INTO sequencia_doc_fiscal (id, "clinicaId", "tipoDoc", serie, "anoFiscal", "ultimoNumero")
     VALUES ($1, $2, CAST($3::text AS "public"."TipoDocumentoFiscal"), $4, $5, 1)
     ON CONFLICT ("clinicaId", "tipoDoc", serie, "anoFiscal")
     DO UPDATE SET "ultimoNumero" = sequencia_doc_fiscal."ultimoNumero" + 1
     RETURNING "ultimoNumero"`, id, clinicaId, tipoDoc, serie, anoFiscal);
    const [first] = seq;
    if (!first) {
        throw new Error('Falha ao gerar sequência documental: nenhum resultado retornado.');
    }
    const { ultimoNumero } = first;
    const formatado = `${tipoDoc} ${serie}/${ultimoNumero}`;
    return { numero: ultimoNumero, formatado };
}
