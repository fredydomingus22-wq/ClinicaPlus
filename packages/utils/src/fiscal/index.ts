// calculo e types são seguros para o browser (sem dependências Node.js)
export * from './calculo';
export * from './types';

// CertificationService e AgtApiClient usam Node.js `crypto` — NÃO exportar aqui.
// Importar directamente em server-side: import { CertificationService } from '@clinicaplus/utils/fiscal/CertificationService';
