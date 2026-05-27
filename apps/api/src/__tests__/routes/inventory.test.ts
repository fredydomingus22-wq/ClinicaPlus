import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import inventoryRoutes from '../../routes/inventory';
import { prisma } from '../../lib/prisma';

// Mock do middleware de autenticação
const mockAuth = (req: any, res: any, next: any) => {
  req.clinica = { id: 'test-clinica-id' };
  req.user = { id: 'test-user-id' };
  next();
};

const app = express();
app.use(express.json());
app.use(mockAuth);
app.use('/inventory', inventoryRoutes);

describe('Inventory Routes - Integração', () => {
  beforeAll(async () => {
    // Setup: criar dados de teste no banco
    // Nota: Em produção, usaríamos um banco de testes separado
  });

  afterAll(async () => {
    // Cleanup: remover dados de teste
  });

  describe('GET /inventory/categorias', () => {
    it('deve listar categorias da clínica', async () => {
      const response = await request(app)
        .get('/inventory/categorias')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /inventory/categorias', () => {
    it('deve criar uma nova categoria', async () => {
      const newCategoria = {
        nome: 'Teste Categoria',
        descricao: 'Descrição de teste',
        cor: '#FF0000',
      };

      const response = await request(app)
        .post('/inventory/categorias')
        .send(newCategoria)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.nome).toBe(newCategoria.nome);
    });

    it('deve rejeitar categoria sem nome', async () => {
      const response = await request(app)
        .post('/inventory/categorias')
        .send({ descricao: 'Sem nome' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /inventory/produtos', () => {
    it('deve listar produtos da clínica', async () => {
      const response = await request(app)
        .get('/inventory/produtos')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('deve filtrar produtos por tipo', async () => {
      const response = await request(app)
        .get('/inventory/produtos?tipo=PRODUTO')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('deve filtrar produtos por busca', async () => {
      const response = await request(app)
        .get('/inventory/produtos?busca=teste')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });

  describe('POST /inventory/produtos', () => {
    it('deve criar um novo produto', async () => {
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

      const response = await request(app)
        .post('/inventory/produtos')
        .send(newProduto)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.nome).toBe(newProduto.nome);
    });

    it('deve rejeitar produto sem categoriaId', async () => {
      const response = await request(app)
        .post('/inventory/produtos')
        .send({
          nome: 'Teste Produto',
          precoCusto: 100,
          precoVenda: 150,
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /inventory/produtos/:id', () => {
    it('deve obter detalhes de um produto', async () => {
      const response = await request(app)
        .get('/inventory/produtos/test-produto-id')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
    });

    it('deve retornar 404 para produto inexistente', async () => {
      const response = await request(app)
        .get('/inventory/produtos/non-existent-id')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /inventory/produtos/:id', () => {
    it('deve atualizar um produto', async () => {
      const updateData = {
        nome: 'Produto Atualizado',
        precoVenda: 200,
      };

      const response = await request(app)
        .put('/inventory/produtos/test-produto-id')
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.nome).toBe(updateData.nome);
    });
  });

  describe('GET /inventory/produtos/:id/lotes', () => {
    it('deve listar lotes de um produto', async () => {
      const response = await request(app)
        .get('/inventory/produtos/test-produto-id/lotes')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /inventory/lotes', () => {
    it('deve criar um novo lote', async () => {
      const newLote = {
        produtoId: 'test-produto-id',
        numeroLote: 'L-2024-001',
        quantidade: 100,
      };

      const response = await request(app)
        .post('/inventory/lotes')
        .send(newLote)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.numeroLote).toBe(newLote.numeroLote);
    });

    it('deve rejeitar lote sem produtoId', async () => {
      const response = await request(app)
        .post('/inventory/lotes')
        .send({
          numeroLote: 'L-2024-001',
          quantidade: 100,
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /inventory/movimentar', () => {
    it('deve registrar uma movimentação de entrada', async () => {
      const movimentacao = {
        produtoId: 'test-produto-id',
        quantidade: 10,
        tipo: 'ENTRADA',
        motivo: 'Teste de entrada',
      };

      const response = await request(app)
        .post('/inventory/movimentar')
        .send(movimentacao)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.tipo).toBe(movimentacao.tipo);
    });

    it('deve registrar uma movimentação de saída', async () => {
      const movimentacao = {
        produtoId: 'test-produto-id',
        quantidade: 5,
        tipo: 'SAIDA',
        motivo: 'Teste de saída',
      };

      const response = await request(app)
        .post('/inventory/movimentar')
        .send(movimentacao)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.tipo).toBe(movimentacao.tipo);
    });

    it('deve rejeitar movimentação sem produtoId', async () => {
      const response = await request(app)
        .post('/inventory/movimentar')
        .send({
          quantidade: 10,
          tipo: 'ENTRADA',
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /inventory/analytics/kpis', () => {
    it('deve retornar KPIs de estoque', async () => {
      const response = await request(app)
        .get('/inventory/analytics/kpis')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('totalProdutos');
      expect(response.body.data).toHaveProperty('valorTotalEstoque');
      expect(response.body.data).toHaveProperty('taxaRuptura');
    });

    it('deve filtrar KPIs por período', async () => {
      const response = await request(app)
        .get('/inventory/analytics/kpis?dataInicio=2024-01-01&dataFim=2024-12-31')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });

  describe('GET /inventory/analytics/top-movimentados', () => {
    it('deve retornar itens mais movimentados', async () => {
      const response = await request(app)
        .get('/inventory/analytics/top-movimentados')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /inventory/analytics/tendencia-diaria', () => {
    it('deve retornar tendência diária', async () => {
      const response = await request(app)
        .get('/inventory/analytics/tendencia-diaria')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /inventory/analytics/previsao-ruptura', () => {
    it('deve retornar previsão de ruptura', async () => {
      const response = await request(app)
        .get('/inventory/analytics/previsao-ruptura')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /inventory/analytics/categorias', () => {
    it('deve retornar distribuição por categorias', async () => {
      const response = await request(app)
        .get('/inventory/analytics/categorias')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
