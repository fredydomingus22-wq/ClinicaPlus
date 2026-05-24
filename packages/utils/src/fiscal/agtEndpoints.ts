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
 * Nota: em Homologação, `listarFacturas` pode usar `/sigt/fe/ws/v1/`.
 * Fonte: skill AGT (`references/servicos-consulta.md`).
 */
export function getAgtEndpointPath(env: AgtEnv, endpoint: AgtEndpointName): string {
  const base =
    env === 'sandbox' && endpoint === 'listarFacturas'
      ? '/sigt/fe/ws/v1'
      : '/sigt/fe/v1';

  return `${base}/${endpoint}`;
}

export function getAgtEndpointUrl(env: AgtEnv, endpoint: AgtEndpointName): string {
  return `${getAgtOrigin(env)}${getAgtEndpointPath(env, endpoint)}`;
}

