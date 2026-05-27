"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapAgtStatusToEnvio = mapAgtStatusToEnvio;
/**
 * Mapeia a resposta de obterEstado para o statusEnvio local.
 */
function mapAgtStatusToEnvio(statusResult) {
    const resultCode = String(statusResult.resultCode);
    if (resultCode === '0') {
        return 'ENTREGUE';
    }
    if (resultCode === '2' || resultCode === '9') {
        return 'ERRO';
    }
    if (resultCode === '1' && statusResult.documentStatusList?.length) {
        const allValid = statusResult.documentStatusList.every((d) => d.documentStatus === 'V');
        return allValid ? 'ENTREGUE' : 'ERRO';
    }
    return 'ENVIADO';
}
//# sourceMappingURL=syncAgtSubmissionStatus.js.map