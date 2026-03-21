import { Prisma, WaConversa, WaInstancia, WaEstadoConversa } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { evolutionApi } from '../lib/evolutionApi';
import { publishEvent } from '../lib/eventBus';

/** Schema de configuração da automação MARCACAO_CONSULTA */
interface ConfigMarcacao {
  horarioInicio:   string;  // "08:00"
  horarioFim:      string;  // "18:00"
  diasAtivos:      number[]; // [1,2,3,4,5] = seg-sex
  msgBoasVindas?:  string;
  msgForaHorario?: string;
  msgErroGenerico?: string;
}

/**
 * Verifica se o momento actual está dentro do horário configurado.
 * Usa timezone Africa/Luanda.
 */
function estaNoHorario(cfg: ConfigMarcacao): boolean {
  const agora = new Date();
  const diaSemana = agora.getDay();

  if (!cfg.diasAtivos || !cfg.diasAtivos.includes(diaSemana)) return false;

  const [hInicio, mInicio] = cfg.horarioInicio.split(':').map(Number);
  const [hFim, mFim] = cfg.horarioFim.split(':').map(Number);

  const luandaAgora = new Date(agora.toLocaleString('en-US', { timeZone: 'Africa/Luanda' }));
  const minutosAgora = luandaAgora.getHours() * 60 + luandaAgora.getMinutes();
  const minutosInicio = hInicio! * 60 + mInicio!;
  const minutosFim = hFim! * 60 + mFim!;

  return minutosAgora >= minutosInicio && minutosAgora < minutosFim;
}

export interface ContextoMarcacao {
  especialidadeId?: string;
  especialidadeNome?: string;
  medicoId?: string;
  medicoNome?: string;
  slotEscolhido?: string;
  slotsTemporarios?: string[];
  errosEspecialidade?: number;
  errosMedico?: number;
  errosHorario?: number;
}

type WaConversaComInstancia = WaConversa & {
  instancia: WaInstancia;
};

const MAX_ERROS = 3;

/**
 * Serviço para gestão do fluxo de conversas via WhatsApp (Máquina de Estados).
 */
export const waConversaService = {
  /**
   * Processa uma mensagem recebida e decide o próximo passo no fluxo.
   */
  async processarMensagem(conversa: WaConversaComInstancia, texto: string): Promise<void> {
    const input = texto.trim();
    const inputLower = input.toLowerCase();

    // Reset de contexto se comando de reinício
    if (inputLower === 'oi' || inputLower === 'menu') {
      return this.etapaInicio(conversa.numeroWhatsapp, conversa.instancia.clinicaId, conversa.instancia.evolutionName, '');
    }

    if (conversa.estado === WaEstadoConversa.AGUARDA_INPUT) {
      if (input === '1' || inputLower === 'marcar' || inputLower === 'vaga') {
        return this.etapaInicio(conversa.numeroWhatsapp, conversa.instancia.clinicaId, conversa.instancia.evolutionName, '');
      }
      
      const clinica = await prisma.clinica.findUnique({ where: { id: conversa.instancia.clinicaId }, select: { nome: true } });
      const saudacao = `Olá! Bem-vindo à *${clinica?.nome || 'nossa Clínica'}*. 🏥\n\nComo podemos ajudar?\n1. Marcar Consulta 📅\n2. Falar com Atendente 🧑‍💻\n\nResponda com o número da opção desejada.`;
      await evolutionApi.enviarTexto(conversa.instancia.evolutionName, conversa.numeroWhatsapp, saudacao);
      return;
    }

    if (conversa.estado === WaEstadoConversa.EM_FLUXO_MARCACAO) {
      return this.processarResposta(conversa.numeroWhatsapp, conversa.instancia.clinicaId, conversa.instancia.evolutionName, texto);
    }
  },

  /**
   * Inicia o fluxo de marcação.
   * Chamado pelo n8n via POST /fluxo/inicio ou internamente.
   */
  async etapaInicio(numero: string, clinicaId: string, instanceName: string, pushName: string): Promise<void> {
    const instancia = await prisma.waInstancia.findUniqueOrThrow({ where: { clinicaId } });
    const clinica = await prisma.clinica.findUniqueOrThrow({ where: { id: clinicaId } });

    // Verificar horário de funcionamento do bot (MODULE-whatsapp.md §3)
    const automacaoMarcacao = await prisma.waAutomacao.findFirst({
      where: { instanciaId: instancia.id, tipo: 'MARCACAO_CONSULTA', ativo: true }
    });
    if (automacaoMarcacao) {
      const cfg = automacaoMarcacao.configuracao as unknown as ConfigMarcacao;
      if (cfg.horarioInicio && cfg.horarioFim && !estaNoHorario(cfg)) {
        const msgFora = cfg.msgForaHorario
          ?.replace('{inicio}', cfg.horarioInicio)
          .replace('{fim}', cfg.horarioFim)
          ?? `Bot disponível das ${cfg.horarioInicio} às ${cfg.horarioFim}. Até logo!`;
        await evolutionApi.enviarTexto(instanceName, numero, msgFora);
        return;
      }
    }

    const especialidades = await prisma.especialidade.findMany({
      where: { clinicaId, ativo: true },
      orderBy: { nome: 'asc' }
    });

    if (especialidades.length === 0) {
      await evolutionApi.enviarTexto(
        instanceName,
        numero,
        'De momento não temos especialidades disponíveis para agendamento online. Por favor, contacte-nos directamente.'
      );
      return;
    }

    const saudacao = `Olá${pushName ? `, ${pushName.split(' ')[0]}` : ''}! 👋\n`
      + `Bem-vindo(a) à *${clinica.nome}*.\n\n`
      + `Escolha a Especialidade:\n\n${formatarMensagemLista(especialidades.map(e => e.nome))}\n\n`
      + `Responda com o número da opção.`;

    await evolutionApi.enviarTexto(instanceName, numero, saudacao);

    await prisma.waConversa.upsert({
      where: { instanciaId_numeroWhatsapp: { instanciaId: instancia.id, numeroWhatsapp: numero } },
      create: { 
        instanciaId: instancia.id, 
        numeroWhatsapp: numero, 
        estado: WaEstadoConversa.EM_FLUXO_MARCACAO, 
        etapaFluxo: 'ESPECIALIDADE', 
        contexto: {},
        clinicaId
      },
      update: { 
        estado: WaEstadoConversa.EM_FLUXO_MARCACAO, 
        etapaFluxo: 'ESPECIALIDADE', 
        contexto: {}, 
        ultimaMensagemEm: new Date() 
      }
    });
  },

  /**
   * Encaminha para a etapa correcta do fluxo baseada no estado actual.
   * Chamado pelo n8n via POST /fluxo/resposta.
   */
  async processarResposta(numero: string, clinicaId: string, instanceName: string, resposta: string): Promise<void> {
    const instancia = await prisma.waInstancia.findUniqueOrThrow({ where: { clinicaId } });
    const conversa = await prisma.waConversa.findUnique({
      where: { instanciaId_numeroWhatsapp: { instanciaId: instancia.id, numeroWhatsapp: numero } },
      include: { instancia: true }
    });

    if (!conversa || conversa.estado !== WaEstadoConversa.EM_FLUXO_MARCACAO) {
      if (resposta.toLowerCase().includes('marcar')) {
        return this.etapaInicio(numero, clinicaId, instanceName, '');
      }
      return;
    }

    const conversaComInstancia = conversa as WaConversaComInstancia;

    switch (conversa.etapaFluxo) {
      case 'ESPECIALIDADE':
        return this.etapaEspecialidade(conversaComInstancia, resposta);
      case 'MEDICO':
        return this.etapaMedico(conversaComInstancia, resposta);
      case 'HORARIO':
        return this.etapaHorario(conversaComInstancia, resposta);
      case 'CONFIRMAR':
        return this.etapaConfirmar(conversaComInstancia, resposta);
      default:
        return this.etapaInicio(numero, clinicaId, instanceName, '');
    }
  },

  async etapaEspecialidade(conversa: WaConversaComInstancia, input: string): Promise<void> {
    const especialidades = await prisma.especialidade.findMany({
      where: { clinicaId: conversa.instancia.clinicaId, ativo: true },
      orderBy: { nome: 'asc' }
    });

    const index = parseInt(input) - 1;
    if (isNaN(index) || index < 0 || index >= especialidades.length) {
      return tratarRespostaInvalida(conversa, especialidades.map(e => e.nome), 'Especialidade');
    }

    const especialidade = especialidades[index]!;
    const medicos = await prisma.medico.findMany({
      where: { especialidadeId: especialidade.id, ativo: true },
      orderBy: { nome: 'asc' }
    });

    if (medicos.length === 0) {
      await evolutionApi.enviarTexto(
        conversa.instancia.evolutionName,
        conversa.numeroWhatsapp,
        `Não temos médicos disponíveis para *${especialidade.nome}* no momento.`
      );
      return;
    }

    if (medicos.length === 1) {
      return this.exibirHorarios(conversa, medicos[0]!, especialidade.id);
    }

    const msg = `Médicos em *${especialidade.nome}*:\n\n${formatarMensagemLista(medicos.map(m => m.nome))}`;
    await evolutionApi.enviarTexto(conversa.instancia.evolutionName, conversa.numeroWhatsapp, msg);

    await prisma.waConversa.update({
      where: { id: conversa.id },
      data: {
        etapaFluxo: 'MEDICO',
        contexto: { 
          especialidadeId: especialidade.id,
          especialidadeNome: especialidade.nome
        }
      }
    });
  },

  async etapaMedico(conversa: WaConversaComInstancia, input: string): Promise<void> {
    const ctx = (conversa.contexto as unknown as ContextoMarcacao) || {};
    const medicos = await prisma.medico.findMany({
      where: { especialidadeId: ctx.especialidadeId!, ativo: true },
      orderBy: { nome: 'asc' }
    });

    const index = parseInt(input) - 1;
    if (isNaN(index) || index < 0 || index >= medicos.length) {
      return tratarRespostaInvalida(conversa, medicos.map(m => m.nome), 'Medico');
    }

    return this.exibirHorarios(conversa, medicos[index]!, ctx.especialidadeId!);
  },

  async exibirHorarios(conversa: WaConversaComInstancia, medico: { id: string, nome: string }, especialidadeId: string): Promise<void> {
    const hoje = new Date();
    const slots: Date[] = [];
    const d = new Date(hoje);
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);

    for (let i = 0; i < 5; i++) {
      const s = new Date(d);
      s.setHours(9 + i, 0);
      slots.push(s);
    }

    const opcoes = slots.map(s => {
      return s.toLocaleString('pt-AO', { 
        weekday: 'short', 
        day: '2-digit', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    });

    const msg = `Horários disponíveis com *${medico.nome}*:\n\n${formatarMensagemLista(opcoes)}`;
    await evolutionApi.enviarTexto(conversa.instancia.evolutionName, conversa.numeroWhatsapp, msg);

    await prisma.waConversa.update({
      where: { id: conversa.id },
      data: {
        etapaFluxo: 'HORARIO',
        contexto: { 
          especialidadeId,
          medicoId: medico.id,
          medicoNome: medico.nome,
          slotsTemporarios: slots.map(s => s.toISOString())
        } as Prisma.JsonObject
      }
    });
  },

  async etapaHorario(conversa: WaConversaComInstancia, input: string): Promise<void> {
    const ctx = (conversa.contexto as unknown as ContextoMarcacao) || {};
    const slots = ctx.slotsTemporarios || [];
    const index = parseInt(input) - 1;

    if (isNaN(index) || index < 0 || index >= slots.length) {
      const labels = slots.map(s => new Date(s!).toLocaleString('pt-AO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }));
      return tratarRespostaInvalida(conversa, labels, 'Horario');
    }

    const slotISO = slots[index]!;
    const dataHora = new Date(slotISO);
    const label = dataHora.toLocaleString('pt-AO', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });

    const resumo = `*Confirmar Agendamento* 🗓️\n\n` +
      `Médico: ${ctx.medicoNome}\n` +
      `Data/Hora: ${label}\n\n` +
      `1. Confirmar ✅\n` +
      `2. Cancelar ❌`;

    await evolutionApi.enviarTexto(conversa.instancia.evolutionName, conversa.numeroWhatsapp, resumo);

    await prisma.waConversa.update({
      where: { id: conversa.id },
      data: {
        etapaFluxo: 'CONFIRMAR',
        contexto: { ...ctx, slotEscolhido: slotISO } as Prisma.JsonObject
      }
    });
  },

  async etapaConfirmar(conversa: WaConversaComInstancia, input: string): Promise<void> {
    const inputLower = input.toLowerCase();
    
    if (inputLower === '2' || inputLower === 'não' || inputLower === 'nao' || inputLower === 'cancelar') {
      await evolutionApi.enviarTexto(conversa.instancia.evolutionName, conversa.numeroWhatsapp, 'Agendamento cancelado. Se precisar de algo mais, escreva *oi*.');
      await prisma.waConversa.update({
        where: { id: conversa.id },
        data: { estado: WaEstadoConversa.AGUARDA_INPUT, etapaFluxo: null, contexto: {} }
      });
      return;
    }

    if (input === '1' || inputLower === 'sim' || inputLower === 's' || inputLower === 'confirmar') {
      const ctx = (conversa.contexto as unknown as ContextoMarcacao) || {};
      const pacienteId = await obterOuCriarPaciente(conversa.numeroWhatsapp, conversa.instancia.clinicaId, '');

      await prisma.agendamento.create({
        data: {
          clinicaId: conversa.instancia.clinicaId,
          pacienteId,
          medicoId: ctx.medicoId!,
          dataHora: new Date(ctx.slotEscolhido!),
          estado: 'CONFIRMADO',
          canal: 'WHATSAPP',
          duracao: 30,
          tipo: 'CONSULTA'
        }
      });

      await evolutionApi.enviarTexto(
        conversa.instancia.evolutionName,
        conversa.numeroWhatsapp,
        '✅ *Agendamento Confirmado!*\n\nAguardamos por si. Receberá um lembrete antes da consulta.'
      );

      await publishEvent(`clinica:${conversa.instancia.clinicaId}`, 'whatsapp:marcacao', {
        pacienteId,
        dataHora: ctx.slotEscolhido
      });

      await prisma.waConversa.update({
        where: { id: conversa.id },
        data: { estado: WaEstadoConversa.CONCLUIDA, etapaFluxo: null, contexto: {} }
      });
      return;
    }

    await evolutionApi.enviarTexto(conversa.instancia.evolutionName, conversa.numeroWhatsapp, 'Por favor, responda *1* para Confirmar ou *2* para Cancelar.');
  },

  /**
   * Obtém uma conversa pelo número WhatsApp — usado pelo n8n (GET /fluxo/conversa).
   */
  async obterConversa(numero: string, clinicaId: string): Promise<unknown> {
    const instancia = await prisma.waInstancia.findUniqueOrThrow({ where: { clinicaId } });
    return prisma.waConversa.findUnique({
      where: { instanciaId_numeroWhatsapp: { instanciaId: instancia.id, numeroWhatsapp: numero } },
      include: { paciente: true },
    });
  },

  async listarActivas(clinicaId: string): Promise<WaConversa[]> {
    return prisma.waConversa.findMany({
      where: {
        instancia: { clinicaId },
        estado: { notIn: [WaEstadoConversa.CONCLUIDA, WaEstadoConversa.EXPIRADA] },
      },
      include: { paciente: true },
      orderBy: { ultimaMensagemEm: 'desc' },
    });
  }
};

/**
 * HELPERS REFACTORED
 */

/**
 * Obtém um paciente existente ou cria um novo baseado no número do WhatsApp.
 */
export async function obterOuCriarPaciente(numero: string, clinicaId: string, nomeWhatsapp: string): Promise<string> {
  const telefone = `+${numero}`;
  let paciente = await prisma.paciente.findFirst({ where: { clinicaId, telefone } });

  if (!paciente) {
    paciente = await prisma.paciente.create({
      data: {
        clinicaId,
        numeroPaciente: `WA-${numero}`,
        nome: nomeWhatsapp || `Paciente WA ${numero.slice(-4)}`,
        telefone,
        origem: 'WHATSAPP',
        dataNascimento: new Date(1900, 0, 1),
        genero: 'M'
      }
    });
  }
  return paciente.id;
}

/**
 * Trata entradas inválidas durante o fluxo de conversa, gerindo reintentos e cancelamento por excesso de erros.
 */
export async function tratarRespostaInvalida(conversa: WaConversaComInstancia, opcoes: string[], tituloEtapa: string): Promise<void> {
  const ctx = (conversa.contexto as unknown as ContextoMarcacao) || {};
  const campoErro = `erros${tituloEtapa}` as keyof ContextoMarcacao;
  const erros = ((ctx[campoErro] as number) || 0) + 1;

  if (erros >= MAX_ERROS) {
    await evolutionApi.enviarTexto(
      conversa.instancia.evolutionName,
      conversa.numeroWhatsapp,
      'Não consegui perceber a tua escolha após várias tentativas. 😕\nEscreve *oi* para recomeçar quando quiseres.'
    );
    await prisma.waConversa.update({
      where: { id: conversa.id },
      data: { estado: WaEstadoConversa.CONCLUIDA, etapaFluxo: null, contexto: {} }
    });
    return;
  }

  const msg = `❌ Opção inválida. Responda com um número de 1 a ${opcoes.length}:\n\n${formatarMensagemLista(opcoes)}`;
  await evolutionApi.enviarTexto(conversa.instancia.evolutionName, conversa.numeroWhatsapp, msg);

  await prisma.waConversa.update({
    where: { id: conversa.id },
    data: { contexto: { ...ctx, [campoErro]: erros } as Prisma.JsonObject }
  });
}

/**
 * Formata uma lista de strings em uma mensagem numerada para o WhatsApp.
 */
export function formatarMensagemLista(itens: string[]): string {
  return itens.map((item, i) => `${i + 1}. ${item}`).join('\n');
}
