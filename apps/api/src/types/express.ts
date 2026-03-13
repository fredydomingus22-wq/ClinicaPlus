/* eslint-disable @typescript-eslint/no-namespace */
import { Clinica, Papel } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        clinicaId: string;
        papel: Papel;
      };
      clinica: Clinica & {
        configuracao?: unknown;
      };
    }
  }
}

export {};
