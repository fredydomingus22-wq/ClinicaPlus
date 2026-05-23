// Entry point exclusivo para imports Server-Side (Node.js)
// Impede que estas dependências "leciem" para o cliente no bundling (Browser/Vite)

export * from './fiscal/CertificationService';
export * from './fiscal/AgtApiClient';
export * from './fiscal/types';
export * from './fiscal/buildAgtRegistarFacturaPayload';
export * from './fiscal/syncAgtSubmissionStatus';
export * from './fiscal/buildAgtObterEstadoPayload';
export * from './fiscal/resolveCustomerCountry';
export * from './fiscal/pollAgtSubmissionStatus';
