/* eslint-disable @typescript-eslint/no-namespace */
import { Clinica, Papel } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        clinicaId: string | null;
        papel: Papel;
        isApiKey?: boolean;
        escopos?: string[];
      };
      clinica: Clinica & {
        configuracao?: unknown;
      };
    }
  }
}

export {};
