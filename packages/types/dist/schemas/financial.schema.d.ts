import { z } from 'zod';
import { EstadoFatura, TipoFatura, MetodoPagamento, EstadoSeguro, TipoDocumentoFiscal } from '../enums';
export declare enum TipoItemFatura {
    PRODUTO = "PRODUTO",
    TRATAMENTO = "TRATAMENTO",
    EXAME = "EXAME",
    CONSULTA = "CONSULTA",
    SERVICO = "SERVICO"
}
export declare const ItemFaturaSchema: z.ZodEffects<z.ZodObject<{
    tipoItem: z.ZodDefault<z.ZodNativeEnum<typeof TipoItemFatura>>;
    produtoId: z.ZodOptional<z.ZodString>;
    tratamentoId: z.ZodOptional<z.ZodString>;
    exameId: z.ZodOptional<z.ZodString>;
    medicoId: z.ZodOptional<z.ZodString>;
    descricao: z.ZodString;
    quantidade: z.ZodDefault<z.ZodNumber>;
    precoUnit: z.ZodNumber;
    desconto: z.ZodDefault<z.ZodNumber>;
    taxaIva: z.ZodDefault<z.ZodNumber>;
    codigoIva: z.ZodDefault<z.ZodString>;
    motivoIsencao: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    descricao: string;
    quantidade: number;
    precoUnit: number;
    desconto: number;
    taxaIva: number;
    codigoIva: string;
    tipoItem: TipoItemFatura;
    medicoId?: string | undefined;
    motivoIsencao?: string | undefined;
    produtoId?: string | undefined;
    tratamentoId?: string | undefined;
    exameId?: string | undefined;
}, {
    descricao: string;
    precoUnit: number;
    medicoId?: string | undefined;
    quantidade?: number | undefined;
    desconto?: number | undefined;
    taxaIva?: number | undefined;
    codigoIva?: string | undefined;
    motivoIsencao?: string | undefined;
    tipoItem?: TipoItemFatura | undefined;
    produtoId?: string | undefined;
    tratamentoId?: string | undefined;
    exameId?: string | undefined;
}>, {
    descricao: string;
    quantidade: number;
    precoUnit: number;
    desconto: number;
    taxaIva: number;
    codigoIva: string;
    tipoItem: TipoItemFatura;
    medicoId?: string | undefined;
    motivoIsencao?: string | undefined;
    produtoId?: string | undefined;
    tratamentoId?: string | undefined;
    exameId?: string | undefined;
}, {
    descricao: string;
    precoUnit: number;
    medicoId?: string | undefined;
    quantidade?: number | undefined;
    desconto?: number | undefined;
    taxaIva?: number | undefined;
    codigoIva?: string | undefined;
    motivoIsencao?: string | undefined;
    tipoItem?: TipoItemFatura | undefined;
    produtoId?: string | undefined;
    tratamentoId?: string | undefined;
    exameId?: string | undefined;
}>;
export declare const ItemFacturavelSelectSchema: z.ZodObject<{
    id: z.ZodString;
    tipo: z.ZodNativeEnum<typeof TipoItemFatura>;
    nome: z.ZodString;
    codigo: z.ZodNullable<z.ZodString>;
    preco: z.ZodNumber;
    taxaIva: z.ZodNumber;
    codigoIva: z.ZodString;
    motivoIsencao: z.ZodNullable<z.ZodString>;
    estoqueAtual: z.ZodOptional<z.ZodNumber>;
    gerenciaEstoque: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    nome: string;
    preco: number;
    tipo: TipoItemFatura;
    taxaIva: number;
    codigoIva: string;
    motivoIsencao: string | null;
    id: string;
    codigo: string | null;
    estoqueAtual?: number | undefined;
    gerenciaEstoque?: boolean | undefined;
}, {
    nome: string;
    preco: number;
    tipo: TipoItemFatura;
    taxaIva: number;
    codigoIva: string;
    motivoIsencao: string | null;
    id: string;
    codigo: string | null;
    estoqueAtual?: number | undefined;
    gerenciaEstoque?: boolean | undefined;
}>;
export type ItemFacturavelSelect = z.infer<typeof ItemFacturavelSelectSchema>;
export declare const FaturaCreateSchema: z.ZodObject<{
    agendamentoId: z.ZodOptional<z.ZodString>;
    pacienteId: z.ZodString;
    medicoId: z.ZodOptional<z.ZodString>;
    tipo: z.ZodDefault<z.ZodNativeEnum<typeof TipoFatura>>;
    tipoDocFiscal: z.ZodDefault<z.ZodNativeEnum<typeof TipoDocumentoFiscal>>;
    itens: z.ZodArray<z.ZodEffects<z.ZodObject<{
        tipoItem: z.ZodDefault<z.ZodNativeEnum<typeof TipoItemFatura>>;
        produtoId: z.ZodOptional<z.ZodString>;
        tratamentoId: z.ZodOptional<z.ZodString>;
        exameId: z.ZodOptional<z.ZodString>;
        medicoId: z.ZodOptional<z.ZodString>;
        descricao: z.ZodString;
        quantidade: z.ZodDefault<z.ZodNumber>;
        precoUnit: z.ZodNumber;
        desconto: z.ZodDefault<z.ZodNumber>;
        taxaIva: z.ZodDefault<z.ZodNumber>;
        codigoIva: z.ZodDefault<z.ZodString>;
        motivoIsencao: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        descricao: string;
        quantidade: number;
        precoUnit: number;
        desconto: number;
        taxaIva: number;
        codigoIva: string;
        tipoItem: TipoItemFatura;
        medicoId?: string | undefined;
        motivoIsencao?: string | undefined;
        produtoId?: string | undefined;
        tratamentoId?: string | undefined;
        exameId?: string | undefined;
    }, {
        descricao: string;
        precoUnit: number;
        medicoId?: string | undefined;
        quantidade?: number | undefined;
        desconto?: number | undefined;
        taxaIva?: number | undefined;
        codigoIva?: string | undefined;
        motivoIsencao?: string | undefined;
        tipoItem?: TipoItemFatura | undefined;
        produtoId?: string | undefined;
        tratamentoId?: string | undefined;
        exameId?: string | undefined;
    }>, {
        descricao: string;
        quantidade: number;
        precoUnit: number;
        desconto: number;
        taxaIva: number;
        codigoIva: string;
        tipoItem: TipoItemFatura;
        medicoId?: string | undefined;
        motivoIsencao?: string | undefined;
        produtoId?: string | undefined;
        tratamentoId?: string | undefined;
        exameId?: string | undefined;
    }, {
        descricao: string;
        precoUnit: number;
        medicoId?: string | undefined;
        quantidade?: number | undefined;
        desconto?: number | undefined;
        taxaIva?: number | undefined;
        codigoIva?: string | undefined;
        motivoIsencao?: string | undefined;
        tipoItem?: TipoItemFatura | undefined;
        produtoId?: string | undefined;
        tratamentoId?: string | undefined;
        exameId?: string | undefined;
    }>, "many">;
    desconto: z.ZodDefault<z.ZodNumber>;
    retencaoFonte: z.ZodDefault<z.ZodNumber>;
    notas: z.ZodOptional<z.ZodString>;
    dataEmissao: z.ZodOptional<z.ZodString>;
    retrodatar: z.ZodDefault<z.ZodBoolean>;
    dataVencimento: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    pacienteId: string;
    tipo: TipoFatura;
    desconto: number;
    itens: {
        descricao: string;
        quantidade: number;
        precoUnit: number;
        desconto: number;
        taxaIva: number;
        codigoIva: string;
        tipoItem: TipoItemFatura;
        medicoId?: string | undefined;
        motivoIsencao?: string | undefined;
        produtoId?: string | undefined;
        tratamentoId?: string | undefined;
        exameId?: string | undefined;
    }[];
    tipoDocFiscal: TipoDocumentoFiscal;
    retencaoFonte: number;
    retrodatar: boolean;
    medicoId?: string | undefined;
    agendamentoId?: string | undefined;
    notas?: string | undefined;
    dataEmissao?: string | undefined;
    dataVencimento?: string | undefined;
}, {
    pacienteId: string;
    itens: {
        descricao: string;
        precoUnit: number;
        medicoId?: string | undefined;
        quantidade?: number | undefined;
        desconto?: number | undefined;
        taxaIva?: number | undefined;
        codigoIva?: string | undefined;
        motivoIsencao?: string | undefined;
        tipoItem?: TipoItemFatura | undefined;
        produtoId?: string | undefined;
        tratamentoId?: string | undefined;
        exameId?: string | undefined;
    }[];
    medicoId?: string | undefined;
    tipo?: TipoFatura | undefined;
    agendamentoId?: string | undefined;
    desconto?: number | undefined;
    notas?: string | undefined;
    dataEmissao?: string | undefined;
    dataVencimento?: string | undefined;
    tipoDocFiscal?: TipoDocumentoFiscal | undefined;
    retencaoFonte?: number | undefined;
    retrodatar?: boolean | undefined;
}>;
export type FaturaCreateInput = z.infer<typeof FaturaCreateSchema>;
export declare const FaturaUpdateSchema: z.ZodObject<{
    agendamentoId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    pacienteId: z.ZodOptional<z.ZodString>;
    medicoId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    tipo: z.ZodOptional<z.ZodDefault<z.ZodNativeEnum<typeof TipoFatura>>>;
    tipoDocFiscal: z.ZodOptional<z.ZodDefault<z.ZodNativeEnum<typeof TipoDocumentoFiscal>>>;
    itens: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        tipoItem: z.ZodDefault<z.ZodNativeEnum<typeof TipoItemFatura>>;
        produtoId: z.ZodOptional<z.ZodString>;
        tratamentoId: z.ZodOptional<z.ZodString>;
        exameId: z.ZodOptional<z.ZodString>;
        medicoId: z.ZodOptional<z.ZodString>;
        descricao: z.ZodString;
        quantidade: z.ZodDefault<z.ZodNumber>;
        precoUnit: z.ZodNumber;
        desconto: z.ZodDefault<z.ZodNumber>;
        taxaIva: z.ZodDefault<z.ZodNumber>;
        codigoIva: z.ZodDefault<z.ZodString>;
        motivoIsencao: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        descricao: string;
        quantidade: number;
        precoUnit: number;
        desconto: number;
        taxaIva: number;
        codigoIva: string;
        tipoItem: TipoItemFatura;
        medicoId?: string | undefined;
        motivoIsencao?: string | undefined;
        produtoId?: string | undefined;
        tratamentoId?: string | undefined;
        exameId?: string | undefined;
    }, {
        descricao: string;
        precoUnit: number;
        medicoId?: string | undefined;
        quantidade?: number | undefined;
        desconto?: number | undefined;
        taxaIva?: number | undefined;
        codigoIva?: string | undefined;
        motivoIsencao?: string | undefined;
        tipoItem?: TipoItemFatura | undefined;
        produtoId?: string | undefined;
        tratamentoId?: string | undefined;
        exameId?: string | undefined;
    }>, {
        descricao: string;
        quantidade: number;
        precoUnit: number;
        desconto: number;
        taxaIva: number;
        codigoIva: string;
        tipoItem: TipoItemFatura;
        medicoId?: string | undefined;
        motivoIsencao?: string | undefined;
        produtoId?: string | undefined;
        tratamentoId?: string | undefined;
        exameId?: string | undefined;
    }, {
        descricao: string;
        precoUnit: number;
        medicoId?: string | undefined;
        quantidade?: number | undefined;
        desconto?: number | undefined;
        taxaIva?: number | undefined;
        codigoIva?: string | undefined;
        motivoIsencao?: string | undefined;
        tipoItem?: TipoItemFatura | undefined;
        produtoId?: string | undefined;
        tratamentoId?: string | undefined;
        exameId?: string | undefined;
    }>, "many">>;
    desconto: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    retencaoFonte: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    notas: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    dataEmissao: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    retrodatar: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    dataVencimento: z.ZodOptional<z.ZodOptional<z.ZodString>>;
} & {
    estado: z.ZodOptional<z.ZodNativeEnum<typeof EstadoFatura>>;
}, "strip", z.ZodTypeAny, {
    pacienteId?: string | undefined;
    medicoId?: string | undefined;
    tipo?: TipoFatura | undefined;
    estado?: EstadoFatura | undefined;
    agendamentoId?: string | undefined;
    desconto?: number | undefined;
    notas?: string | undefined;
    itens?: {
        descricao: string;
        quantidade: number;
        precoUnit: number;
        desconto: number;
        taxaIva: number;
        codigoIva: string;
        tipoItem: TipoItemFatura;
        medicoId?: string | undefined;
        motivoIsencao?: string | undefined;
        produtoId?: string | undefined;
        tratamentoId?: string | undefined;
        exameId?: string | undefined;
    }[] | undefined;
    dataEmissao?: string | undefined;
    dataVencimento?: string | undefined;
    tipoDocFiscal?: TipoDocumentoFiscal | undefined;
    retencaoFonte?: number | undefined;
    retrodatar?: boolean | undefined;
}, {
    pacienteId?: string | undefined;
    medicoId?: string | undefined;
    tipo?: TipoFatura | undefined;
    estado?: EstadoFatura | undefined;
    agendamentoId?: string | undefined;
    desconto?: number | undefined;
    notas?: string | undefined;
    itens?: {
        descricao: string;
        precoUnit: number;
        medicoId?: string | undefined;
        quantidade?: number | undefined;
        desconto?: number | undefined;
        taxaIva?: number | undefined;
        codigoIva?: string | undefined;
        motivoIsencao?: string | undefined;
        tipoItem?: TipoItemFatura | undefined;
        produtoId?: string | undefined;
        tratamentoId?: string | undefined;
        exameId?: string | undefined;
    }[] | undefined;
    dataEmissao?: string | undefined;
    dataVencimento?: string | undefined;
    tipoDocFiscal?: TipoDocumentoFiscal | undefined;
    retencaoFonte?: number | undefined;
    retrodatar?: boolean | undefined;
}>;
export declare const PagamentoCreateSchema: z.ZodObject<{
    faturaId: z.ZodString;
    metodo: z.ZodNativeEnum<typeof MetodoPagamento>;
    valor: z.ZodNumber;
    referencia: z.ZodOptional<z.ZodString>;
    notas: z.ZodOptional<z.ZodString>;
    seguro: z.ZodOptional<z.ZodObject<{
        seguradora: z.ZodString;
        numeroBeneficiario: z.ZodString;
        numeroAutorizacao: z.ZodOptional<z.ZodString>;
        valorSolicitado: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        seguradora: string;
        numeroBeneficiario: string;
        valorSolicitado: number;
        numeroAutorizacao?: string | undefined;
    }, {
        seguradora: string;
        numeroBeneficiario: string;
        valorSolicitado: number;
        numeroAutorizacao?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    metodo: MetodoPagamento;
    valor: number;
    faturaId: string;
    notas?: string | undefined;
    referencia?: string | undefined;
    seguro?: {
        seguradora: string;
        numeroBeneficiario: string;
        valorSolicitado: number;
        numeroAutorizacao?: string | undefined;
    } | undefined;
}, {
    metodo: MetodoPagamento;
    valor: number;
    faturaId: string;
    notas?: string | undefined;
    referencia?: string | undefined;
    seguro?: {
        seguradora: string;
        numeroBeneficiario: string;
        valorSolicitado: number;
        numeroAutorizacao?: string | undefined;
    } | undefined;
}>;
export type PagamentoCreateInput = z.infer<typeof PagamentoCreateSchema>;
export declare const NotaDebitoCreateSchema: z.ZodObject<{
    motivo: z.ZodString;
    itens: z.ZodArray<z.ZodEffects<z.ZodObject<{
        tipoItem: z.ZodDefault<z.ZodNativeEnum<typeof TipoItemFatura>>;
        produtoId: z.ZodOptional<z.ZodString>;
        tratamentoId: z.ZodOptional<z.ZodString>;
        exameId: z.ZodOptional<z.ZodString>;
        medicoId: z.ZodOptional<z.ZodString>;
        descricao: z.ZodString;
        quantidade: z.ZodDefault<z.ZodNumber>;
        precoUnit: z.ZodNumber;
        desconto: z.ZodDefault<z.ZodNumber>;
        taxaIva: z.ZodDefault<z.ZodNumber>;
        codigoIva: z.ZodDefault<z.ZodString>;
        motivoIsencao: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        descricao: string;
        quantidade: number;
        precoUnit: number;
        desconto: number;
        taxaIva: number;
        codigoIva: string;
        tipoItem: TipoItemFatura;
        medicoId?: string | undefined;
        motivoIsencao?: string | undefined;
        produtoId?: string | undefined;
        tratamentoId?: string | undefined;
        exameId?: string | undefined;
    }, {
        descricao: string;
        precoUnit: number;
        medicoId?: string | undefined;
        quantidade?: number | undefined;
        desconto?: number | undefined;
        taxaIva?: number | undefined;
        codigoIva?: string | undefined;
        motivoIsencao?: string | undefined;
        tipoItem?: TipoItemFatura | undefined;
        produtoId?: string | undefined;
        tratamentoId?: string | undefined;
        exameId?: string | undefined;
    }>, {
        descricao: string;
        quantidade: number;
        precoUnit: number;
        desconto: number;
        taxaIva: number;
        codigoIva: string;
        tipoItem: TipoItemFatura;
        medicoId?: string | undefined;
        motivoIsencao?: string | undefined;
        produtoId?: string | undefined;
        tratamentoId?: string | undefined;
        exameId?: string | undefined;
    }, {
        descricao: string;
        precoUnit: number;
        medicoId?: string | undefined;
        quantidade?: number | undefined;
        desconto?: number | undefined;
        taxaIva?: number | undefined;
        codigoIva?: string | undefined;
        motivoIsencao?: string | undefined;
        tipoItem?: TipoItemFatura | undefined;
        produtoId?: string | undefined;
        tratamentoId?: string | undefined;
        exameId?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    motivo: string;
    itens: {
        descricao: string;
        quantidade: number;
        precoUnit: number;
        desconto: number;
        taxaIva: number;
        codigoIva: string;
        tipoItem: TipoItemFatura;
        medicoId?: string | undefined;
        motivoIsencao?: string | undefined;
        produtoId?: string | undefined;
        tratamentoId?: string | undefined;
        exameId?: string | undefined;
    }[];
}, {
    motivo: string;
    itens: {
        descricao: string;
        precoUnit: number;
        medicoId?: string | undefined;
        quantidade?: number | undefined;
        desconto?: number | undefined;
        taxaIva?: number | undefined;
        codigoIva?: string | undefined;
        motivoIsencao?: string | undefined;
        tipoItem?: TipoItemFatura | undefined;
        produtoId?: string | undefined;
        tratamentoId?: string | undefined;
        exameId?: string | undefined;
    }[];
}>;
export type NotaDebitoCreateInput = z.infer<typeof NotaDebitoCreateSchema>;
export declare const SeguroUpdateSchema: z.ZodObject<{
    estado: z.ZodNativeEnum<typeof EstadoSeguro>;
    valorAprovado: z.ZodOptional<z.ZodNumber>;
    numeroAutorizacao: z.ZodOptional<z.ZodString>;
    notasSeguradora: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    estado: EstadoSeguro;
    numeroAutorizacao?: string | undefined;
    valorAprovado?: number | undefined;
    notasSeguradora?: string | undefined;
}, {
    estado: EstadoSeguro;
    numeroAutorizacao?: string | undefined;
    valorAprovado?: number | undefined;
    notasSeguradora?: string | undefined;
}>;
export interface ItemFaturaDTO {
    id: string;
    faturaId: string;
    tipoItem: TipoItemFatura;
    produtoId?: string;
    tratamentoId?: string;
    exameId?: string;
    medicoId?: string;
    produto?: {
        id: string;
        nome: string;
        codigo: string | null;
    };
    tipoTratamento?: {
        id: string;
        nome: string;
    };
    tipoExame?: {
        id: string;
        nome: string;
    };
    medico?: {
        id: string;
        nome: string;
    };
    descricao: string;
    quantidade: number;
    precoUnit: number;
    desconto: number;
    taxaIva: number;
    codigoIva: string;
    motivoIsencao?: string;
    total: number;
}
export interface SeguroPagamentoDTO {
    pagamentoId: string;
    seguradora: string;
    numeroBeneficiario: string;
    numeroAutorizacao?: string;
    valorSolicitado: number;
    valorAprovado?: number | null;
    estado: EstadoSeguro;
    dataSubmissao?: string;
    dataResposta?: string;
    notasSeguradora?: string;
}
export interface PagamentoDTO {
    id: string;
    clinicaId: string;
    faturaId: string;
    metodo: MetodoPagamento;
    valor: number;
    referencia?: string;
    notas?: string;
    numeroRecibo?: string;
    fiscalHash?: string;
    documentoChave?: string;
    criadoEm: string;
    criadoPor: string;
    seguro?: SeguroPagamentoDTO;
}
export interface FaturaDTO {
    id: string;
    clinicaId: string;
    numeroFatura: string;
    agendamentoId?: string;
    pacienteId: string;
    medicoId?: string;
    tipo: TipoFatura;
    estado: EstadoFatura;
    subtotal: number;
    desconto: number;
    totalIva: number;
    total: number;
    notas?: string;
    dataEmissao?: string;
    dataVencimento?: string;
    criadoEm: string;
    atualizadoEm: string;
    tipoDocFiscal: TipoDocumentoFiscal;
    valorExtenso?: string | null;
    retencaoFonte: number;
    valorPago: number;
    moeda: string;
    fiscalHash?: string | null;
    hashAnterior?: string | null;
    hashControl?: string | null;
    documentoChave?: string | null;
    serieDocFiscal?: string | null;
    statusEnvio?: string;
    emContingencia?: boolean;
    agtRequestID?: string | null;
    itens?: ItemFaturaDTO[];
    pagamentos?: PagamentoDTO[];
    paciente?: {
        id: string;
        nome: string;
        numeroPaciente?: string;
        endereco?: string;
        nif?: string;
        cidade?: string;
    };
    medico?: {
        id: string;
        nome: string;
    };
}
export interface DocumentoFiscalDTO {
    id: string;
    numeroDocumento: string;
    tipoDocFiscal: TipoDocumentoFiscal;
    dataEmissao: string;
    total: number;
    estado: EstadoFatura | 'EMITIDO';
    pacienteNome: string;
    pacienteNumero?: string;
    referenciaOrigem?: string;
    documentoOrigemId?: string;
}
//# sourceMappingURL=financial.schema.d.ts.map