import {
  ContractAmendmentStatus,
  ContractEventType,
  ContractItemType,
  ContractPaymentType,
  ContractSignatureStatus,
  ContractStatus,
  Prisma,
} from '@prisma/client';
import { AppError } from '../lib/AppError';
import { prisma } from '../lib/prisma';
import { publishEvent } from '../lib/eventBus';
import { faturasService } from './faturas.service';

type ServiceItemInput = {
  itemType: ContractItemType;
  produtoId?: string;
  tipoTratamentoId?: string;
  quantidade: number;
  precoUnitario?: number;
  desconto?: number;
};

type PaymentPlanInput = {
  tipo: ContractPaymentType;
  parcelas?: number;
  periodicidade?: string;
  diaVencimento?: number;
  jurosMora?: number;
  multa?: number;
};

type CreateContractInput = {
  pacienteId: string;
  titulo: string;
  dataInicio: string;
  dataFim: string;
  moeda?: string;
  valorEntrada?: number;
  clausulaRescisao?: string;
  observacoes?: string;
  servicos: ServiceItemInput[];
  planoPagamento: PaymentPlanInput;
  allowActiveOverride?: boolean;
};

type RegisterPaymentInput = { valor: number; metodo: string; referencia?: string | undefined; notas?: string | undefined; faturaId?: string | undefined };
type UpdateDraftInput = { titulo?: string | undefined; dataInicio?: string | undefined; dataFim?: string | undefined; clausulaRescisao?: string | undefined; observacoes?: string | undefined; valorEntrada?: number | undefined };

const includePayload = {
  servicos: true,
  planoPagamento: true,
  parcelas: { orderBy: { numero: 'asc' as const } },
  clausulas: { orderBy: { ordem: 'asc' as const } },
  assinaturas: { orderBy: { criadoEm: 'asc' as const } },
  aditivos: { orderBy: { criadoEm: 'desc' as const } },
  paciente: { select: { id: true, nome: true, numeroPaciente: true } },
} satisfies Prisma.ContractInclude;

export const contractsService = {
  canTransition(from: ContractStatus, to: ContractStatus) {
    const transitions: Record<ContractStatus, ContractStatus[]> = {
      DRAFT: [ContractStatus.REVIEW, ContractStatus.PENDING_SIGNATURE, ContractStatus.TERMINATED],
      REVIEW: [ContractStatus.PENDING_SIGNATURE, ContractStatus.TERMINATED],
      PENDING_SIGNATURE: [ContractStatus.ACTIVE, ContractStatus.TERMINATED],
      ACTIVE: [ContractStatus.SUSPENDED, ContractStatus.TERMINATED, ContractStatus.EXPIRED],
      SUSPENDED: [ContractStatus.ACTIVE, ContractStatus.TERMINATED],
      TERMINATED: [],
      EXPIRED: [],
    };
    return transitions[from].includes(to);
  },

  async list(clinicaId: string, status?: ContractStatus) {
    return prisma.contract.findMany({
      where: { clinicaId, ...(status ? { status } : {}) },
      include: {
        paciente: { select: { id: true, nome: true, numeroPaciente: true } },
        planoPagamento: true,
      },
      orderBy: { criadoEm: 'desc' },
      take: 100,
    });
  },

  async getById(clinicaId: string, id: string) {
    const contract = await prisma.contract.findFirst({ where: { id, clinicaId }, include: includePayload });
    if (!contract) throw new AppError('Contrato não encontrado', 404);
    return contract;
  },

  async create(clinicaId: string, actorId: string | undefined, input: CreateContractInput) {
    const paciente = await prisma.paciente.findFirst({ where: { id: input.pacienteId, clinicaId } });
    if (!paciente) throw new AppError('Paciente não encontrado para esta clínica', 404);

    if (!input.allowActiveOverride) {
      const active = await prisma.contract.findFirst({
        where: {
          clinicaId,
          pacienteId: input.pacienteId,
          status: { in: [ContractStatus.ACTIVE, ContractStatus.PENDING_SIGNATURE, ContractStatus.SUSPENDED] },
        },
        select: { id: true, numero: true, status: true },
      });
      if (active) {
        throw new AppError(
          `Já existe contrato ${active.numero} (${active.status}) para este paciente. Use override explícito para criar outro.`,
          409,
          'ACTIVE_CONTRACT_EXISTS',
        );
      }
    }

    if (new Date(input.dataFim) <= new Date(input.dataInicio)) {
      throw new AppError('A data de fim deve ser maior que a data de início', 400);
    }

    const now = new Date();
    const serial = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const numero = `CTR-${serial}`;

    const servicos = await this.normalizeServiceItems(clinicaId, input.servicos);
    const valorTotal = servicos.reduce((acc, item) => acc + item.subtotal, 0);

    const createData: Prisma.ContractCreateInput = {
      clinica: { connect: { id: clinicaId } },
      paciente: { connect: { id: input.pacienteId } },
      numero,
      titulo: input.titulo,
      status: ContractStatus.DRAFT,
      dataInicio: new Date(input.dataInicio),
      dataFim: new Date(input.dataFim),
      moeda: input.moeda ?? 'AOA',
      valorTotal,
      valorEntrada: input.valorEntrada ?? 0,
      categoria: 'GENERAL',
      clausulaRescisao: this.toNullable(input.clausulaRescisao),
      observacoes: this.toNullable(input.observacoes),
      servicos: { create: servicos },
      planoPagamento: {
        create: {
          tipo: input.planoPagamento.tipo,
          parcelas: input.planoPagamento.parcelas ?? 1,
          periodicidade: this.toNullable(input.planoPagamento.periodicidade),
          diaVencimento: this.toNullableNumber(input.planoPagamento.diaVencimento),
          jurosMora: input.planoPagamento.jurosMora ?? 0,
          multa: input.planoPagamento.multa ?? 0,
        },
      },
    };
    if (input.clausulaRescisao) {
      createData.clausulas = {
        create: [{ tipo: 'RESCISAO', titulo: 'Cláusula de Rescisão', conteudo: input.clausulaRescisao, ordem: 1 }],
      };
    }

    const contract = await prisma.contract.create({ data: createData, include: includePayload });
    await prisma.contractEvent.create({
      data: {
        contractId: contract.id,
        clinicaId,
        actorId: actorId ?? null,
        type: ContractEventType.CREATED,
        payload: { status: contract.status, valorTotal: contract.valorTotal },
      },
    });
    await publishEvent(`clinica:${clinicaId}`, 'contract:created', { contractId: contract.id, status: contract.status });
    return contract;
  },

  async updateStatus(clinicaId: string, actorId: string | undefined, id: string, status: ContractStatus) {
    const existing = await prisma.contract.findFirst({ where: { id, clinicaId } });
    if (!existing) throw new AppError('Contrato não encontrado', 404);
    if (!this.canTransition(existing.status, status)) {
      throw new AppError(`Transição de estado inválida: ${existing.status} -> ${status}`, 409, 'INVALID_STATUS_TRANSITION');
    }
    const updated = await prisma.contract.update({ where: { id }, data: { status, version: { increment: 1 } }, include: includePayload });
    await prisma.contractEvent.create({
      data: { contractId: id, clinicaId, actorId: actorId ?? null, type: ContractEventType.STATUS_CHANGED, payload: { from: existing.status, to: status } },
    });
    await publishEvent(`clinica:${clinicaId}`, 'contract:status_changed', { contractId: id, status });
    return updated;
  },

  async updateDraft(clinicaId: string, actorId: string | undefined, id: string, input: UpdateDraftInput) {
    const existing = await prisma.contract.findFirst({ where: { id, clinicaId } });
    if (!existing) throw new AppError('Contrato não encontrado', 404);
    if (existing.status !== ContractStatus.DRAFT && existing.status !== ContractStatus.REVIEW) {
      throw new AppError('Só contratos em DRAFT/REVIEW podem ser editados diretamente', 409);
    }
    const signedCount = await prisma.contractSignature.count({ where: { contractId: id, status: ContractSignatureStatus.SIGNED } });
    if (signedCount > 0) throw new AppError('Contrato assinado não pode ser editado diretamente. Use aditivo.', 409, 'SIGNED_CONTRACT_IMMUTABLE');

    const data: Prisma.ContractUpdateInput = { version: { increment: 1 } };
    if (input.titulo !== undefined) data.titulo = input.titulo;
    if (input.dataInicio !== undefined) data.dataInicio = new Date(input.dataInicio);
    if (input.dataFim !== undefined) data.dataFim = new Date(input.dataFim);
    if (input.clausulaRescisao !== undefined) data.clausulaRescisao = this.toNullable(input.clausulaRescisao);
    if (input.observacoes !== undefined) data.observacoes = this.toNullable(input.observacoes);
    if (input.valorEntrada !== undefined) data.valorEntrada = input.valorEntrada;

    const updated = await prisma.contract.update({ where: { id }, data, include: includePayload });
    await prisma.contractEvent.create({
      data: {
        contractId: id,
        clinicaId,
        actorId: actorId ?? null,
        type: ContractEventType.UPDATED,
        payload: { kind: 'DRAFT_UPDATE', fields: Object.keys(input).filter((k) => (input as Record<string, unknown>)[k] !== undefined) },
      },
    });
    await publishEvent(`clinica:${clinicaId}`, 'contract:updated', { contractId: id });
    return updated;
  },

  async submit(clinicaId: string, actorId: string | undefined, id: string) {
    const existing = await prisma.contract.findFirst({ where: { id, clinicaId } });
    if (!existing) throw new AppError('Contrato não encontrado', 404);
    if (existing.status !== ContractStatus.DRAFT && existing.status !== ContractStatus.REVIEW) throw new AppError('Só contratos em DRAFT/REVIEW podem ser enviados para assinatura', 409);
    return this.updateStatus(clinicaId, actorId, id, ContractStatus.PENDING_SIGNATURE);
  },

  async activate(clinicaId: string, actorId: string | undefined, id: string) {
    const existing = await prisma.contract.findFirst({ where: { id, clinicaId } });
    if (!existing) throw new AppError('Contrato não encontrado', 404);
    if (existing.status !== ContractStatus.PENDING_SIGNATURE) throw new AppError('Só contratos em PENDING_SIGNATURE podem ser ativados', 409);
    await this.updateStatus(clinicaId, actorId, id, ContractStatus.ACTIVE);
    await this.generateInstallments(clinicaId, id);
    return this.getById(clinicaId, id);
  },

  async terminate(clinicaId: string, actorId: string | undefined, id: string, input: { motivo: string; dataEfetiva: string; saldoAjuste?: number | undefined; penalidade?: number | undefined }) {
    const existing = await prisma.contract.findFirst({ where: { id, clinicaId } });
    if (!existing) throw new AppError('Contrato não encontrado', 404);
    if (existing.status !== ContractStatus.ACTIVE && existing.status !== ContractStatus.SUSPENDED) throw new AppError('Só contratos ACTIVE/SUSPENDED podem ser rescindidos', 409);
    const updated = await this.updateStatus(clinicaId, actorId, id, ContractStatus.TERMINATED);
    await prisma.contractEvent.create({
      data: {
        contractId: id,
        clinicaId,
        actorId: actorId ?? null,
        type: ContractEventType.UPDATED,
        payload: { kind: 'TERMINATION', motivo: input.motivo, dataEfetiva: input.dataEfetiva, saldoAjuste: input.saldoAjuste ?? 0, penalidade: input.penalidade ?? 0 },
      },
    });
    await publishEvent(`clinica:${clinicaId}`, 'contract:terminated', { contractId: id });
    return updated;
  },

  async renew(clinicaId: string, actorId: string | undefined, id: string, input: { dataInicio: string; dataFim: string; observacoes?: string | undefined }) {
    const existing = await prisma.contract.findFirst({ where: { id, clinicaId }, include: includePayload });
    if (!existing) throw new AppError('Contrato não encontrado', 404);
    const renewableStatuses: ContractStatus[] = [ContractStatus.ACTIVE, ContractStatus.EXPIRED, ContractStatus.TERMINATED];
    if (!renewableStatuses.includes(existing.status)) throw new AppError('Estado atual não permite renovação', 409);

    const renewedData: Prisma.ContractCreateInput = {
      clinica: { connect: { id: clinicaId } },
      paciente: { connect: { id: existing.pacienteId } },
      numero: `${existing.numero}-R${existing.version + 1}`,
      titulo: `${existing.titulo} (Renovação)`,
      status: ContractStatus.DRAFT,
      dataInicio: new Date(input.dataInicio),
      dataFim: new Date(input.dataFim),
      moeda: existing.moeda,
      valorTotal: existing.valorTotal,
      valorEntrada: existing.valorEntrada,
      categoria: existing.categoria,
      clausulaRescisao: existing.clausulaRescisao,
      observacoes: this.toNullable(input.observacoes) ?? existing.observacoes,
      servicos: {
        create: existing.servicos.map((s) => ({
          itemType: s.itemType,
          produtoId: s.produtoId ?? null,
          tipoTratamentoId: s.tipoTratamentoId ?? null,
          descricao: s.descricao,
          quantidade: s.quantidade,
          precoUnitario: s.precoUnitario,
          desconto: s.desconto,
          subtotal: s.subtotal,
        })),
      },
    };
    if (existing.planoPagamento) {
      renewedData.planoPagamento = {
        create: {
          tipo: existing.planoPagamento.tipo,
          parcelas: existing.planoPagamento.parcelas,
          periodicidade: existing.planoPagamento.periodicidade,
          diaVencimento: existing.planoPagamento.diaVencimento,
          jurosMora: existing.planoPagamento.jurosMora,
          multa: existing.planoPagamento.multa,
        },
      };
    }

    const renewed = await prisma.contract.create({ data: renewedData, include: includePayload });
    await prisma.contractEvent.create({
      data: { contractId: renewed.id, clinicaId, actorId: actorId ?? null, type: ContractEventType.CREATED, payload: { kind: 'RENEWAL', sourceContractId: id } },
    });
    await publishEvent(`clinica:${clinicaId}`, 'contract:renewed', { sourceContractId: id, newContractId: renewed.id });
    return renewed;
  },

  async amend(clinicaId: string, actorId: string | undefined, id: string, input: { motivo: string; delta: Record<string, unknown>; effectiveDate: string }) {
    const existing = await prisma.contract.findFirst({ where: { id, clinicaId } });
    if (!existing) throw new AppError('Contrato não encontrado', 404);
    const nextNumber = (await prisma.contractAmendment.count({ where: { contractId: id } })) + 1;
    await prisma.contractAmendment.create({
      data: {
        contractId: id,
        numero: nextNumber,
        motivo: input.motivo,
        deltaJson: input.delta as Prisma.InputJsonValue,
        status: ContractAmendmentStatus.DRAFT,
        effectiveDate: new Date(input.effectiveDate),
      },
    });
    const amendmentPayload = {
      kind: 'AMENDMENT',
      numero: nextNumber,
      motivo: input.motivo,
      delta: input.delta,
      effectiveDate: input.effectiveDate,
    } as Prisma.InputJsonValue;
    await prisma.contractEvent.create({
      data: {
        contractId: id,
        clinicaId,
        actorId: actorId ?? null,
        type: ContractEventType.AMENDMENT_CREATED,
        payload: amendmentPayload,
      },
    });
    await publishEvent(`clinica:${clinicaId}`, 'contract:amended', { contractId: id });
    return this.getById(clinicaId, id);
  },

  async sign(clinicaId: string, actorId: string | undefined, id: string, input: { signerType: 'CLINIC' | 'PATIENT' | 'GUARDIAN'; signerName: string; signerDoc?: string | undefined; provider?: string | undefined; evidenceJson?: Record<string, unknown> | undefined }) {
    const existing = await prisma.contract.findFirst({ where: { id, clinicaId } });
    if (!existing) throw new AppError('Contrato não encontrado', 404);
    if (existing.status !== ContractStatus.PENDING_SIGNATURE) throw new AppError('Contrato não está em estado de assinatura', 409);

    const signature = await prisma.contractSignature.create({
      data: {
        contractId: id,
        signerType: input.signerType,
        signerName: input.signerName,
        signerDoc: input.signerDoc ?? null,
        status: ContractSignatureStatus.SIGNED,
        signedAt: new Date(),
        provider: input.provider ?? null,
        evidenceJson: input.evidenceJson ? (input.evidenceJson as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
    await prisma.contractEvent.create({
      data: {
        contractId: id,
        clinicaId,
        actorId: actorId ?? null,
        type: ContractEventType.SIGNATURE_RECORDED,
        payload: { signerType: signature.signerType, signerName: signature.signerName, signedAt: signature.signedAt?.toISOString() },
      },
    });
    await publishEvent(`clinica:${clinicaId}`, 'contract:signature_recorded', { contractId: id, signatureId: signature.id });
    return signature;
  },

  async listEvents(clinicaId: string, contractId: string) {
    const contract = await prisma.contract.findFirst({ where: { id: contractId, clinicaId }, select: { id: true } });
    if (!contract) throw new AppError('Contrato não encontrado', 404);
    return prisma.contractEvent.findMany({ where: { clinicaId, contractId }, orderBy: { criadoEm: 'desc' }, take: 100 });
  },

  async addDocument(clinicaId: string, contractId: string, input: { nome: string; url: string; mimeType?: string | undefined; tamanhoBytes?: number | undefined }) {
    const contract = await prisma.contract.findFirst({ where: { id: contractId, clinicaId }, select: { id: true } });
    if (!contract) throw new AppError('Contrato não encontrado', 404);
    const doc = await prisma.contractDocument.create({
      data: {
        contractId,
        clinicaId,
        nome: input.nome,
        url: input.url,
        mimeType: input.mimeType ?? null,
        tamanhoBytes: input.tamanhoBytes ?? null,
      },
    });
    await prisma.contractEvent.create({
      data: {
        contractId,
        clinicaId,
        type: ContractEventType.UPDATED,
        payload: { kind: 'DOCUMENT', nome: input.nome, url: input.url, mimeType: input.mimeType ?? null, tamanhoBytes: input.tamanhoBytes ?? null, criadoEm: new Date().toISOString() },
      },
    });
    await publishEvent(`clinica:${clinicaId}`, 'contract:document_added', { contractId, documentId: doc.id });
    return doc;
  },
  async payInstallmentWithReceipt(
    clinicaId: string,
    actorId: string | undefined,
    contractId: string,
    numero: number,
    input: { metodo: string; referencia?: string | undefined; notas?: string | undefined; faturaId?: string | undefined },
  ) {
    const contract = await prisma.contract.findFirst({ where: { id: contractId, clinicaId } });
    if (!contract) throw new AppError('Contrato não encontrado', 404);

    const installment = await prisma.contractInstallment.findFirst({ where: { contractId, numero } });
    if (!installment) throw new AppError('Parcela não encontrada', 404);
    if (installment.status === 'PAID') throw new AppError('Parcela já liquidada', 409);

    const marker = `[CONTRACT:${contractId}]`;
    const requestedFaturaId = input.faturaId;
    const faturaContrato = await prisma.fatura.findFirst({
      where: {
        clinicaId,
        pacienteId: contract.pacienteId,
        ...(requestedFaturaId ? { id: requestedFaturaId } : {}),
        notas: { contains: marker },
        estado: 'EMITIDA',
      },
      orderBy: { criadoEm: 'desc' },
      select: { id: true },
    });
    if (!faturaContrato) {
      throw new AppError('Não existe fatura do contrato para liquidar a parcela', 409, 'CONTRACT_INVOICE_NOT_FOUND');
    }

    const pagamento = await faturasService.registarPagamento(
      faturaContrato.id,
      {
        faturaId: faturaContrato.id,
        metodo: input.metodo as any,
        valor: installment.valor,
        ...(input.referencia ? { referencia: input.referencia } : {}),
        ...(input.notas ? { notas: input.notas } : {}),
      },
      clinicaId,
      actorId ?? 'SISTEMA',
    );

    const updated = await prisma.contractInstallment.update({
      where: { id: installment.id },
      data: {
        status: 'PAID',
        pagoEm: new Date(),
        metodoPagamento: input.metodo,
        referencia: input.referencia ?? null,
      },
    });

    await prisma.contractEvent.create({
      data: {
        contractId,
        clinicaId,
        actorId: actorId ?? null,
        type: ContractEventType.PAYMENT_RECORDED,
        payload: {
          kind: 'INSTALLMENT_PAYMENT',
          numero: updated.numero,
          valor: updated.valor,
          metodo: input.metodo,
          referencia: input.referencia ?? null,
          notas: input.notas ?? null,
          pagamentoId: pagamento.id,
          numeroRecibo: pagamento.numeroRecibo ?? null,
          pagoEm: updated.pagoEm?.toISOString(),
        },
      },
    });

    await publishEvent(`clinica:${clinicaId}`, 'contract:installment_paid', {
      contractId,
      numero,
      pagamentoId: pagamento.id,
    });
    return updated;
  },

  async registerPaymentWithReceipt(
    clinicaId: string,
    actorId: string | undefined,
    contractId: string,
    input: RegisterPaymentInput,
  ) {
    const contract = await prisma.contract.findFirst({ where: { id: contractId, clinicaId } });
    if (!contract) throw new AppError('Contrato não encontrado', 404);
    if (input.valor <= 0) throw new AppError('Valor de pagamento inválido', 400);

    const marker = `[CONTRACT:${contractId}]`;
    const requestedFaturaId = (input as any).faturaId as string | undefined;
    const faturaContrato = await prisma.fatura.findFirst({
      where: {
        clinicaId,
        pacienteId: contract.pacienteId,
        ...(requestedFaturaId ? { id: requestedFaturaId } : {}),
        notas: { contains: marker },
        estado: { not: 'ANULADA' },
      },
      orderBy: { criadoEm: 'desc' },
      select: { id: true },
    });
    if (!faturaContrato) {
      throw new AppError('Não existe fatura do contrato para registar pagamento', 409, 'CONTRACT_INVOICE_NOT_FOUND');
    }

    const pagamento = await faturasService.registarPagamento(
      faturaContrato.id,
      {
        faturaId: faturaContrato.id,
        valor: input.valor,
        metodo: input.metodo as any,
        ...(input.referencia ? { referencia: input.referencia } : {}),
        ...(input.notas ? { notas: input.notas } : {}),
      },
      clinicaId,
      actorId ?? 'SISTEMA',
    );

    const event = await prisma.contractEvent.create({
      data: {
        contractId,
        clinicaId,
        actorId: actorId ?? null,
        type: ContractEventType.PAYMENT_RECORDED,
        payload: {
          kind: 'PAYMENT',
          pagamentoId: pagamento.id,
          numeroRecibo: pagamento.numeroRecibo ?? null,
          valor: input.valor,
          metodo: input.metodo,
          referencia: input.referencia ?? null,
          notas: input.notas ?? null,
          registadoEm: new Date().toISOString(),
        },
      },
    });
    await publishEvent(`clinica:${clinicaId}`, 'contract:payment_recorded', {
      contractId,
      eventId: event.id,
      pagamentoId: pagamento.id,
    });
    return event;
  },

  async normalizeServiceItems(clinicaId: string, items: ServiceItemInput[]) {
    const normalized: Array<{
      itemType: ContractItemType;
      produtoId: string | null;
      tipoTratamentoId: string | null;
      descricao: string;
      quantidade: number;
      precoUnitario: number;
      desconto: number;
      subtotal: number;
    }> = [];

    for (const item of items) {
      if (item.itemType === ContractItemType.TRATAMENTO) {
        if (!item.tipoTratamentoId) throw new AppError('Item de tratamento exige tipoTratamentoId', 400);
        const tipo = await prisma.tipoTratamento.findFirst({ where: { id: item.tipoTratamentoId, clinicaId, ativo: true } });
        if (!tipo) throw new AppError('Tipo de tratamento inválido para esta clínica', 400);
        const precoUnitario = tipo.preco;
        const desconto = item.desconto ?? 0;
        normalized.push({
          itemType: item.itemType,
          produtoId: null,
          tipoTratamentoId: item.tipoTratamentoId,
          descricao: tipo.nome,
          quantidade: item.quantidade,
          precoUnitario,
          desconto,
          subtotal: Math.max(item.quantidade * precoUnitario - desconto, 0),
        });
        continue;
      }

      if (!item.produtoId) throw new AppError('Item de serviço/produto exige produtoId', 400);
      const produto = await prisma.produto.findFirst({ where: { id: item.produtoId, clinicaId, ativo: true } });
      if (!produto) throw new AppError('Produto/serviço inválido para esta clínica', 400);
      if (item.itemType === ContractItemType.SERVICO && produto.tipo !== 'SERVICO') throw new AppError('Item SERVICO deve referenciar produto tipo SERVICO', 400);
      if (item.itemType === ContractItemType.PRODUTO && produto.tipo !== 'PRODUTO') throw new AppError('Item PRODUTO deve referenciar produto tipo PRODUTO', 400);

      const precoUnitario = produto.precoVenda;
      const desconto = item.desconto ?? 0;
      normalized.push({
        itemType: item.itemType,
        produtoId: item.produtoId,
        tipoTratamentoId: null,
        descricao: produto.nome,
        quantidade: item.quantidade,
        precoUnitario,
        desconto,
        subtotal: Math.max(item.quantidade * precoUnitario - desconto, 0),
      });
    }

    return normalized;
  },

  async generateInstallments(clinicaId: string, contractId: string) {
    const contract = await prisma.contract.findFirst({ where: { id: contractId, clinicaId }, include: { planoPagamento: true } });
    if (!contract) throw new AppError('Contrato não encontrado', 404);
    if (!contract.planoPagamento) return;

    await prisma.contractInstallment.deleteMany({ where: { contractId } });
    const parcelas = Math.max(contract.planoPagamento.parcelas || 1, 1);
    const base = Math.max(contract.valorTotal - contract.valorEntrada, 0);
    const valorParcela = Math.floor(base / parcelas);
    let remainder = base - valorParcela * parcelas;
    const diaVencimento = contract.planoPagamento.diaVencimento || contract.dataInicio.getDate();

    const rows: Prisma.ContractInstallmentCreateManyInput[] = [];
    for (let i = 1; i <= parcelas; i++) {
      const due = new Date(contract.dataInicio);
      due.setMonth(due.getMonth() + (i - 1));
      due.setDate(Math.min(diaVencimento, 28));
      const extra = remainder > 0 ? 1 : 0;
      remainder -= extra;
      rows.push({ contractId, numero: i, vencimento: due, valor: valorParcela + extra, status: 'PENDING' });
    }
    if (rows.length) await prisma.contractInstallment.createMany({ data: rows });
  },

  toNullable(value?: string): string | null {
    if (value === undefined) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  },

  toNullableNumber(value?: number): number | null {
    return value === undefined ? null : value;
  },
};

