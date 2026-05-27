"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agtApiClient = exports.AgtApiClient = void 0;
const server_1 = require("@clinicaplus/utils/server");
const logger_1 = require("../../lib/logger");
/**
 * Cliente da API AGT para a aplicação API.
 * Usa Basic Auth com credenciais do produtor de software (variáveis de ambiente).
 */
class AgtApiClient extends server_1.AgtApiClient {
    constructor() {
        const env = (0, server_1.resolveAgtEnvFromProcessEnv)();
        const isMock = process.env.AGT_MOCK === 'true' || process.env.NODE_ENV === 'test';
        super({ env, logger: logger_1.logger, isMock });
    }
    /**
     * Retorna a string de autenticação Basic Auth no formato 'user:pass'.
     * A classe base converte automaticamente para Base64.
     * As credenciais são do produtor de software (globais, não por clínica).
     */
    getBasicAuth() {
        return (0, server_1.requireAgtBasicAuthFromEnv)();
    }
}
exports.AgtApiClient = AgtApiClient;
exports.agtApiClient = new AgtApiClient();
