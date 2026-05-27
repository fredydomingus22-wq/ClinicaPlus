"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAgtObterEstadoPayload = buildAgtObterEstadoPayload;
const buildAgtRegistarFacturaPayload_1 = require("./buildAgtRegistarFacturaPayload");
function buildAgtObterEstadoPayload(taxRegistrationNumber, requestID, certService, options) {
    const softwareInfoDetail = (0, buildAgtRegistarFacturaPayload_1.getDefaultAgtSoftwareInfoDetail)();
    const payload = {
        schemaVersion: '1.2',
        taxRegistrationNumber,
        submissionTimeStamp: options?.submissionTimeStamp ?? new Date().toISOString(),
        softwareInfo: {
            softwareInfoDetail,
            jwsSoftwareSignature: certService.signSoftwareJWS(softwareInfoDetail),
        },
        requestID,
        jwsSignature: certService.signRequestJWS({ taxRegistrationNumber, requestID }),
    };
    if (options?.submissionUUID) {
        payload.submissionUUID = options.submissionUUID;
    }
    return payload;
}
//# sourceMappingURL=buildAgtObterEstadoPayload.js.map