"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.relatoriosRouter = void 0;
const express_1 = require("express");
const date_fns_1 = require("date-fns");
const prisma_1 = require("../lib/prisma");
const requirePermission_1 = require("../middleware/requirePermission");
exports.relatoriosRouter = (0, express_1.Router)();
exports.relatoriosRouter.get('/receita', (0, requirePermission_1.requirePermission)('relatorio', 'read'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const plan = req.clinica.plano;
        const { inicio, fim, agruparPor = 'day', medicoId, tipo } = req.query;
        let dataInicio = inicio ? new Date(inicio) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        dataInicio.setHours(0, 0, 0, 0);
        const dataFim = fim ? new Date(fim) : new Date();
        if (fim) {
            dataFim.setHours(23, 59, 59, 999);
        }
        const now = new Date();
        let minDate = null;
        if (plan === 'BASICO') {
            minDate = (0, date_fns_1.subDays)(now, 30);
        }
        else if (plan === 'PRO') {
            minDate = (0, date_fns_1.subMonths)(now, 12);
        }
        if (minDate && dataInicio < minDate) {
            dataInicio = minDate;
        }
        // Whitelist agruparPor — DATE_TRUNC requires a literal, not a parameter
        const allowedIntervals = { day: 'day', week: 'week', month: 'month' };
        const interval = allowedIntervals[agruparPor] || 'day';
        // Build dynamic WHERE clauses with parameterized values
        const params = [clinicaId, dataInicio, dataFim];
        let extraWhere = '';
        if (medicoId) {
            params.push(medicoId);
            extraWhere += ` AND f."medicoId" = $${params.length}`;
        }
        if (tipo) {
            params.push(tipo);
            extraWhere += ` AND f.tipo::text = $${params.length}`;
        }
        const results = await prisma_1.prisma.$queryRawUnsafe(`
      SELECT
        DATE_TRUNC('${interval}', f."dataEmissao") AS periodo,
        f."medicoId" AS medico_id,
        m.nome AS medico_nome,
        COUNT(DISTINCT f.id)::int AS consultas,
        SUM(CASE WHEN f.estado::text IN ('EMITIDA', 'PAGA') THEN f.total ELSE 0 END)::int AS receita,
        SUM(CASE WHEN f.estado::text IN ('EMITIDA', 'PAGA') THEN f."totalIva" ELSE 0 END)::int AS total_iva,
        SUM(CASE WHEN f.estado::text = 'RASCUNHO' THEN f.total ELSE 0 END)::int AS receita_prevista,
        COUNT(DISTINCT CASE WHEN f.estado::text = 'RASCUNHO' THEN f.id ELSE NULL END)::int AS rascunhos,
        SUM(CASE WHEN f.tipo::text = 'SEGURO' AND sp.estado::text = 'PENDENTE' THEN f.total ELSE 0 END)::int AS seguros_pendentes
      FROM faturas f
      LEFT JOIN medicos m ON f."medicoId" = m.id
      LEFT JOIN pagamentos p ON p."faturaId" = f.id
      LEFT JOIN seguros_pagamento sp ON sp."pagamentoId" = p.id
      WHERE f."clinicaId" = $1
        AND (
          (f.estado::text IN ('EMITIDA', 'PAGA') AND f."dataEmissao" BETWEEN $2 AND $3)
          OR 
          (f.estado::text = 'RASCUNHO' AND f."criadoEm" BETWEEN $2 AND $3)
        )
        ${extraWhere}
      GROUP BY DATE_TRUNC('${interval}', f."dataEmissao"), f."medicoId", m.nome
      ORDER BY periodo DESC
    `, ...params);
        // Aggregate totals
        const totais = results.reduce((acc, curr) => {
            acc.consultas += curr.consultas;
            acc.receita += curr.receita;
            acc.totalIva += curr.total_iva || 0;
            acc.receitaPrevista += curr.receita_prevista || 0;
            acc.rascunhos += curr.rascunhos || 0;
            acc.segurosPendentes += curr.seguros_pendentes || 0;
            return acc;
        }, { consultas: 0, receita: 0, totalIva: 0, receitaPrevista: 0, rascunhos: 0, segurosPendentes: 0 });
        const mediaConsulta = totais.consultas > 0 ? Math.round(totais.receita / totais.consultas) : 0;
        // Group by doctor
        const porMedico = results.reduce((acc, curr) => {
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
    }
    catch (err) {
        next(err);
    }
});
exports.relatoriosRouter.get('/receita/export', (0, requirePermission_1.requirePermission)('relatorio', 'export'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const plan = req.clinica.plano;
        // Verificar se o plano permite exportação
        const { planEnforcementService } = await Promise.resolve().then(() => __importStar(require('../services/planEnforcement.service')));
        await planEnforcementService.canUseFeature(clinicaId, 'export');
        const { inicio, fim, medicoId, tipo } = req.query;
        let dataInicio = inicio ? new Date(inicio) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const dataFim = fim ? new Date(fim) : new Date();
        const now = new Date();
        let minDate = null;
        if (plan === 'BASICO') {
            minDate = (0, date_fns_1.subDays)(now, 30);
        }
        else if (plan === 'PRO') {
            minDate = (0, date_fns_1.subMonths)(now, 12);
        }
        if (minDate && dataInicio < minDate) {
            dataInicio = minDate;
        }
        const where = {
            clinicaId,
            dataEmissao: { gte: dataInicio, lte: dataFim },
            estado: { in: ['EMITIDA', 'PAGA'] },
            ...(medicoId && { medicoId: String(medicoId) }),
            ...(tipo && { tipo: tipo })
        };
        const faturas = await prisma_1.prisma.fatura.findMany({
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
    }
    catch (err) {
        next(err);
    }
});
exports.relatoriosRouter.get('/mapa-faturacao', (0, requirePermission_1.requirePermission)('relatorio', 'read'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const { inicio, fim, medicoId } = req.query;
        const dataInicio = inicio ? new Date(inicio) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const dataFim = fim ? new Date(fim) : new Date();
        const faturas = await prisma_1.prisma.fatura.findMany({
            where: {
                clinicaId,
                dataEmissao: { gte: dataInicio, lte: dataFim },
                estado: { in: ['EMITIDA', 'PAGA', 'ANULADA'] },
                ...(medicoId && { medicoId })
            },
            include: {
                paciente: { select: { nome: true, nif: true, endereco: true, cidade: true } },
                medico: { select: { nome: true } }
            },
            orderBy: { dataEmissao: 'asc' }
        });
        const totais = faturas.reduce((acc, f) => {
            if (f.estado !== 'ANULADA') {
                acc.totalFaturado += Number(f.total);
                acc.totalDescontos += Number(f.desconto);
                acc.totalIva += Number(f.totalIva || 0);
            }
            return acc;
        }, { totalFaturado: 0, totalIva: 0, totalDescontos: 0 });
        res.json({
            success: true,
            data: {
                inicio: dataInicio.toISOString(),
                fim: dataFim.toISOString(),
                faturas,
                ...totais
            }
        });
    }
    catch (err) {
        next(err);
    }
});
