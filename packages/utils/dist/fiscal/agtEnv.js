"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAgtEnvFromProcessEnv = resolveAgtEnvFromProcessEnv;
exports.formatAgtEnvLabel = formatAgtEnvLabel;
/**
 * Fonte única para resolver o ambiente AGT.
 *
 * Ordem de precedência:
 * 1) `AGT_ENV` (sandbox|production)
 * 2) `AGT_SANDBOX=true`
 * 3) `NODE_ENV=production` => production, caso contrário sandbox
 */
function resolveAgtEnvFromProcessEnv(env = process.env) {
    const direct = env.AGT_ENV;
    if (direct === 'sandbox' || direct === 'production')
        return direct;
    const sandboxFlag = String(env.AGT_SANDBOX).toLowerCase() === 'true';
    if (sandboxFlag)
        return 'sandbox';
    return env.NODE_ENV === 'production' ? 'production' : 'sandbox';
}
function formatAgtEnvLabel(env) {
    return env === 'production' ? 'PRODUÇÃO' : 'SANDBOX';
}
//# sourceMappingURL=agtEnv.js.map