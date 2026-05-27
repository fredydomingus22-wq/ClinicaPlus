import { z } from "zod";
import type { MetodoPagamento, RegimeFiscal } from "./enums";
export declare const ItemFaturaInputSchema: z.ZodObject<{
    descricao: z.ZodString;
    quantidade: z.ZodNumber;
    precoUnit: z.ZodNumber;
    desconto: z.ZodDefault<z.ZodNumber>;
    taxaIva: z.ZodOptional<z.ZodNumber>;
    codigoIva: z.ZodOptional<z.ZodString>;
    motivoIsencao: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    descricao: string;
    quantidade: number;
    precoUnit: number;
    desconto: number;
    taxaIva?: number | undefined;
    codigoIva?: string | undefined;
    motivoIsencao?: string | undefined;
}, {
    descricao: string;
    quantidade: number;
    precoUnit: number;
    desconto?: number | undefined;
    taxaIva?: number | undefined;
    codigoIva?: string | undefined;
    motivoIsencao?: string | undefined;
}>;
export declare const CriarFaturaSchema: z.ZodObject<{
    pacienteId: z.ZodString;
    agendamentoId: z.ZodOptional<z.ZodString>;
    medicoId: z.ZodOptional<z.ZodString>;
    tipo: z.ZodDefault<z.ZodEnum<["PARTICULAR", "SEGURO"]>>;
    notas: z.ZodOptional<z.ZodString>;
    itens: z.ZodArray<z.ZodObject<{
        descricao: z.ZodString;
        quantidade: z.ZodNumber;
        precoUnit: z.ZodNumber;
        desconto: z.ZodDefault<z.ZodNumber>;
        taxaIva: z.ZodOptional<z.ZodNumber>;
        codigoIva: z.ZodOptional<z.ZodString>;
        motivoIsencao: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        descricao: string;
        quantidade: number;
        precoUnit: number;
        desconto: number;
        taxaIva?: number | undefined;
        codigoIva?: string | undefined;
        motivoIsencao?: string | undefined;
    }, {
        descricao: string;
        quantidade: number;
        precoUnit: number;
        desconto?: number | undefined;
        taxaIva?: number | undefined;
        codigoIva?: string | undefined;
        motivoIsencao?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    pacienteId: string;
    tipo: "PARTICULAR" | "SEGURO";
    itens: {
        descricao: string;
        quantidade: number;
        precoUnit: number;
        desconto: number;
        taxaIva?: number | undefined;
        codigoIva?: string | undefined;
        motivoIsencao?: string | undefined;
    }[];
    medicoId?: string | undefined;
    agendamentoId?: string | undefined;
    notas?: string | undefined;
}, {
    pacienteId: string;
    itens: {
        descricao: string;
        quantidade: number;
        precoUnit: number;
        desconto?: number | undefined;
        taxaIva?: number | undefined;
        codigoIva?: string | undefined;
        motivoIsencao?: string | undefined;
    }[];
    medicoId?: string | undefined;
    tipo?: "PARTICULAR" | "SEGURO" | undefined;
    agendamentoId?: string | undefined;
    notas?: string | undefined;
}>;
export type CriarFaturaDto = z.infer<typeof CriarFaturaSchema>;
export declare const CriarPagamentoSchema: z.ZodObject<{
    metodo: z.ZodNativeEnum<typeof MetodoPagamento>;
    valor: z.ZodNumber;
    referencia: z.ZodOptional<z.ZodString>;
    notas: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    metodo: MetodoPagamento;
    valor: number;
    notas?: string | undefined;
    referencia?: string | undefined;
}, {
    metodo: MetodoPagamento;
    valor: number;
    notas?: string | undefined;
    referencia?: string | undefined;
}>;
export type CriarPagamentoDto = z.infer<typeof CriarPagamentoSchema>;
export declare const CriarNotaCreditoSchema: z.ZodObject<{
    motivo: z.ZodString;
    itens: z.ZodOptional<z.ZodArray<z.ZodObject<{
        descricao: z.ZodString;
        quantidade: z.ZodNumber;
        precoUnit: z.ZodNumber;
        desconto: z.ZodDefault<z.ZodNumber>;
        taxaIva: z.ZodOptional<z.ZodNumber>;
        codigoIva: z.ZodOptional<z.ZodString>;
        motivoIsencao: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        descricao: string;
        quantidade: number;
        precoUnit: number;
        desconto: number;
        taxaIva?: number | undefined;
        codigoIva?: string | undefined;
        motivoIsencao?: string | undefined;
    }, {
        descricao: string;
        quantidade: number;
        precoUnit: number;
        desconto?: number | undefined;
        taxaIva?: number | undefined;
        codigoIva?: string | undefined;
        motivoIsencao?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    motivo: string;
    itens?: {
        descricao: string;
        quantidade: number;
        precoUnit: number;
        desconto: number;
        taxaIva?: number | undefined;
        codigoIva?: string | undefined;
        motivoIsencao?: string | undefined;
    }[] | undefined;
}, {
    motivo: string;
    itens?: {
        descricao: string;
        quantidade: number;
        precoUnit: number;
        desconto?: number | undefined;
        taxaIva?: number | undefined;
        codigoIva?: string | undefined;
        motivoIsencao?: string | undefined;
    }[] | undefined;
}>;
export type CriarNotaCreditoDto = z.infer<typeof CriarNotaCreditoSchema>;
export declare const ConfiguracaoFiscalSchema: z.ZodEffects<z.ZodObject<{
    tipoEntidade: z.ZodDefault<z.ZodEnum<["SINGULAR", "EMPRESA"]>>;
    nif: z.ZodString;
    razaoSocial: z.ZodString;
    enderecoPostal: z.ZodString;
    cidade: z.ZodOptional<z.ZodString>;
    provincia: z.ZodOptional<z.ZodString>;
    regimeFiscal: z.ZodNativeEnum<typeof RegimeFiscal>;
    serieDocFiscal: z.ZodDefault<z.ZodString>;
    agtSoftwareCert: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tipoEntidade: "SINGULAR" | "EMPRESA";
    nif: string;
    razaoSocial: string;
    enderecoPostal: string;
    regimeFiscal: RegimeFiscal;
    serieDocFiscal: string;
    cidade?: string | undefined;
    provincia?: string | undefined;
    agtSoftwareCert?: string | undefined;
}, {
    nif: string;
    razaoSocial: string;
    enderecoPostal: string;
    regimeFiscal: RegimeFiscal;
    tipoEntidade?: "SINGULAR" | "EMPRESA" | undefined;
    cidade?: string | undefined;
    provincia?: string | undefined;
    serieDocFiscal?: string | undefined;
    agtSoftwareCert?: string | undefined;
}>, {
    tipoEntidade: "SINGULAR" | "EMPRESA";
    nif: string;
    razaoSocial: string;
    enderecoPostal: string;
    regimeFiscal: RegimeFiscal;
    serieDocFiscal: string;
    cidade?: string | undefined;
    provincia?: string | undefined;
    agtSoftwareCert?: string | undefined;
}, {
    nif: string;
    razaoSocial: string;
    enderecoPostal: string;
    regimeFiscal: RegimeFiscal;
    tipoEntidade?: "SINGULAR" | "EMPRESA" | undefined;
    cidade?: string | undefined;
    provincia?: string | undefined;
    serieDocFiscal?: string | undefined;
    agtSoftwareCert?: string | undefined;
}>;
export type ConfiguracaoFiscalDto = z.infer<typeof ConfiguracaoFiscalSchema>;
export declare const SaftExportSchema: z.ZodObject<{
    ano: z.ZodNumber;
    mes: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    ano: number;
    mes?: number | undefined;
}, {
    ano: number;
    mes?: number | undefined;
}>;
export type SaftExportDto = z.infer<typeof SaftExportSchema>;
//# sourceMappingURL=faturacao.d.ts.map