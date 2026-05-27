"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const inventory_1 = __importDefault(require("../../routes/inventory"));
// Mock do middleware de autenticação
const mockAuth = (req, res, next) => {
    req.clinica = { id: 'test-clinica-id' };
    req.user = { id: 'test-user-id' };
    next();
};
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(mockAuth);
app.use('/inventory', inventory_1.default);
(0, vitest_1.describe)('Inventory Routes - Integração', () => {
    (0, vitest_1.beforeAll)(async () => {
        // Setup: criar dados de teste no banco
        // Nota: Em produção, usaríamos um banco de testes separado
    });
    (0, vitest_1.afterAll)(async () => {
        // Cleanup: remover dados de teste
    });
    (0, vitest_1.describe)('GET /inventory/categorias', () => {
        (0, vitest_1.it)('deve listar categorias da clínica', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/inventory/categorias')
                .expect('Content-Type', /json/)
                .expect(200);
            (0, vitest_1.expect)(response.body).toHaveProperty('data');
            (0, vitest_1.expect)(Array.isArray(response.body.data)).toBe(true);
        });
    });
    (0, vitest_1.describe)('POST /inventory/categorias', () => {
        (0, vitest_1.it)('deve criar uma nova categoria', async () => {
            const newCategoria = {
                nome: 'Teste Categoria',
                descricao: 'Descrição de teste',
                cor: '#FF0000',
            };
            const response = await (0, supertest_1.default)(app)
                .post('/inventory/categorias')
                .send(newCategoria)
                .expect('Content-Type', /json/)
                .expect(200);
            (0, vitest_1.expect)(response.body).toHaveProperty('data');
            (0, vitest_1.expect)(response.body.data).toHaveProperty('id');
            (0, vitest_1.expect)(response.body.data.nome).toBe(newCategoria.nome);
        });
        (0, vitest_1.it)('deve rejeitar categoria sem nome', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/inventory/categorias')
                .send({ descricao: 'Sem nome' })
                .expect('Content-Type', /json/)
                .expect(400);
            (0, vitest_1.expect)(response.body).toHaveProperty('error');
        });
    });
    (0, vitest_1.describe)('GET /inventory/produtos', () => {
        (0, vitest_1.it)('deve listar produtos da clínica', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/inventory/produtos')
                .expect('Content-Type', /json/)
                .expect(200);
            (0, vitest_1.expect)(response.body).toHaveProperty('data');
            (0, vitest_1.expect)(Array.isArray(response.body.data)).toBe(true);
        });
        (0, vitest_1.it)('deve filtrar produtos por tipo', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/inventory/produtos?tipo=PRODUTO')
                .expect('Content-Type', /json/)
                .expect(200);
            (0, vitest_1.expect)(response.body).toHaveProperty('data');
        });
        (0, vitest_1.it)('deve filtrar produtos por busca', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/inventory/produtos?busca=teste')
                .expect('Content-Type', /json/)
                .expect(200);
            (0, vitest_1.expect)(response.body).toHaveProperty('data');
        });
    });
    (0, vitest_1.describe)('POST /inventory/produtos', () => {
        (0, vitest_1.it)('deve criar um novo produto', async () => {
            const newProduto = {
                categoriaId: 'test-categoria-id',
                nome: 'Teste Produto',
                precoCusto: 100,
                precoVenda: 150,
                taxaIva: 14,
                codigoIva: 'IVA',
                tipo: 'PRODUTO',
                gerenciaEstoque: true,
                estoqueMinimo: 10,
            };
            const response = await (0, supertest_1.default)(app)
                .post('/inventory/produtos')
                .send(newProduto)
                .expect('Content-Type', /json/)
                .expect(200);
            (0, vitest_1.expect)(response.body).toHaveProperty('data');
            (0, vitest_1.expect)(response.body.data).toHaveProperty('id');
            (0, vitest_1.expect)(response.body.data.nome).toBe(newProduto.nome);
        });
        (0, vitest_1.it)('deve rejeitar produto sem categoriaId', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/inventory/produtos')
                .send({
                nome: 'Teste Produto',
                precoCusto: 100,
                precoVenda: 150,
            })
                .expect('Content-Type', /json/)
                .expect(400);
            (0, vitest_1.expect)(response.body).toHaveProperty('error');
        });
    });
    (0, vitest_1.describe)('GET /inventory/produtos/:id', () => {
        (0, vitest_1.it)('deve obter detalhes de um produto', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/inventory/produtos/test-produto-id')
                .expect('Content-Type', /json/)
                .expect(200);
            (0, vitest_1.expect)(response.body).toHaveProperty('data');
            (0, vitest_1.expect)(response.body.data).toHaveProperty('id');
        });
        (0, vitest_1.it)('deve retornar 404 para produto inexistente', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/inventory/produtos/non-existent-id')
                .expect('Content-Type', /json/)
                .expect(404);
            (0, vitest_1.expect)(response.body).toHaveProperty('error');
        });
    });
    (0, vitest_1.describe)('PUT /inventory/produtos/:id', () => {
        (0, vitest_1.it)('deve atualizar um produto', async () => {
            const updateData = {
                nome: 'Produto Atualizado',
                precoVenda: 200,
            };
            const response = await (0, supertest_1.default)(app)
                .put('/inventory/produtos/test-produto-id')
                .send(updateData)
                .expect('Content-Type', /json/)
                .expect(200);
            (0, vitest_1.expect)(response.body).toHaveProperty('data');
            (0, vitest_1.expect)(response.body.data.nome).toBe(updateData.nome);
        });
    });
    (0, vitest_1.describe)('GET /inventory/produtos/:id/lotes', () => {
        (0, vitest_1.it)('deve listar lotes de um produto', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/inventory/produtos/test-produto-id/lotes')
                .expect('Content-Type', /json/)
                .expect(200);
            (0, vitest_1.expect)(response.body).toHaveProperty('data');
            (0, vitest_1.expect)(Array.isArray(response.body.data)).toBe(true);
        });
    });
    (0, vitest_1.describe)('POST /inventory/lotes', () => {
        (0, vitest_1.it)('deve criar um novo lote', async () => {
            const newLote = {
                produtoId: 'test-produto-id',
                numeroLote: 'L-2024-001',
                quantidade: 100,
            };
            const response = await (0, supertest_1.default)(app)
                .post('/inventory/lotes')
                .send(newLote)
                .expect('Content-Type', /json/)
                .expect(200);
            (0, vitest_1.expect)(response.body).toHaveProperty('data');
            (0, vitest_1.expect)(response.body.data).toHaveProperty('id');
            (0, vitest_1.expect)(response.body.data.numeroLote).toBe(newLote.numeroLote);
        });
        (0, vitest_1.it)('deve rejeitar lote sem produtoId', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/inventory/lotes')
                .send({
                numeroLote: 'L-2024-001',
                quantidade: 100,
            })
                .expect('Content-Type', /json/)
                .expect(400);
            (0, vitest_1.expect)(response.body).toHaveProperty('error');
        });
    });
    (0, vitest_1.describe)('POST /inventory/movimentar', () => {
        (0, vitest_1.it)('deve registrar uma movimentação de entrada', async () => {
            const movimentacao = {
                produtoId: 'test-produto-id',
                quantidade: 10,
                tipo: 'ENTRADA',
                motivo: 'Teste de entrada',
            };
            const response = await (0, supertest_1.default)(app)
                .post('/inventory/movimentar')
                .send(movimentacao)
                .expect('Content-Type', /json/)
                .expect(200);
            (0, vitest_1.expect)(response.body).toHaveProperty('data');
            (0, vitest_1.expect)(response.body.data).toHaveProperty('id');
            (0, vitest_1.expect)(response.body.data.tipo).toBe(movimentacao.tipo);
        });
        (0, vitest_1.it)('deve registrar uma movimentação de saída', async () => {
            const movimentacao = {
                produtoId: 'test-produto-id',
                quantidade: 5,
                tipo: 'SAIDA',
                motivo: 'Teste de saída',
            };
            const response = await (0, supertest_1.default)(app)
                .post('/inventory/movimentar')
                .send(movimentacao)
                .expect('Content-Type', /json/)
                .expect(200);
            (0, vitest_1.expect)(response.body).toHaveProperty('data');
            (0, vitest_1.expect)(response.body.data.tipo).toBe(movimentacao.tipo);
        });
        (0, vitest_1.it)('deve rejeitar movimentação sem produtoId', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/inventory/movimentar')
                .send({
                quantidade: 10,
                tipo: 'ENTRADA',
            })
                .expect('Content-Type', /json/)
                .expect(400);
            (0, vitest_1.expect)(response.body).toHaveProperty('error');
        });
    });
    (0, vitest_1.describe)('GET /inventory/analytics/kpis', () => {
        (0, vitest_1.it)('deve retornar KPIs de estoque', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/inventory/analytics/kpis')
                .expect('Content-Type', /json/)
                .expect(200);
            (0, vitest_1.expect)(response.body).toHaveProperty('data');
            (0, vitest_1.expect)(response.body.data).toHaveProperty('totalProdutos');
            (0, vitest_1.expect)(response.body.data).toHaveProperty('valorTotalEstoque');
            (0, vitest_1.expect)(response.body.data).toHaveProperty('taxaRuptura');
        });
        (0, vitest_1.it)('deve filtrar KPIs por período', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/inventory/analytics/kpis?dataInicio=2024-01-01&dataFim=2024-12-31')
                .expect('Content-Type', /json/)
                .expect(200);
            (0, vitest_1.expect)(response.body).toHaveProperty('data');
        });
    });
    (0, vitest_1.describe)('GET /inventory/analytics/top-movimentados', () => {
        (0, vitest_1.it)('deve retornar itens mais movimentados', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/inventory/analytics/top-movimentados')
                .expect('Content-Type', /json/)
                .expect(200);
            (0, vitest_1.expect)(response.body).toHaveProperty('data');
            (0, vitest_1.expect)(Array.isArray(response.body.data)).toBe(true);
        });
    });
    (0, vitest_1.describe)('GET /inventory/analytics/tendencia-diaria', () => {
        (0, vitest_1.it)('deve retornar tendência diária', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/inventory/analytics/tendencia-diaria')
                .expect('Content-Type', /json/)
                .expect(200);
            (0, vitest_1.expect)(response.body).toHaveProperty('data');
            (0, vitest_1.expect)(Array.isArray(response.body.data)).toBe(true);
        });
    });
    (0, vitest_1.describe)('GET /inventory/analytics/previsao-ruptura', () => {
        (0, vitest_1.it)('deve retornar previsão de ruptura', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/inventory/analytics/previsao-ruptura')
                .expect('Content-Type', /json/)
                .expect(200);
            (0, vitest_1.expect)(response.body).toHaveProperty('data');
            (0, vitest_1.expect)(Array.isArray(response.body.data)).toBe(true);
        });
    });
    (0, vitest_1.describe)('GET /inventory/analytics/categorias', () => {
        (0, vitest_1.it)('deve retornar distribuição por categorias', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/inventory/analytics/categorias')
                .expect('Content-Type', /json/)
                .expect(200);
            (0, vitest_1.expect)(response.body).toHaveProperty('data');
            (0, vitest_1.expect)(Array.isArray(response.body.data)).toBe(true);
        });
    });
});
