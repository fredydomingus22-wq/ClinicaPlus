import { prisma } from '../lib/prisma';
import { WaDirecao } from '@prisma/client';

export const waActividadeService = {
  /**
   * Retorna um log unificado da actividade recente do WhatsApp.
   */
  async listarRecente(clinicaId: string) {
    // 1. Buscar mensagens enviadas recentemente (Lembretes/Notificações)
    const mensagens = await prisma.waMensagem.findMany({
      where: { 
        conversa: { clinicaId },
        direcao: WaDirecao.SAIDA 
      },
      take: 10,
      orderBy: { criadoEm: 'desc' },
      include: { conversa: { include: { paciente: true } } }
    });

    // 2. Buscar agendamentos via WhatsApp
    const agendamentos = await prisma.agendamento.findMany({
      where: { clinicaId, canal: 'WHATSAPP' },
      take: 10,
      orderBy: { criadoEm: 'desc' },
      include: { paciente: true, medico: true }
    });

    // 3. Unificar e formatar
    const logs = [
      ...mensagens.map(m => ({
        id: `msg-${m.id}`,
        tipo: 'MENSAGEM',
        msg: `Mensagem enviada para ${m.conversa.paciente?.nome || m.conversa.numeroWhatsapp}`,
        data: m.criadoEm,
        detalhe: m.conteudo.length > 50 ? m.conteudo.substring(0, 50) + '...' : m.conteudo
      })),
      ...agendamentos.map(a => ({
        id: `age-${a.id}`,
        tipo: 'CONSULTA',
        msg: `Consulta marcada: ${a.medico.nome} (${a.paciente.nome})`,
        data: a.criadoEm,
        detalhe: `${a.dataHora.toLocaleDateString()} às ${a.dataHora.toLocaleTimeString()}`
      }))
    ];

    // Ordenar por data decrescente
    return logs.sort((a, b) => b.data.getTime() - a.data.getTime()).slice(0, 15);
  },

  /**
   * Retorna métricas agregadas para a dashboard
   */
  async obterMetricas(clinicaId: string) {
    const [totalMensagens, totalAgendamentos, conversasActivas] = await Promise.all([
      prisma.waMensagem.count({ where: { conversa: { clinicaId }, direcao: WaDirecao.SAIDA } }),
      prisma.agendamento.count({ where: { clinicaId, canal: 'WHATSAPP' } }),
      prisma.waConversa.count({ where: { clinicaId, estado: 'AGUARDA_INPUT' } }) // Exemplo de "activas"
    ]);

    return {
      totalMensagens,
      totalAgendamentos,
      conversasActivas
    };
  }
};
