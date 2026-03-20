import { logger } from '../lib/logger';
import { addDays, startOfDay, endOfDay } from 'date-fns';
import { config } from '../lib/config';
import { Resend } from 'resend';
import { emailTemplates } from '../lib/emailTemplates';
import { EstadoSubscricao } from '@clinicaplus/types';
import { prisma } from '../lib/prisma';

const resend = new Resend(config.RESEND_API_KEY);
const FROM = 'ClinicaPlus <noreply@zimbotechia.site>';

export async function jobSubscricaoAvisos() {
  const log = logger.child({ job: 'subscricao-avisos' });
  log.info('Iniciando envio de avisos de expiração');

  const thresholds = [30, 7, 1];

  try {
    for (const days of thresholds) {
      const targetDate = addDays(new Date(), days);
      const start = startOfDay(targetDate);
      const end = endOfDay(targetDate);

      const aExpirar = await prisma.clinica.findMany({
        where: {
          subscricaoEstado: EstadoSubscricao.ACTIVA,
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
            html: emailTemplates.avisoExpiracao({
              clinicaNome: clinica.nome,
              diasRestantes: days,
              dataExpiracao: clinica.subscricaoValidaAte!,
            }),
          });
          log.info({ clinicaId: clinica.id, days }, 'Aviso enviado');
        } catch (emailErr) {
          log.error({ emailErr, clinicaId: clinica.id }, `Falha ao enviar aviso D-${days}`);
        }
      }
    }
    log.info('Finalizado jobSubscricaoAvisos');
  } catch (err) {
    log.error({ err }, 'Erro crítico no jobSubscricaoAvisos');
  }
}
