"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardService = void 0;
const prisma_1 = require("../lib/prisma");
exports.dashboardService = {
    /**
     * Returns overall statistics for a clinic manager.
     */
    async getStats(clinicaId, periodo) {
        const now = new Date();
        const startDate = new Date();
        if (periodo === 'hoje') {
            startDate.setHours(0, 0, 0, 0);
        }
        else if (periodo === 'semana') {
            startDate.setDate(now.getDate() - 7);
        }
        else {
            startDate.setDate(now.getDate() - 30);
        }
        // Previous period for trends
        const prevStartDate = new Date(startDate);
        const diff = now.getTime() - startDate.getTime();
        prevStartDate.setTime(startDate.getTime() - diff);
        const [totalPacientes, consultasHoje, consultasSemana, receitasAtivas, prevTotalPacientes, prevTotalConsultas, prevTotalReceitas, novosPacientes, prevNovosPacientes, totalMedicosAtivos, agendamentosPeriodo, agendamentosPrevPeriodo, consultasPeriodo, prevConsultasPeriodo] = await prisma_1.prisma.$transaction([
            // Total patients
            prisma_1.prisma.paciente.count({ where: { clinicaId, ativo: true } }),
            // Consultations today
            prisma_1.prisma.agendamento.count({
                where: {
                    clinicaId,
                    dataHora: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        lt: new Date(new Date().setHours(23, 59, 59, 999)),
                    },
                },
            }),
            // Consultations this week (last 7 days)
            prisma_1.prisma.agendamento.count({
                where: {
                    clinicaId,
                    dataHora: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
                },
            }),
            // Active prescriptions
            prisma_1.prisma.receita.count({
                where: {
                    clinicaId,
                    dataValidade: { gte: now },
                },
            }),
            // Trend: Patients in previous period
            prisma_1.prisma.paciente.count({
                where: { clinicaId, ativo: true, criadoEm: { lt: startDate } },
            }),
            // Trend: Consultations in previous period
            prisma_1.prisma.agendamento.count({
                where: {
                    clinicaId,
                    dataHora: { gte: prevStartDate, lt: startDate },
                },
            }),
            // Trend: Recipes in previous period
            prisma_1.prisma.receita.count({
                where: {
                    clinicaId,
                    criadoEm: { gte: prevStartDate, lt: startDate },
                },
            }),
            // Novos pacientes no periodo atual
            prisma_1.prisma.paciente.count({
                where: { clinicaId, criadoEm: { gte: startDate, lte: now } }
            }),
            // Novos pacientes no periodo anterior
            prisma_1.prisma.paciente.count({
                where: { clinicaId, criadoEm: { gte: prevStartDate, lt: startDate } }
            }),
            // Medicos ativos para taxa de ocupacao
            prisma_1.prisma.medico.count({ where: { clinicaId, ativo: true } }),
            // Agendamentos detalhados para faturamento/especialidade no periodo
            prisma_1.prisma.agendamento.findMany({
                where: {
                    clinicaId,
                    dataHora: { gte: startDate, lte: now },
                    estado: { in: ['CONFIRMADO', 'CONCLUIDO'] },
                },
                select: {
                    medico: {
                        select: {
                            preco: true,
                            especialidade: {
                                select: { nome: true }
                            }
                        }
                    }
                }
            }),
            // Agendamentos detalhados do periodo anterior (para tendencia de faturamento)
            prisma_1.prisma.agendamento.findMany({
                where: {
                    clinicaId,
                    dataHora: { gte: prevStartDate, lt: startDate },
                    estado: { in: ['CONFIRMADO', 'CONCLUIDO'] },
                },
                select: {
                    medico: {
                        select: { preco: true }
                    }
                }
            }),
            // Consultas totais no período (para ocupação)
            prisma_1.prisma.agendamento.count({
                where: { clinicaId, dataHora: { gte: startDate, lte: now }, estado: { not: 'CANCELADO' } }
            }),
            // Consultas totais no período anterior (para tendencia de ocupação)
            prisma_1.prisma.agendamento.count({
                where: { clinicaId, dataHora: { gte: prevStartDate, lt: startDate }, estado: { not: 'CANCELADO' } }
            })
        ]);
        const calculateTrend = (curr, prev) => {
            if (prev === 0)
                return curr > 0 ? 100 : 0;
            return Math.round(((curr - prev) / prev) * 100);
        };
        // Faturamento
        const faturamentoEstimado = agendamentosPeriodo.reduce((acc, ag) => acc + (ag.medico?.preco || 0), 0);
        const prevFaturamento = agendamentosPrevPeriodo.reduce((acc, ag) => acc + (ag.medico?.preco || 0), 0);
        // Ocupação
        const numDias = periodo === 'hoje' ? 1 : periodo === 'semana' ? 7 : 30;
        const capacidadeTotal = totalMedicosAtivos * 16 * numDias;
        const taxaOcupacao = capacidadeTotal > 0 ? Math.round((consultasPeriodo / capacidadeTotal) * 100) : 0;
        const prevTaxaOcupacao = capacidadeTotal > 0 ? Math.round((prevConsultasPeriodo / capacidadeTotal) * 100) : 0;
        // Distribuição por Especialidade
        const distMap = new Map();
        agendamentosPeriodo.forEach(ag => {
            const sp = ag.medico?.especialidade?.nome || 'Geral';
            distMap.set(sp, (distMap.get(sp) || 0) + 1);
        });
        const distribuicaoEspecialidade = Array.from(distMap.entries())
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value);
        return {
            totalPacientes,
            consultasHoje,
            consultasSemana,
            receitasAtivas,
            faturamentoEstimado,
            taxaOcupacao,
            novosPacientes,
            distribuicaoEspecialidade,
            tendencias: {
                pacientes: calculateTrend(totalPacientes, prevTotalPacientes),
                consultas: calculateTrend(consultasSemana, prevTotalConsultas),
                receitas: calculateTrend(receitasAtivas, prevTotalReceitas),
                faturamento: calculateTrend(faturamentoEstimado, prevFaturamento),
                ocupacao: Math.round(taxaOcupacao - prevTaxaOcupacao), // Variação em pontos percentuais
                novosPacientes: calculateTrend(novosPacientes, prevNovosPacientes)
            },
        };
    },
    /**
     * Returns statistics and today's schedule for a specific doctor.
     */
    async getDashboardMedico(utilizadorId, clinicaId) {
        const medico = await prisma_1.prisma.medico.findFirst({
            where: { utilizadorId, clinicaId },
        });
        if (!medico) {
            throw new Error('Perfil de médico não encontrado');
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const [consultasHoje, concluidas, aAguardar, agendamentos] = await prisma_1.prisma.$transaction([
            // Total today
            prisma_1.prisma.agendamento.count({
                where: {
                    clinicaId,
                    medicoId: medico.id,
                    dataHora: { gte: today, lt: tomorrow },
                },
            }),
            // Completed today
            prisma_1.prisma.agendamento.count({
                where: {
                    clinicaId,
                    medicoId: medico.id,
                    dataHora: { gte: today, lt: tomorrow },
                    estado: 'CONCLUIDO',
                },
            }),
            // Waiting (Confirmed but not in progress/completed)
            prisma_1.prisma.agendamento.count({
                where: {
                    clinicaId,
                    medicoId: medico.id,
                    dataHora: { gte: today, lt: tomorrow },
                    estado: 'CONFIRMADO',
                },
            }),
            // Today's list
            prisma_1.prisma.agendamento.findMany({
                where: {
                    clinicaId,
                    medicoId: medico.id,
                    dataHora: { gte: today, lt: tomorrow },
                },
                include: {
                    paciente: true,
                    medico: true,
                },
                orderBy: { dataHora: 'asc' },
            }),
        ]);
        return {
            consultasHoje,
            concluidas,
            aAguardar,
            agendamentos: agendamentos.map((a) => ({
                id: a.id,
                clinicaId: a.clinicaId,
                pacienteId: a.pacienteId,
                medicoId: a.medicoId,
                dataHora: a.dataHora.toISOString(),
                duracao: a.duracao,
                tipo: a.tipo,
                estado: a.estado,
                motivoConsulta: a.motivoConsulta,
                observacoes: a.observacoes,
                triagem: a.triagem,
                notasConsulta: a.notasConsulta,
                diagnostico: a.diagnostico,
                paciente: {
                    ...a.paciente,
                    dataNascimento: a.paciente.dataNascimento.toISOString(),
                    criadoEm: a.paciente.criadoEm.toISOString(),
                    atualizadoEm: a.paciente.atualizadoEm.toISOString(),
                },
                medico: {
                    ...a.medico,
                    horario: a.medico.horario,
                    criadoEm: a.medico.criadoEm.toISOString(),
                    atualizadoEm: a.medico.atualizadoEm.toISOString(),
                },
                canceladoPor: a.canceladoPor,
                canceladoEm: a.canceladoEm?.toISOString() || null,
                criadoEm: a.criadoEm.toISOString(),
                atualizadoEm: a.atualizadoEm.toISOString(),
            })),
        };
    },
    /**
     * Returns appointment counts per day for the last 7 days.
     */
    async getConsultasPorDia(clinicaId) {
        const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const result = [];
        for (let i = 6; i >= 0; i--) {
            const day = new Date();
            day.setDate(day.getDate() - i);
            day.setHours(0, 0, 0, 0);
            const nextDay = new Date(day);
            nextDay.setDate(nextDay.getDate() + 1);
            const count = await prisma_1.prisma.agendamento.count({
                where: {
                    clinicaId,
                    dataHora: { gte: day, lt: nextDay },
                },
            });
            result.push({
                label: dayLabels[day.getDay()],
                value: count,
            });
        }
        return result;
    },
};
