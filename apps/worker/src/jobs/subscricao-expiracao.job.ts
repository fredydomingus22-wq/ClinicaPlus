import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { subDays, addDays } from 'date-fns';
import { Plano, RazaoMudancaPlano } from '@prisma/client';
import { EstadoSubscricao } from '@clinicaplus/types';
import { config } from '../lib/config';
import { Resend } from 'resend';
import { emailTemplates } from '../lib/emailTemplates';

const resend = new Resend(config.RESEND_API_KEY);
const FROM = 'ClinicaPlus <noreply@zimbotechia.site>';

export async function jobVerificarExpiracoes() {
  const agora = new Date();
  const log = logger.child({ job: 'subscricao-expiracao' });
  log.info('Iniciando verificação de expirações de subscrição');

  try {
    // 1. TRIAL expirado → converter para BASICO/ACTIVA (conforme Sprint Rules)
    const trialsExpirados = await prisma.clinica.findMany({
      where: {
        subscricaoEstado: EstadoSubscricao.TRIAL,
        subscricaoValidaAte: { lt: agora },
      },
    });

    for (const clinica of trialsExpirados) {
      log.info({ clinicaId: clinica.id }, 'Convertendo TRIAL expirado -> BASICO/ACTIVA');
      await prisma.$transaction(async (tx) => {
        const sub = await tx.subscricao.create({
          data: {
            clinicaId: clinica.id,
            plano: Plano.BASICO,
            estado: EstadoSubscricao.ACTIVA,
            inicioEm: agora,
            validaAte: addDays(agora, 30),
            razao: RazaoMudancaPlano.TRIAL_EXPIRADO,
            alteradoPor: 'sistema',
          }
        });

        await tx.clinica.update({
          where: { id: clinica.id },
          data: {
            plano: Plano.BASICO,
            subscricaoEstado: EstadoSubscricao.ACTIVA,
            subscricaoValidaAte: sub.validaAte
          }
        });
      });
    }

    // 2. ACTIVA expirada → transição para GRACE_PERIOD
    const activasExpiradas = await prisma.clinica.findMany({
      where: {
        subscricaoEstado: EstadoSubscricao.ACTIVA,
        subscricaoValidaAte: { lt: agora },
      },
    });

    for (const clinica of activasExpiradas) {
      log.info({ clinicaId: clinica.id }, 'Transição ACTIVA -> GRACE_PERIOD');
      await prisma.clinica.update({
        where: { id: clinica.id },
        data: { subscricaoEstado: EstadoSubscricao.GRACE_PERIOD },
      });
      
      // Enviar email Grace Period
      try {
        await resend.emails.send({
          from: FROM,
          to: clinica.email,
          subject: 'Subscrição Expirada — Período de Graça — ClinicaPlus',
          html: emailTemplates.gracePeriod({
            clinicaNome: clinica.nome,
            diasRestantes: 7,
            dataExpiracao: clinica.subscricaoValidaAte!,
          }),
        });
      } catch (emailErr) {
        log.error({ emailErr, clinicaId: clinica.id }, 'Falha ao enviar email grace period');
      }
    }

    // 3. GRACE_PERIOD há mais de 7 dias → SUSPENSA
    const graceExpirados = await prisma.clinica.findMany({
      where: {
        subscricaoEstado: EstadoSubscricao.GRACE_PERIOD,
        subscricaoValidaAte: { lt: subDays(agora, 7) },
      },
    });

    for (const clinica of graceExpirados) {
      log.info({ clinicaId: clinica.id }, 'Suspendendo conta após GRACE_PERIOD');
      await prisma.$transaction(async (tx) => {
        await tx.subscricao.create({
          data: {
            clinicaId: clinica.id,
            plano: Plano.BASICO,
            estado: EstadoSubscricao.SUSPENSA,
            inicioEm: agora,
            validaAte: clinica.subscricaoValidaAte!,
            razao: RazaoMudancaPlano.DOWNGRADE_AUTO,
            alteradoPor: 'sistema',
            notas: 'Suspensão automática após grace period'
          }
        });

        await tx.clinica.update({
          where: { id: clinica.id },
          data: {
            plano: Plano.BASICO,
            subscricaoEstado: EstadoSubscricao.SUSPENSA
          }
        });
      });

      // Enviar email Conta Suspensa
      try {
        await resend.emails.send({
          from: FROM,
          to: clinica.email,
          subject: 'Conta Suspensa — ClinicaPlus',
          html: emailTemplates.contaSuspensa({
            clinicaNome: clinica.nome,
          }),
        });
      } catch (emailErr) {
        log.error({ emailErr, clinicaId: clinica.id }, 'Falha ao enviar email suspensão');
      }
    }

    log.info('Finalizado jobVerificarExpiracoes');
  } catch (err) {
    log.error({ err }, 'Erro crítico no jobVerificarExpiracoes');
  }
}
