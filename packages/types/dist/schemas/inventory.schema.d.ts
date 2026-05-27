import { z } from 'zod';
import { TipoProduto, TipoMovimentacao } from '../enums';
export declare const CategoriaProdutoSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    nome: z.ZodString;
    descricao: z.ZodOptional<z.ZodString>;
    cor: z.ZodOptional<z.ZodString>;
    ativo: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    ativo: boolean;
    nome: string;
    descricao?: string | undefined;
    id?: string | undefined;
    cor?: string | undefined;
}, {
    nome: string;
    ativo?: boolean | undefined;
    descricao?: string | undefined;
    id?: string | undefined;
    cor?: string | undefined;
}>;
export type CategoriaProdutoDTO = z.infer<typeof CategoriaProdutoSchema> & {
    id: string;
    clinicaId: string;
};
export declare const ProdutoSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    categoriaId: z.ZodString;
    codigo: z.ZodOptional<z.ZodString>;
    nome: z.ZodString;
    descricao: z.ZodOptional<z.ZodString>;
    precoCusto: z.ZodDefault<z.ZodNumber>;
    precoVenda: z.ZodNumber;
    taxaIva: z.ZodDefault<z.ZodNumber>;
    codigoIva: z.ZodDefault<z.ZodString>;
    motivoIsencao: z.ZodOptional<z.ZodString>;
    tipo: z.ZodDefault<z.ZodNativeEnum<typeof TipoProduto>>;
    gerenciaEstoque: z.ZodDefault<z.ZodBoolean>;
    estoqueMinimo: z.ZodDefault<z.ZodNumber>;
    ativo: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    ativo: boolean;
    nome: string;
    tipo: TipoProduto;
    taxaIva: number;
    codigoIva: string;
    gerenciaEstoque: boolean;
    categoriaId: string;
    precoCusto: number;
    precoVenda: number;
    estoqueMinimo: number;
    descricao?: string | undefined;
    motivoIsencao?: string | undefined;
    id?: string | undefined;
    codigo?: string | undefined;
}, {
    nome: string;
    categoriaId: string;
    precoVenda: number;
    ativo?: boolean | undefined;
    tipo?: TipoProduto | undefined;
    descricao?: string | undefined;
    taxaIva?: number | undefined;
    codigoIva?: string | undefined;
    motivoIsencao?: string | undefined;
    id?: string | undefined;
    codigo?: string | undefined;
    gerenciaEstoque?: boolean | undefined;
    precoCusto?: number | undefined;
    estoqueMinimo?: number | undefined;
}>;
export type ProdutoDTO = z.infer<typeof ProdutoSchema> & {
    id: string;
    clinicaId: string;
    categoria?: CategoriaProdutoDTO;
    estoqueAtual?: number;
};
export declare const EstoqueLoteSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    produtoId: z.ZodString;
    numeroLote: z.ZodString;
    dataValidade: z.ZodOptional<z.ZodString>;
    quantidade: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    quantidade: number;
    produtoId: string;
    numeroLote: string;
    dataValidade?: string | undefined;
    id?: string | undefined;
}, {
    quantidade: number;
    produtoId: string;
    numeroLote: string;
    dataValidade?: string | undefined;
    id?: string | undefined;
}>;
export type EstoqueLoteDTO = z.infer<typeof EstoqueLoteSchema> & {
    id: string;
    clinicaId: string;
};
export declare const MovimentacaoEstoqueSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    produtoId: z.ZodString;
    loteId: z.ZodOptional<z.ZodString>;
    tipo: z.ZodNativeEnum<typeof TipoMovimentacao>;
    quantidade: z.ZodNumber;
    motivo: z.ZodOptional<z.ZodString>;
    documentoReferencia: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tipo: TipoMovimentacao;
    quantidade: number;
    produtoId: string;
    motivo?: string | undefined;
    id?: string | undefined;
    loteId?: string | undefined;
    documentoReferencia?: string | undefined;
}, {
    tipo: TipoMovimentacao;
    quantidade: number;
    produtoId: string;
    motivo?: string | undefined;
    id?: string | undefined;
    loteId?: string | undefined;
    documentoReferencia?: string | undefined;
}>;
export type MovimentacaoEstoqueDTO = z.infer<typeof MovimentacaoEstoqueSchema> & {
    id: string;
    clinicaId: string;
    utilizadorId: string;
    criadoEm: string;
};
//# sourceMappingURL=inventory.schema.d.ts.map