import type { AgtEnv } from './agtEndpoints';
/**
 * Fonte única para resolver o ambiente AGT.
 *
 * Ordem de precedência:
 * 1) `AGT_ENV` (sandbox|production)
 * 2) `AGT_SANDBOX=true`
 * 3) `NODE_ENV=production` => production, caso contrário sandbox
 */
export declare function resolveAgtEnvFromProcessEnv(env?: NodeJS.ProcessEnv): AgtEnv;
export declare function formatAgtEnvLabel(env: AgtEnv): 'SANDBOX' | 'PRODUÇÃO';
//# sourceMappingURL=agtEnv.d.ts.map