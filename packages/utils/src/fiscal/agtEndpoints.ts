export type AgtEnv = 'sandbox' | 'production';

export type AgtEndpointName =
  | 'solicitarSerie'
  | 'listarSeries'
  | 'registarFactura'
  | 'obterEstado'
  | 'consultarFactura'
  | 'listarFacturas'
  | 'validarDocumento';

export function getAgtOrigin(env: AgtEnv): string {
  return env === 'sandbox'
    ? 'https://sifphml.minfin.gov.ao'
    : 'https://sifp.minfin.gov.ao';
}

/**
 * Resolve o path completo do endpoint conforme a documentação AGT (DS.120).
 *
 * Nota: em Homologação, `solicitarSerie` e `listarFacturas` usam `/sigt/fe/ws/v1/`.
 * Fonte: documentação AGT oficial.
 */
export function getAgtEndpointPath(env: AgtEnv, endpoint: AgtEndpointName): string {
  if (env === 'sandbox' && (endpoint === 'solicitarSerie' || endpoint === 'listarFacturas')) {
    return `/sigt/fe/ws/v1/${endpoint}`;
  }
  return `/sigt/fe/v1/${endpoint}`;
}

export function getAgtEndpointUrl(env: AgtEnv, endpoint: AgtEndpointName): string {
  return `${getAgtOrigin(env)}${getAgtEndpointPath(env, endpoint)}`;
}

