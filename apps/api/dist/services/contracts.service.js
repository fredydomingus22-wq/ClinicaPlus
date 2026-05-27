"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractsService = void 0;
const client_1 = require("@prisma/client");
const AppError_1 = require("../lib/AppError");
const prisma_1 = require("../lib/prisma");
const eventBus_1 = require("../lib/eventBus");
const faturas_service_1 = require("./faturas.service");
const includePayload = {
    servicos: true,
    planoPagamento: true,
    parcelas: { orderBy: { numero: 'asc' } },
    clausulas: { orderBy: { ordem: 'asc' } },
    assinaturas: { orderBy: { criadoEm: 'asc' } },
    aditivos: { orderBy: { criadoEm: 'desc' } },
    paciente: { select: { id: true, nome: true, numeroPaciente: true } },
};
exports.contractsService = {
    canTransition(from, to) {
        const transitions = {
            DRAFT: [client_1.ContractStatus.REVIEW, client_1.ContractStatus.PENDING_SIGNATURE, client_1.ContractStatus.TERMINATED],
            REVIEW: [client_1.ContractStatus.PENDING_SIGNATURE, client_1.ContractStatus.TERMINATED],
            PENDING_SIGNATURE: [client_1.ContractStatus.ACTIVE, client_1.ContractStatus.TERMINATED],
            ACTIVE: [client_1.ContractStatus.SUSPENDED, client_1.ContractStatus.TERMINATED, client_1.ContractStatus.EXPIRED],
            SUSPENDED: [client_1.ContractStatus.ACTIVE, client_1.ContractStatus.TERMINATED],
            TERMINATED: [],
            EXPIRED: [],
        };
        return transitions[from].includes(to);
    },
    async list(clinicaId, status) {
        return prisma_1.prisma.contract.findMany({
            where: { clinicaId, ...(status ? { status } : {}) },
            include: {
                paciente: { select: { id: true, nome: true, numeroPaciente: true } },
                planoPagamento: true,
            },
            orderBy: { criadoEm: 'desc' },
            take: 100,
        });
    },
    async getById(clinicaId, id) {
        const contract = await prisma_1.prisma.contract.findFirst({ where: { id, clinicaId }, include: includePayload });
        if (!contract)
            throw new AppError_1.AppError('Contrato não encontrado', 404);
        return contract;
    },
    async create(clinicaId, actorId, input) {
        const paciente = await prisma_1.prisma.paciente.findFirst({ where: { id: input.pacienteId, clinicaId } });
        if (!paciente)
            throw new AppError_1.AppError('Paciente não encontrado para esta clínica', 404);
        if (!input.allowActiveOverride) {
            const active = await prisma_1.prisma.contract.findFirst({
                where: {
                    clinicaId,
                    pacienteId: input.pacienteId,
                    status: { in: [client_1.ContractStatus.ACTIVE, client_1.ContractStatus.PENDING_SIGNATURE, client_1.ContractStatus.SUSPENDED] },
                },
                select: { id: true, numero: true, status: true },
            });
            if (active) {
                throw new AppError_1.AppError(`Já existe contrato ${active.numero} (${active.status}) para este paciente. Use override explícito para criar outro.`, 409, 'ACTIVE_CONTRACT_EXISTS');
            }
        }
        if (new Date(input.dataFim) <= new Date(input.dataInicio)) {
            throw new AppError_1.AppError('A data de fim deve ser maior que a data de início', 400);
        }
        const now = new Date();
        const serial = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        const numero = `CTR-${serial}`;
        const servicos = await this.normalizeServiceItems(clinicaId, input.servicos);
        const valorTotal = servicos.reduce((acc, item) => acc + item.subtotal, 0);
        const createData = {
            clinica: { connect: { id: clinicaId } },
            paciente: { connect: { id: input.pacienteId } },
            numero,
            titulo: input.titulo,
            status: client_1.ContractStatus.DRAFT,
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
        const contract = await prisma_1.prisma.contract.create({ data: createData, include: includePayload });
        await prisma_1.prisma.contractEvent.create({
            data: {
                contractId: contract.id,
                clinicaId,
                actorId: actorId ?? null,
                type: client_1.ContractEventType.CREATED,
                payload: { status: contract.status, valorTotal: contract.valorTotal },
            },
        });
        await (0, eventBus_1.publishEvent)(`clinica:${clinicaId}`, 'contract:created', { contractId: contract.id, status: contract.status });
        return contract;
    },
    async updateStatus(clinicaId, actorId, id, status) {
        const existing = await prisma_1.prisma.contract.findFirst({ where: { id, clinicaId } });
        if (!existing)
            throw new AppError_1.AppError('Contrato não encontrado', 404);
        if (!this.canTransition(existing.status, status)) {
            throw new AppError_1.AppError(`Transição de estado inválida: ${existing.status} -> ${status}`, 409, 'INVALID_STATUS_TRANSITION');
        }
        const updated = await prisma_1.prisma.contract.update({ where: { id }, data: { status, version: { increment: 1 } }, include: includePayload });
        await prisma_1.prisma.contractEvent.create({
            data: { contractId: id, clinicaId, actorId: actorId ?? null, type: client_1.ContractEventType.STATUS_CHANGED, payload: { from: existing.status, to: status } },
        });
        await (0, eventBus_1.publishEvent)(`clinica:${clinicaId}`, 'contract:status_changed', { contractId: id, status });
        return updated;
    },
    async updateDraft(clinicaId, actorId, id, input) {
        const existing = await prisma_1.prisma.contract.findFirst({ where: { id, clinicaId } });
        if (!existing)
            throw new AppError_1.AppError('Contrato não encontrado', 404);
        if (existing.status !== client_1.ContractStatus.DRAFT && existing.status !== client_1.ContractStatus.REVIEW) {
            throw new AppError_1.AppError('Só contratos em DRAFT/REVIEW podem ser editados diretamente', 409);
        }
        const signedCount = await prisma_1.prisma.contractSignature.count({ where: { contractId: id, status: client_1.ContractSignatureStatus.SIGNED } });
        if (signedCount > 0)
            throw new AppError_1.AppError('Contrato assinado não pode ser editado diretamente. Use aditivo.', 409, 'SIGNED_CONTRACT_IMMUTABLE');
        const data = { version: { increment: 1 } };
        if (input.titulo !== undefined)
            data.titulo = input.titulo;
        if (input.dataInicio !== undefined)
            data.dataInicio = new Date(input.dataInicio);
        if (input.dataFim !== undefined)
            data.dataFim = new Date(input.dataFim);
        if (input.clausulaRescisao !== undefined)
            data.clausulaRescisao = this.toNullable(input.clausulaRescisao);
        if (input.observacoes !== undefined)
            data.observacoes = this.toNullable(input.observacoes);
        if (input.valorEntrada !== undefined)
            data.valorEntrada = input.valorEntrada;
        const updated = await prisma_1.prisma.contract.update({ where: { id }, data, include: includePayload });
        await prisma_1.prisma.contractEvent.create({
            data: {
                contractId: id,
                clinicaId,
                actorId: actorId ?? null,
                type: client_1.ContractEventType.UPDATED,
                payload: { kind: 'DRAFT_UPDATE', fields: Object.keys(input).filter((k) => input[k] !== undefined) },
            },
        });
        await (0, eventBus_1.publishEvent)(`clinica:${clinicaId}`, 'contract:updated', { contractId: id });
        return updated;
    },
    async submit(clinicaId, actorId, id) {
        const existing = await prisma_1.prisma.contract.findFirst({ where: { id, clinicaId } });
        if (!existing)
            throw new AppError_1.AppError('Contrato não encontrado', 404);
        if (existing.status !== client_1.ContractStatus.DRAFT && existing.status !== client_1.ContractStatus.REVIEW)
            throw new AppError_1.AppError('Só contratos em DRAFT/REVIEW podem ser enviados para assinatura', 409);
        return this.updateStatus(clinicaId, actorId, id, client_1.ContractStatus.PENDING_SIGNATURE);
    },
    async activate(clinicaId, actorId, id) {
        const existing = await prisma_1.prisma.contract.findFirst({ where: { id, clinicaId } });
        if (!existing)
            throw new AppError_1.AppError('Contrato não encontrado', 404);
        if (existing.status !== client_1.ContractStatus.PENDING_SIGNATURE)
            throw new AppError_1.AppError('Só contratos em PENDING_SIGNATURE podem ser ativados', 409);
        await this.updateStatus(clinicaId, actorId, id, client_1.ContractStatus.ACTIVE);
        await this.generateInstallments(clinicaId, id);
        return this.getById(clinicaId, id);
    },
    async terminate(clinicaId, actorId, id, input) {
        const existing = await prisma_1.prisma.contract.findFirst({ where: { id, clinicaId } });
        if (!existing)
            throw new AppError_1.AppError('Contrato não encontrado', 404);
        if (existing.status !== client_1.ContractStatus.ACTIVE && existing.status !== client_1.ContractStatus.SUSPENDED)
            throw new AppError_1.AppError('Só contratos ACTIVE/SUSPENDED podem ser rescindidos', 409);
        const updated = await this.updateStatus(clinicaId, actorId, id, client_1.ContractStatus.TERMINATED);
        await prisma_1.prisma.contractEvent.create({
            data: {
                contractId: id,
                clinicaId,
                actorId: actorId ?? null,
                type: client_1.ContractEventType.UPDATED,
                payload: { kind: 'TERMINATION', motivo: input.motivo, dataEfetiva: input.dataEfetiva, saldoAjuste: input.saldoAjuste ?? 0, penalidade: input.penalidade ?? 0 },
            },
        });
        await (0, eventBus_1.publishEvent)(`clinica:${clinicaId}`, 'contract:terminated', { contractId: id });
        return updated;
    },
    async renew(clinicaId, actorId, id, input) {
        const existing = await prisma_1.prisma.contract.findFirst({ where: { id, clinicaId }, include: includePayload });
        if (!existing)
            throw new AppError_1.AppError('Contrato não encontrado', 404);
        const renewableStatuses = [client_1.ContractStatus.ACTIVE, client_1.ContractStatus.EXPIRED, client_1.ContractStatus.TERMINATED];
        if (!renewableStatuses.includes(existing.status))
            throw new AppError_1.AppError('Estado atual não permite renovação', 409);
        const renewedData = {
            clinica: { connect: { id: clinicaId } },
            paciente: { connect: { id: existing.pacienteId } },
            numero: `${existing.numero}-R${existing.version + 1}`,
            titulo: `${existing.titulo} (Renovação)`,
            status: client_1.ContractStatus.DRAFT,
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
        const renewed = await prisma_1.prisma.contract.create({ data: renewedData, include: includePayload });
        await prisma_1.prisma.contractEvent.create({
            data: { contractId: renewed.id, clinicaId, actorId: actorId ?? null, type: client_1.ContractEventType.CREATED, payload: { kind: 'RENEWAL', sourceContractId: id } },
        });
        await (0, eventBus_1.publishEvent)(`clinica:${clinicaId}`, 'contract:renewed', { sourceContractId: id, newContractId: renewed.id });
        return renewed;
    },
    async amend(clinicaId, actorId, id, input) {
        const existing = await prisma_1.prisma.contract.findFirst({ where: { id, clinicaId } });
        if (!existing)
            throw new AppError_1.AppError('Contrato não encontrado', 404);
        const nextNumber = (await prisma_1.prisma.contractAmendment.count({ where: { contractId: id } })) + 1;
        await prisma_1.prisma.contractAmendment.create({
            data: {
                contractId: id,
                numero: nextNumber,
                motivo: input.motivo,
                deltaJson: input.delta,
                status: client_1.ContractAmendmentStatus.DRAFT,
                effectiveDate: new Date(input.effectiveDate),
            },
        });
        const amendmentPayload = {
            kind: 'AMENDMENT',
            numero: nextNumber,
            motivo: input.motivo,
            delta: input.delta,
            effectiveDate: input.effectiveDate,
        };
        await prisma_1.prisma.contractEvent.create({
            data: {
                contractId: id,
                clinicaId,
                actorId: actorId ?? null,
                type: client_1.ContractEventType.AMENDMENT_CREATED,
                payload: amendmentPayload,
            },
        });
        await (0, eventBus_1.publishEvent)(`clinica:${clinicaId}`, 'contract:amended', { contractId: id });
        return this.getById(clinicaId, id);
    },
    async sign(clinicaId, actorId, id, input) {
        const existing = await prisma_1.prisma.contract.findFirst({ where: { id, clinicaId } });
        if (!existing)
            throw new AppError_1.AppError('Contrato não encontrado', 404);
        if (existing.status !== client_1.ContractStatus.PENDING_SIGNATURE)
            throw new AppError_1.AppError('Contrato não está em estado de assinatura', 409);
        const signature = await prisma_1.prisma.contractSignature.create({
            data: {
                contractId: id,
                signerType: input.signerType,
                signerName: input.signerName,
                signerDoc: input.signerDoc ?? null,
                status: client_1.ContractSignatureStatus.SIGNED,
                signedAt: new Date(),
                provider: input.provider ?? null,
                evidenceJson: input.evidenceJson ? input.evidenceJson : client_1.Prisma.JsonNull,
            },
        });
        await prisma_1.prisma.contractEvent.create({
            data: {
                contractId: id,
                clinicaId,
                actorId: actorId ?? null,
                type: client_1.ContractEventType.SIGNATURE_RECORDED,
                payload: { signerType: signature.signerType, signerName: signature.signerName, signedAt: signature.signedAt?.toISOString() },
            },
        });
        await (0, eventBus_1.publishEvent)(`clinica:${clinicaId}`, 'contract:signature_recorded', { contractId: id, signatureId: signature.id });
        return signature;
    },
    async listEvents(clinicaId, contractId) {
        const contract = await prisma_1.prisma.contract.findFirst({ where: { id: contractId, clinicaId }, select: { id: true } });
        if (!contract)
            throw new AppError_1.AppError('Contrato não encontrado', 404);
        return prisma_1.prisma.contractEvent.findMany({ where: { clinicaId, contractId }, orderBy: { criadoEm: 'desc' }, take: 100 });
    },
    async addDocument(clinicaId, contractId, input) {
        const contract = await prisma_1.prisma.contract.findFirst({ where: { id: contractId, clinicaId }, select: { id: true } });
        if (!contract)
            throw new AppError_1.AppError('Contrato não encontrado', 404);
        const doc = await prisma_1.prisma.contractDocument.create({
            data: {
                contractId,
                clinicaId,
                nome: input.nome,
                url: input.url,
                mimeType: input.mimeType ?? null,
                tamanhoBytes: input.tamanhoBytes ?? null,
            },
        });
        await prisma_1.prisma.contractEvent.create({
            data: {
                contractId,
                clinicaId,
                type: client_1.ContractEventType.UPDATED,
                payload: { kind: 'DOCUMENT', nome: input.nome, url: input.url, mimeType: input.mimeType ?? null, tamanhoBytes: input.tamanhoBytes ?? null, criadoEm: new Date().toISOString() },
            },
        });
        await (0, eventBus_1.publishEvent)(`clinica:${clinicaId}`, 'contract:document_added', { contractId, documentId: doc.id });
        return doc;
    },
    async payInstallmentWithReceipt(clinicaId, actorId, contractId, numero, input) {
        const contract = await prisma_1.prisma.contract.findFirst({ where: { id: contractId, clinicaId } });
        if (!contract)
            throw new AppError_1.AppError('Contrato não encontrado', 404);
        const installment = await prisma_1.prisma.contractInstallment.findFirst({ where: { contractId, numero } });
        if (!installment)
            throw new AppError_1.AppError('Parcela não encontrada', 404);
        if (installment.status === 'PAID')
            throw new AppError_1.AppError('Parcela já liquidada', 409);
        const marker = `[CONTRACT:${contractId}]`;
        const requestedFaturaId = input.faturaId;
        const faturaContrato = await prisma_1.prisma.fatura.findFirst({
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
            throw new AppError_1.AppError('Não existe fatura do contrato para liquidar a parcela', 409, 'CONTRACT_INVOICE_NOT_FOUND');
        }
        const pagamento = await faturas_service_1.faturasService.registarPagamento(faturaContrato.id, {
            faturaId: faturaContrato.id,
            metodo: input.metodo,
            valor: installment.valor,
            ...(input.referencia ? { referencia: input.referencia } : {}),
            ...(input.notas ? { notas: input.notas } : {}),
        }, clinicaId, actorId ?? 'SISTEMA');
        const updated = await prisma_1.prisma.contractInstallment.update({
            where: { id: installment.id },
            data: {
                status: 'PAID',
                pagoEm: new Date(),
                metodoPagamento: input.metodo,
                referencia: input.referencia ?? null,
            },
        });
        await prisma_1.prisma.contractEvent.create({
            data: {
                contractId,
                clinicaId,
                actorId: actorId ?? null,
                type: client_1.ContractEventType.PAYMENT_RECORDED,
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
        await (0, eventBus_1.publishEvent)(`clinica:${clinicaId}`, 'contract:installment_paid', {
            contractId,
            numero,
            pagamentoId: pagamento.id,
        });
        return updated;
    },
    async registerPaymentWithReceipt(clinicaId, actorId, contractId, input) {
        const contract = await prisma_1.prisma.contract.findFirst({ where: { id: contractId, clinicaId } });
        if (!contract)
            throw new AppError_1.AppError('Contrato não encontrado', 404);
        if (input.valor <= 0)
            throw new AppError_1.AppError('Valor de pagamento inválido', 400);
        const marker = `[CONTRACT:${contractId}]`;
        const requestedFaturaId = input.faturaId;
        const faturaContrato = await prisma_1.prisma.fatura.findFirst({
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
            throw new AppError_1.AppError('Não existe fatura do contrato para registar pagamento', 409, 'CONTRACT_INVOICE_NOT_FOUND');
        }
        const pagamento = await faturas_service_1.faturasService.registarPagamento(faturaContrato.id, {
            faturaId: faturaContrato.id,
            valor: input.valor,
            metodo: input.metodo,
            ...(input.referencia ? { referencia: input.referencia } : {}),
            ...(input.notas ? { notas: input.notas } : {}),
        }, clinicaId, actorId ?? 'SISTEMA');
        const event = await prisma_1.prisma.contractEvent.create({
            data: {
                contractId,
                clinicaId,
                actorId: actorId ?? null,
                type: client_1.ContractEventType.PAYMENT_RECORDED,
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
        await (0, eventBus_1.publishEvent)(`clinica:${clinicaId}`, 'contract:payment_recorded', {
            contractId,
            eventId: event.id,
            pagamentoId: pagamento.id,
        });
        return event;
    },
    async normalizeServiceItems(clinicaId, items) {
        const normalized = [];
        for (const item of items) {
            if (item.itemType === client_1.ContractItemType.TRATAMENTO) {
                if (!item.tipoTratamentoId)
                    throw new AppError_1.AppError('Item de tratamento exige tipoTratamentoId', 400);
                const tipo = await prisma_1.prisma.tipoTratamento.findFirst({ where: { id: item.tipoTratamentoId, clinicaId, ativo: true } });
                if (!tipo)
                    throw new AppError_1.AppError('Tipo de tratamento inválido para esta clínica', 400);
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
            if (!item.produtoId)
                throw new AppError_1.AppError('Item de serviço/produto exige produtoId', 400);
            const produto = await prisma_1.prisma.produto.findFirst({ where: { id: item.produtoId, clinicaId, ativo: true } });
            if (!produto)
                throw new AppError_1.AppError('Produto/serviço inválido para esta clínica', 400);
            if (item.itemType === client_1.ContractItemType.SERVICO && produto.tipo !== 'SERVICO')
                throw new AppError_1.AppError('Item SERVICO deve referenciar produto tipo SERVICO', 400);
            if (item.itemType === client_1.ContractItemType.PRODUTO && produto.tipo !== 'PRODUTO')
                throw new AppError_1.AppError('Item PRODUTO deve referenciar produto tipo PRODUTO', 400);
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
    async generateInstallments(clinicaId, contractId) {
        const contract = await prisma_1.prisma.contract.findFirst({ where: { id: contractId, clinicaId }, include: { planoPagamento: true } });
        if (!contract)
            throw new AppError_1.AppError('Contrato não encontrado', 404);
        if (!contract.planoPagamento)
            return;
        await prisma_1.prisma.contractInstallment.deleteMany({ where: { contractId } });
        const parcelas = Math.max(contract.planoPagamento.parcelas || 1, 1);
        const base = Math.max(contract.valorTotal - contract.valorEntrada, 0);
        const valorParcela = Math.floor(base / parcelas);
        let remainder = base - valorParcela * parcelas;
        const diaVencimento = contract.planoPagamento.diaVencimento || contract.dataInicio.getDate();
        const rows = [];
        for (let i = 1; i <= parcelas; i++) {
            const due = new Date(contract.dataInicio);
            due.setMonth(due.getMonth() + (i - 1));
            due.setDate(Math.min(diaVencimento, 28));
            const extra = remainder > 0 ? 1 : 0;
            remainder -= extra;
            rows.push({ contractId, numero: i, vencimento: due, valor: valorParcela + extra, status: 'PENDING' });
        }
        if (rows.length)
            await prisma_1.prisma.contractInstallment.createMany({ data: rows });
    },
    toNullable(value) {
        if (value === undefined)
            return null;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    },
    toNullableNumber(value) {
        return value === undefined ? null : value;
    },
};
