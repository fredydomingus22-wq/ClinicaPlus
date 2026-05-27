import { z } from 'zod';
export declare const NotificacaoTipoSchema: z.ZodEnum<["INFO", "SUCESSO", "AVISO", "ERRO", "AGENDAMENTO", "RECEITA"]>;
export type NotificacaoTipo = z.infer<typeof NotificacaoTipoSchema>;
export declare const NotificacaoSchema: z.ZodObject<{
    id: z.ZodString;
    utilizadorId: z.ZodString;
    titulo: z.ZodString;
    mensagem: z.ZodString;
    tipo: z.ZodEnum<["INFO", "SUCESSO", "AVISO", "ERRO", "AGENDAMENTO", "RECEITA"]>;
    lida: z.ZodBoolean;
    url: z.ZodOptional<z.ZodString>;
    criadoEm: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    utilizadorId: string;
    tipo: "RECEITA" | "ERRO" | "INFO" | "SUCESSO" | "AVISO" | "AGENDAMENTO";
    id: string;
    titulo: string;
    mensagem: string;
    lida: boolean;
    criadoEm: Date;
    url?: string | undefined;
}, {
    utilizadorId: string;
    tipo: "RECEITA" | "ERRO" | "INFO" | "SUCESSO" | "AVISO" | "AGENDAMENTO";
    id: string;
    titulo: string;
    mensagem: string;
    lida: boolean;
    criadoEm: Date;
    url?: string | undefined;
}>;
export declare const NotificacaoCreateSchema: z.ZodObject<Omit<{
    id: z.ZodString;
    utilizadorId: z.ZodString;
    titulo: z.ZodString;
    mensagem: z.ZodString;
    tipo: z.ZodEnum<["INFO", "SUCESSO", "AVISO", "ERRO", "AGENDAMENTO", "RECEITA"]>;
    lida: z.ZodBoolean;
    url: z.ZodOptional<z.ZodString>;
    criadoEm: z.ZodDate;
}, "id" | "lida" | "criadoEm">, "strip", z.ZodTypeAny, {
    utilizadorId: string;
    tipo: "RECEITA" | "ERRO" | "INFO" | "SUCESSO" | "AVISO" | "AGENDAMENTO";
    titulo: string;
    mensagem: string;
    url?: string | undefined;
}, {
    utilizadorId: string;
    tipo: "RECEITA" | "ERRO" | "INFO" | "SUCESSO" | "AVISO" | "AGENDAMENTO";
    titulo: string;
    mensagem: string;
    url?: string | undefined;
}>;
export type Notificacao = z.infer<typeof NotificacaoSchema>;
export type NotificacaoCreate = z.infer<typeof NotificacaoCreateSchema>;
//# sourceMappingURL=notificacao.schema.d.ts.map