import { 
  Prisma, 
  EstadoFatura, 
  RegimeFiscal, 
  TipoDocumentoFiscal 
} from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { auditLogService } from './auditLog.service';
import { publishEvent } from '../lib/eventBus';
import { 
  FaturaCreateSchema, 
  PagamentoCreateSchema,
  FaturaDTO,
  PagamentoDTO,
} from '@clinicaplus/types';
import { 
  TipoFatura,
  MetodoPagamento,
  EventoWebhook 
} from '@clinicaplus/types';
import { webhooksService } from './webhooks.service';
import { permissaoService } from './permissao.service';
import { 
  numberToWords, 
  AgtInvoicePayload,
  calcularFatura 
} from '@clinicaplus/utils';
import { logger } from '../lib/logger';
import { agtApiClient } from './fiscal/AgtApiClient';

type PagamentoCreateInput = z.infer<typeof PagamentoCreateSchema>;

// Tipagem auxiliar
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// Opcional: Extrair para FaturaNumberService se ficar mais complexo
async function generateFaturaNumber(clinicaId: string, tipoDoc: TipoDocumentoFiscal = TipoDocumentoFiscal.FT): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = tipoDoc; // FT, FR, VD, NC, ND

  const lastInvoice = await prisma.fatura.findFirst({
    where: {
      clinicaId,
      numeroFatura: {
        startsWith: `${prefix} ${currentYear}/`,
      },
      tipoDocFiscal: tipoDoc
    },
    orderBy: {
      numeroFatura: 'desc',
    },
  });

  let nextNumber = 1;
  if (lastInvoice) {
    const parts = lastInvoice.numeroFatura.split('/');
    if (parts.length === 2 && parts[1]) {
      nextNumber = parseInt(parts[1], 10) + 1;
    }
  }

  const paddedNumber = String(nextNumber).padStart(6, '0');
  return `${prefix} ${currentYear}/${paddedNumber}`;
}

interface InvoiceItemInput {
  descricao: string;
  quantidade: number;
  precoUnit: number;
  desconto?: number | undefined;
  taxaIva?: number | undefined;
  motivoIsencao?: string | null | undefined;
}

interface CalculatedTaxItem extends Omit<InvoiceItemInput, 'motivoIsencao'> {
  baseTributavel: number;
  valorIva: number;
  total: number;
  codigoIva: string;
  motivoIsencao: string | null;
}

/**
 * Calcula os impostos para os itens baseado no regime da clínica
 * Referência: Decreto Presidencial n.º 71/25 e CIVA Angola 2025/2026
 */
function calculateInvoiceTaxes(items: InvoiceItemInput[], regimeFiscal: RegimeFiscal): CalculatedTaxItem[] {
  // Serviços de Saúde são isentos via Artigo 12.º, n.º 2 do CIVA
  const EXENCAO_SAUDE = 'Isento nos termos do n.º 2 do Artigo 12.º do CIVA';

  return items.map(item => {
    let taxaIva: number;
    let codigoIva: string;
    let motivoIsencao: string | null;

    if (regimeFiscal === RegimeFiscal.EXUSA) {
      taxaIva = 0;
      codigoIva = 'ISE';
      motivoIsencao = 'Isento nos termos do Regime de Exclusão (Artigo 21.º do CIVA)';
    } else if (regimeFiscal === RegimeFiscal.SIMPLIFICADO) {
      // Regime Simplificado (7%): Isento na fatura, mas flag para imposto sobre recebimento
      taxaIva = 0;
      codigoIva = 'ISE';
      motivoIsencao = 'IVA - Regime Simplificado (Artigo 24.º do CIVA)';
    } else {
      // Regime Geral (14%)
      taxaIva = item.taxaIva !== undefined ? item.taxaIva : 14;
      codigoIva = taxaIva > 0 ? 'IVA' : 'ISE';
      motivoIsencao = taxaIva > 0 ? null : (item.motivoIsencao || EXENCAO_SAUDE);
    }

    const precoUnit = Math.round(item.precoUnit);
    const descontoItem = Math.round(item.desconto || 0);
    const baseTributavel = (precoUnit * item.quantidade) - descontoItem;
    const valorIva = Math.round(baseTributavel * (taxaIva / 100));
    const totalItem = baseTributavel + valorIva;

    return {
      ...item,
      precoUnit,
      desconto: descontoItem,
      taxaIva,
      codigoIva,
      motivoIsencao,
      baseTributavel,
      valorIva,
      total: totalItem
    };
  });
}

export const faturasService = {
  async create(data: z.infer<typeof FaturaCreateSchema>, clinicaId: string, criadoPor: string): Promise<FaturaDTO> {
    const { planEnforcementService } = await import('./planEnforcement.service');
    await planEnforcementService.check(clinicaId, 'consultas');

    const clinica = await prisma.clinica.findUnique({
      where: { id: clinicaId },
      select: { 
        regimeFiscal: true,
        serieDocFiscal: true
      }
    });

    if (!clinica) throw new AppError('Clínica não encontrada', 404);

    const tipoDoc = data.tipoDocFiscal || TipoDocumentoFiscal.FT;
    const serieDocFiscal = clinica.serieDocFiscal || 'CPLS';
    const numeroFatura = await generateFaturaNumber(clinicaId, tipoDoc);
    const { subtotal, totalDesconto, totalIva, total, itensCalculados } = calcularFatura(data.itens as any, clinica.regimeFiscal as any);

    const fatura = await prisma.fatura.create({
      data: {
        clinicaId,
        numeroFatura,
        agendamentoId: data.agendamentoId || null,
        pacienteId: data.pacienteId,
        medicoId: data.medicoId || null,
        tipo: data.tipo as TipoFatura,
        tipoDocFiscal: tipoDoc,
        estado: EstadoFatura.RASCUNHO,
        subtotal,
        desconto: totalDesconto,
        totalIva,
        total,
        retencaoFonte: data.retencaoFonte || 0,
        notas: data.notas || null,
        dataVencimento: data.dataVencimento ? new Date(data.dataVencimento) : null,
        moeda: 'AOA',
        itens: {
          create: itensCalculados.map(item => ({
            descricao: item.descricao || '',
            quantidade: item.quantidade,
            precoUnit: item.precoUnit,
            desconto: item.desconto,
            taxaIva: item.taxaIva,
            codigoIva: item.codigoIva,
            motivoIsencao: item.motivoIsencao ?? null,
            total: item.total
          }))
        }
      },
      include: {
        itens: true,
        paciente: true,
        medico: true
      }
    });

    const valorExtenso = numberToWords(fatura.total);
    await prisma.fatura.update({
      where: { id: fatura.id },
      data: { valorExtenso }
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
    const { proximoNumero } = await import('./fiscal/SequenciaService');
    const { certificationService } = await import('./fiscal/CertificationService');
    const { calcularFatura } = await import('@clinicaplus/utils');

    const faturaEmitida = await prisma.$transaction(async (tx) => {
      // 1. Buscar fatura
      const fatura = await tx.fatura.findUnique({
        where: { id, clinicaId },
        include: { itens: true, paciente: true, clinica: true },
      });

      if (!fatura) throw new AppError('Fatura não encontrada', 404);

      if (fatura.estado !== EstadoFatura.RASCUNHO) {
        throw new AppError(`Apenas faturas em RASCUNHO podem ser emitidas. Estado actual: ${fatura.estado}`, 409);
      }
      if (!fatura.itens || fatura.itens.length === 0) {
        throw new AppError('A fatura deve ter pelo menos um item para ser emitida', 400);
      }

      // 2. Buscar dados fiscais
      const clinica = await tx.clinica.findUnique({
        where: { id: clinicaId },
        select: { nif: true, razaoSocial: true, enderecoPostal: true, cidade: true, provincia: true, regimeFiscal: true, serieDocFiscal: true },
      });

      if (!clinica?.nif || !clinica?.razaoSocial || !clinica?.enderecoPostal) {
        throw new AppError('Dados fiscais da clínica incompletos. Configure o NIF, Razão Social e Endereço.', 400);
      }

      // 3. Recalcular
      const calculo = calcularFatura(fatura.itens as any, clinica.regimeFiscal as any);

      // 4. Sequencial
      const { formatado: numeroFatura } = await proximoNumero(tx as any, clinicaId, fatura.tipoDocFiscal, clinica.serieDocFiscal || 'CPLS');

      // 5. Hash Chain
      const hashAnterior = await certificationService.obterHashAnterior(clinicaId, clinica.serieDocFiscal || 'CPLS', fatura.tipoDocFiscal, tx);
      const agora = new Date();
      const assinatura = certificationService.assinarDocumento({
        dataEmissao: agora,
        dataDocumento: agora,
        numero: numeroFatura,
        total: calculo.total,
        hashAnterior,
      });

      // 6. Snapshot
      await tx.faturaSnapshot.create({
        data: {
          faturaId: id,
          emitenteNif: clinica.nif,
          emitenteNome: clinica.razaoSocial,
          emitenteEndereco: clinica.enderecoPostal,
          emitenteCidade: clinica.cidade,
          emitenteProvincia: clinica.provincia,
          clienteNome: fatura.paciente.nome,
          clienteNif: '999999990',
          clienteEndereco: fatura.paciente.endereco,
          serieDocFiscal: clinica.serieDocFiscal || 'CPLS',
          regimeFiscal: clinica.regimeFiscal as any,
        }
      });

      // 7. Atualizar
      return tx.fatura.update({
        where: { id },
        data: {
          estado: EstadoFatura.EMITIDA,
          numeroFatura,
          serieDocFiscal: clinica.serieDocFiscal || 'CPLS',
          dataEmissao: agora,
          subtotal: calculo.subtotal,
          totalIva: calculo.totalIva,
          total: calculo.total,
          fiscalHash: assinatura.hash,
          hashControl: assinatura.hashControl,
          documentoChave: `${agora.toISOString().split('T')[0]};${agora.toISOString().split('T')[0]};${numeroFatura};${(calculo.total).toFixed(2)};${hashAnterior}`,
          statusEnvio: 'PENDENTE'
        },
        include: { itens: true, pagamentos: true, paciente: true },
      });
    }, { isolationLevel: 'Serializable' });

    await auditLogService.log({
      actorId: criadoPor,
      accao: 'UPDATE',
      recurso: 'fatura',
      recursoId: faturaEmitida.id,
      depois: { numero: faturaEmitida.numeroFatura, total: faturaEmitida.total },
      clinicaId,
    });

    await publishEvent(`clinica:${clinicaId}`, 'fatura:emitida', { id: faturaEmitida.id, numeroFatura: faturaEmitida.numeroFatura });
    webhooksService.trigger(EventoWebhook.FATURA_EMITIDA, faturaEmitida, clinicaId);

    this.submeterParaAgt(faturaEmitida.id, clinicaId).catch((err) => {
        logger.error({ err, faturaId: faturaEmitida.id }, 'Erro na submissão automática para AGT');
    });

    return toFaturaDTO(faturaEmitida);
  },

  /**
   * Submete uma fatura para a AGT em tempo real
   */
  async submeterParaAgt(faturaId: string, clinicaId: string): Promise<void> {
    const fatura = await prisma.fatura.findUnique({
      where: { id: faturaId, clinicaId },
      include: {
        itens: true,
        paciente: true,
        clinica: true
      }
    });

    if (!fatura || !fatura.fiscalHash) return;

    try {
      const agtPayload: AgtInvoicePayload = {
        invoiceNumber: fatura.numeroFatura!,
        invoiceDate: fatura.dataEmissao?.toISOString() || new Date().toISOString(),
        customerName: fatura.paciente?.nome || 'Consumidor Final',
        customerTaxID: fatura.paciente?.nif || '999999999',
        totalAmount: fatura.total / 100,
        hash: fatura.fiscalHash || '',
        hashControl: fatura.hashControl || '',
        tipoDocFiscal: fatura.tipoDocFiscal,
        taxAccountingBasis: 'F', // Facturação
        selfBillingIndicator: 0,
        cashBasisIndicator: 0,
        thirdPartyBillingIndicator: 0,
        retencaoFonte: fatura.retencaoFonte / 100,
        items: fatura.itens.map(item => ({
          description: item.descricao,
          quantity: item.quantidade,
          unitPrice: item.precoUnit / 100,
          taxAmount: Math.round(item.total - (item.precoUnit * item.quantidade - item.desconto)) / 100,
          taxRate: item.taxaIva
        }))
      };

      // 6. Registar na AGT
      const response = await agtApiClient.registarFatura(agtPayload, fatura.clinica?.agtApiToken || '');

      await prisma.fatura.update({
        where: { id: faturaId },
        data: {
          agtRequestID: response.requestID,
          statusEnvio: response.status === 'SUCCESS' ? 'ENTREGUE' : 'ERRO',
          notas: response.message ? `${fatura.notas}\nAGT: ${response.message}` : fatura.notas
        }
      });

      logger.info({ faturaId, requestID: response.requestID }, 'Fatura registada na AGT com sucesso');
    } catch (error: unknown) {
      const err = error as Error;
      logger.error({ err, id: faturaId }, 'Erro ao emitir fatura');
      await prisma.fatura.update({
        where: { id: faturaId },
        data: { statusEnvio: 'ERRO' }
      });
    }
  },

  async criarNotaCredito(faturaOriginalId: string, clinicaId: string, motivo: string, criadoPor: string): Promise<FaturaDTO> {
    await permissaoService.requirePermission(criadoPor, 'fatura', 'void');

    const faturaOriginal = await prisma.fatura.findUnique({
      where: { id: faturaOriginalId, clinicaId },
      include: { itens: true }
    });

    if (!faturaOriginal) {
      throw new AppError('Fatura não encontrada', 404);
    }

    if (faturaOriginal.estado !== EstadoFatura.EMITIDA && faturaOriginal.estado !== EstadoFatura.PAGA) {
      throw new AppError('Só é possível criar nota de crédito para facturas emitidas ou pagas', 409);
    }

    const { planEnforcementService } = await import('./planEnforcement.service');
    await planEnforcementService.check(clinicaId, 'consultas');

    const novaNC = await prisma.$transaction(async (tx) => {
      // 1. Marcar original como ANULADA
      await tx.fatura.update({
        where: { id: faturaOriginalId },
        data: { 
          estado: EstadoFatura.ANULADA, 
          motivoAnulacao: motivo,
          notas: faturaOriginal.notas ? `${faturaOriginal.notas}\nAnulada: ${motivo}` : `Anulada: ${motivo}`
        }
      });

      // 2. Criar itens em negativo
      let subtotal = 0;
      let totalIva = 0;
      let descontoTotal = 0;

      const itensNC = faturaOriginal.itens.map(i => {
        subtotal += (i.precoUnit * i.quantidade) - i.desconto;
        totalIva += (i.total - ((i.precoUnit * i.quantidade) - i.desconto));
        descontoTotal += i.desconto;

        return {
          descricao: `Anulação: ${i.descricao}`,
          quantidade: i.quantidade,
          precoUnit: -i.precoUnit, // Valores negativos na base
          desconto: -(i.desconto),
          taxaIva: i.taxaIva,
          codigoIva: i.codigoIva,
          motivoIsencao: i.motivoIsencao,
          total: -(i.total)
        };
      });

      const totalFinal = -(faturaOriginal.total);

      // 3. Gerar a fatura NC
      return tx.fatura.create({
        data: {
          numeroFatura: 'DRAFT',
          clinicaId,
          tipoDocFiscal: TipoDocumentoFiscal.NC,
          faturaOriginalId,
          pacienteId: faturaOriginal.pacienteId,
          medicoId: faturaOriginal.medicoId,
          tipo: faturaOriginal.tipo,
          estado: EstadoFatura.RASCUNHO,
          subtotal: -subtotal,
          desconto: -descontoTotal,
          totalIva: -totalIva,
          retencaoFonte: -(faturaOriginal.retencaoFonte),
          total: totalFinal,
          valorExtenso: numberToWords(Math.abs(totalFinal)),
          notas: `Anulação da fatura ${faturaOriginal.numeroFatura} - Motivo: ${motivo}`,
          itens: {
            create: itensNC
          }
        }
      });
    });

    await auditLogService.log({
      actorId: criadoPor,
      accao: 'UPDATE',
      recurso: 'fatura',
      recursoId: faturaOriginalId,
      depois: { faturaOriginalId, notaCreditoId: novaNC.id },
      clinicaId,
    });

    // 4. Auto-emitir a nota de crédito
    const emitido = await this.emitir(novaNC.id, clinicaId, criadoPor);
    return emitido;
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
      throw new AppError('Não é possível registar pagamentos em faturas anuladas', 409, 'INVOICE_VOIDED');
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

      await tx.fatura.update({
        where: { id: faturaId },
        data: { 
          estado: novoTotalPago >= fatura.total ? EstadoFatura.PAGA : fatura.estado,
          valorPago: novoTotalPago
        },
      });

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
    // Campos Fiscais (AGT)
    tipoDocFiscal: fatura.tipoDocFiscal,
    valorExtenso: fatura.valorExtenso,
    retencaoFonte: fatura.retencaoFonte,
    valorPago: fatura.valorPago,
    moeda: fatura.moeda,
    fiscalHash: fatura.fiscalHash || null,
    hashAnterior: fatura.documentoChave?.split(';').pop() || null,
    hashControl: fatura.hashControl || null,
    documentoChave: fatura.documentoChave || null,
    statusEnvio: fatura.statusEnvio,
    agtRequestID: fatura.agtRequestID || null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itens: fatura.itens?.map((i: any) => ({
      id: i.id,
      descricao: i.descricao,
      quantidade: i.quantidade,
      precoUnit: i.precoUnit,
      desconto: i.desconto,
      taxaIva: i.taxaIva,
      codigoIva: i.codigoIva,
      motivoIsencao: i.motivoIsencao || undefined,
      total: i.total
    })) || [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pagamentos: fatura.pagamentos?.map((p: any) => ({
      id: p.id,
      metodo: p.metodo,
      valor: p.valor,
      referencia: p.referencia || null,
      criadoEm: p.criadoEm.toISOString(),
      seguro: p.seguro ? {
        pagamentoId: p.seguro.pagamentoId,
        seguradora: p.seguro.seguradora,
        numeroBeneficiario: p.seguro.numeroBeneficiario,
        numeroAutorizacao: p.seguro.numeroAutorizacao || undefined,
        valorSolicitado: p.seguro.valorSolicitado,
        valorAprovado: p.seguro.valorAprovado,
        estado: p.seguro.estado,
        dataSubmissao: p.seguro.dataSubmissao?.toISOString(),
        dataResposta: p.seguro.dataResposta?.toISOString(),
        notasSeguradora: p.seguro.notasSeguradora || undefined
      } : undefined
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
