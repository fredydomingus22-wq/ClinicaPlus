import { Router, Request, Response } from 'express';
import { subDays, subMonths } from 'date-fns';
import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/requireRole';
import { Papel } from '@clinicaplus/types';
import { Prisma, TipoFatura } from '@prisma/client';

export const relatoriosRouter = Router();

interface ReceitaQuery {
  inicio?: string;
  fim?: string;
  agrupamento?: string;
  medicoId?: string;
  tipo?: string;
}

interface ReceitaResult {
  periodo: Date;
  medico_id: string | null;
  medico_nome: string | null;
  consultas: number;
  receita: number;
  seguros_pendentes: number;
}

relatoriosRouter.get('/receita', requireRole([Papel.ADMIN]), async (req: Request, res: Response, next) => {
  try {
    const clinicaId = req.clinica.id!;
    const plan = req.clinica.plano;
    const { inicio, fim, agrupamento = 'day', medicoId, tipo } = req.query as ReceitaQuery;

    let dataInicio = inicio ? new Date(inicio) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const dataFim = fim ? new Date(fim) : new Date();

    const now = new Date();
    let minDate: Date | null = null;

    if (plan === 'BASICO') {
      minDate = subDays(now, 30);
    } else if (plan === 'PRO') {
      minDate = subMonths(now, 12);
    }

    if (minDate && dataInicio < minDate) {
      dataInicio = minDate;
    }


    // Whitelist agrupamento — DATE_TRUNC requires a literal, not a parameter
    const allowedIntervals: Record<string, string> = { day: 'day', week: 'week', month: 'month' };
    const interval = allowedIntervals[agrupamento] || 'day';

    // Build dynamic WHERE clauses with parameterized values
    const params: unknown[] = [clinicaId, dataInicio, dataFim];
    let extraWhere = '';

    if (medicoId) {
      params.push(medicoId);
      extraWhere += ` AND f."medicoId" = $${params.length}`;
    }
    if (tipo) {
      params.push(tipo);
      extraWhere += ` AND f.tipo = $${params.length}`;
    }

    const results = await prisma.$queryRawUnsafe<ReceitaResult[]>(`
      SELECT
        DATE_TRUNC('${interval}', f."dataEmissao") AS periodo,
        f."medicoId" AS medico_id,
        m.nome AS medico_nome,
        COUNT(DISTINCT f.id)::int AS consultas,
        SUM(f.total)::int AS receita,
        SUM(CASE WHEN f.tipo = 'SEGURO' AND sp.estado = 'PENDENTE' THEN f.total ELSE 0 END)::int AS seguros_pendentes
      FROM faturas f
      LEFT JOIN medicos m ON f."medicoId" = m.id
      LEFT JOIN pagamentos p ON p."faturaId" = f.id
      LEFT JOIN seguros_pagamento sp ON sp."pagamentoId" = p.id
      WHERE f."clinicaId" = $1
        AND f."dataEmissao" BETWEEN $2 AND $3
        AND f.estado IN ('EMITIDA', 'PAGA')
        ${extraWhere}
      GROUP BY DATE_TRUNC('${interval}', f."dataEmissao"), f."medicoId", m.nome
      ORDER BY periodo DESC
    `, ...params);

    // Aggregate totals
    const totais = results.reduce((acc, curr) => {
      acc.consultas += curr.consultas;
      acc.receita += curr.receita;
      acc.segurosPendentes += curr.seguros_pendentes || 0;
      return acc;
    }, { consultas: 0, receita: 0, segurosPendentes: 0 });

    const mediaConsulta = totais.consultas > 0 ? Math.round(totais.receita / totais.consultas) : 0;

    // Group by doctor
    const porMedico = results.reduce((acc: Record<string, { nome: string, consultas: number, receita: number }>, curr) => {
      const medico = curr.medico_nome || 'Sem Médico';
      if (!acc[medico]) {
        acc[medico] = { nome: medico, consultas: 0, receita: 0 };
      }
      acc[medico].consultas += curr.consultas;
      acc[medico].receita += curr.receita;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totais: { ...totais, mediaConsulta },
        porMedico: Object.values(porMedico),
        serie: results
      }
    });
  } catch (err) { next(err); }
});

relatoriosRouter.get('/receita/export', requireRole([Papel.ADMIN]), async (req: Request, res: Response, next) => {
  try {
    const clinicaId = req.clinica.id!;
    const plan = req.clinica.plano;

    const { inicio, fim, medicoId, tipo } = req.query as ReceitaQuery;
    let dataInicio = inicio ? new Date(inicio) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const dataFim = fim ? new Date(fim) : new Date();

    const now = new Date();
    let minDate: Date | null = null;

    if (plan === 'BASICO') {
      minDate = subDays(now, 30);
    } else if (plan === 'PRO') {
      minDate = subMonths(now, 12);
    }

    if (minDate && dataInicio < minDate) {
      dataInicio = minDate;
    }

    const where: Prisma.FaturaWhereInput = {
      clinicaId,
      dataEmissao: { gte: dataInicio, lte: dataFim },
      estado: { in: ['EMITIDA', 'PAGA'] },
      ...(medicoId && { medicoId: String(medicoId) }),
      ...(tipo && { tipo: tipo as TipoFatura })
    };

    const faturas = await prisma.fatura.findMany({
      where,
      include: {
        paciente: { select: { nome: true } },
        medico: { select: { nome: true } }
      },
      orderBy: { dataEmissao: 'desc' }
    });

    // CSV with BOM and semicolon separator
    let csv = '\uFEFF';
    csv += 'Data;Fatura;Paciente;Medico;Tipo;Total;Estado\n';

    faturas.forEach(f => {
      const data = f.dataEmissao?.toLocaleDateString('pt-AO') || '';
      csv += `${data};${f.numeroFatura};${f.paciente?.nome || '---'};${f.medico?.nome || '---'};${f.tipo};${f.total};${f.estado}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=relatorio-receita-${new Date().toISOString().split('T')[0]}.csv`);
    res.status(200).send(csv);
  } catch (err) { next(err); }
});
