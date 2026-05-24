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
 * Usa sempre endpoint REST (/sigt/fe/v1/) que aceita JSON.
 * Endpoint SOAP (/sigt/fe/ws/v1/) foi descontinuado em favor de REST.
 */
export function getAgtEndpointPath(env: AgtEnv, endpoint: AgtEndpointName): string {
  return `/sigt/fe/v1/${endpoint}`;
}

export function getAgtEndpointUrl(env: AgtEnv, endpoint: AgtEndpointName): string {
  return `${getAgtOrigin(env)}${getAgtEndpointPath(env, endpoint)}`;
}

