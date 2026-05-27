import { z } from 'zod';
import { Plano, EstadoSubscricao, RazaoMudancaPlano } from '../enums';
export declare const SubscricaoSchema: z.ZodObject<{
    id: z.ZodString;
    clinicaId: z.ZodString;
    plano: z.ZodNativeEnum<typeof Plano>;
    estado: z.ZodNativeEnum<typeof EstadoSubscricao>;
    inicioEm: z.ZodString;
    validaAte: z.ZodString;
    trialAte: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    valorKz: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    referenciaInterna: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    razao: z.ZodNativeEnum<typeof RazaoMudancaPlano>;
    planoAnterior: z.ZodOptional<z.ZodNullable<z.ZodNativeEnum<typeof Plano>>>;
    alteradoPor: z.ZodString;
    notas: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    criadoEm: z.ZodString;
}, "strip", z.ZodTypeAny, {
    estado: EstadoSubscricao;
    plano: Plano;
    id: string;
    criadoEm: string;
    clinicaId: string;
    inicioEm: string;
    validaAte: string;
    razao: RazaoMudancaPlano;
    alteradoPor: string;
    notas?: string | null | undefined;
    trialAte?: string | null | undefined;
    valorKz?: number | null | undefined;
    referenciaInterna?: string | null | undefined;
    planoAnterior?: Plano | null | undefined;
}, {
    estado: EstadoSubscricao;
    plano: Plano;
    id: string;
    criadoEm: string;
    clinicaId: string;
    inicioEm: string;
    validaAte: string;
    razao: RazaoMudancaPlano;
    alteradoPor: string;
    notas?: string | null | undefined;
    trialAte?: string | null | undefined;
    valorKz?: number | null | undefined;
    referenciaInterna?: string | null | undefined;
    planoAnterior?: Plano | null | undefined;
}>;
export type SubscricaoDTO = z.infer<typeof SubscricaoSchema>;
export declare const FaturaAssinaturaSchema: z.ZodObject<{
    id: z.ZodString;
    clinicaId: z.ZodString;
    numero: z.ZodString;
    valor: z.ZodNumber;
    moeda: z.ZodString;
    status: z.ZodEnum<["PAGO", "PENDENTE", "CANCELADO", "VENCIDO"]>;
    dataEmissao: z.ZodString;
    dataPagamento: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dataVencimento: z.ZodString;
    urlPdf: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status: "PENDENTE" | "CANCELADO" | "PAGO" | "VENCIDO";
    valor: number;
    id: string;
    clinicaId: string;
    numero: string;
    moeda: string;
    dataEmissao: string;
    dataVencimento: string;
    dataPagamento?: string | null | undefined;
    urlPdf?: string | null | undefined;
}, {
    status: "PENDENTE" | "CANCELADO" | "PAGO" | "VENCIDO";
    valor: number;
    id: string;
    clinicaId: string;
    numero: string;
    moeda: string;
    dataEmissao: string;
    dataVencimento: string;
    dataPagamento?: string | null | undefined;
    urlPdf?: string | null | undefined;
}>;
export type FaturaAssinaturaDTO = z.infer<typeof FaturaAssinaturaSchema>;
export declare const BillingHistorySchema: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    clinicaId: z.ZodString;
    numero: z.ZodString;
    valor: z.ZodNumber;
    moeda: z.ZodString;
    status: z.ZodEnum<["PAGO", "PENDENTE", "CANCELADO", "VENCIDO"]>;
    dataEmissao: z.ZodString;
    dataPagamento: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dataVencimento: z.ZodString;
    urlPdf: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status: "PENDENTE" | "CANCELADO" | "PAGO" | "VENCIDO";
    valor: number;
    id: string;
    clinicaId: string;
    numero: string;
    moeda: string;
    dataEmissao: string;
    dataVencimento: string;
    dataPagamento?: string | null | undefined;
    urlPdf?: string | null | undefined;
}, {
    status: "PENDENTE" | "CANCELADO" | "PAGO" | "VENCIDO";
    valor: number;
    id: string;
    clinicaId: string;
    numero: string;
    moeda: string;
    dataEmissao: string;
    dataVencimento: string;
    dataPagamento?: string | null | undefined;
    urlPdf?: string | null | undefined;
}>, "many">;
export declare const SubscriptionStatusSchema: z.ZodObject<{
    plano: z.ZodNativeEnum<typeof Plano>;
    status: z.ZodString;
    proximaFatura: z.ZodString;
    diasRestantes: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    status: string;
    plano: Plano;
    proximaFatura: string;
    diasRestantes: number;
}, {
    status: string;
    plano: Plano;
    proximaFatura: string;
    diasRestantes: number;
}>;
export type SubscriptionStatusDTO = z.infer<typeof SubscriptionStatusSchema>;
//# sourceMappingURL=billing.schema.d.ts.map