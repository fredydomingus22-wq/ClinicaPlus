import type { CertificationService } from './CertificationService';
import type { AgtStatusRequest } from './types';
export declare function buildAgtObterEstadoPayload(taxRegistrationNumber: string, requestID: string, certService: CertificationService, options?: {
    submissionUUID?: string;
    submissionTimeStamp?: string;
}): AgtStatusRequest;
//# sourceMappingURL=buildAgtObterEstadoPayload.d.ts.map