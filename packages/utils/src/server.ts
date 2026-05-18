// Entry point exclusivo para imports Server-Side (Node.js)
// Impede que estas dependências "leciem" para o cliente no bundling (Browser/Vite)

export * from './fiscal/CertificationService';
export * from './fiscal/AgtApiClient';
export * from './fiscal/types'; // Importar tipos pode ser feito aqui também se necessário para backend
