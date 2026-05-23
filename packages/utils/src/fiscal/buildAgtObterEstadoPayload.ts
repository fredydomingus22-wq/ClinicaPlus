import type { CertificationService } from './CertificationService';
import type { AgtStatusRequest } from './types';
import { getDefaultAgtSoftwareInfoDetail } from './buildAgtRegistarFacturaPayload';

export function buildAgtObterEstadoPayload(
  taxRegistrationNumber: string,
  requestID: string,
  certService: CertificationService,
  options?: { submissionUUID?: string; submissionTimeStamp?: string }
): AgtStatusRequest {
  const softwareInfoDetail = getDefaultAgtSoftwareInfoDetail();

  const payload: AgtStatusRequest = {
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
