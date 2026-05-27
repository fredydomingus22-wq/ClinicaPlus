"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.faturasService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
const auditLog_service_1 = require("./auditLog.service");
const eventBus_1 = require("../lib/eventBus");
const types_1 = require("@clinicaplus/types");
const types_2 = require("@clinicaplus/types");
const webhooks_service_1 = require("./webhooks.service");
const permissao_service_1 = require("./permissao.service");
const utils_1 = require("@clinicaplus/utils");
const server_1 = require("@clinicaplus/utils/server");
const logger_1 = require("../lib/logger");
const AgtApiClient_1 = require("./fiscal/AgtApiClient");
const SequenciaService_1 = require("./fiscal/SequenciaService");
const queues_1 = require("../lib/queues");
const secretCrypto_1 = require("../lib/secretCrypto");
const estoqueCalculo_service_1 = require("./estoqueCalculo.service");
// Opcional: Extrair para FaturaNumberService se ficar mais complexo
exports.faturasService = {
    async create(data, clinicaId, criadoPor) {
        const { planEnforcementService } = await Promise.resolve().then(() => __importStar(require('./planEnforcement.service')));
        await planEnforcementService.check(clinicaId, 'consultas');
        const clinica = await prisma_1.prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: {
                regimeFiscal: true,
                serieDocFiscal: true
            }
        });
        if (!clinica)
            throw new AppError_1.AppError('Clínica não encontrada', 404);
        // NOVO: Processar itens polimórficos
        const itensProcessados = await Promise.all(data.itens.map(async (item) => {
            if (item.tipoItem === types_1.TipoItemFatura.PRODUTO && item.produtoId) {
                const produto = await prisma_1.prisma.produto.findFirst({
                    where: { id: item.produtoId, clinicaId },
                    select: {
                        id: true,
                        nome: true,
                        precoVenda: true,
                        taxaIva: true,
                        codigoIva: true,
                        motivoIsencao: true,
                        gerenciaEstoque: true,
                    },
                });
                if (!produto)
                    throw new AppError_1.AppError('Produto não encontrado', 404);
                // Validar estoque se gerenciaEstoque
                if (produto.gerenciaEstoque) {
                    const estoqueAtual = await estoqueCalculo_service_1.estoqueCalculoService.calcularEstoqueProduto(clinicaId, produto.id);
                    if (estoqueAtual < item.quantidade) {
                        throw new AppError_1.AppError(`Estoque insuficiente para ${produto.nome}. Disponível: ${estoqueAtual}`, 400);
                    }
                }
                return {
                    ...item,
                    descricao: item.descricao || produto.nome,
                    precoUnit: item.precoUnit || produto.precoVenda,
                    taxaIva: item.taxaIva ?? produto.taxaIva,
                    codigoIva: item.codigoIva || produto.codigoIva,
                    motivoIsencao: item.motivoIsencao ?? produto.motivoIsencao,
                };
            }
            if (item.tipoItem === types_1.TipoItemFatura.TRATAMENTO && item.tratamentoId) {
                const tratamento = await prisma_1.prisma.tipoTratamento.findFirst({
                    where: { id: item.tratamentoId, clinicaId },
                    select: { id: true, nome: true, preco: true },
                });
                if (!tratamento)
                    throw new AppError_1.AppError('Tratamento não encontrado', 404);
                return {
                    ...item,
                    descricao: item.descricao || tratamento.nome,
                    precoUnit: item.precoUnit || tratamento.preco,
                };
            }
            if (item.tipoItem === types_1.TipoItemFatura.EXAME && item.exameId) {
                const exame = await prisma_1.prisma.tipoExameClinica.findFirst({
                    where: { id: item.exameId, clinicaId },
                    select: { id: true, nome: true, preco: true },
                });
                if (!exame)
                    throw new AppError_1.AppError('Exame não encontrado', 404);
                return {
                    ...item,
                    descricao: item.descricao || exame.nome,
                    precoUnit: item.precoUnit || exame.preco,
                };
            }
            if (item.tipoItem === types_1.TipoItemFatura.CONSULTA && item.medicoId) {
                const medico = await prisma_1.prisma.medico.findFirst({
                    where: { id: item.medicoId, clinicaId },
                    select: { id: true, nome: true, preco: true },
                });
                if (!medico)
                    throw new AppError_1.AppError('Médico não encontrado', 404);
                return {
                    ...item,
                    descricao: item.descricao || `Consulta - ${medico.nome}`,
                    precoUnit: item.precoUnit || medico.preco,
                };
            }
            // SERVICO - manter como está
            return item;
        }));
        const tipoDoc = (data.tipoDocFiscal || types_2.TipoDocumentoFiscal.FT);
        const { formatado: numeroFatura } = await (0, SequenciaService_1.proximoNumero)(prisma_1.prisma, clinicaId, tipoDoc);
        const { subtotal, totalDesconto, totalIva, total, itensCalculados } = (0, utils_1.calcularFatura)(itensProcessados, clinica.regimeFiscal);
        const fatura = await prisma_1.prisma.fatura.create({
            data: {
                clinicaId,
                numeroFatura,
                agendamentoId: data.agendamentoId || null,
                pacienteId: data.pacienteId,
                medicoId: data.medicoId || null,
                tipo: data.tipo,
                tipoDocFiscal: tipoDoc,
                serieDocFiscal: clinica.serieDocFiscal,
                estado: client_1.EstadoFatura.RASCUNHO,
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
                        tipoItem: item.tipoItem || types_1.TipoItemFatura.SERVICO,
                        produtoId: item.produtoId || null,
                        tratamentoId: item.tratamentoId || null,
                        exameId: item.exameId || null,
                        medicoId: item.medicoId || null,
                        descricao: item.descricao || 'Item sem descrição',
                        quantidade: item.quantidade,
                        precoUnit: item.precoUnit,
                        desconto: item.desconto,
                        taxaIva: item.taxaIva,
                        codigoIva: item.codigoIva,
                        motivoIsencao: (item.motivoIsencao || null),
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
        const valorExtenso = (0, utils_1.numberToWords)(fatura.total);
        await prisma_1.prisma.fatura.update({
            where: { id: fatura.id },
            data: { valorExtenso }
        });
        await auditLog_service_1.auditLogService.log({
            actorId: criadoPor,
            accao: 'CREATE',
            recurso: 'fatura',
            recursoId: fatura.id,
            depois: fatura,
            clinicaId,
        });
        return toFaturaDTO(fatura);
    },
    async listItensFacturaveis(clinicaId, busca, tipo) {
        const itens = [];
        // Produtos
        if (!tipo || tipo === types_1.TipoItemFatura.PRODUTO) {
            const produtos = await prisma_1.prisma.produto.findMany({
                where: {
                    clinicaId,
                    ativo: true,
                    ...(busca ? {
                        OR: [
                            { nome: { contains: busca, mode: 'insensitive' } },
                            { codigo: { contains: busca, mode: 'insensitive' } },
                        ],
                    } : {}),
                },
                select: {
                    id: true,
                    nome: true,
                    codigo: true,
                    precoVenda: true,
                    taxaIva: true,
                    codigoIva: true,
                    motivoIsencao: true,
                    gerenciaEstoque: true,
                },
                orderBy: { nome: 'asc' },
            });
            const produtoIds = produtos.map(p => p.id);
            const estoqueBatch = await estoqueCalculo_service_1.estoqueCalculoService.calcularEstoqueBatch(clinicaId, produtoIds);
            itens.push(...produtos.map(p => ({
                id: p.id,
                tipo: types_1.TipoItemFatura.PRODUTO,
                nome: p.nome,
                codigo: p.codigo,
                preco: p.precoVenda,
                taxaIva: p.taxaIva,
                codigoIva: p.codigoIva,
                motivoIsencao: p.motivoIsencao,
                estoqueAtual: estoqueBatch[p.id] || 0,
                gerenciaEstoque: p.gerenciaEstoque,
            })));
        }
        // Tratamentos
        if (!tipo || tipo === types_1.TipoItemFatura.TRATAMENTO) {
            const tratamentos = await prisma_1.prisma.tipoTratamento.findMany({
                where: {
                    clinicaId,
                    ativo: true,
                    ...(busca ? {
                        OR: [
                            { nome: { contains: busca, mode: 'insensitive' } },
                        ],
                    } : {}),
                },
                select: {
                    id: true,
                    nome: true,
                    preco: true,
                },
                orderBy: { nome: 'asc' },
            });
            itens.push(...tratamentos.map(t => ({
                id: t.id,
                tipo: types_1.TipoItemFatura.TRATAMENTO,
                nome: t.nome,
                codigo: null,
                preco: t.preco,
                taxaIva: 14,
                codigoIva: 'IVA',
                motivoIsencao: null,
            })));
        }
        // Exames
        if (!tipo || tipo === types_1.TipoItemFatura.EXAME) {
            const exames = await prisma_1.prisma.tipoExameClinica.findMany({
                where: {
                    clinicaId,
                    ativo: true,
                    ...(busca ? {
                        OR: [
                            { nome: { contains: busca, mode: 'insensitive' } },
                        ],
                    } : {}),
                },
                select: {
                    id: true,
                    nome: true,
                    preco: true,
                },
                orderBy: { nome: 'asc' },
            });
            itens.push(...exames.map(e => ({
                id: e.id,
                tipo: types_1.TipoItemFatura.EXAME,
                nome: e.nome,
                codigo: null,
                preco: e.preco,
                taxaIva: 14,
                codigoIva: 'IVA',
                motivoIsencao: null,
            })));
        }
        // Consultas (Médicos)
        if (!tipo || tipo === types_1.TipoItemFatura.CONSULTA) {
            const medicos = await prisma_1.prisma.medico.findMany({
                where: {
                    clinicaId,
                    ativo: true,
                    ...(busca ? {
                        OR: [
                            { nome: { contains: busca, mode: 'insensitive' } },
                        ],
                    } : {}),
                },
                select: {
                    id: true,
                    nome: true,
                    preco: true,
                },
                orderBy: { nome: 'asc' },
            });
            itens.push(...medicos.map(m => ({
                id: m.id,
                tipo: types_1.TipoItemFatura.CONSULTA,
                nome: `Consulta - ${m.nome}`,
                codigo: null,
                preco: m.preco,
                taxaIva: 14,
                codigoIva: 'IVA',
                motivoIsencao: null,
            })));
        }
        return itens;
    },
    async emitir(id, clinicaId, criadoPor) {
        const { proximoNumero } = await Promise.resolve().then(() => __importStar(require('./fiscal/SequenciaService')));
        const { CertificationService } = await Promise.resolve().then(() => __importStar(require('./fiscal/CertificationService')));
        const { calcularFatura } = await Promise.resolve().then(() => __importStar(require('@clinicaplus/utils')));
        const faturaEmitida = await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Buscar fatura
            const fatura = await tx.fatura.findUnique({
                where: { id, clinicaId },
                include: { itens: true, paciente: true, clinica: true },
            });
            if (!fatura)
                throw new AppError_1.AppError('Fatura não encontrada', 404);
            if (fatura.estado !== client_1.EstadoFatura.RASCUNHO) {
                throw new AppError_1.AppError(`Apenas faturas em RASCUNHO podem ser emitidas. Estado actual: ${fatura.estado}`, 409);
            }
            if (!fatura.itens || fatura.itens.length === 0) {
                throw new AppError_1.AppError('A fatura deve ter pelo menos um item para ser emitida', 400);
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
                logger_1.logger.warn({ clinicaId, clinicaRaw }, 'Dados fiscais da clínica incompletos para emissão');
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
                logger_1.logger.error({ clinicaId, clinicaRaw }, 'Dados fiscais incompletos para emissão');
                throw new AppError_1.AppError('Dados fiscais da clínica incompletos. Configure o NIF, Razão Social e Endereço.', 400);
            }
            // 4. Instanciar serviço de certificação com as chaves da clínica
            const certService = new CertificationService((0, server_1.resolveAgtTenantKeys)(clinica, secretCrypto_1.decryptSecret));
            // 3. Recalcular — Prisma devolve motivoIsencao: string | null; ItemCalculo espera string? (sem null).
            // Com exactOptionalPropertyTypes:true não podemos passar undefined explicitamente,
            // por isso omitimos a propriedade quando o valor é null.
            const itensParaCalculo = fatura.itens.map(({ motivoIsencao, ...rest }) => ({
                ...rest,
                ...(motivoIsencao !== null ? { motivoIsencao } : {}),
            }));
            const calculo = calcularFatura(itensParaCalculo, clinica.regimeFiscal || 'GERAL');
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
            const dataDocumento = fatura.criadoEm;
            const assinatura = certService.assinarDocumento({
                dataEmissao: agora,
                dataDocumento,
                numero: numeroFatura,
                total: calculo.total,
                hashAnterior,
            });
            // 7. Snapshot
            await tx.faturaSnapshot.create({
                data: {
                    faturaId: id,
                    emitenteNif: clinica.nif,
                    emitenteNome: clinica.razaoSocial,
                    emitenteEndereco: clinica.enderecoPostal,
                    emitenteCidade: clinica.cidade || null,
                    emitenteProvincia: clinica.provincia || null,
                    clienteNome: fatura.paciente.nome,
                    clienteNif: fatura.paciente.nif || '999999999',
                    clienteCountry: (0, server_1.resolveCustomerCountry)(fatura.paciente.nif),
                    clienteEndereco: fatura.paciente.endereco,
                    serieDocFiscal: serieParaUsar,
                    regimeFiscal: clinica.regimeFiscal ?? client_1.RegimeFiscal.GERAL,
                }
            });
            // 8. Atualizar
            const faturaActualizada = await tx.fatura.update({
                where: { id },
                data: {
                    estado: fatura.tipoDocFiscal === types_2.TipoDocumentoFiscal.FR ? client_1.EstadoFatura.PAGA : client_1.EstadoFatura.EMITIDA,
                    numeroFatura,
                    serieDocFiscal: serieParaUsar,
                    dataEmissao: agora,
                    subtotal: calculo.subtotal,
                    totalIva: calculo.totalIva,
                    total: calculo.total,
                    valorPago: fatura.tipoDocFiscal === types_2.TipoDocumentoFiscal.FR ? calculo.total : fatura.valorPago,
                    fiscalHash: assinatura.hash,
                    hashControl: assinatura.hashControl,
                    documentoChave: `${agora.toISOString().split('T')[0]};${dataDocumento.toISOString().split('T')[0]};${numeroFatura};${(calculo.total).toFixed(2)};${hashAnterior}`,
                    statusEnvio: isContingencyActive ? 'CONTINGENCIA' : 'PENDENTE',
                    emContingencia: isContingencyActive
                },
                include: { itens: true, pagamentos: true, paciente: true },
            });
            // 8. Se for FR, registar um pagamento automático (Método padrão: NUMERARIO se não especificado)
            if (fatura.tipoDocFiscal === types_2.TipoDocumentoFiscal.FR) {
                await tx.pagamento.create({
                    data: {
                        clinicaId,
                        faturaId: id,
                        metodo: types_2.MetodoPagamento.DINHEIRO, // Fallback para FR sem pagamento prévio
                        valor: calculo.total,
                        notas: 'Pagamento automático via Factura-Recibo (FR)',
                        criadoPor,
                    }
                });
            }
            // NOVO: Deduzir stock apenas para PRODUTO após emissão bem-sucedida
            for (const item of faturaActualizada.itens) {
                if (item.tipoItem === types_1.TipoItemFatura.PRODUTO && item.produtoId) {
                    // Buscar lote FIFO
                    const { encontrarLoteFIFO } = await Promise.resolve().then(() => __importStar(require('./estoqueCalculo.service')));
                    const loteId = await encontrarLoteFIFO(clinicaId, item.produtoId, item.quantidade);
                    if (loteId) {
                        // Atualizar quantidade do lote
                        await tx.estoqueLote.update({
                            where: { id: loteId },
                            data: { quantidade: { decrement: item.quantidade } },
                        });
                        // Registar movimentação
                        await tx.movimentacaoEstoque.create({
                            data: {
                                clinicaId,
                                produtoId: item.produtoId,
                                loteId,
                                quantidade: item.quantidade,
                                tipo: 'VENDA',
                                motivo: `Venda na fatura ${numeroFatura}`,
                                documentoRef: numeroFatura,
                                utilizadorId: criadoPor,
                            },
                        });
                    }
                }
            }
            return faturaActualizada;
        }, { isolationLevel: 'Serializable' }).catch(error => {
            logger_1.logger.error({ error, faturaId: id, clinicaId }, 'Erro na transacção de emissão de fatura');
            if (error instanceof AppError_1.AppError)
                throw error;
            throw new AppError_1.AppError(`Erro ao emitir fatura: ${error.message || 'Erro interno'}`, 400);
        });
        await auditLog_service_1.auditLogService.log({
            actorId: criadoPor,
            accao: 'UPDATE',
            recurso: 'fatura',
            recursoId: faturaEmitida.id,
            depois: { numero: faturaEmitida.numeroFatura, total: faturaEmitida.total },
            clinicaId,
        });
        await (0, eventBus_1.publishEvent)(`clinica:${clinicaId}`, 'fatura:emitida', { id: faturaEmitida.id, numeroFatura: faturaEmitida.numeroFatura });
        webhooks_service_1.webhooksService.trigger(types_2.EventoWebhook.FATURA_EMITIDA, faturaEmitida, clinicaId);
        if (!faturaEmitida.emContingencia) {
            await queues_1.reportAgtQueue.add('report-agt', { faturaId: faturaEmitida.id, clinicaId }, { jobId: `report-agt-${faturaEmitida.id}` });
        }
        return toFaturaDTO(faturaEmitida);
    },
    /**
     * Submete uma fatura para a AGT em tempo real
     */
    async submeterParaAgt(faturaId, clinicaId) {
        const fatura = await prisma_1.prisma.fatura.findUnique({
            where: { id: faturaId, clinicaId },
            include: {
                itens: true,
                paciente: true,
                clinica: true,
                snapshot: true,
            }
        });
        if (!fatura || !fatura.fiscalHash)
            return;
        try {
            const { CertificationService } = await Promise.resolve().then(() => __importStar(require('./fiscal/CertificationService')));
            const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
            const certService = new CertificationService((0, server_1.resolveAgtTenantKeys)(fatura.clinica || {}, secretCrypto_1.decryptSecret));
            const clienteNome = fatura.snapshot?.clienteNome ?? fatura.paciente?.nome ?? 'Consumidor Final';
            const clienteNif = fatura.snapshot?.clienteNif ?? fatura.paciente?.nif ?? '999999999';
            const clienteCountry = fatura.snapshot?.clienteCountry ?? (0, server_1.resolveCustomerCountry)(clienteNif);
            const taxRegistrationNumber = fatura.clinica?.nif || '999999999';
            if (!fatura.snapshot?.emitenteNome) {
                throw new AppError_1.AppError('Snapshot fiscal incompleto: emitenteNome em falta. Re-emita o documento para gerar snapshot correctamente.', 400);
            }
            const emitenteNome = fatura.snapshot.emitenteNome;
            const agtPayload = (0, server_1.buildAgtRegistarFacturaPayload)({
                numeroFatura: fatura.numeroFatura,
                tipoDocFiscal: fatura.tipoDocFiscal,
                dataEmissao: fatura.dataEmissao || new Date(),
                systemEntryDate: fatura.criadoEm,
                subtotal: fatura.subtotal,
                totalIva: fatura.totalIva,
                total: fatura.total,
                retencaoFonte: fatura.retencaoFonte,
                taxRegistrationNumber,
                emitenteNome,
                clienteNif,
                clienteNome,
                clienteCountry,
                itens: fatura.itens.map((item) => ({
                    id: item.id,
                    descricao: item.descricao,
                    quantidade: item.quantidade,
                    precoUnit: item.precoUnit,
                    desconto: item.desconto,
                    taxaIva: item.taxaIva,
                    codigoIva: item.codigoIva,
                })),
            }, certService, {
                submissionUUID: crypto.randomUUID(),
                softwareInfoDetail: (0, server_1.getDefaultAgtSoftwareInfoDetail)(),
                eacCode: process.env.AGT_EAC_CODE || '86201',
            });
            const response = await AgtApiClient_1.agtApiClient.registarFactura(agtPayload, AgtApiClient_1.agtApiClient.getBasicAuth());
            let statusEnvio = response.errorList && response.errorList.length > 0 ? 'ERRO' : 'ENVIADO';
            if (statusEnvio === 'ENVIADO' && response.requestID) {
                try {
                    const poll = await (0, server_1.pollAgtSubmissionStatus)(() => AgtApiClient_1.agtApiClient.obterEstado((0, server_1.buildAgtObterEstadoPayload)(taxRegistrationNumber, response.requestID, certService), AgtApiClient_1.agtApiClient.getBasicAuth()), {
                        maxAttempts: Number(process.env.AGT_POLL_MAX_ATTEMPTS || 5),
                    });
                    statusEnvio = poll.status;
                }
                catch (pollError) {
                    logger_1.logger.warn({ faturaId, requestID: response.requestID, pollError }, 'Registo aceite; validação assíncrona pendente (obterEstado)');
                }
            }
            await prisma_1.prisma.fatura.update({
                where: { id: faturaId },
                data: {
                    agtRequestID: response.requestID || null,
                    statusEnvio,
                    notas: response.message ? `${fatura.notas}\nAGT: ${response.message}` : fatura.notas
                }
            });
            logger_1.logger.info({ faturaId, requestID: response.requestID, statusEnvio }, 'Fatura registada na AGT com sucesso');
        }
        catch (error) {
            // Se falha de rede, marcar fatura em contingência
            const err = error;
            if (this.isNetworkError(err)) {
                await this.activarContingenciaAutomatica(faturaId, fatura.clinica?.id || clinicaId);
            }
            else {
                await prisma_1.prisma.fatura.update({
                    where: { id: faturaId },
                    data: { statusEnvio: 'ERRO' }
                });
            }
        }
    },
    async criarNotaCredito(faturaOriginalId, clinicaId, motivo, criadoPor) {
        await permissao_service_1.permissaoService.requirePermission(criadoPor, 'fatura', 'void');
        const faturaOriginal = await prisma_1.prisma.fatura.findUnique({
            where: { id: faturaOriginalId, clinicaId },
            include: { itens: true }
        });
        if (!faturaOriginal) {
            throw new AppError_1.AppError('Fatura não encontrada', 404);
        }
        if (faturaOriginal.estado !== client_1.EstadoFatura.EMITIDA && faturaOriginal.estado !== client_1.EstadoFatura.PAGA) {
            throw new AppError_1.AppError('Só é possível criar nota de crédito para facturas emitidas ou pagas', 409);
        }
        const { planEnforcementService } = await Promise.resolve().then(() => __importStar(require('./planEnforcement.service')));
        await planEnforcementService.check(clinicaId, 'consultas');
        const novaNC = await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Marcar original como ANULADA
            await tx.fatura.update({
                where: { id: faturaOriginalId },
                data: {
                    estado: client_1.EstadoFatura.ANULADA,
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
                    tipoDocFiscal: types_2.TipoDocumentoFiscal.NC,
                    faturaOriginalId,
                    pacienteId: faturaOriginal.pacienteId,
                    medicoId: faturaOriginal.medicoId,
                    tipo: faturaOriginal.tipo,
                    estado: client_1.EstadoFatura.RASCUNHO,
                    subtotal: -subtotal,
                    desconto: -descontoTotal,
                    totalIva: -totalIva,
                    retencaoFonte: -(faturaOriginal.retencaoFonte),
                    total: totalFinal,
                    valorExtenso: (0, utils_1.numberToWords)(Math.abs(totalFinal)),
                    notas: `Anulação da fatura ${faturaOriginal.numeroFatura} - Motivo: ${motivo}`,
                    itens: {
                        create: itensNC
                    }
                }
            });
        });
        await auditLog_service_1.auditLogService.log({
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
    async criarNotaDebito(faturaOriginalId, clinicaId, data, criadoPor) {
        await permissao_service_1.permissaoService.requirePermission(criadoPor, 'fatura', 'update');
        const faturaOriginal = await prisma_1.prisma.fatura.findUnique({
            where: { id: faturaOriginalId, clinicaId },
            include: { itens: true }
        });
        if (!faturaOriginal)
            throw new AppError_1.AppError('Fatura não encontrada', 404);
        if (faturaOriginal.estado !== client_1.EstadoFatura.EMITIDA && faturaOriginal.estado !== client_1.EstadoFatura.PAGA) {
            throw new AppError_1.AppError('Só é possível criar nota de débito para facturas emitidas ou pagas', 409);
        }
        const novaND = await prisma_1.prisma.$transaction(async (tx) => {
            const clinica = await tx.clinica.findUnique({ where: { id: clinicaId }, select: { regimeFiscal: true } });
            if (!clinica)
                throw new AppError_1.AppError('Clínica não encontrada', 404);
            const { subtotal, totalIva, total, itensCalculados } = (0, utils_1.calcularFatura)(data.itens, clinica.regimeFiscal || 'GERAL');
            return tx.fatura.create({
                data: {
                    numeroFatura: 'DRAFT',
                    clinicaId,
                    tipoDocFiscal: types_2.TipoDocumentoFiscal.ND,
                    faturaOriginalId,
                    pacienteId: faturaOriginal.pacienteId,
                    medicoId: faturaOriginal.medicoId,
                    tipo: faturaOriginal.tipo,
                    estado: client_1.EstadoFatura.RASCUNHO,
                    subtotal,
                    desconto: 0,
                    totalIva,
                    total,
                    valorExtenso: (0, utils_1.numberToWords)(total),
                    notas: `Nota de débito complementar à fatura ${faturaOriginal.numeroFatura} - Motivo: ${data.motivo}`,
                    itens: {
                        create: itensCalculados.map(i => ({
                            descricao: i.descricao || 'Item sem descrição',
                            quantidade: i.quantidade,
                            precoUnit: i.precoUnit,
                            desconto: i.desconto,
                            taxaIva: i.taxaIva,
                            codigoIva: i.codigoIva,
                            motivoIsencao: (i.motivoIsencao || null),
                            total: i.total
                        }))
                    }
                }
            });
        });
        await auditLog_service_1.auditLogService.log({
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
    async registarPagamento(faturaId, data, clinicaId, criadoPor) {
        const fatura = await prisma_1.prisma.fatura.findUnique({
            where: { id: faturaId, clinicaId },
            include: { pagamentos: true },
        });
        if (!fatura) {
            throw new AppError_1.AppError('Fatura não encontrada', 404);
        }
        if (fatura.estado === client_1.EstadoFatura.ANULADA) {
            throw new AppError_1.AppError('Não é possível registar pagamentos em faturas anuladas', 409, 'INVOICE_VOIDED');
        }
        if (fatura.estado === client_1.EstadoFatura.RASCUNHO) {
            throw new AppError_1.AppError('A fatura deve ser emitida antes de registar pagamentos', 409);
        }
        if (fatura.estado === client_1.EstadoFatura.PAGA) {
            throw new AppError_1.AppError('Esta fatura já se encontra totalmente paga', 409);
        }
        const valorPagamento = Math.round(data.valor);
        // Validação de valor em excesso
        const totalPagoAteAgora = fatura.pagamentos.reduce((acc, p) => acc + (p.valor || 0), 0);
        const saldoDevedor = fatura.total - totalPagoAteAgora;
        if (valorPagamento > saldoDevedor) {
            const valorFormatado = (valorPagamento / 100).toFixed(2);
            const saldoFormatado = (saldoDevedor / 100).toFixed(2);
            throw new AppError_1.AppError(`O valor introduzido (${valorFormatado} Kz) excede o saldo devedor (${saldoFormatado} Kz) deste documento.`, 400, 'PAYMENT_EXCEEDS_BALANCE');
        }
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const { CertificationService } = await Promise.resolve().then(() => __importStar(require('./fiscal/CertificationService')));
            const { proximoNumero } = await Promise.resolve().then(() => __importStar(require('./fiscal/SequenciaService')));
            const agora = new Date();
            const clinica = await tx.clinica.findUnique({ where: { id: clinicaId } });
            if (!clinica)
                throw new AppError_1.AppError('Clínica não encontrada', 404);
            const certificationService = new CertificationService((0, server_1.resolveAgtTenantKeys)(clinica, secretCrypto_1.decryptSecret));
            const serieDocFiscal = clinica.serieDocFiscal || 'CPLS';
            const hashAnterior = await certificationService.obterHashAnteriorRecibo(clinicaId, serieDocFiscal, tx);
            const { formatado: numeroRecibo } = await proximoNumero(tx, clinicaId, client_1.TipoDocumentoFiscal.RC, serieDocFiscal);
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
                    ...(data.metodo === types_2.MetodoPagamento.SEGURO && data.seguro ? {
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
                    estado: novoTotalPago >= fatura.total ? client_1.EstadoFatura.PAGA : fatura.estado,
                    valorPago: novoTotalPago
                },
            });
            await auditLog_service_1.auditLogService.log({
                actorId: criadoPor,
                accao: 'CREATE',
                recurso: 'pagamento',
                recursoId: pagamento.id,
                depois: pagamento,
                clinicaId,
            });
            return pagamento;
        });
        const dto = result;
        // Trigger Webhooks se a fatura ficou paga
        const faturaActualizada = await prisma_1.prisma.fatura.findUnique({
            where: { id: faturaId },
            select: { estado: true }
        });
        if (faturaActualizada?.estado === client_1.EstadoFatura.PAGA) {
            webhooks_service_1.webhooksService.trigger(types_2.EventoWebhook.FATURA_PAGA, { faturaId }, clinicaId);
        }
        return dto;
    },
    async list(filters, clinicaId) {
        const page = parseInt(String(filters.page || '1'), 10);
        const limit = parseInt(String(filters.limit || '10'), 10);
        const skip = (page - 1) * limit;
        const where = { clinicaId };
        if (filters.estado)
            where.estado = filters.estado;
        if (filters.pacienteId)
            where.pacienteId = filters.pacienteId;
        if (filters.medicoId)
            where.medicoId = filters.medicoId;
        if (filters.tipo)
            where.tipo = filters.tipo;
        if (filters.dataInicio || filters.dataFim) {
            where.dataEmissao = {
                gte: filters.dataInicio ? new Date(String(filters.dataInicio)) : undefined,
                lte: filters.dataFim ? new Date(String(filters.dataFim)) : undefined,
            };
        }
        const [total, faturas] = await Promise.all([
            prisma_1.prisma.fatura.count({ where }),
            prisma_1.prisma.fatura.findMany({
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
    async getOne(id, clinicaId) {
        const fatura = await prisma_1.prisma.fatura.findUnique({
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
                throw new AppError_1.AppError('Fatura não encontrada', 404);
            }
            logger_1.logger.info({ id, clinicaId }, 'Iniciando mapeamento DTO para fatura');
            const dto = toFaturaDTO(fatura);
            logger_1.logger.info({ id }, 'Mapeamento DTO concluído com sucesso');
            return dto;
        }
        catch (err) {
            logger_1.logger.error({ err, id, clinicaId }, 'FALHA CRÍTICA: Erro no getOne/toFaturaDTO');
            throw err;
        }
    },
    async submeterSeguro(pagamentoId, clinicaId) {
        const seguro = await prisma_1.prisma.seguroPagamento.findUnique({
            where: { pagamentoId },
            include: { pagamento: true }
        });
        if (!seguro || seguro.pagamento.clinicaId !== clinicaId) {
            throw new AppError_1.AppError('Pagamento com seguro não encontrado', 404);
        }
        if (seguro.estado !== 'PENDENTE') {
            throw new AppError_1.AppError(`Não é possível submeter um seguro no estado ${seguro.estado}`, 400);
        }
        await prisma_1.prisma.seguroPagamento.update({
            where: { pagamentoId },
            data: {
                estado: 'SUBMETIDO',
                dataSubmissao: new Date(),
            },
        });
    },
    async registarRespostaSeguro(pagamentoId, clinicaId, data) {
        const seguro = await prisma_1.prisma.seguroPagamento.findUnique({
            where: { pagamentoId },
            include: { pagamento: true }
        });
        if (!seguro || seguro.pagamento.clinicaId !== clinicaId) {
            throw new AppError_1.AppError('Pagamento com seguro não encontrado', 404);
        }
        if (seguro.estado !== 'SUBMETIDO') {
            throw new AppError_1.AppError(`Não é possível registar resposta para um seguro no estado ${seguro.estado}`, 400);
        }
        await prisma_1.prisma.seguroPagamento.update({
            where: { pagamentoId },
            data: {
                estado: data.estado,
                valorAprovado: data.estado === 'APROVADO' ? (data.valorAprovado ?? seguro.valorSolicitado) : 0,
                notasSeguradora: data.notas ?? null,
                dataResposta: new Date(),
            },
        });
    },
    async checkContingencyStatus(clinicaId) {
        const activeContingency = await prisma_1.prisma.sequenciaDocFiscal.findFirst({
            where: {
                clinicaId,
                isContingency: true,
                endTS: null
            }
        });
        return !!activeContingency;
    },
    isNetworkError(error) {
        if (!error)
            return false;
        const code = error.code || error.cause?.code;
        const status = error.status || error.response?.status;
        return (code === 'ECONNABORTED' || // Timeout
            code === 'ENOTFOUND' || // DNS Down
            code === 'ECONNREFUSED' || // Conexão Recusada
            code === 'ETIMEDOUT' || // Timeout genérico
            status === 503 || // Service Unavailable
            status === 504 || // Gateway Timeout
            (status && status >= 500) // Queda de servidor AGT
        );
    },
    async activarContingenciaAutomatica(faturaId, clinicaId) {
        logger_1.logger.warn({ faturaId }, 'Rede AGT indisponível. Marcando fatura em contingência');
        await prisma_1.prisma.fatura.update({
            where: { id: faturaId, clinicaId },
            data: {
                statusEnvio: 'CONTINGENCIA',
                emContingencia: true
            }
        });
        const fatura = await prisma_1.prisma.fatura.findUnique({
            where: { id: faturaId },
            select: { serieDocFiscal: true, tipoDocFiscal: true }
        });
        if (fatura) {
            const anoFiscal = new Date().getFullYear();
            await prisma_1.prisma.sequenciaDocFiscal.updateMany({
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
        await prisma_1.prisma.sistemaEvento.create({
            data: {
                clinicaId,
                tipo: 'API_ERROR',
                severidade: 'WARN',
                mensagem: `Submissão falhou. Factura ${faturaId} colocada em fila de contingência.`
            }
        });
    },
    async exportRelatorio(clinicaId, userId) {
        await permissao_service_1.permissaoService.requirePermission(userId, 'relatorio', 'export');
        // Lógica delegada para o relatoriosRouter, mas o service pode ter hooks ou logs.
        await auditLog_service_1.auditLogService.log({
            actorId: userId,
            accao: 'EXPORT',
            recurso: 'relatorio',
            clinicaId,
        });
    },
};
function toFaturaDTO(fatura) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const f = fatura;
    try {
        const dto = {
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
            serieDocFiscal: f.serieDocFiscal,
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
            itens: f.itens?.map((i) => ({
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
            pagamentos: f.pagamentos?.map((p) => {
                const pag = {
                    id: p.id,
                    clinicaId: f.clinicaId,
                    faturaId: f.id,
                    metodo: p.metodo,
                    valor: p.valor,
                    referencia: p.referencia || null,
                    criadoPor: p.criadoPor || 'SISTEMA',
                    criadoEm: p.criadoEm.toISOString(),
                };
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
                return pag;
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
    }
    catch (err) {
        logger_1.logger.error({ err, faturaId: f?.id, faturaKeys: Object.keys(f || {}) }, 'Erro interno no toFaturaDTO');
        throw err;
    }
}
