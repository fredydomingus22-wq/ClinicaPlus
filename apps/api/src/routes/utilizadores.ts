import { Papel as PrismaPapel } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { permissaoService } from '../services/permissao.service';
import { authenticate } from '../middleware/authenticate';
import { tenantMiddleware } from '../middleware/tenant';
import { requireRole } from '../middleware/requireRole';
import { Papel } from '@clinicaplus/types';

const router = Router();

/**
 * GET /utilizadores/:id/permissoes
 * Lista permissões base do role + overrides.
 */
router.get('/:id/permissoes', authenticate, tenantMiddleware, requireRole([Papel.ADMIN, Papel.SUPER_ADMIN]), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const clinicaId = req.clinica?.id;
    if (!clinicaId) throw new AppError('Clínica não identificada', 400);

    const utilizador = await prisma.utilizador.findUnique({
      where: { id, clinicaId },
      include: {
        permissoes: {
          include: { permissao: true }
        }
      }
    });

    if (!utilizador) {
      throw new AppError('Utilizador não encontrado', 404);
    }

    // Buscar todas as permissões do sistema
    const todasPermissoes = await prisma.permissao.findMany();

    // Buscar permissões da role
    const rolePermissoes = await prisma.rolePermissao.findMany({
      where: { papel: utilizador.papel as PrismaPapel },
      include: { permissao: true }
    });

    const rolePermCodes = new Set(rolePermissoes.map(rp => rp.permissao.codigo));
    const overrides = new Map(utilizador.permissoes.map(up => [up.permissao.codigo, up.tipo]));

    const resultado = todasPermissoes.map(p => {
      const override = overrides.get(p.codigo);
      const base = rolePermCodes.has(p.codigo);
      let efectivo = base;
      
      if (override === 'GRANT') efectivo = true;
      if (override === 'DENY') efectivo = false;

      return {
        codigo: p.codigo,
        descricao: p.descricao,
        modulo: p.modulo,
        base,
        override: override || null,
        efectivo
      };
    });

    res.json({ success: true, data: resultado });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /utilizadores/:id/permissoes/:codigo
 * Define ou remove um override de permissão.
 */
router.put('/:id/permissoes/:codigo', authenticate, tenantMiddleware, requireRole([Papel.ADMIN, Papel.SUPER_ADMIN]), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const codigo = req.params.codigo as string;
    const { tipo } = req.body; // GRANT | DENY | RESET
    const clinicaId = req.clinica?.id;
    if (!clinicaId) throw new AppError('Clínica não identificada', 400);

    const utilizador = await prisma.utilizador.findUnique({
      where: { id, clinicaId }
    });

    if (!utilizador) {
      throw new AppError('Utilizador não encontrado', 404);
    }

    const permissao = await prisma.permissao.findUnique({
      where: { codigo }
    });

    if (!permissao) {
      throw new AppError('Permissão não encontrada', 404);
    }

    if (tipo === 'RESET') {
      await prisma.utilizadorPermissao.deleteMany({
        where: {
          utilizadorId: id,
          permissaoId: permissao.id
        }
      });
    } else if (tipo === 'GRANT' || tipo === 'DENY') {
      await prisma.utilizadorPermissao.upsert({
        where: {
          utilizadorId_permissaoId: {
            utilizadorId: id,
            permissaoId: permissao.id
          }
        },
        update: { tipo },
        create: {
          utilizadorId: id,
          permissaoId: permissao.id,
          tipo,
          criadoPor: req.user!.id
        }
      });
    } else {
      throw new AppError('Tipo de override inválido. Use GRANT, DENY ou RESET.', 400);
    }

    // IMPORTANT: Invalida o cache
    await permissaoService.invalidateCache(id);

    res.json({ success: true, message: 'Permissão actualizada com sucesso' });
  } catch (err) {
    next(err);
  }
});

export default router;
