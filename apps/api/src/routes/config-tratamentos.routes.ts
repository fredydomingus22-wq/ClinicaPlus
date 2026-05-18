import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/requireRole';
import { AppError } from '../lib/AppError';
import { Prisma } from '@prisma/client';

/**
 * Config-Tratamentos Router
 * CRUD para tipos de exame e tipos de tratamento do catálogo da clínica.
 */
const router = Router();

// ─── TIPOS DE EXAME ───────────────────────────────────────────────────────────

/** Lista todos os tipos de exame da clínica */
router.get('/tipos-exame', async (req, res, next) => {
  try {
    const tipos = await prisma.tipoExameClinica.findMany({
      where: { clinicaId: req.clinica!.id, ativo: true },
      orderBy: { nome: 'asc' },
    });
    res.json({ data: tipos });
  } catch (err) {
    next(err);
  }
});

/** Cria um novo tipo de exame */
router.post('/tipos-exame', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { nome, descricao, preco } = req.body as {
      nome: string;
      descricao?: string;
      preco?: number;
    };

    if (!nome) throw new AppError('Campo nome é obrigatório', 400);

    const tipo = await prisma.tipoExameClinica.create({
      data: {
        clinicaId: req.clinica!.id,
        nome,
        ...(descricao !== undefined && { descricao }),
        ...(preco !== undefined && { preco }),
      },
    });
    res.status(201).json({ data: tipo });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return next(new AppError('Já existe um tipo de exame com este nome nesta clínica', 400, 'DUPLICATE_ENTRY'));
    }
    next(err);
  }
});

/** Actualiza um tipo de exame */
router.patch('/tipos-exame/:id', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const tipo = await prisma.tipoExameClinica.findFirst({
      where: { id, clinicaId: req.clinica!.id },
    });
    if (!tipo) throw new AppError('Tipo de exame não encontrado', 404);

    const updated = await prisma.tipoExameClinica.update({
      where: { id },
      data: req.body,
    });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

/** Remove (desactiva) um tipo de exame */
router.delete('/tipos-exame/:id', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    await prisma.tipoExameClinica.updateMany({
      where: { id, clinicaId: req.clinica!.id },
      data: { ativo: false },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ─── TIPOS DE TRATAMENTO ──────────────────────────────────────────────────────

/** Lista todos os tipos de tratamento da clínica */
router.get('/tipos-tratamento', async (req, res, next) => {
  try {
    const tipos = await prisma.tipoTratamento.findMany({
      where: { clinicaId: req.clinica!.id, ativo: true },
      orderBy: { nome: 'asc' },
    });
    res.json({ data: tipos });
  } catch (err) {
    next(err);
  }
});

/** Cria um novo tipo de tratamento */
router.post('/tipos-tratamento', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { nome, descricao, duracaoMin, preco } = req.body as {
      nome: string;
      descricao?: string;
      duracaoMin?: number;
      preco?: number;
    };

    if (!nome) throw new AppError('Campo nome é obrigatório', 400);

    const tipo = await prisma.tipoTratamento.create({
      data: {
        clinicaId: req.clinica!.id,
        nome,
        ...(descricao !== undefined && { descricao }),
        ...(duracaoMin !== undefined && { duracaoMin }),
        ...(preco !== undefined && { preco }),
      },
    });
    res.status(201).json({ data: tipo });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return next(new AppError('Já existe um tipo de tratamento com este nome nesta clínica', 400, 'DUPLICATE_ENTRY'));
    }
    next(err);
  }
});

/** Actualiza um tipo de tratamento */
router.patch('/tipos-tratamento/:id', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const tipo = await prisma.tipoTratamento.findFirst({
      where: { id, clinicaId: req.clinica!.id },
    });
    if (!tipo) throw new AppError('Tipo de tratamento não encontrado', 404);

    const updated = await prisma.tipoTratamento.update({
      where: { id },
      data: req.body,
    });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

/** Remove (desactiva) um tipo de tratamento */
router.delete('/tipos-tratamento/:id', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    await prisma.tipoTratamento.updateMany({
      where: { id, clinicaId: req.clinica!.id },
      data: { ativo: false },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
