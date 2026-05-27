"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAgtTenantKeys = resolveAgtTenantKeys;
/**
 * Helper partilhado (API/worker) para desencriptar chaves AGT do tenant.
 *
 * Nota: a normalização (\n, aspas, trim) é feita dentro do CertificationService.
 * Aqui apenas resolvemos "valor encriptado -> valor em claro" de forma consistente.
 */
function resolveAgtTenantKeys(source, decryptSecret) {
    const result = {};
    if (source.agtPrivateKey)
        result.tenantPrivateKey = decryptSecret(source.agtPrivateKey);
    if (source.agtPublicKey)
        result.tenantPublicKey = decryptSecret(source.agtPublicKey);
    return result;
}
//# sourceMappingURL=agtKeys.js.map