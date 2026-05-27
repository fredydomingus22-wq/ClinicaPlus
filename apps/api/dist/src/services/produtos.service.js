"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.produtosService = void 0;
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
const estoque_calculo_service_1 = require("./estoque.calculo.service");
const inventory_dto_1 = require("../dto/inventory.dto");
const inventory_schema_1 = require("../schemas/inventory.schema");
exports.produtosService = {
    /**
     * Lista todas as categorias de produtos/serviços de uma clínica
     */
    async listCategorias(clinicaId) {
        const categorias = await prisma_1.prisma.categoriaProduto.findMany({
            where: { clinicaId, ativo: true },
            select: {
                id: true,
                clinicaId: true,
                nome: true,
                descricao: true,
                cor: true,
                ativo: true,
                criadoEm: true,
                atualizadoEm: true,
            },
            orderBy: { nome: 'asc' },
        });
        const categoriasComContagem = await Promise.all(categorias.map(async (categoria) => {
            const totalProdutos = await prisma_1.prisma.produto.count({
                where: { categoriaId: categoria.id, clinicaId, ativo: true },
            });
            return {
                ...inventory_dto_1.InventoryMapper.toCategoriaResponse(categoria),
                totalProdutos,
            };
        }));
        return { data: categoriasComContagem };
    },
    /**
     * Cria uma nova categoria
     */
    async createCategoria(clinicaId, data) {
        const validated = inventory_schema_1.CreateCategoriaSchema.parse(data);
        const categoria = await prisma_1.prisma.categoriaProduto.create({
            data: {
                nome: validated.nome,
                descricao: validated.descricao ?? null,
                cor: validated.cor ?? null,
                clinicaId,
            },
            select: {
                id: true,
                clinicaId: true,
                nome: true,
                descricao: true,
                cor: true,
                ativo: true,
                criadoEm: true,
                atualizadoEm: true,
            },
        });
        return { data: inventory_dto_1.InventoryMapper.toCategoriaResponse(categoria) };
    },
    /**
     * Lista todos os produtos/serviços de uma clínica com filtros
     */
    async listProdutos(clinicaId, filters) {
        const validated = inventory_schema_1.ListProdutosSchema.parse(filters);
        const produtos = await prisma_1.prisma.produto.findMany({
            where: {
                clinicaId,
                ativo: true,
                ...(validated.categoriaId ? { categoriaId: validated.categoriaId } : {}),
                ...(validated.tipo ? { tipo: validated.tipo } : {}),
                ...(validated.busca ? {
                    OR: [
                        { nome: { contains: validated.busca, mode: 'insensitive' } },
                        { codigo: { contains: validated.busca, mode: 'insensitive' } },
                    ],
                } : {}),
            },
            select: {
                id: true,
                clinicaId: true,
                categoriaId: true,
                codigo: true,
                nome: true,
                descricao: true,
                precoCusto: true,
                precoVenda: true,
                taxaIva: true,
                tipo: true,
                gerenciaEstoque: true,
                estoqueMinimo: true,
                ativo: true,
                criadoEm: true,
                atualizadoEm: true,
                categoria: {
                    select: {
                        id: true,
                        clinicaId: true,
                        nome: true,
                        descricao: true,
                        cor: true,
                        ativo: true,
                        criadoEm: true,
                        atualizadoEm: true,
                    },
                },
            },
            orderBy: { nome: 'asc' },
        });
        // Calcular estoque atual em batch para evitar N+1 queries
        const produtoIds = produtos.map(p => p.id);
        const estoqueBatch = await estoque_calculo_service_1.estoqueCalculoService.calcularEstoqueBatch(clinicaId, produtoIds);
        const produtosComEstoque = produtos.map(produto => inventory_dto_1.InventoryMapper.toProdutoListResponse(produto, estoqueBatch[produto.id] || 0));
        return { data: produtosComEstoque };
    },
    /**
     * Obtém detalhes de um produto
     */
    async getProduto(clinicaId, id) {
        const produto = await prisma_1.prisma.produto.findFirst({
            where: { id, clinicaId },
            select: {
                id: true,
                clinicaId: true,
                categoriaId: true,
                codigo: true,
                nome: true,
                descricao: true,
                precoCusto: true,
                precoVenda: true,
                taxaIva: true,
                codigoIva: true,
                motivoIsencao: true,
                tipo: true,
                gerenciaEstoque: true,
                estoqueMinimo: true,
                ativo: true,
                criadoEm: true,
                atualizadoEm: true,
                categoria: {
                    select: {
                        id: true,
                        clinicaId: true,
                        nome: true,
                        descricao: true,
                        cor: true,
                        ativo: true,
                        criadoEm: true,
                        atualizadoEm: true,
                    },
                },
                lotes: {
                    where: { quantidade: { gt: 0 } },
                    select: {
                        id: true,
                        clinicaId: true,
                        produtoId: true,
                        numeroLote: true,
                        dataValidade: true,
                        quantidade: true,
                        criadoEm: true,
                        atualizadoEm: true,
                    },
                    orderBy: { dataValidade: 'asc' },
                },
            },
        });
        if (!produto) {
            throw new AppError_1.AppError('Produto não encontrado', 404);
        }
        // Calcular estoque atual usando service centralizado
        const estoqueAtual = await estoque_calculo_service_1.estoqueCalculoService.calcularEstoqueProduto(clinicaId, id);
        return { data: inventory_dto_1.InventoryMapper.toProdutoResponse(produto, estoqueAtual) };
    },
    /**
     * Cria um novo produto/serviço
     */
    async createProduto(clinicaId, data) {
        const validated = inventory_schema_1.CreateProdutoSchema.parse(data);
        // Validar se categoria pertence à clínica
        const categoria = await prisma_1.prisma.categoriaProduto.findFirst({
            where: { id: validated.categoriaId, clinicaId },
            select: { id: true },
        });
        if (!categoria) {
            throw new AppError_1.AppError('Categoria inválida para esta clínica', 400);
        }
        const produto = await prisma_1.prisma.produto.create({
            data: {
                nome: validated.nome,
                tipo: validated.tipo,
                categoriaId: validated.categoriaId,
                codigo: validated.codigo ?? null,
                descricao: validated.descricao ?? null,
                precoCusto: validated.precoCusto,
                precoVenda: validated.precoVenda,
                taxaIva: validated.taxaIva,
                codigoIva: validated.codigoIva,
                motivoIsencao: validated.motivoIsencao ?? null,
                gerenciaEstoque: validated.gerenciaEstoque,
                estoqueMinimo: validated.estoqueMinimo,
                clinicaId,
            },
            select: {
                id: true,
                clinicaId: true,
                categoriaId: true,
                codigo: true,
                nome: true,
                descricao: true,
                precoCusto: true,
                precoVenda: true,
                taxaIva: true,
                codigoIva: true,
                motivoIsencao: true,
                tipo: true,
                gerenciaEstoque: true,
                estoqueMinimo: true,
                ativo: true,
                criadoEm: true,
                atualizadoEm: true,
                categoria: {
                    select: {
                        id: true,
                        clinicaId: true,
                        nome: true,
                        descricao: true,
                        cor: true,
                        ativo: true,
                        criadoEm: true,
                        atualizadoEm: true,
                    },
                },
            },
        });
        return { data: inventory_dto_1.InventoryMapper.toProdutoResponse(produto, 0) };
    },
    /**
     * Atualiza um produto/serviço
     */
    async updateProduto(clinicaId, id, data) {
        const validated = inventory_schema_1.UpdateProdutoSchema.parse(data);
        const produto = await prisma_1.prisma.produto.findFirst({
            where: { id, clinicaId },
            select: { id: true, categoriaId: true },
        });
        if (!produto) {
            throw new AppError_1.AppError('Produto não encontrado', 404);
        }
        // Se estiver mudando de categoria, validar
        if (validated.categoriaId && validated.categoriaId !== produto.categoriaId) {
            const categoria = await prisma_1.prisma.categoriaProduto.findFirst({
                where: { id: validated.categoriaId, clinicaId },
                select: { id: true },
            });
            if (!categoria) {
                throw new AppError_1.AppError('Categoria inválida para esta clínica', 400);
            }
        }
        const updateData = {};
        if (validated.nome !== undefined)
            updateData.nome = validated.nome;
        if (validated.tipo !== undefined)
            updateData.tipo = validated.tipo;
        if (validated.categoriaId !== undefined)
            updateData.categoriaId = validated.categoriaId;
        if (validated.codigo !== undefined)
            updateData.codigo = validated.codigo ?? null;
        if (validated.descricao !== undefined)
            updateData.descricao = validated.descricao ?? null;
        if (validated.precoCusto !== undefined)
            updateData.precoCusto = validated.precoCusto;
        if (validated.precoVenda !== undefined)
            updateData.precoVenda = validated.precoVenda;
        if (validated.taxaIva !== undefined)
            updateData.taxaIva = validated.taxaIva;
        if (validated.codigoIva !== undefined)
            updateData.codigoIva = validated.codigoIva;
        if (validated.motivoIsencao !== undefined)
            updateData.motivoIsencao = validated.motivoIsencao ?? null;
        if (validated.gerenciaEstoque !== undefined)
            updateData.gerenciaEstoque = validated.gerenciaEstoque;
        if (validated.estoqueMinimo !== undefined)
            updateData.estoqueMinimo = validated.estoqueMinimo;
        const updated = await prisma_1.prisma.produto.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                clinicaId: true,
                categoriaId: true,
                codigo: true,
                nome: true,
                descricao: true,
                precoCusto: true,
                precoVenda: true,
                taxaIva: true,
                codigoIva: true,
                motivoIsencao: true,
                tipo: true,
                gerenciaEstoque: true,
                estoqueMinimo: true,
                ativo: true,
                criadoEm: true,
                atualizadoEm: true,
                categoria: {
                    select: {
                        id: true,
                        clinicaId: true,
                        nome: true,
                        descricao: true,
                        cor: true,
                        ativo: true,
                        criadoEm: true,
                        atualizadoEm: true,
                    },
                },
            },
        });
        const estoqueAtual = await estoque_calculo_service_1.estoqueCalculoService.calcularEstoqueProduto(clinicaId, id);
        return { data: inventory_dto_1.InventoryMapper.toProdutoResponse(updated, estoqueAtual) };
    }
};
