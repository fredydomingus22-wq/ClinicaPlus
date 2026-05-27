export type AgtTenantKeySource = {
    agtPrivateKey?: string | null;
    agtPublicKey?: string | null;
};
/**
 * Helper partilhado (API/worker) para desencriptar chaves AGT do tenant.
 *
 * Nota: a normalização (\n, aspas, trim) é feita dentro do CertificationService.
 * Aqui apenas resolvemos "valor encriptado -> valor em claro" de forma consistente.
 */
export declare function resolveAgtTenantKeys(source: AgtTenantKeySource, decryptSecret: (value: string) => string): {
    tenantPrivateKey?: string;
    tenantPublicKey?: string;
};
//# sourceMappingURL=agtKeys.d.ts.map