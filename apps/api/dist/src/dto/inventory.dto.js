"use strict";
/**
 * DTOs (Data Transfer Objects) para respostas normalizadas do módulo de inventário/stock
 * Mantém consistência com a arquitetura atual do projeto (Express + Prisma + TypeScript)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryMapper = void 0;
// Mappers para converter Prisma para DTO
class InventoryMapper {
    static toCategoriaResponse(data) {
        return {
            id: data.id,
            clinicaId: data.clinicaId,
            nome: data.nome,
            descricao: data.descricao,
            cor: data.cor,
            ativo: data.ativo,
            criadoEm: data.criadoEm.toISOString(),
            atualizadoEm: data.atualizadoEm.toISOString(),
        };
    }
    static toProdutoResponse(data, estoqueAtual = 0) {
        return {
            id: data.id,
            clinicaId: data.clinicaId,
            categoriaId: data.categoriaId,
            codigo: data.codigo,
            nome: data.nome,
            descricao: data.descricao,
            precoCusto: data.precoCusto,
            precoVenda: data.precoVenda,
            taxaIva: data.taxaIva,
            codigoIva: data.codigoIva,
            motivoIsencao: data.motivoIsencao,
            tipo: data.tipo,
            gerenciaEstoque: data.gerenciaEstoque,
            estoqueMinimo: data.estoqueMinimo,
            estoqueAtual,
            ativo: data.ativo,
            criadoEm: data.criadoEm.toISOString(),
            atualizadoEm: data.atualizadoEm.toISOString(),
            categoria: this.toCategoriaResponse(data.categoria),
            lotes: data.lotes?.map((l) => this.toLoteResponse(l)) || [],
        };
    }
    static toProdutoListResponse(data, estoqueAtual = 0) {
        return {
            id: data.id,
            clinicaId: data.clinicaId,
            categoriaId: data.categoriaId,
            codigo: data.codigo,
            nome: data.nome,
            descricao: data.descricao,
            precoCusto: data.precoCusto,
            precoVenda: data.precoVenda,
            taxaIva: data.taxaIva,
            tipo: data.tipo,
            gerenciaEstoque: data.gerenciaEstoque,
            estoqueMinimo: data.estoqueMinimo,
            estoqueAtual,
            ativo: data.ativo,
            categoria: this.toCategoriaResponse(data.categoria),
        };
    }
    static toLoteResponse(data) {
        const diasAteValidade = data.dataValidade
            ? Math.floor((data.dataValidade.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;
        return {
            id: data.id,
            clinicaId: data.clinicaId,
            produtoId: data.produtoId,
            numeroLote: data.numeroLote,
            dataValidade: data.dataValidade?.toISOString() || null,
            quantidade: data.quantidade,
            diasAteValidade,
            criadoEm: data.criadoEm.toISOString(),
            atualizadoEm: data.atualizadoEm.toISOString(),
        };
    }
    static toLoteComProdutoResponse(data) {
        return {
            ...this.toLoteResponse(data),
            produto: {
                id: data.produto.id,
                nome: data.produto.nome,
                codigo: data.produto.codigo,
            },
        };
    }
    static toMovimentacaoResponse(data) {
        return {
            id: data.id,
            clinicaId: data.clinicaId,
            produtoId: data.produtoId,
            loteId: data.loteId,
            utilizadorId: data.utilizadorId,
            tipo: data.tipo,
            quantidade: data.quantidade,
            motivo: data.motivo,
            documentoRef: data.documentoRef,
            criadoEm: data.criadoEm.toISOString(),
            lote: data.lote ? this.toLoteResponse(data.lote) : null,
            produto: {
                id: data.produto.id,
                nome: data.produto.nome,
                codigo: data.produto.codigo,
            },
        };
    }
}
exports.InventoryMapper = InventoryMapper;
