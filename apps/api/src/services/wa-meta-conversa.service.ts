import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { metaCloudApi, MetaListSection } from '../lib/metaCloudApi';
import { decryptSecret } from '../lib/secretCrypto';
import { WaInstancia, WaConversa, WaEstadoConversa, WaDirecao, Prisma } from '@prisma/client';
import { format, addDays } from 'date-fns';
import { pt } from 'date-fns/locale';

// ─── Tipos internos ──────────────────────────────────────────────────────────

/** Mensagem tipificada da Meta (simplificada para uso interno) */
interface MetaMsgInput {
  id: string;
  type: string;
  text?: { body: string };
  interactive?: {
    type: 'list_reply' | 'button_reply';
    list_reply?: { id: string; title: string };
    button_reply?: { id: string; title: string };
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Envia uma mensagem de saída e persiste na BD.
 */
async function enviarEPersistir(
  instancia: WaInstancia,
  conversaId: string,
  numero: string,
  fn: () => Promise<{ messages: Array<{ id: string }> }>,
  conteudoLog: string,
): Promise<void> {
  try {
    const res = await fn();
    await prisma.waMensagem.create({
      data: {
        conversaId,
        conteudo: conteudoLog,
        direcao: WaDirecao.SAIDA,
        evolutionMsgId: res.messages[0]?.id ?? null,
        tipo: 'interactive',
        entregue: false,
        lida: false,
      },
    });
    logger.info({ conversaId, numero, msgId: res.messages[0]?.id }, 'Mensagem Meta enviada');
  } catch (err) {
    logger.error({ err, conversaId, numero }, 'Falha ao enviar mensagem Meta');
  }
}

/**
 * Actualiza o estado da conversa e o contexto JSON.
 */
async function actualizarConversa(
  conversaId: string,
  estado: WaEstadoConversa,
  contexto: Record<string, unknown>,
): Promise<void> {
  await prisma.waConversa.update({
    where: { id: conversaId },
    data: { estado, contexto: contexto as Prisma.InputJsonObject, ultimaMensagemEm: new Date() },
  });
}

// ─── Serviço ─────────────────────────────────────────────────────────────────

/**
 * Motor de fluxo de marcação nativo via Meta Cloud API.
 * Usa List Messages e Reply Buttons sem depender de n8n.
 *
 * Máquina de estados:
 *   AGUARDA_INPUT        → utilizador diz "Olá" etc.
 *   ESPECIALIDADE        → utilizador escolhe especialidade (list_reply)
 *   MEDICO               → utilizador escolhe médico (list_reply)
 *   HORARIO              → utilizador escolhe slot (list_reply)
 *   CONFIRMAR            → utilizador confirma ou cancela (button_reply)
 *   FINALIZADA           → marcação criada ✅
 */
export const waMetaConversaService = {
  /**
   * Ponto de entrada: recebe a mensagem e despacha conforme o estado da conversa.
   */
  async processarMensagem(
    instancia: WaInstancia,
    conversa: WaConversa,
    msg: MetaMsgInput,
    nomeContacto?: string,
  ): Promise<void> {
    // Instância sem credenciais Meta → sair silenciosamente
    if (!instancia.metaPhoneNumberId || !instancia.metaAccessToken) {
      logger.warn({ instanciaId: instancia.id }, 'Instância META_CLOUD sem credenciais — ignorar');
      return;
    }

    const phoneId = instancia.metaPhoneNumberId;
    const token = decryptSecret(instancia.metaAccessToken);
    const numero = conversa.numeroWhatsapp;
    const cid = conversa.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx: Record<string, unknown> = (conversa.contexto as any) ?? {};

    const estado = conversa.estado;

    // Detectar saudações para resets
    const texto = msg.text?.body?.toLowerCase().trim() ?? '';
    const eSaudacao = ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'hello', 'hi', 'marcação', 'marcacao', 'consulta'].some(
      (s) => texto.includes(s),
    );

    // Se em estado terminal ou saudação → reiniciar fluxo
    if (estado === WaEstadoConversa.AGUARDA_INPUT || eSaudacao) {
      await this.iniciarFluxo(instancia, conversa, nomeContacto);
      return;
    }

    // Respostas interactivas
    const listReplyId = msg.interactive?.list_reply?.id;
    const buttonReplyId = msg.interactive?.button_reply?.id;

    switch (estado) {
      case WaEstadoConversa.ESPECIALIDADE:
        if (listReplyId) await this.handleEspecialidade(instancia, conversa, listReplyId);
        else await this.enviarMensagemNaoEntendida(phoneId, token, numero, cid);
        break;

      case WaEstadoConversa.MEDICO:
        if (listReplyId) await this.handleMedico(instancia, conversa, listReplyId);
        else await this.enviarMensagemNaoEntendida(phoneId, token, numero, cid);
        break;

      case WaEstadoConversa.HORARIO:
        if (listReplyId) await this.handleHorario(instancia, conversa, listReplyId, ctx);
        else await this.enviarMensagemNaoEntendida(phoneId, token, numero, cid);
        break;

      case WaEstadoConversa.CONFIRMAR:
        if (buttonReplyId) await this.handleConfirmacao(instancia, conversa, buttonReplyId, ctx);
        else await this.enviarMensagemNaoEntendida(phoneId, token, numero, cid);
        break;

      default:
        await this.iniciarFluxo(instancia, conversa, nomeContacto);
    }
  },

  // ─── Passo 1: Menu de especialidades ──────────────────────────────────────

  async iniciarFluxo(
    instancia: WaInstancia,
    conversa: WaConversa,
    nomeContacto?: string,
  ): Promise<void> {
    const phoneId = instancia.metaPhoneNumberId!;
    const token = decryptSecret(instancia.metaAccessToken!);
    const numero = conversa.numeroWhatsapp;

    // Buscar especialidades activas da clínica
    const especialidades = await prisma.especialidade.findMany({
      where: { clinicaId: instancia.clinicaId, ativo: true },
      orderBy: { nome: 'asc' },
      take: 10, // limite da lista Meta
    });

    if (!especialidades.length) {
      await metaCloudApi.enviarTexto(
        phoneId, token, numero,
        '⚠️ Ainda não há especialidades configuradas nesta clínica. Por favor contacte a recepção.',
      );
      return;
    }

    const nome = nomeContacto ? `, ${nomeContacto.split(' ')[0]}` : '';
    const rows = especialidades.map((e) => ({
      id: `esp:${e.id}`,
      title: e.nome.substring(0, 24),
      ...(e.descricao ? { description: e.descricao.substring(0, 72) } : {}),
    }));

    const sections: MetaListSection[] = [{ title: 'Especialidades', rows }];

    await enviarEPersistir(
      instancia, conversa.id, numero,
      () => metaCloudApi.enviarInteractivoLista(phoneId, token, numero, {
        headerText: '🏥 ClinicaPlus',
        bodyText: `Olá${nome}! 👋 Bem-vindo(a).\n\nQual especialidade pretende?`,
        footerText: 'Toque em "Ver Opções" para escolher',
        buttonText: 'Ver Especialidades',
        sections,
      }),
      '[LISTA: escolha de especialidade]',
    );

    await actualizarConversa(conversa.id, WaEstadoConversa.ESPECIALIDADE, {});
  },

  // ─── Passo 2: Escolha de médico ───────────────────────────────────────────

  async handleEspecialidade(
    instancia: WaInstancia,
    conversa: WaConversa,
    listReplyId: string,
  ): Promise<void> {
    const phoneId = instancia.metaPhoneNumberId!;
    const token = decryptSecret(instancia.metaAccessToken!);
    const numero = conversa.numeroWhatsapp;

    const especialidadeId = listReplyId.replace('esp:', '');
    const especialidade = await prisma.especialidade.findUnique({ where: { id: especialidadeId } });

    if (!especialidade) {
      await this.enviarMensagemNaoEntendida(phoneId, token, numero, conversa.id);
      return;
    }

    const medicos = await prisma.medico.findMany({
      where: { clinicaId: instancia.clinicaId, especialidadeId, ativo: true },
      include: { utilizador: { select: { nome: true } } },
      take: 10,
    });

    if (!medicos.length) {
      await metaCloudApi.enviarTexto(
        phoneId, token, numero,
        `😔 Não há médicos disponíveis para *${especialidade.nome}* neste momento. Tente mais tarde.`,
      );
      return;
    }

    const rows = medicos.map((m) => ({
      id: `med:${m.id}`,
      title: m.nome.substring(0, 24),
      description: especialidade.nome.substring(0, 72),
    }));

    await enviarEPersistir(
      instancia, conversa.id, numero,
      () => metaCloudApi.enviarInteractivoLista(phoneId, token, numero, {
        headerText: `📋 ${especialidade.nome}`,
        bodyText: 'Escolha o médico:',
        footerText: 'Toque para ver os médicos disponíveis',
        buttonText: 'Ver Médicos',
        sections: [{ title: 'Médicos Disponíveis', rows }],
      }),
      '[LISTA: escolha de médico]',
    );

    await actualizarConversa(conversa.id, WaEstadoConversa.MEDICO, {
      especialidadeId,
      especialidadeNome: especialidade.nome,
    });
  },

  // ─── Passo 3: Escolha de horário ──────────────────────────────────────────

  async handleMedico(
    instancia: WaInstancia,
    conversa: WaConversa,
    listReplyId: string,
  ): Promise<void> {
    const phoneId = instancia.metaPhoneNumberId!;
    const token = decryptSecret(instancia.metaAccessToken!);
    const numero = conversa.numeroWhatsapp;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (conversa.contexto as any) ?? {};

    const medicoId = listReplyId.replace('med:', '');
    const medico = await prisma.medico.findUnique({
      where: { id: medicoId },
      include: { utilizador: { select: { nome: true } } },
    });

    if (!medico) {
      await this.enviarMensagemNaoEntendida(phoneId, token, numero, conversa.id);
      return;
    }

    // Buscar slots disponíveis para os próximos 3 dias
    const slots = await this.buscarSlots(medico.id, instancia.clinicaId);

    if (!slots.length) {
      await metaCloudApi.enviarTexto(
        phoneId, token, numero,
        `😔 O Dr(a). *${medico.nome}* não tem horários disponíveis nos próximos 3 dias. Deseja escolher outro médico?\n\nEscreva "Olá" para recomeçar.`,
      );
      return;
    }

    const rows = slots.slice(0, 10).map((slot) => ({
      id: `slot:${slot.iso}`,
      title: slot.label.substring(0, 24),
      description: format(new Date(slot.iso), 'EEEE, d MMMM', { locale: pt }),
    }));

    await enviarEPersistir(
      instancia, conversa.id, numero,
      () => metaCloudApi.enviarInteractivoLista(phoneId, token, numero, {
        headerText: `👨‍⚕️ ${medico.nome}`,
        bodyText: 'Escolha o horário da consulta:',
        footerText: 'Horários disponíveis para os próximos 3 dias',
        buttonText: 'Ver Horários',
        sections: [{ title: 'Horários Disponíveis', rows }],
      }),
      '[LISTA: escolha de horário]',
    );

    await actualizarConversa(conversa.id, WaEstadoConversa.HORARIO, {
      ...ctx,
      medicoId,
      medicoNome: medico.nome,
    });
  },

  // ─── Passo 4: Confirmação ────────────────────────────────────────────────

  async handleHorario(
    instancia: WaInstancia,
    conversa: WaConversa,
    listReplyId: string,
    ctx: Record<string, unknown>,
  ): Promise<void> {
    const phoneId = instancia.metaPhoneNumberId!;
    const token = decryptSecret(instancia.metaAccessToken!);
    const numero = conversa.numeroWhatsapp;

    const isoSlot = listReplyId.replace('slot:', '');
    const dataHora = new Date(isoSlot);

    const dataLabel = format(dataHora, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: pt });

    await enviarEPersistir(
      instancia, conversa.id, numero,
      () => metaCloudApi.enviarInteractivoBotoes(phoneId, token, numero, {
        bodyText: `📋 *Resumo da marcação:*\n\n👨‍⚕️ Médico: ${ctx.medicoNome}\n🗓️ Data: ${dataLabel}\n\nConfirma?`,
        footerText: 'Clínica Plus — Marcação Online',
        buttons: [
          { id: 'confirmar', title: '✅ Confirmar' },
          { id: 'cancelar', title: '❌ Cancelar' },
        ],
      }),
      '[BOTÕES: confirmação de marcação]',
    );

    await actualizarConversa(conversa.id, WaEstadoConversa.CONFIRMAR, {
      ...ctx,
      slotIso: isoSlot,
      slotLabel: dataLabel,
    });
  },

  // ─── Passo 5: Criar Agendamento ───────────────────────────────────────────

  async handleConfirmacao(
    instancia: WaInstancia,
    conversa: WaConversa,
    buttonReplyId: string,
    ctx: Record<string, unknown>,
  ): Promise<void> {
    const phoneId = instancia.metaPhoneNumberId!;
    const token = decryptSecret(instancia.metaAccessToken!);
    const numero = conversa.numeroWhatsapp;

    if (buttonReplyId === 'cancelar') {
      await metaCloudApi.enviarTexto(
        phoneId, token, numero,
        '❌ Marcação cancelada. Escreva "Olá" quando quiser marcar novamente. 😊',
      );
      await actualizarConversa(conversa.id, WaEstadoConversa.AGUARDA_INPUT, {});
      return;
    }

    // Confirmar → criar agendamento
    const { medicoId, slotIso } = ctx as {
      medicoId: string;
      slotIso: string;
    };

    // Tentar encontrar paciente pelo número
    const paciente = await prisma.paciente.findFirst({
      where: {
        clinicaId: instancia.clinicaId,
        telefone: { contains: numero },
      },
    });

    if (!paciente) {
      await metaCloudApi.enviarTexto(
        phoneId, token, numero,
        '🔍 Não encontrámos a sua conta na nossa clínica. Por favor, registe-se na recepção ou ligue-nos para confirmar a marcação.',
      );
      await actualizarConversa(conversa.id, WaEstadoConversa.AGUARDA_INPUT, {});
      return;
    }

    try {
      const medico = await prisma.medico.findUniqueOrThrow({ where: { id: medicoId } });

      await prisma.agendamento.create({
        data: {
          clinicaId: instancia.clinicaId,
          pacienteId: paciente.id,
          medicoId,
          dataHora: new Date(slotIso),
          duracao: medico.duracaoConsulta,
          canal: 'WHATSAPP_META',
          estado: 'PENDENTE',
        },
      });

      await metaCloudApi.enviarTexto(
        phoneId, token, numero,
        `✅ *Marcação confirmada!*\n\n` +
        `👨‍⚕️ Médico: ${ctx.medicoNome}\n` +
        `🗓️ Data: ${ctx.slotLabel}\n\n` +
        `Receberá uma confirmação por SMS. Obrigado! 🙏`,
      );

      await actualizarConversa(conversa.id, WaEstadoConversa.FINALIZADA, {});
    } catch (err) {
      logger.error({ err, conversaId: conversa.id }, 'Erro ao criar agendamento via Meta');
      await metaCloudApi.enviarTexto(
        phoneId, token, numero,
        '⚠️ Ocorreu um erro ao criar a marcação. Por favor contacte a recepção. Pedimos desculpa pelo inconveniente.',
      );
      await actualizarConversa(conversa.id, WaEstadoConversa.AGUARDA_INPUT, {});
    }
  },

  // ─── Utilitários ──────────────────────────────────────────────────────────

  /**
   * Gera lista de slots disponíveis para os próximos 3 dias.
   */
  async buscarSlots(
    medicoId: string,
    clinicaId: string,
  ): Promise<Array<{ iso: string; label: string }>> {
    const medico = await prisma.medico.findUnique({ where: { id: medicoId } });
    if (!medico) return [];

    const slots: Array<{ iso: string; label: string }> = [];
    const hoje = new Date();

    for (let dias = 0; dias <= 3; dias++) {
      const dia = addDays(hoje, dias);
      const diaNome = format(dia, 'EEEE', { locale: pt }).toLowerCase() as keyof typeof horarioPorDia;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const horarioPorDia = medico.horario as any;
      const horarioDia = horarioPorDia?.[diaNome];

      if (!horarioDia?.ativo || !horarioDia.inicio || !horarioDia.fim) continue;

      const [hiH, hiM] = (horarioDia.inicio as string).split(':').map(Number);
      const [hfH, hfM] = (horarioDia.fim as string).split(':').map(Number);
      
      if (hiH === undefined || hiM === undefined || hfH === undefined || hfM === undefined) continue;
      
      const duracao = medico.duracaoConsulta || 30;

      // Gerar slots com a duração da consulta
      let slotH = hiH;
      let slotM = hiM;
      while (slotH * 60 + slotM + duracao <= hfH * 60 + hfM) {
        const slotDate = new Date(dia);
        slotDate.setHours(slotH, slotM, 0, 0);

        // Não mostrar slots no passado
        if (slotDate > hoje) {
          // Verificar se o slot não está ocupado
          const ocupado = await prisma.agendamento.findFirst({
            where: {
              clinicaId,
              medicoId,
              dataHora: slotDate,
              estado: { notIn: ['CANCELADO', 'NAO_COMPARECEU'] },
            },
          });

          if (!ocupado) {
            slots.push({
              iso: slotDate.toISOString(),
              label: format(slotDate, "EEE dd/MM 'às' HH:mm", { locale: pt }),
            });
          }
        }

        slotM += duracao;
        if (slotM >= 60) { slotH += Math.floor(slotM / 60); slotM = slotM % 60; }
      }
    }

    return slots;
  },

  /**
   * Envia lembrete de consulta via Meta Cloud API (chamado pelo scheduler).
   */
  async enviarLembreteConsulta(
    instancia: WaInstancia,
    numero: string,
    consulta: { medicoNome: string; dataHora: Date; especialidade: string },
  ): Promise<void> {
    if (!instancia.metaPhoneNumberId || !instancia.metaAccessToken) return;

    const dataLabel = format(consulta.dataHora, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: pt });

    await metaCloudApi.enviarInteractivoBotoes(
      instancia.metaPhoneNumberId,
      decryptSecret(instancia.metaAccessToken),
      numero,
      {
        bodyText:
          `⏰ *Lembrete — ClinicaPlus*\n\n` +
          `Tem uma consulta marcada:\n` +
          `👨‍⚕️ ${consulta.medicoNome} (${consulta.especialidade})\n` +
          `🗓️ ${dataLabel}\n\n` +
          `Confirma a sua presença?`,
        footerText: 'Responda para confirmar ou cancelar',
        buttons: [
          { id: 'confirmar_lembrete', title: '✅ Confirmo' },
          { id: 'cancelar_lembrete', title: '❌ Cancelar' },
        ],
      },
    );
  },

  async enviarMensagemNaoEntendida(
    phoneId: string,
    token: string,
    numero: string,
    conversaId: string,
  ): Promise<void> {
    await metaCloudApi.enviarTexto(
      phoneId, token, numero,
      '❓ Não percebi a sua resposta. Por favor use as opções do menu. Escreva "Olá" para recomeçar.',
    );
    await prisma.waMensagem.create({
      data: {
        conversaId,
        conteudo: '[SISTEMA: resposta não entendida]',
        direcao: WaDirecao.SAIDA,
        tipo: 'text',
      },
    });
  },
};
