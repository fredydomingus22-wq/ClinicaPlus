"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobSubscricaoAvisos = jobSubscricaoAvisos;
const logger_1 = require("../lib/logger");
const date_fns_1 = require("date-fns");
const config_1 = require("../lib/config");
const resend_1 = require("resend");
const emailTemplates_1 = require("../lib/emailTemplates");
const types_1 = require("@clinicaplus/types");
const prisma_1 = require("../lib/prisma");
const resend = new resend_1.Resend(config_1.config.RESEND_API_KEY);
const FROM = 'ClinicaPlus <noreply@zimbotechia.site>';
async function jobSubscricaoAvisos() {
    const log = logger_1.logger.child({ job: 'subscricao-avisos' });
    log.info('Iniciando envio de avisos de expiração');
    const thresholds = [30, 7, 1];
    try {
        for (const days of thresholds) {
            const targetDate = (0, date_fns_1.addDays)(new Date(), days);
            const start = (0, date_fns_1.startOfDay)(targetDate);
            const end = (0, date_fns_1.endOfDay)(targetDate);
            const aExpirar = await prisma_1.prisma.clinica.findMany({
                where: {
                    subscricaoEstado: types_1.EstadoSubscricao.ACTIVA,
                    subscricaoValidaAte: {
                        gte: start,
                        lte: end,
                    },
                }
            });
            log.info({ days, count: aExpirar.length }, `Processando avisos D-${days}`);
            for (const clinica of aExpirar) {
                try {
                    await resend.emails.send({
                        from: FROM,
                        to: clinica.email,
                        subject: `A tua subscrição ClinicaPlus expira em ${days} ${days === 1 ? 'dia' : 'dias'}`,
                        html: emailTemplates_1.emailTemplates.avisoExpiracao({
                            clinicaNome: clinica.nome,
                            diasRestantes: days,
                            dataExpiracao: clinica.subscricaoValidaAte,
                        }),
                    });
                    log.info({ clinicaId: clinica.id, days }, 'Aviso enviado');
                }
                catch (emailErr) {
                    log.error({ emailErr, clinicaId: clinica.id }, `Falha ao enviar aviso D-${days}`);
                }
            }
        }
        log.info('Finalizado jobSubscricaoAvisos');
    }
    catch (err) {
        log.error({ err }, 'Erro crítico no jobSubscricaoAvisos');
    }
}
