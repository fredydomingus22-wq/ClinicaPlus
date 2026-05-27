import { z } from 'zod';
export declare const ContactoClinicaSchema: z.ZodObject<{
    tipo: z.ZodEnum<["TELEFONE", "WHATSAPP", "EMAIL", "OUTRO"]>;
    valor: z.ZodString;
    descricao: z.ZodOptional<z.ZodString>;
    ordem: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    ordem: number;
    tipo: "OUTRO" | "TELEFONE" | "WHATSAPP" | "EMAIL";
    valor: string;
    descricao?: string | undefined;
}, {
    tipo: "OUTRO" | "TELEFONE" | "WHATSAPP" | "EMAIL";
    valor: string;
    ordem?: number | undefined;
    descricao?: string | undefined;
}>;
export declare const ContactoClinicaCreateSchema: z.ZodObject<{
    tipo: z.ZodEnum<["TELEFONE", "WHATSAPP", "EMAIL", "OUTRO"]>;
    valor: z.ZodString;
    descricao: z.ZodOptional<z.ZodString>;
    ordem: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    ordem: number;
    tipo: "OUTRO" | "TELEFONE" | "WHATSAPP" | "EMAIL";
    valor: string;
    descricao?: string | undefined;
}, {
    tipo: "OUTRO" | "TELEFONE" | "WHATSAPP" | "EMAIL";
    valor: string;
    ordem?: number | undefined;
    descricao?: string | undefined;
}>;
export declare const ContactoClinicaUpdateSchema: z.ZodObject<{
    tipo: z.ZodOptional<z.ZodEnum<["TELEFONE", "WHATSAPP", "EMAIL", "OUTRO"]>>;
    valor: z.ZodOptional<z.ZodString>;
    descricao: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    ordem: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    ordem?: number | undefined;
    tipo?: "OUTRO" | "TELEFONE" | "WHATSAPP" | "EMAIL" | undefined;
    descricao?: string | undefined;
    valor?: string | undefined;
}, {
    ordem?: number | undefined;
    tipo?: "OUTRO" | "TELEFONE" | "WHATSAPP" | "EMAIL" | undefined;
    descricao?: string | undefined;
    valor?: string | undefined;
}>;
export type ContactoClinicaInput = z.infer<typeof ContactoClinicaSchema>;
export declare const ClinicaCreateSchema: z.ZodObject<{
    nome: z.ZodString;
    slug: z.ZodString;
    email: z.ZodString;
    adminNome: z.ZodString;
    adminEmail: z.ZodString;
    adminPassword: z.ZodString;
    plano: z.ZodDefault<z.ZodEnum<["BASICO", "PRO", "ENTERPRISE"]>>;
    telefone: z.ZodOptional<z.ZodString>;
    endereco: z.ZodOptional<z.ZodString>;
    cidade: z.ZodOptional<z.ZodString>;
    provincia: z.ZodOptional<z.ZodString>;
    logo: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    email: string;
    nome: string;
    slug: string;
    adminNome: string;
    adminEmail: string;
    adminPassword: string;
    plano: "BASICO" | "PRO" | "ENTERPRISE";
    cidade?: string | undefined;
    provincia?: string | undefined;
    telefone?: string | undefined;
    endereco?: string | undefined;
    logo?: string | undefined;
}, {
    email: string;
    nome: string;
    slug: string;
    adminNome: string;
    adminEmail: string;
    adminPassword: string;
    cidade?: string | undefined;
    provincia?: string | undefined;
    plano?: "BASICO" | "PRO" | "ENTERPRISE" | undefined;
    telefone?: string | undefined;
    endereco?: string | undefined;
    logo?: string | undefined;
}>;
export type ClinicaCreateInput = z.infer<typeof ClinicaCreateSchema>;
export declare const ConfiguracaoClinicaUpdateSchema: z.ZodObject<{
    lembrete24h: z.ZodOptional<z.ZodBoolean>;
    lembrete2h: z.ZodOptional<z.ZodBoolean>;
    agendamentoOnline: z.ZodOptional<z.ZodBoolean>;
    preTriagem: z.ZodOptional<z.ZodBoolean>;
    prontuarioCustom: z.ZodOptional<z.ZodBoolean>;
    horasAntecedencia: z.ZodOptional<z.ZodNumber>;
    moedaSimbolo: z.ZodOptional<z.ZodString>;
    fusoHorario: z.ZodOptional<z.ZodString>;
    seguradoras: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    lembrete24h?: boolean | undefined;
    lembrete2h?: boolean | undefined;
    agendamentoOnline?: boolean | undefined;
    preTriagem?: boolean | undefined;
    prontuarioCustom?: boolean | undefined;
    horasAntecedencia?: number | undefined;
    moedaSimbolo?: string | undefined;
    fusoHorario?: string | undefined;
    seguradoras?: string[] | undefined;
}, {
    lembrete24h?: boolean | undefined;
    lembrete2h?: boolean | undefined;
    agendamentoOnline?: boolean | undefined;
    preTriagem?: boolean | undefined;
    prontuarioCustom?: boolean | undefined;
    horasAntecedencia?: number | undefined;
    moedaSimbolo?: string | undefined;
    fusoHorario?: string | undefined;
    seguradoras?: string[] | undefined;
}>;
export declare const ClinicaUpdateSchema: z.ZodObject<{
    nome: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    telefone: z.ZodOptional<z.ZodString>;
    endereco: z.ZodOptional<z.ZodString>;
    cidade: z.ZodOptional<z.ZodString>;
    provincia: z.ZodOptional<z.ZodString>;
    logo: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    logotipoUrl: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    nif: z.ZodOptional<z.ZodString>;
    tipoEntidade: z.ZodOptional<z.ZodEnum<["SINGULAR", "EMPRESA"]>>;
    razaoSocial: z.ZodOptional<z.ZodString>;
    enderecoPostal: z.ZodOptional<z.ZodString>;
    regimeFiscal: z.ZodOptional<z.ZodEnum<["GERAL", "SIMPLIFICADO", "EXUSA"]>>;
    serieDocFiscal: z.ZodOptional<z.ZodString>;
    agtPrivateKey: z.ZodOptional<z.ZodString>;
    agtPublicKey: z.ZodOptional<z.ZodString>;
    configuracao: z.ZodOptional<z.ZodObject<{
        lembrete24h: z.ZodOptional<z.ZodBoolean>;
        lembrete2h: z.ZodOptional<z.ZodBoolean>;
        agendamentoOnline: z.ZodOptional<z.ZodBoolean>;
        preTriagem: z.ZodOptional<z.ZodBoolean>;
        prontuarioCustom: z.ZodOptional<z.ZodBoolean>;
        horasAntecedencia: z.ZodOptional<z.ZodNumber>;
        moedaSimbolo: z.ZodOptional<z.ZodString>;
        fusoHorario: z.ZodOptional<z.ZodString>;
        seguradoras: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        lembrete24h?: boolean | undefined;
        lembrete2h?: boolean | undefined;
        agendamentoOnline?: boolean | undefined;
        preTriagem?: boolean | undefined;
        prontuarioCustom?: boolean | undefined;
        horasAntecedencia?: number | undefined;
        moedaSimbolo?: string | undefined;
        fusoHorario?: string | undefined;
        seguradoras?: string[] | undefined;
    }, {
        lembrete24h?: boolean | undefined;
        lembrete2h?: boolean | undefined;
        agendamentoOnline?: boolean | undefined;
        preTriagem?: boolean | undefined;
        prontuarioCustom?: boolean | undefined;
        horasAntecedencia?: number | undefined;
        moedaSimbolo?: string | undefined;
        fusoHorario?: string | undefined;
        seguradoras?: string[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    email?: string | undefined;
    nome?: string | undefined;
    tipoEntidade?: "SINGULAR" | "EMPRESA" | undefined;
    nif?: string | undefined;
    razaoSocial?: string | undefined;
    enderecoPostal?: string | undefined;
    cidade?: string | undefined;
    provincia?: string | undefined;
    regimeFiscal?: "GERAL" | "SIMPLIFICADO" | "EXUSA" | undefined;
    serieDocFiscal?: string | undefined;
    telefone?: string | undefined;
    endereco?: string | undefined;
    logo?: string | null | undefined;
    logotipoUrl?: string | null | undefined;
    agtPrivateKey?: string | undefined;
    agtPublicKey?: string | undefined;
    configuracao?: {
        lembrete24h?: boolean | undefined;
        lembrete2h?: boolean | undefined;
        agendamentoOnline?: boolean | undefined;
        preTriagem?: boolean | undefined;
        prontuarioCustom?: boolean | undefined;
        horasAntecedencia?: number | undefined;
        moedaSimbolo?: string | undefined;
        fusoHorario?: string | undefined;
        seguradoras?: string[] | undefined;
    } | undefined;
}, {
    email?: string | undefined;
    nome?: string | undefined;
    tipoEntidade?: "SINGULAR" | "EMPRESA" | undefined;
    nif?: string | undefined;
    razaoSocial?: string | undefined;
    enderecoPostal?: string | undefined;
    cidade?: string | undefined;
    provincia?: string | undefined;
    regimeFiscal?: "GERAL" | "SIMPLIFICADO" | "EXUSA" | undefined;
    serieDocFiscal?: string | undefined;
    telefone?: string | undefined;
    endereco?: string | undefined;
    logo?: string | null | undefined;
    logotipoUrl?: string | null | undefined;
    agtPrivateKey?: string | undefined;
    agtPublicKey?: string | undefined;
    configuracao?: {
        lembrete24h?: boolean | undefined;
        lembrete2h?: boolean | undefined;
        agendamentoOnline?: boolean | undefined;
        preTriagem?: boolean | undefined;
        prontuarioCustom?: boolean | undefined;
        horasAntecedencia?: number | undefined;
        moedaSimbolo?: string | undefined;
        fusoHorario?: string | undefined;
        seguradoras?: string[] | undefined;
    } | undefined;
}>;
export type ClinicaUpdateInput = z.infer<typeof ClinicaUpdateSchema>;
export declare const ClinicaListQuerySchema: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
    plano: z.ZodOptional<z.ZodString>;
    ativo: z.ZodUnion<[z.ZodEffects<z.ZodOptional<z.ZodString>, boolean, string | undefined>, z.ZodOptional<z.ZodBoolean>]>;
    page: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    ativo?: boolean | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    q?: string | undefined;
    plano?: string | undefined;
}, {
    ativo?: string | boolean | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    q?: string | undefined;
    plano?: string | undefined;
}>;
export type ClinicaListQuery = z.infer<typeof ClinicaListQuerySchema>;
//# sourceMappingURL=clinica.schema.d.ts.map