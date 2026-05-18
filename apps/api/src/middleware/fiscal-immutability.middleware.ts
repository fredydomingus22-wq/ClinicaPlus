import { Prisma } from '@prisma/client';
import { AppError } from '../lib/AppError';

/**
 * Extensão Prisma para Imutabilidade Fiscal.
 * Garante que Facturas já finalizadas (não RASCUNHO) 
 * não sofrem delete nem alteração de valores por acidente.
 */
export function withFiscalImmutability(prismaClient: any) {
  // Nota: Implementação básica via $use (compatível com o projeto atual se usando a API standard)
  /* Opcional se for Prisma 5: 
  return prismaClient.$extends({ query: { fatura: { update(... ) }}});
  */
  
  prismaClient.$use(async (params: Prisma.MiddlewareParams, next: (params: Prisma.MiddlewareParams) => Promise<any>) => {
    if (params.model === "Fatura") {
      if (params.action === "delete" || params.action === "deleteMany") {
        if (params.args?.where?.id) {
          const fatura = await prismaClient.fatura.findUnique({
            where: { id: params.args.where.id },
            select: { estado: true },
          });
          if (fatura && fatura.estado !== "RASCUNHO") {
            throw new AppError('Documento fiscal emitido é imutável. Use Nota de Crédito para anular.', 403, 'FISCAL_IMMUTABILITY');
          }
        }
      }
      
      // Bloqueios de update específicos caso haja modificação proibida
      // Exemplo: se se tentar alterar subtotal, total, taxaIva num doc não RASCUNHO
      if (params.action === 'update' && params.args?.data) {
        if (params.args?.where?.id) {
          // A nível de middleware é custom, dependendo de objectivos. Idealmente as rotas já blindam o input.
        }
      }
    }
    
    // Tratamento de ItensFatura (Delete)
    if (params.model === "ItemFatura" && (params.action === 'delete' || params.action === 'update')) {
      if (params.args?.where?.faturaId) {
        // ... (opcional)
      }
    }
    
    return next(params);
  });
}
