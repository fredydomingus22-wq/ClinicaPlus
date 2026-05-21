import { 
  Prisma, 
  EstadoFatura, 
  RegimeFiscal,
  TipoDocumentoFiscal as PrismaTipoDoc 
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
  ClinicaDTO,
} from '@clinicaplus/types';
import { 
  TipoFatura,
  MetodoPagamento,
  EventoWebhook,
  TipoDocumentoFiscal,
  NotaDebitoCreateInput 
} from '@clinicaplus/types';
import { webhooksService } from './webhooks.service';
import { permissaoService } from './permissao.service';
import { 
  numberToWords, 
  calcularFatura 
} from '@clinicaplus/utils';
import { AgtElectronicInvoiceRequest, AgtDocumentLine } from '@clinicaplus/utils/server';
import { logger } from '../lib/logger';
import { agtApiClient } from './fiscal/AgtApiClient';
import { proximoNumero as obterProximoNumeroDocumento } from './fiscal/SequenciaService';
import { reportAgtQueue } from '../lib/queues';

type PagamentoCreateInput = z.infer<typeof PagamentoCreateSchema>;

// Tipagem auxiliar
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// Opcional: Extrair para FaturaNumberService se ficar mais complexo





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

    const tipoDoc = (data.tipoDocFiscal || TipoDocumentoFiscal.FT) as TipoDocumentoFiscal;
    const { formatado: numeroFatura } = await obterProximoNumeroDocumento(prisma as unknown as Prisma.TransactionClient, clinicaId, tipoDoc as unknown as PrismaTipoDoc);
    const { subtotal, totalDesconto, totalIva, total, itensCalculados } = calcularFatura(data.itens, clinica.regimeFiscal);

    const fatura = await prisma.fatura.create({
      data: {
        clinicaId,
        numeroFatura,
        agendamentoId: data.agendamentoId || null,
        pacienteId: data.pacienteId,
        medicoId: data.medicoId || null,
        tipo: data.tipo as TipoFatura,
        tipoDocFiscal: tipoDoc as unknown as PrismaTipoDoc,
        serieDocFiscal: clinica.serieDocFiscal,
        estado: EstadoFatura.RASCUNHO,
        subtotal,
        desconto: totalDesconto,
        totalIva,
        total,
        retencaoFonte: data.retencaoFonte || 0,
        notas: data.notas || null,
        dataEmissao: data.retrodatar && data.dataEmissao ? new Date(data.dataEmissao) : null,
        dataVencimento: data.dataVencimento ? new Date(data.dataVencimento) : null,
        moeda: 'AOA',
        itens: {
          create: itensCalculados.map(item => ({
            descricao: item.descricao || 'Item sem descrição',
            quantidade: item.quantidade,
            precoUnit: item.precoUnit,
            desconto: item.desconto,
            taxaIva: item.taxaIva,
            codigoIva: item.codigoIva,
            motivoIsencao: (item.motivoIsencao || null) as any,
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
    const { CertificationService } = await import('./fiscal/CertificationService');
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

      // 2. Buscar dados fiscais (com fallbacks se AGT_MOCK=true)
      const clinicaRaw = await tx.clinica.findUnique({
        where: { id: clinicaId },
        select: { 
          nif: true, 
          razaoSocial: true, 
          enderecoPostal: true, 
          cidade: true, 
          provincia: true, 
          regimeFiscal: true, 
          serieDocFiscal: true,
          agtPrivateKey: true,
          agtPublicKey: true
        },
      });

      const isMock = process.env.AGT_MOCK === 'true';
      
      // Log para diagnóstico em caso de erro 400
      if (!clinicaRaw || !clinicaRaw.nif || !clinicaRaw.razaoSocial || !clinicaRaw.enderecoPostal) {
        logger.warn({ clinicaId, clinicaRaw }, 'Dados fiscais da clínica incompletos para emissão');
      }

      const clinica = {
        ...clinicaRaw,
        nif: clinicaRaw?.nif || (isMock ? '999999999' : null),
        razaoSocial: clinicaRaw?.razaoSocial || (isMock ? 'Clinica Plus (Backup)' : null),
        enderecoPostal: clinicaRaw?.enderecoPostal || (isMock ? 'Endereço Indefinido' : null),
        cidade: clinicaRaw?.cidade || (isMock ? 'Luanda' : null),
        provincia: clinicaRaw?.provincia || (isMock ? 'Luanda' : null),
      };

      if (!clinica.nif || !clinica.razaoSocial || !clinica.enderecoPostal) {
        logger.error({ clinicaId, clinicaRaw }, 'Dados fiscais incompletos para emissão');
        throw new AppError('Dados fiscais da clínica incompletos. Configure o NIF, Razão Social e Endereço.', 400);
      }

      // 4. Instanciar serviço de certificação com as chaves da clínica
      const certService = new CertificationService({
        tenantPrivateKey: clinica.agtPrivateKey || process.env.AGT_PRIVATE_KEY,
        tenantPublicKey: clinica.agtPublicKey || process.env.AGT_PUBLIC_KEY,
      });

      // 3. Recalcular — Prisma devolve motivoIsencao: string | null; ItemCalculo espera string? (sem null).
      // Com exactOptionalPropertyTypes:true não podemos passar undefined explicitamente,
      // por isso omitimos a propriedade quando o valor é null.
      const itensParaCalculo = fatura.itens.map(({ motivoIsencao, ...rest }) => ({
        ...rest,
        ...(motivoIsencao !== null ? { motivoIsencao } : {}),
      }));
      const calculo = calcularFatura(itensParaCalculo, (clinica.regimeFiscal as ClinicaDTO['regimeFiscal']) || 'GERAL');

      // 4. Determinar se a clínica está em modo de contingência activo
      const activeContingency = await tx.sequenciaDocFiscal.findFirst({
        where: {
          clinicaId,
          isContingency: true,
          endTS: null
        }
      });
      const isContingencyActive = !!activeContingency;

      const serieParaUsar = isContingencyActive 
        ? `${clinica.serieDocFiscal || 'CPLS'}C`
        : (clinica.serieDocFiscal || 'CPLS');

      // 5. Sequencial
      const { formatado: numeroFatura } = await proximoNumero(tx, clinicaId, fatura.tipoDocFiscal, serieParaUsar);

      if (isContingencyActive) {
        await tx.sequenciaDocFiscal.updateMany({
          where: {
            clinicaId,
            serie: serieParaUsar,
            tipoDoc: fatura.tipoDocFiscal,
            startTS: null
          },
          data: {
            isContingency: true,
            startTS: new Date(),
            isRegistered: false,
            endTS: null
          }
        });
      }

      // 6. Hash Chain usando a série correcta
      const hashAnterior = await certService.obterHashAnterior(clinicaId, serieParaUsar, fatura.tipoDocFiscal, tx);
      const agora = fatura.dataEmissao || new Date();
      const assinatura = certService.assinarDocumento({
        dataEmissao: agora,
        dataDocumento: agora,
        numero: numeroFatura,
        total: calculo.total,
        hashAnterior,
      });

      // 7. Snapshot
      await tx.faturaSnapshot.create({
        data: {
          faturaId: id,
          emitenteNif: clinica.nif!,
          emitenteNome: clinica.razaoSocial!,
          emitenteEndereco: clinica.enderecoPostal!,
          emitenteCidade: clinica.cidade || null,
          emitenteProvincia: clinica.provincia || null,
          clienteNome: fatura.paciente.nome,
          clienteNif: fatura.paciente.nif || '999999999',
          clienteEndereco: fatura.paciente.endereco,
          serieDocFiscal: serieParaUsar,
          regimeFiscal: clinica.regimeFiscal ?? RegimeFiscal.GERAL,
        }
      });

      // 8. Atualizar
      const faturaActualizada = await tx.fatura.update({
        where: { id },
        data: {
          estado: fatura.tipoDocFiscal === TipoDocumentoFiscal.FR ? EstadoFatura.PAGA : EstadoFatura.EMITIDA,
          numeroFatura,
          serieDocFiscal: serieParaUsar,
          dataEmissao: agora,
          subtotal: calculo.subtotal,
          totalIva: calculo.totalIva,
          total: calculo.total,
          valorPago: fatura.tipoDocFiscal === TipoDocumentoFiscal.FR ? calculo.total : fatura.valorPago,
          fiscalHash: assinatura.hash,
          hashControl: assinatura.hashControl,
          documentoChave: `${agora.toISOString().split('T')[0]};${agora.toISOString().split('T')[0]};${numeroFatura};${(calculo.total).toFixed(2)};${hashAnterior}`,
          statusEnvio: isContingencyActive ? 'CONTINGENCIA' : 'PENDENTE',
          emContingencia: isContingencyActive
        },
        include: { itens: true, pagamentos: true, paciente: true },
      });

      // 8. Se for FR, registar um pagamento automático (Método padrão: NUMERARIO se não especificado)
      if (fatura.tipoDocFiscal === TipoDocumentoFiscal.FR) {
        await tx.pagamento.create({
          data: {
            clinicaId,
            faturaId: id,
            metodo: MetodoPagamento.DINHEIRO, // Fallback para FR sem pagamento prévio
            valor: calculo.total,
            notas: 'Pagamento automático via Factura-Recibo (FR)',
            criadoPor,
          }
        });
      }

      return faturaActualizada;
    }, { isolationLevel: 'Serializable' }).catch(error => {
      logger.error({ error, faturaId: id, clinicaId }, 'Erro na transacção de emissão de fatura');
      if (error instanceof AppError) throw error;
      throw new AppError(`Erro ao emitir fatura: ${error.message || 'Erro interno'}`, 400);
    });

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

    if (!faturaEmitida.emContingencia) {
      await reportAgtQueue.add(
        'report-agt',
        { faturaId: faturaEmitida.id, clinicaId },
        { jobId: `report-agt-${faturaEmitida.id}` }
      );
    }

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
      const { certificationService } = await import('./fiscal/CertificationService');
      const crypto = await import('crypto');
      const softwareInfoDetail = {
        productId: 'DocAgen',
        productVersion: '1.0.0',
        softwareValidationNumber: process.env.AGT_SOFTWARE_CERTIFICATE || '0',
        signatureVersion: Number(process.env.AGT_SIGNATURE_VERSION || 1)
      };

      // Payload específico para a assinatura do documento (conforme prompt AGT)
      const documentPayloadForSig = {
        documentNo: fatura.numeroFatura!,
        taxRegistrationNumber: fatura.clinica?.nif || '999999999',
        documentType: fatura.tipoDocFiscal,
        documentDate: (fatura.dataEmissao || new Date()).toISOString().substring(0, 10),
        customerTaxID: fatura.paciente?.nif || '999999999',
        customerCountry: 'AO',
        companyName: fatura.clinica?.razaoSocial || 'ClinicaPlus',
        documentTotals: {
          taxPayable: Number((fatura.totalIva / 100).toFixed(2)),
          netTotal: Number((fatura.subtotal / 100).toFixed(2)),
          grossTotal: Number((fatura.total / 100).toFixed(2)),
        }
      };

      const agtPayload: AgtElectronicInvoiceRequest = {
        schemaVersion: '1.2',
        submissionUUID: crypto.randomUUID(),
        taxRegistrationNumber: fatura.clinica?.nif || '999999999',
        submissionTimeStamp: new Date().toISOString(),
        softwareInfo: {
          softwareInfoDetail,
          jwsSoftwareSignature: certificationService.signSoftwareJWS(softwareInfoDetail)
        },
        numberOfEntries: 1,
        documents: [
          {
            documentNo: fatura.numeroFatura!,
            documentStatus: 'N',
            jwsDocumentSignature: certificationService.signDocumentJWS(documentPayloadForSig),
            documentDate: (fatura.dataEmissao || new Date()).toISOString().substring(0, 10),
            documentType: fatura.tipoDocFiscal,
            systemEntryDate: fatura.criadoEm.toISOString(),
            customerTaxID: fatura.paciente?.nif || '999999999',
            customerCountry: 'AO',
            companyName: fatura.clinica?.razaoSocial || 'ClinicaPlus',
            lines: fatura.itens.map((item, index) => {
              const valorLinha = (item.precoUnit * item.quantidade) - item.desconto; // Valor base total
              const valorFinalStr = (valorLinha / 100).toFixed(2);
              const precoUnitStr = (item.precoUnit / 100).toFixed(2);
              
              // No unitPriceBase consider descontos rateados na unidade se quiser, ou passamos no total da linha no creditAmount/debitAmount.
              // DS.120 normalmente unitPriceBase é unitPrice com desconto por unidade.
              const descontoUnitario = item.quantidade > 0 ? (item.desconto / item.quantidade) : 0;
              const unitPriceBaseStr = ((item.precoUnit - descontoUnitario) / 100).toFixed(2);

              const baseTaxInfo = {
                taxType: 'IVA',
                taxCountryRegion: 'AO',
                taxCode: item.codigoIva || (item.taxaIva === 0 ? 'ISE' : 'NOR'),
                taxPercentage: item.taxaIva.toFixed(2),
              };
              const taxesList = item.taxaIva === 0 
                ? [{ ...baseTaxInfo, taxExemptionCode: item.codigoIva || 'M02' }]
                : [baseTaxInfo];

              const documentLine: AgtDocumentLine = {
                lineNumber: (index + 1).toString(),
                operationType: 'SS',
                productCode: item.descricao.substring(0, 30),
                productDescription: item.descricao,
                quantity: item.quantidade.toString(),
                unitOfMeasure: 'UN',
                unitPrice: precoUnitStr,
                unitPriceBase: unitPriceBaseStr,
                taxes: taxesList,
                settlementAmount: '0.00'
              };


              
              if (fatura.tipoDocFiscal === 'NC') {
                documentLine.creditAmount = valorFinalStr;
              } else {
                documentLine.debitAmount = valorFinalStr;
              }

              return documentLine;
            }),
            documentTotals: {
              taxPayable: (fatura.totalIva / 100).toFixed(2),
              netTotal: (fatura.subtotal / 100).toFixed(2),
              grossTotal: (fatura.total / 100).toFixed(2),
              currency: {
                currencyCode: 'AOA',
                currencyAmount: (fatura.total / 100).toFixed(2),
                exchangeRate: '1'
              }
            }
          }
        ]
      };

      // 6. Registar na AGT
      const response = await agtApiClient.registarFactura(agtPayload, agtApiClient.getBasicAuth());

      await prisma.fatura.update({
        where: { id: faturaId },
        data: {
          agtRequestID: response.requestID || null,
          // Modelo assíncrono AGT:
          // request aceite => fica ENVIADO; confirmação final vem no obterEstado por requestID.
          statusEnvio: response.errorList && response.errorList.length > 0 ? 'ERRO' : 'ENVIADO',
          notas: response.message ? `${fatura.notas}\nAGT: ${response.message}` : fatura.notas
        }
      });

      logger.info({ faturaId, requestID: response.requestID }, 'Fatura registada na AGT com sucesso');
    } catch (error: unknown) {
      // Se falha de rede, marcar fatura em contingência
      const err = error as Error;
      if (this.isNetworkError(err)) {
        await this.activarContingenciaAutomatica(faturaId, fatura.clinica?.id || clinicaId);
      } else {
        await prisma.fatura.update({
          where: { id: faturaId },
          data: { statusEnvio: 'ERRO' }
        });
      }
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

  async criarNotaDebito(faturaOriginalId: string, clinicaId: string, data: NotaDebitoCreateInput, criadoPor: string): Promise<FaturaDTO> {
    await permissaoService.requirePermission(criadoPor, 'fatura', 'update');

    const faturaOriginal = await prisma.fatura.findUnique({
      where: { id: faturaOriginalId, clinicaId },
      include: { itens: true }
    });

    if (!faturaOriginal) throw new AppError('Fatura não encontrada', 404);
    if (faturaOriginal.estado !== EstadoFatura.EMITIDA && faturaOriginal.estado !== EstadoFatura.PAGA) {
      throw new AppError('Só é possível criar nota de débito para facturas emitidas ou pagas', 409);
    }

    const novaND = await prisma.$transaction(async (tx) => {
      const clinica = await tx.clinica.findUnique({ where: { id: clinicaId }, select: { regimeFiscal: true } });
      if (!clinica) throw new AppError('Clínica não encontrada', 404);

      const { subtotal, totalIva, total, itensCalculados } = calcularFatura(data.itens, clinica.regimeFiscal || 'GERAL');

      return tx.fatura.create({
        data: {
          numeroFatura: 'DRAFT',
          clinicaId,
          tipoDocFiscal: TipoDocumentoFiscal.ND as unknown as PrismaTipoDoc,
          faturaOriginalId,
          pacienteId: faturaOriginal.pacienteId,
          medicoId: faturaOriginal.medicoId,
          tipo: faturaOriginal.tipo,
          estado: EstadoFatura.RASCUNHO,
          subtotal,
          desconto: 0,
          totalIva,
          total,
          valorExtenso: numberToWords(total),
          notas: `Nota de débito complementar à fatura ${faturaOriginal.numeroFatura} - Motivo: ${data.motivo}`,
          itens: {
            create: itensCalculados.map(i => ({
              descricao: i.descricao || 'Item sem descrição',
              quantidade: i.quantidade,
              precoUnit: i.precoUnit,
              desconto: i.desconto,
              taxaIva: i.taxaIva,
              codigoIva: i.codigoIva,
              motivoIsencao: (i.motivoIsencao || null) as any,
              total: i.total
            }))
          }
        }
      });
    });

    await auditLogService.log({
      actorId: criadoPor,
      accao: 'UPDATE',
      recurso: 'fatura',
      recursoId: faturaOriginalId,
      depois: { faturaOriginalId, notaDebitoId: novaND.id },
      clinicaId,
    });

    // Auto-emitir a nota de débito (assinar e numerar)
    return this.emitir(novaND.id, clinicaId, criadoPor);
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
    
    // Validação de valor em excesso
    const totalPagoAteAgora = fatura.pagamentos.reduce((acc, p) => acc + (p.valor || 0), 0);
    const saldoDevedor = fatura.total - totalPagoAteAgora;
    
    if (valorPagamento > saldoDevedor) {
      const valorFormatado = (valorPagamento / 100).toFixed(2);
      const saldoFormatado = (saldoDevedor / 100).toFixed(2);
      throw new AppError(
        `O valor introduzido (${valorFormatado} Kz) excede o saldo devedor (${saldoFormatado} Kz) deste documento.`,
        400,
        'PAYMENT_EXCEEDS_BALANCE'
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const { certificationService } = await import('./fiscal/CertificationService');
      const { proximoNumero } = await import('./fiscal/SequenciaService');
      const agora = new Date();
      const clinica = await tx.clinica.findUnique({ where: { id: clinicaId } });
      if (!clinica) throw new AppError('Clínica não encontrada', 404);

      const serieDocFiscal = clinica.serieDocFiscal || 'CPLS';
      const hashAnterior = await certificationService.obterHashAnteriorRecibo(clinicaId, serieDocFiscal, tx);
      const { formatado: numeroRecibo } = await proximoNumero(tx, clinicaId, PrismaTipoDoc.RC, serieDocFiscal);

      // Assinatura do Recibo (RC)
      const dataIso = agora.toISOString().split('T')[0];
      const dataHoraIso = agora.toISOString().replace('Z', '');
      const valorFormatado = (valorPagamento / 100).toFixed(2);
      
      const dadosConcatenados = `${dataIso};${dataHoraIso};${numeroRecibo};${valorFormatado};${hashAnterior}`;
      const assinatura = certificationService.assinarDocumento({
        dataEmissao: agora,
        dataDocumento: agora,
        numero: numeroRecibo,
        total: valorPagamento / 100,
        hashAnterior
      });

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
          numeroRecibo,
          fiscalHash: assinatura.hash,
          documentoChave: dadosConcatenados,
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

    try {
      if (!fatura) {
        throw new AppError('Fatura não encontrada', 404);
      }

      logger.info({ id, clinicaId }, 'Iniciando mapeamento DTO para fatura');
      const dto = toFaturaDTO(fatura);
      logger.info({ id }, 'Mapeamento DTO concluído com sucesso');
      return dto;
    } catch (err) {
      logger.error({ err, id, clinicaId }, 'FALHA CRÍTICA: Erro no getOne/toFaturaDTO');
      throw err;
    }
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

  async checkContingencyStatus(clinicaId: string): Promise<boolean> {
    const activeContingency = await prisma.sequenciaDocFiscal.findFirst({
      where: {
        clinicaId,
        isContingency: true,
        endTS: null
      }
    });
    return !!activeContingency;
  },

  isNetworkError(error: any): boolean {
    if (!error) return false;
    const code = error.code || (error.cause as any)?.code;
    const status = error.status || error.response?.status;
    return (
      code === 'ECONNABORTED' || // Timeout
      code === 'ENOTFOUND' ||    // DNS Down
      code === 'ECONNREFUSED' || // Conexão Recusada
      code === 'ETIMEDOUT' ||    // Timeout genérico
      status === 503 ||          // Service Unavailable
      status === 504 ||          // Gateway Timeout
      (status && status >= 500)  // Queda de servidor AGT
    );
  },

  async activarContingenciaAutomatica(faturaId: string, clinicaId: string): Promise<void> {
    logger.warn({ faturaId }, 'Rede AGT indisponível. Marcando fatura em contingência');
    
    await prisma.fatura.update({
      where: { id: faturaId, clinicaId },
      data: {
        statusEnvio: 'CONTINGENCIA',
        emContingencia: true
      }
    });

    const fatura = await prisma.fatura.findUnique({
      where: { id: faturaId },
      select: { serieDocFiscal: true, tipoDocFiscal: true }
    });

    if (fatura) {
      const anoFiscal = new Date().getFullYear();
      await prisma.sequenciaDocFiscal.updateMany({
        where: {
          clinicaId,
          serie: fatura.serieDocFiscal,
          tipoDoc: fatura.tipoDocFiscal,
          anoFiscal
        },
        data: {
          isContingency: true,
          startTS: new Date(),
          endTS: null,
          isRegistered: false
        }
      });
    }

    await prisma.sistemaEvento.create({
      data: {
        clinicaId,
        tipo: 'API_ERROR',
        severidade: 'WARN',
        mensagem: `Submissão falhou. Factura ${faturaId} colocada em fila de contingência.`
      }
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

function toFaturaDTO(fatura: unknown): FaturaDTO {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = fatura as any;
  try {
    const dto: FaturaDTO = {
      id: f.id,
    clinicaId: f.clinicaId,
    numeroFatura: f.numeroFatura,
    agendamentoId: f.agendamentoId || null,
    pacienteId: f.pacienteId,
    medicoId: f.medicoId || null,
    tipo: f.tipo,
    estado: f.estado,
    subtotal: f.subtotal,
    desconto: f.desconto,
    totalIva: f.totalIva,
    total: f.total,
    notas: f.notas || null,
    dataEmissao: f.dataEmissao?.toISOString() || null,
    dataVencimento: f.dataVencimento?.toISOString() || null,
    criadoEm: f.criadoEm.toISOString(),
    atualizadoEm: f.atualizadoEm.toISOString(),
    // Campos Fiscais (AGT)
    tipoDocFiscal: f.tipoDocFiscal,
    valorExtenso: f.valorExtenso,
    retencaoFonte: f.retencaoFonte,
    valorPago: f.valorPago,
    moeda: f.moeda,
    fiscalHash: f.fiscalHash || null,
    hashAnterior: f.documentoChave?.split(';').pop() || null,
    hashControl: f.hashControl || null,
    documentoChave: f.documentoChave || null,
     statusEnvio: f.statusEnvio,
     emContingencia: f.emContingencia,
     agtRequestID: f.agtRequestID || null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itens: (f.itens as any[] | undefined)?.map((i: any) => ({
      id: i.id,
      faturaId: f.id,
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
    pagamentos: (f.pagamentos as any[] | undefined)?.map((p: any) => {
      const pag = {
        id: p.id,
        clinicaId: f.clinicaId,
        faturaId: f.id,
        metodo: p.metodo,
        valor: p.valor,
        referencia: p.referencia || null,
        criadoPor: p.criadoPor || 'SISTEMA',
        criadoEm: p.criadoEm.toISOString(),
      } as PagamentoDTO;

      if (p.seguro) {
        pag.seguro = {
          pagamentoId: p.seguro.pagamentoId,
          seguradora: p.seguro.seguradora,
          numeroBeneficiario: p.seguro.numeroBeneficiario,
          numeroAutorizacao: p.seguro.numeroAutorizacao || null,
          valorSolicitado: p.seguro.valorSolicitado,
          valorAprovado: p.seguro.valorAprovado,
          estado: p.seguro.estado,
          dataSubmissao: p.seguro.dataSubmissao?.toISOString(),
          dataResposta: p.seguro.dataResposta?.toISOString(),
          notasSeguradora: p.seguro.notasSeguradora || null
        };
      }
      return pag as PagamentoDTO;
    }) || []
  };

  if (f.paciente) {
    dto.paciente = {
      id: f.paciente.id,
      nome: f.paciente.nome,
      numeroPaciente: f.paciente.numeroPaciente,
      endereco: f.paciente.endereco || null
    };
  }

  if (f.medico) {
    dto.medico = {
      id: f.medico.id,
      nome: f.medico.nome
    };
  }

  return dto;
  } catch (err) {
    logger.error({ err, faturaId: f?.id, faturaKeys: Object.keys(f || {}) }, 'Erro interno no toFaturaDTO');
    throw err;
  }
}
