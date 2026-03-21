import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { AppError } from '../lib/AppError';
import { publishEvent } from '../lib/eventBus';
import { auditLogService } from './auditLog.service';
import {
  FaturaDTO,
  EstadoFatura,
  TipoFatura,
  MetodoPagamento,
  PagamentoDTO,
  FaturaCreateSchema,
  PagamentoCreateSchema,
  PaginatedResult,
  EventoWebhook,
} from '@clinicaplus/types';
import { webhooksService } from './webhooks.service';
import { permissaoService } from './permissao.service';
import { z } from 'zod';

type PagamentoCreateInput = z.infer<typeof PagamentoCreateSchema>;

// Opcional: Extrair para FaturaNumberService se ficar mais complexo
async function generateFaturaNumber(clinicaId: string): Promise<string> {
  const currentYear = new Date().getFullYear();

  const lastInvoice = await prisma.fatura.findFirst({
    where: {
      clinicaId,
      numeroFatura: {
        startsWith: `F-${currentYear}-`,
      },
    },
    orderBy: {
      numeroFatura: 'desc',
    },
  });

  let nextNumber = 1;
  if (lastInvoice) {
    const parts = lastInvoice.numeroFatura.split('-');
    if (parts.length === 3 && parts[2]) {
      nextNumber = parseInt(parts[2], 10) + 1;
    }
  }

  const paddedNumber = String(nextNumber).padStart(5, '0');
  return `F-${currentYear}-${paddedNumber}`;
}

export const faturasService = {
  async create(data: z.infer<typeof FaturaCreateSchema>, clinicaId: string, criadoPor: string): Promise<FaturaDTO> {
    // 1. Verificar quota de agendamentos no plano
    const { planEnforcementService } = await import('./planEnforcement.service');
    await planEnforcementService.check(clinicaId, 'consultas');

    const numeroFatura = await generateFaturaNumber(clinicaId);

    let subtotal = 0;
    const itensPreparados = data.itens.map((item) => {
      const precoUnit = Math.round(item.precoUnit);
      const descontoItem = Math.round(item.desconto || 0);
      const totalItem = (precoUnit * item.quantidade) - descontoItem;
      subtotal += totalItem;

      return {
        descricao: item.descricao,
        quantidade: item.quantidade,
        precoUnit: precoUnit,
        desconto: descontoItem,
        total: totalItem,
      };
    });

    const descontoTotal = Math.round(data.desconto || 0);
    const totalFinal = subtotal - descontoTotal;

    const fatura = await prisma.fatura.create({
      data: {
        clinicaId,
        numeroFatura,
        agendamentoId: data.agendamentoId ?? null,
        pacienteId: data.pacienteId,
        medicoId: data.medicoId ?? null,
        tipo: data.tipo || TipoFatura.PARTICULAR,
        estado: EstadoFatura.RASCUNHO,
        subtotal,
        desconto: descontoTotal,
        total: totalFinal,
        notas: data.notas ?? null,
        dataVencimento: data.dataVencimento ? new Date(data.dataVencimento) : null,
        itens: {
          create: itensPreparados,
        },
      },
      include: {
        itens: true,
      },
    });

    await auditLogService.log({
      actorId: criadoPor,
      accao: 'CREATE',
      recurso: 'fatura',
      recursoId: fatura.id,
      depois: fatura,
      clinicaId,
    });

    return toFaturaDTO(fatura);
  },

  async emitir(id: string, clinicaId: string, criadoPor: string): Promise<FaturaDTO> {
    const fatura = await prisma.fatura.findUnique({
      where: { id, clinicaId },
      include: { itens: true },
    });

    if (!fatura) {
      throw new AppError('Fatura não encontrada', 404);
    }

    if (fatura.estado !== EstadoFatura.RASCUNHO) {
      throw new AppError(`Apenas faturas em RASCUNHO podem ser emitidas. Estado actual: ${fatura.estado}`, 409);
    }

    if (!fatura.itens || fatura.itens.length === 0) {
      throw new AppError('A fatura deve ter pelo menos um item para ser emitida', 400);
    }

    const faturaEmitida = await prisma.fatura.update({
      where: { id },
      data: {
        estado: EstadoFatura.EMITIDA,
        dataEmissao: new Date(),
      },
      include: {
        itens: true,
        pagamentos: true,
      },
    });

    await auditLogService.log({
      actorId: criadoPor,
      accao: 'UPDATE',
      recurso: 'fatura',
      recursoId: faturaEmitida.id,
      antes: fatura,
      depois: faturaEmitida,
      clinicaId,
    });

    await publishEvent(`clinica:${clinicaId}`, 'fatura:emitida', { id: faturaEmitida.id, numeroFatura: faturaEmitida.numeroFatura });

    // Trigger Webhooks
    webhooksService.trigger(EventoWebhook.FATURA_EMITIDA, faturaEmitida, clinicaId);

    return toFaturaDTO(faturaEmitida);
  },

  async anular(id: string, clinicaId: string, motivo: string, criadoPor: string): Promise<FaturaDTO> {
    await permissaoService.requirePermission(criadoPor, 'fatura', 'void');

    const fatura = await prisma.fatura.findUnique({
      where: { id, clinicaId },
      include: { itens: true, pagamentos: true }
    });

    if (!fatura) {
      throw new AppError('Fatura não encontrada', 404);
    }

    if (fatura.estado === EstadoFatura.ANULADA) {
      throw new AppError('Esta fatura já se encontra anulada', 409);
    }

    const faturaAnulada = await prisma.fatura.update({
      where: { id },
      data: {
        estado: EstadoFatura.ANULADA,
        notas: fatura.notas ? `${fatura.notas}\nAnulada: ${motivo}` : `Anulada: ${motivo}`,
      },
      include: {
        itens: true,
        pagamentos: true,
      },
    });

    await auditLogService.log({
      actorId: criadoPor,
      accao: 'UPDATE',
      recurso: 'fatura',
      recursoId: faturaAnulada.id,
      antes: fatura,
      depois: faturaAnulada,
      clinicaId,
    });

    return toFaturaDTO(faturaAnulada);
  },

  async registarPagamento(faturaId: string, data: PagamentoCreateInput, clinicaId: string, criadoPor: string): Promise<PagamentoDTO> {
    const fatura = await prisma.fatura.findUnique({
      where: { id: faturaId, clinicaId },
      include: { pagamentos: true },
    });

    if (!fatura) {
      throw new AppError('Fatura não encontrada', 404);
    }

    if (fatura.estado === EstadoFatura.ANULADA) {
      throw new AppError('Não é possível registar pagamentos em faturas anuladas', 409);
    }
    
    if (fatura.estado === EstadoFatura.RASCUNHO) {
        throw new AppError('A fatura deve ser emitida antes de registar pagamentos', 409);
    }
    if (fatura.estado === EstadoFatura.PAGA) {
        throw new AppError('Esta fatura já se encontra totalmente paga', 409);
    }

    const valorPagamento = Math.round(data.valor);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Criar Pagamento
      const pagamento = await tx.pagamento.create({
        data: {
          clinicaId,
          faturaId,
          metodo: data.metodo,
          valor: valorPagamento,
          referencia: data.referencia ?? null,
          notas: data.notas ?? null,
          criadoPor,
          ...(data.metodo === MetodoPagamento.SEGURO && data.seguro ? {
            seguro: {
              create: {
                seguradora: data.seguro.seguradora,
                numeroBeneficiario: data.seguro.numeroBeneficiario,
                numeroAutorizacao: data.seguro.numeroAutorizacao ?? null,
                valorSolicitado: data.seguro.valorSolicitado || valorPagamento,
              }
            }
          } : {}),
        },
      });

      // 2. Verificar se totaliza
      const pagamentosActuais = fatura.pagamentos.reduce((acc, p) => acc + p.valor, 0);
      const novoTotalPago = pagamentosActuais + valorPagamento;

      if (novoTotalPago >= fatura.total && fatura.estado !== EstadoFatura.PAGA) {
        await tx.fatura.update({
          where: { id: faturaId },
          data: { estado: EstadoFatura.PAGA },
        });
      }

      await auditLogService.log({
        actorId: criadoPor,
        accao: 'CREATE',
        recurso: 'pagamento',
        recursoId: pagamento.id,
        depois: pagamento,
        clinicaId,
      });

      return pagamento;
    });

    const dto = result as unknown as PagamentoDTO;

    // Trigger Webhooks se a fatura ficou paga
    const faturaActualizada = await prisma.fatura.findUnique({
      where: { id: faturaId },
      select: { estado: true }
    });

    if (faturaActualizada?.estado === EstadoFatura.PAGA) {
       webhooksService.trigger(EventoWebhook.FATURA_PAGA, { faturaId }, clinicaId);
    }

    return dto;
  },

  async list(filters: Record<string, unknown>, clinicaId: string): Promise<PaginatedResult<FaturaDTO>> {
    const page = parseInt(String(filters.page || '1'), 10);
    const limit = parseInt(String(filters.limit || '10'), 10);
    const skip = (page - 1) * limit;

    const where: Prisma.FaturaWhereInput = { clinicaId };

    if (filters.estado) where.estado = filters.estado;
    if (filters.pacienteId) where.pacienteId = filters.pacienteId;
    if (filters.medicoId) where.medicoId = filters.medicoId;
    if (filters.tipo) where.tipo = filters.tipo;

    if (filters.dataInicio || filters.dataFim) {
      where.dataEmissao = {
        gte: filters.dataInicio ? new Date(String(filters.dataInicio)) : undefined,
        lte: filters.dataFim ? new Date(String(filters.dataFim)) : undefined,
      } as Prisma.DateTimeNullableFilter;
    }

    const [total, faturas] = await Promise.all([
      prisma.fatura.count({ where }),
      prisma.fatura.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dataEmissao: 'desc' },
        include: {
          paciente: {
            select: { id: true, nome: true, numeroPaciente: true, endereco: true }
          },
          medico: {
            select: { id: true, nome: true }
          },
          itens: true,
        }
      }),
    ]);

    return {
      items: faturas.map(toFaturaDTO),
      total,
      page,
      limit,
    };
  },

  async getOne(id: string, clinicaId: string): Promise<FaturaDTO> {
    const fatura = await prisma.fatura.findUnique({
      where: { id, clinicaId },
      include: {
        itens: true,
        pagamentos: {
          include: { seguro: true }
        },
        paciente: {
            select: { id: true, nome: true, numeroPaciente: true, endereco: true }
        },
        medico: {
            select: { id: true, nome: true }
        }
      },
    });

    if (!fatura) {
      throw new AppError('Fatura não encontrada', 404);
    }

    return toFaturaDTO(fatura);
  },

  async submeterSeguro(pagamentoId: string, clinicaId: string): Promise<void> {
    const seguro = await prisma.seguroPagamento.findUnique({
      where: { pagamentoId },
      include: { pagamento: true }
    });

    if (!seguro || seguro.pagamento.clinicaId !== clinicaId) {
      throw new AppError('Pagamento com seguro não encontrado', 404);
    }

    if (seguro.estado !== 'PENDENTE') {
      throw new AppError(`Não é possível submeter um seguro no estado ${seguro.estado}`, 400);
    }

    await prisma.seguroPagamento.update({
      where: { pagamentoId },
      data: {
        estado: 'SUBMETIDO',
        dataSubmissao: new Date(),
      },
    });
  },

  async registarRespostaSeguro(
    pagamentoId: string, 
    clinicaId: string, 
    data: { estado: 'APROVADO' | 'REJEITADO', valorAprovado?: number, notas?: string }
  ): Promise<void> {
    const seguro = await prisma.seguroPagamento.findUnique({
      where: { pagamentoId },
      include: { pagamento: true }
    });

    if (!seguro || seguro.pagamento.clinicaId !== clinicaId) {
      throw new AppError('Pagamento com seguro não encontrado', 404);
    }

    if (seguro.estado !== 'SUBMETIDO') {
      throw new AppError(`Não é possível registar resposta para um seguro no estado ${seguro.estado}`, 400);
    }

    await prisma.seguroPagamento.update({
      where: { pagamentoId },
      data: {
        estado: data.estado,
        valorAprovado: data.estado === 'APROVADO' ? (data.valorAprovado ?? seguro.valorSolicitado) : 0,
        notasSeguradora: data.notas ?? null,
        dataResposta: new Date(),
      },
    });
  },

  async exportRelatorio(clinicaId: string, userId: string): Promise<void> {
    await permissaoService.requirePermission(userId, 'relatorio', 'export');
    // Lógica delegada para o relatoriosRouter, mas o service pode ter hooks ou logs.
    await auditLogService.log({
      actorId: userId,
      accao: 'EXPORT',
      recurso: 'relatorio',
      clinicaId,
    });
  },
};

/**
 * Mapeia um objecto do Prisma para um DTO de Fatura seguro.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toFaturaDTO(fatura: any): FaturaDTO {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dto: any = {
    id: fatura.id,
    clinicaId: fatura.clinicaId,
    numeroFatura: fatura.numeroFatura,
    agendamentoId: fatura.agendamentoId || null,
    pacienteId: fatura.pacienteId,
    medicoId: fatura.medicoId || null,
    tipo: fatura.tipo,
    estado: fatura.estado,
    subtotal: fatura.subtotal,
    desconto: fatura.desconto,
    total: fatura.total,
    notas: fatura.notas || null,
    dataEmissao: fatura.dataEmissao?.toISOString() || null,
    dataVencimento: fatura.dataVencimento?.toISOString() || null,
    criadoEm: fatura.criadoEm.toISOString(),
    atualizadoEm: fatura.atualizadoEm.toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itens: fatura.itens?.map((i: any) => ({
      id: i.id,
      descricao: i.descricao,
      quantidade: i.quantidade,
      precoUnit: i.precoUnit,
      desconto: i.desconto,
      total: i.total
    })) || [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pagamentos: fatura.pagamentos?.map((p: any) => ({
      id: p.id,
      metodo: p.metodo,
      valor: p.valor,
      referencia: p.referencia || null,
      criadoEm: p.criadoEm.toISOString()
    })) || []
  };

  if (fatura.paciente) {
    dto.paciente = {
      id: fatura.paciente.id,
      nome: fatura.paciente.nome,
      numeroPaciente: fatura.paciente.numeroPaciente,
      endereco: fatura.paciente.endereco || null
    };
  }

  if (fatura.medico) {
    dto.medico = {
      id: fatura.medico.id,
      nome: fatura.medico.nome
    };
  }

  return dto as FaturaDTO;
}
