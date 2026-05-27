export type AgtEnv = 'sandbox' | 'production';
export type AgtEndpointName = 'solicitarSerie' | 'listarSeries' | 'registarFactura' | 'obterEstado' | 'consultarFactura' | 'listarFacturas' | 'validarDocumento';
export declare function getAgtOrigin(env: AgtEnv): string;
/**
 * Resolve o path completo do endpoint conforme a documentação AGT (DS.120).
 *
 * Usa sempre endpoint REST (/sigt/fe/v1/) que aceita JSON.
 * Endpoint SOAP (/sigt/fe/ws/v1/) foi descontinuado em favor de REST.
 */
export declare function getAgtEndpointPath(env: AgtEnv, endpoint: AgtEndpointName): string;
export declare function getAgtEndpointUrl(env: AgtEnv, endpoint: AgtEndpointName): string;
//# sourceMappingURL=agtEndpoints.d.ts.map