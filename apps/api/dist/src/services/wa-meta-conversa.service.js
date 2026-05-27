"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waMetaConversaService = void 0;
const prisma_1 = require("../lib/prisma");
const logger_1 = require("../lib/logger");
const metaCloudApi_1 = require("../lib/metaCloudApi");
const secretCrypto_1 = require("../lib/secretCrypto");
const client_1 = require("@prisma/client");
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
// ─── Helpers ─────────────────────────────────────────────────────────────────
/**
 * Envia uma mensagem de saída e persiste na BD.
 */
async function enviarEPersistir(instancia, conversaId, numero, fn, conteudoLog) {
    try {
        const res = await fn();
        await prisma_1.prisma.waMensagem.create({
            data: {
                conversaId,
                conteudo: conteudoLog,
                direcao: client_1.WaDirecao.SAIDA,
                evolutionMsgId: res.messages[0]?.id ?? null,
                tipo: 'interactive',
                entregue: false,
                lida: false,
            },
        });
        logger_1.logger.info({ conversaId, numero, msgId: res.messages[0]?.id }, 'Mensagem Meta enviada');
    }
    catch (err) {
        logger_1.logger.error({ err, conversaId, numero }, 'Falha ao enviar mensagem Meta');
    }
}
/**
 * Actualiza o estado da conversa e o contexto JSON.
 */
async function actualizarConversa(conversaId, estado, contexto) {
    await prisma_1.prisma.waConversa.update({
        where: { id: conversaId },
        data: { estado, contexto: contexto, ultimaMensagemEm: new Date() },
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
exports.waMetaConversaService = {
    /**
     * Ponto de entrada: recebe a mensagem e despacha conforme o estado da conversa.
     */
    async processarMensagem(instancia, conversa, msg, nomeContacto) {
        // Instância sem credenciais Meta → sair silenciosamente
        if (!instancia.metaPhoneNumberId || !instancia.metaAccessToken) {
            logger_1.logger.warn({ instanciaId: instancia.id }, 'Instância META_CLOUD sem credenciais — ignorar');
            return;
        }
        const phoneId = instancia.metaPhoneNumberId;
        const token = (0, secretCrypto_1.decryptSecret)(instancia.metaAccessToken);
        const numero = conversa.numeroWhatsapp;
        const cid = conversa.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx = conversa.contexto ?? {};
        const estado = conversa.estado;
        // Detectar saudações para resets
        const texto = msg.text?.body?.toLowerCase().trim() ?? '';
        const eSaudacao = ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'hello', 'hi', 'marcação', 'marcacao', 'consulta'].some((s) => texto.includes(s));
        // Se em estado terminal ou saudação → reiniciar fluxo
        if (estado === client_1.WaEstadoConversa.AGUARDA_INPUT || eSaudacao) {
            await this.iniciarFluxo(instancia, conversa, nomeContacto);
            return;
        }
        // Respostas interactivas
        const listReplyId = msg.interactive?.list_reply?.id;
        const buttonReplyId = msg.interactive?.button_reply?.id;
        switch (estado) {
            case client_1.WaEstadoConversa.ESPECIALIDADE:
                if (listReplyId)
                    await this.handleEspecialidade(instancia, conversa, listReplyId);
                else
                    await this.enviarMensagemNaoEntendida(phoneId, token, numero, cid);
                break;
            case client_1.WaEstadoConversa.MEDICO:
                if (listReplyId)
                    await this.handleMedico(instancia, conversa, listReplyId);
                else
                    await this.enviarMensagemNaoEntendida(phoneId, token, numero, cid);
                break;
            case client_1.WaEstadoConversa.HORARIO:
                if (listReplyId)
                    await this.handleHorario(instancia, conversa, listReplyId, ctx);
                else
                    await this.enviarMensagemNaoEntendida(phoneId, token, numero, cid);
                break;
            case client_1.WaEstadoConversa.CONFIRMAR:
                if (buttonReplyId)
                    await this.handleConfirmacao(instancia, conversa, buttonReplyId, ctx);
                else
                    await this.enviarMensagemNaoEntendida(phoneId, token, numero, cid);
                break;
            default:
                await this.iniciarFluxo(instancia, conversa, nomeContacto);
        }
    },
    // ─── Passo 1: Menu de especialidades ──────────────────────────────────────
    async iniciarFluxo(instancia, conversa, nomeContacto) {
        const phoneId = instancia.metaPhoneNumberId;
        const token = (0, secretCrypto_1.decryptSecret)(instancia.metaAccessToken);
        const numero = conversa.numeroWhatsapp;
        // Buscar especialidades activas da clínica
        const especialidades = await prisma_1.prisma.especialidade.findMany({
            where: { clinicaId: instancia.clinicaId, ativo: true },
            orderBy: { nome: 'asc' },
            take: 10, // limite da lista Meta
        });
        if (!especialidades.length) {
            await metaCloudApi_1.metaCloudApi.enviarTexto(phoneId, token, numero, '⚠️ Ainda não há especialidades configuradas nesta clínica. Por favor contacte a recepção.');
            return;
        }
        const nome = nomeContacto ? `, ${nomeContacto.split(' ')[0]}` : '';
        const rows = especialidades.map((e) => ({
            id: `esp:${e.id}`,
            title: e.nome.substring(0, 24),
            ...(e.descricao ? { description: e.descricao.substring(0, 72) } : {}),
        }));
        const sections = [{ title: 'Especialidades', rows }];
        await enviarEPersistir(instancia, conversa.id, numero, () => metaCloudApi_1.metaCloudApi.enviarInteractivoLista(phoneId, token, numero, {
            headerText: '🏥 ClinicaPlus',
            bodyText: `Olá${nome}! 👋 Bem-vindo(a).\n\nQual especialidade pretende?`,
            footerText: 'Toque em "Ver Opções" para escolher',
            buttonText: 'Ver Especialidades',
            sections,
        }), '[LISTA: escolha de especialidade]');
        await actualizarConversa(conversa.id, client_1.WaEstadoConversa.ESPECIALIDADE, {});
    },
    // ─── Passo 2: Escolha de médico ───────────────────────────────────────────
    async handleEspecialidade(instancia, conversa, listReplyId) {
        const phoneId = instancia.metaPhoneNumberId;
        const token = (0, secretCrypto_1.decryptSecret)(instancia.metaAccessToken);
        const numero = conversa.numeroWhatsapp;
        const especialidadeId = listReplyId.replace('esp:', '');
        const especialidade = await prisma_1.prisma.especialidade.findUnique({ where: { id: especialidadeId } });
        if (!especialidade) {
            await this.enviarMensagemNaoEntendida(phoneId, token, numero, conversa.id);
            return;
        }
        const medicos = await prisma_1.prisma.medico.findMany({
            where: { clinicaId: instancia.clinicaId, especialidadeId, ativo: true },
            include: { utilizador: { select: { nome: true } } },
            take: 10,
        });
        if (!medicos.length) {
            await metaCloudApi_1.metaCloudApi.enviarTexto(phoneId, token, numero, `😔 Não há médicos disponíveis para *${especialidade.nome}* neste momento. Tente mais tarde.`);
            return;
        }
        const rows = medicos.map((m) => ({
            id: `med:${m.id}`,
            title: m.nome.substring(0, 24),
            description: especialidade.nome.substring(0, 72),
        }));
        await enviarEPersistir(instancia, conversa.id, numero, () => metaCloudApi_1.metaCloudApi.enviarInteractivoLista(phoneId, token, numero, {
            headerText: `📋 ${especialidade.nome}`,
            bodyText: 'Escolha o médico:',
            footerText: 'Toque para ver os médicos disponíveis',
            buttonText: 'Ver Médicos',
            sections: [{ title: 'Médicos Disponíveis', rows }],
        }), '[LISTA: escolha de médico]');
        await actualizarConversa(conversa.id, client_1.WaEstadoConversa.MEDICO, {
            especialidadeId,
            especialidadeNome: especialidade.nome,
        });
    },
    // ─── Passo 3: Escolha de horário ──────────────────────────────────────────
    async handleMedico(instancia, conversa, listReplyId) {
        const phoneId = instancia.metaPhoneNumberId;
        const token = (0, secretCrypto_1.decryptSecret)(instancia.metaAccessToken);
        const numero = conversa.numeroWhatsapp;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx = conversa.contexto ?? {};
        const medicoId = listReplyId.replace('med:', '');
        const medico = await prisma_1.prisma.medico.findUnique({
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
            await metaCloudApi_1.metaCloudApi.enviarTexto(phoneId, token, numero, `😔 O Dr(a). *${medico.nome}* não tem horários disponíveis nos próximos 3 dias. Deseja escolher outro médico?\n\nEscreva "Olá" para recomeçar.`);
            return;
        }
        const rows = slots.slice(0, 10).map((slot) => ({
            id: `slot:${slot.iso}`,
            title: slot.label.substring(0, 24),
            description: (0, date_fns_1.format)(new Date(slot.iso), 'EEEE, d MMMM', { locale: locale_1.pt }),
        }));
        await enviarEPersistir(instancia, conversa.id, numero, () => metaCloudApi_1.metaCloudApi.enviarInteractivoLista(phoneId, token, numero, {
            headerText: `👨‍⚕️ ${medico.nome}`,
            bodyText: 'Escolha o horário da consulta:',
            footerText: 'Horários disponíveis para os próximos 3 dias',
            buttonText: 'Ver Horários',
            sections: [{ title: 'Horários Disponíveis', rows }],
        }), '[LISTA: escolha de horário]');
        await actualizarConversa(conversa.id, client_1.WaEstadoConversa.HORARIO, {
            ...ctx,
            medicoId,
            medicoNome: medico.nome,
        });
    },
    // ─── Passo 4: Confirmação ────────────────────────────────────────────────
    async handleHorario(instancia, conversa, listReplyId, ctx) {
        const phoneId = instancia.metaPhoneNumberId;
        const token = (0, secretCrypto_1.decryptSecret)(instancia.metaAccessToken);
        const numero = conversa.numeroWhatsapp;
        const isoSlot = listReplyId.replace('slot:', '');
        const dataHora = new Date(isoSlot);
        const dataLabel = (0, date_fns_1.format)(dataHora, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: locale_1.pt });
        await enviarEPersistir(instancia, conversa.id, numero, () => metaCloudApi_1.metaCloudApi.enviarInteractivoBotoes(phoneId, token, numero, {
            bodyText: `📋 *Resumo da marcação:*\n\n👨‍⚕️ Médico: ${ctx.medicoNome}\n🗓️ Data: ${dataLabel}\n\nConfirma?`,
            footerText: 'Clínica Plus — Marcação Online',
            buttons: [
                { id: 'confirmar', title: '✅ Confirmar' },
                { id: 'cancelar', title: '❌ Cancelar' },
            ],
        }), '[BOTÕES: confirmação de marcação]');
        await actualizarConversa(conversa.id, client_1.WaEstadoConversa.CONFIRMAR, {
            ...ctx,
            slotIso: isoSlot,
            slotLabel: dataLabel,
        });
    },
    // ─── Passo 5: Criar Agendamento ───────────────────────────────────────────
    async handleConfirmacao(instancia, conversa, buttonReplyId, ctx) {
        const phoneId = instancia.metaPhoneNumberId;
        const token = (0, secretCrypto_1.decryptSecret)(instancia.metaAccessToken);
        const numero = conversa.numeroWhatsapp;
        if (buttonReplyId === 'cancelar') {
            await metaCloudApi_1.metaCloudApi.enviarTexto(phoneId, token, numero, '❌ Marcação cancelada. Escreva "Olá" quando quiser marcar novamente. 😊');
            await actualizarConversa(conversa.id, client_1.WaEstadoConversa.AGUARDA_INPUT, {});
            return;
        }
        // Confirmar → criar agendamento
        const { medicoId, slotIso } = ctx;
        // Tentar encontrar paciente pelo número
        const paciente = await prisma_1.prisma.paciente.findFirst({
            where: {
                clinicaId: instancia.clinicaId,
                telefone: { contains: numero },
            },
        });
        if (!paciente) {
            await metaCloudApi_1.metaCloudApi.enviarTexto(phoneId, token, numero, '🔍 Não encontrámos a sua conta na nossa clínica. Por favor, registe-se na recepção ou ligue-nos para confirmar a marcação.');
            await actualizarConversa(conversa.id, client_1.WaEstadoConversa.AGUARDA_INPUT, {});
            return;
        }
        try {
            const medico = await prisma_1.prisma.medico.findUniqueOrThrow({ where: { id: medicoId } });
            await prisma_1.prisma.agendamento.create({
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
            await metaCloudApi_1.metaCloudApi.enviarTexto(phoneId, token, numero, `✅ *Marcação confirmada!*\n\n` +
                `👨‍⚕️ Médico: ${ctx.medicoNome}\n` +
                `🗓️ Data: ${ctx.slotLabel}\n\n` +
                `Receberá uma confirmação por SMS. Obrigado! 🙏`);
            await actualizarConversa(conversa.id, client_1.WaEstadoConversa.FINALIZADA, {});
        }
        catch (err) {
            logger_1.logger.error({ err, conversaId: conversa.id }, 'Erro ao criar agendamento via Meta');
            await metaCloudApi_1.metaCloudApi.enviarTexto(phoneId, token, numero, '⚠️ Ocorreu um erro ao criar a marcação. Por favor contacte a recepção. Pedimos desculpa pelo inconveniente.');
            await actualizarConversa(conversa.id, client_1.WaEstadoConversa.AGUARDA_INPUT, {});
        }
    },
    // ─── Utilitários ──────────────────────────────────────────────────────────
    /**
     * Gera lista de slots disponíveis para os próximos 3 dias.
     */
    async buscarSlots(medicoId, clinicaId) {
        const medico = await prisma_1.prisma.medico.findUnique({ where: { id: medicoId } });
        if (!medico)
            return [];
        const slots = [];
        const hoje = new Date();
        for (let dias = 0; dias <= 3; dias++) {
            const dia = (0, date_fns_1.addDays)(hoje, dias);
            const diaNome = (0, date_fns_1.format)(dia, 'EEEE', { locale: locale_1.pt }).toLowerCase();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const horarioPorDia = medico.horario;
            const horarioDia = horarioPorDia?.[diaNome];
            if (!horarioDia?.ativo || !horarioDia.inicio || !horarioDia.fim)
                continue;
            const [hiH, hiM] = horarioDia.inicio.split(':').map(Number);
            const [hfH, hfM] = horarioDia.fim.split(':').map(Number);
            if (hiH === undefined || hiM === undefined || hfH === undefined || hfM === undefined)
                continue;
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
                    const ocupado = await prisma_1.prisma.agendamento.findFirst({
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
                            label: (0, date_fns_1.format)(slotDate, "EEE dd/MM 'às' HH:mm", { locale: locale_1.pt }),
                        });
                    }
                }
                slotM += duracao;
                if (slotM >= 60) {
                    slotH += Math.floor(slotM / 60);
                    slotM = slotM % 60;
                }
            }
        }
        return slots;
    },
    /**
     * Envia lembrete de consulta via Meta Cloud API (chamado pelo scheduler).
     */
    async enviarLembreteConsulta(instancia, numero, consulta) {
        if (!instancia.metaPhoneNumberId || !instancia.metaAccessToken)
            return;
        const dataLabel = (0, date_fns_1.format)(consulta.dataHora, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: locale_1.pt });
        await metaCloudApi_1.metaCloudApi.enviarInteractivoBotoes(instancia.metaPhoneNumberId, (0, secretCrypto_1.decryptSecret)(instancia.metaAccessToken), numero, {
            bodyText: `⏰ *Lembrete — ClinicaPlus*\n\n` +
                `Tem uma consulta marcada:\n` +
                `👨‍⚕️ ${consulta.medicoNome} (${consulta.especialidade})\n` +
                `🗓️ ${dataLabel}\n\n` +
                `Confirma a sua presença?`,
            footerText: 'Responda para confirmar ou cancelar',
            buttons: [
                { id: 'confirmar_lembrete', title: '✅ Confirmo' },
                { id: 'cancelar_lembrete', title: '❌ Cancelar' },
            ],
        });
    },
    async enviarMensagemNaoEntendida(phoneId, token, numero, conversaId) {
        await metaCloudApi_1.metaCloudApi.enviarTexto(phoneId, token, numero, '❓ Não percebi a sua resposta. Por favor use as opções do menu. Escreva "Olá" para recomeçar.');
        await prisma_1.prisma.waMensagem.create({
            data: {
                conversaId,
                conteudo: '[SISTEMA: resposta não entendida]',
                direcao: client_1.WaDirecao.SAIDA,
                tipo: 'text',
            },
        });
    },
};
