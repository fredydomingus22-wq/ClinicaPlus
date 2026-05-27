"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgtOrigin = getAgtOrigin;
exports.getAgtEndpointPath = getAgtEndpointPath;
exports.getAgtEndpointUrl = getAgtEndpointUrl;
function getAgtOrigin(env) {
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
function getAgtEndpointPath(env, endpoint) {
    return `/sigt/fe/v1/${endpoint}`;
}
function getAgtEndpointUrl(env, endpoint) {
    return `${getAgtOrigin(env)}${getAgtEndpointPath(env, endpoint)}`;
}
//# sourceMappingURL=agtEndpoints.js.map