"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobVerificarExpiracoes = jobVerificarExpiracoes;
const prisma_1 = require("../lib/prisma");
const logger_1 = require("../lib/logger");
const date_fns_1 = require("date-fns");
const client_1 = require("@prisma/client");
const types_1 = require("@clinicaplus/types");
const config_1 = require("../lib/config");
const resend_1 = require("resend");
const emailTemplates_1 = require("../lib/emailTemplates");
const resend = new resend_1.Resend(config_1.config.RESEND_API_KEY);
const FROM = 'ClinicaPlus <noreply@zimbotechia.site>';
async function jobVerificarExpiracoes() {
    const agora = new Date();
    const log = logger_1.logger.child({ job: 'subscricao-expiracao' });
    log.info('Iniciando verificação de expirações de subscrição');
    try {
        // 1. TRIAL expirado → converter para BASICO/ACTIVA (conforme Sprint Rules)
        const trialsExpirados = await prisma_1.prisma.clinica.findMany({
            where: {
                subscricaoEstado: types_1.EstadoSubscricao.TRIAL,
                subscricaoValidaAte: { lt: agora },
            },
        });
        for (const clinica of trialsExpirados) {
            log.info({ clinicaId: clinica.id }, 'Convertendo TRIAL expirado -> BASICO');
            await prisma_1.prisma.$transaction(async (tx) => {
                const sub = await tx.subscricao.create({
                    data: {
                        clinicaId: clinica.id,
                        plano: client_1.Plano.BASICO,
                        estado: types_1.EstadoSubscricao.ACTIVA, // Converter para activa básica
                        inicioEm: agora,
                        validaAte: (0, date_fns_1.addDays)(agora, 30),
                        razao: client_1.RazaoMudancaPlano.TRIAL_EXPIRADO,
                        alteradoPor: 'sistema',
                        notas: 'Conversão automática após fim do Trial'
                    }
                });
                await tx.clinica.update({
                    where: { id: clinica.id },
                    data: {
                        plano: client_1.Plano.BASICO,
                        subscricaoEstado: types_1.EstadoSubscricao.ACTIVA,
                        subscricaoValidaAte: sub.validaAte
                    }
                });
            });
        }
        // 2. ACTIVA expirada → transição para GRACE_PERIOD
        const activasExpiradas = await prisma_1.prisma.clinica.findMany({
            where: {
                subscricaoEstado: types_1.EstadoSubscricao.ACTIVA,
                subscricaoValidaAte: { lt: agora },
            },
            include: { subscricoes: { orderBy: { criadoEm: 'desc' }, take: 1 } }
        });
        for (const clinica of activasExpiradas) {
            log.info({ clinicaId: clinica.id }, 'Transição ACTIVA -> GRACE_PERIOD');
            const subId = clinica.subscricoes[0]?.id;
            await prisma_1.prisma.$transaction(async (tx) => {
                await tx.clinica.update({
                    where: { id: clinica.id },
                    data: { subscricaoEstado: types_1.EstadoSubscricao.GRACE_PERIOD },
                });
                if (subId) {
                    await tx.subscricaoNotificacao.upsert({
                        where: { subscricaoId_tipo: { subscricaoId: subId, tipo: 'EXPIROU' } },
                        create: { subscricaoId: subId, tipo: 'EXPIROU', enviadoEm: agora },
                        update: { enviadoEm: agora }
                    });
                }
            });
            // Enviar email Grace Period
            try {
                await resend.emails.send({
                    from: FROM,
                    to: clinica.email,
                    subject: 'Subscrição Expirada — Período de Graça — ClinicaPlus',
                    html: emailTemplates_1.emailTemplates.gracePeriod({
                        clinicaNome: clinica.nome,
                        diasRestantes: 7,
                        dataExpiracao: clinica.subscricaoValidaAte,
                    }),
                });
            }
            catch (emailErr) {
                log.error({ emailErr, clinicaId: clinica.id }, 'Falha ao enviar email grace period');
            }
        }
        // 3. GRACE_PERIOD há mais de 7 dias → SUSPENSA
        const graceExpirados = await prisma_1.prisma.clinica.findMany({
            where: {
                subscricaoEstado: types_1.EstadoSubscricao.GRACE_PERIOD,
                subscricaoValidaAte: { lt: (0, date_fns_1.subDays)(agora, 7) },
            },
        });
        for (const clinica of graceExpirados) {
            log.info({ clinicaId: clinica.id }, 'Suspendendo conta após GRACE_PERIOD');
            await prisma_1.prisma.$transaction(async (tx) => {
                const sub = await tx.subscricao.create({
                    data: {
                        clinicaId: clinica.id,
                        plano: client_1.Plano.BASICO,
                        estado: types_1.EstadoSubscricao.SUSPENSA,
                        inicioEm: agora,
                        validaAte: clinica.subscricaoValidaAte,
                        razao: client_1.RazaoMudancaPlano.DOWNGRADE_AUTO,
                        alteradoPor: 'sistema',
                        notas: 'Suspensão automática após grace period'
                    }
                });
                await tx.clinica.update({
                    where: { id: clinica.id },
                    data: {
                        plano: client_1.Plano.BASICO,
                        subscricaoEstado: types_1.EstadoSubscricao.SUSPENSA
                    }
                });
                await tx.subscricaoNotificacao.create({
                    data: { subscricaoId: sub.id, tipo: 'GRACE_END', enviadoEm: agora }
                });
            });
            // Enviar email Conta Suspensa
            try {
                await resend.emails.send({
                    from: FROM,
                    to: clinica.email,
                    subject: 'Conta Suspensa — ClinicaPlus',
                    html: emailTemplates_1.emailTemplates.contaSuspensa({
                        clinicaNome: clinica.nome,
                    }),
                });
            }
            catch (emailErr) {
                log.error({ emailErr, clinicaId: clinica.id }, 'Falha ao enviar email suspensão');
            }
        }
        log.info('Finalizado jobVerificarExpiracoes');
    }
    catch (err) {
        log.error({ err }, 'Erro crítico no jobVerificarExpiracoes');
    }
}
