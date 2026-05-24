import type { AgtEnv } from './agtEndpoints';

/**
 * Fonte única para resolver o ambiente AGT.
 *
 * Ordem de precedência:
 * 1) `AGT_ENV` (sandbox|production)
 * 2) `AGT_SANDBOX=true`
 * 3) `NODE_ENV=production` => production, caso contrário sandbox
 */
export function resolveAgtEnvFromProcessEnv(env: NodeJS.ProcessEnv = process.env): AgtEnv {
  const direct = env.AGT_ENV;
  if (direct === 'sandbox' || direct === 'production') return direct;

  const sandboxFlag = String(env.AGT_SANDBOX).toLowerCase() === 'true';
  if (sandboxFlag) return 'sandbox';

  return env.NODE_ENV === 'production' ? 'production' : 'sandbox';
}

export function formatAgtEnvLabel(env: AgtEnv): 'SANDBOX' | 'PRODUÇÃO' {
  return env === 'production' ? 'PRODUÇÃO' : 'SANDBOX';
}

