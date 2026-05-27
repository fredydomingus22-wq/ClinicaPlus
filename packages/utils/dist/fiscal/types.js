"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgtError = void 0;
/**
 * Erros específicos da comunicação com a AGT
 */
class AgtError extends Error {
    constructor(message, code, agtCode) {
        super(message);
        this.name = 'AgtError';
        this.code = code;
        this.agtCode = agtCode;
    }
    /**
     * Mapeia códigos de erro da AGT para mensagens amigáveis em PT-AO
     */
    static fromStatus(status, agtCode) {
        switch (status) {
            case 400:
                if (agtCode === 'E93')
                    return new AgtError('Documento não reconhecido pela AGT. Verifique os dados.', 400, 'E93');
                return new AgtError('Erro na estrutura do pedido enviado à AGT.', 400);
            case 422:
                return new AgtError('Configuração Inválida: O NIF do certificado não corresponde ao NIF da clínica (E94).', 422, 'E94');
            case 429:
                return new AgtError('Muitas solicitações seguidas. Aguarde alguns segundos antes de tentar novamente (E98).', 429, 'E98');
            default:
                return new AgtError('Ocorreu um erro inesperado na comunicação com a AGT.', status);
        }
    }
}
exports.AgtError = AgtError;
//# sourceMappingURL=types.js.map