import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockPrisma } from '../test/mocks/prisma.mock';
import { mockEvolutionApi } from '../test/mocks/evolutionApi.mock';
import { WaEstadoConversa, WaEstadoInstancia, WaInstancia, Clinica, Plano, Especialidade, Medico } from '@prisma/client';
import { EstadoSubscricao } from '@clinicaplus/types';
import { waConversaService } from './wa-conversa.service';
import { publishEvent } from '../lib/eventBus';

// Mock dependências
vi.mock('../lib/evolutionApi', () => ({ evolutionApi: mockEvolutionApi }));
vi.mock('../lib/eventBus', () => ({ publishEvent: vi.fn() }));
vi.mock('../lib/prisma', () => ({ prisma: mockPrisma }));

const getClinicaBase = (): Clinica => ({
  id: 'clinica-1',
  nome: 'Clínica Plus',
  slug: 'clinica-plus',
  email: 'test@clinica.plus',
  plano: Plano.PRO,
  ativo: true,
  subscricaoEstado: EstadoSubscricao.ACTIVA,
  criadoEm: new Date(),
  atualizadoEm: new Date(),
  logo: null,
  telefone: null,
  endereco: null,
  cidade: null,
  provincia: null,
  subscricaoValidaAte: null
});

const getInstanciaBase = (): WaInstancia => ({
  id: 'ins-1',
  clinicaId: 'clinica-1',
  evolutionName: 'cp-test',
  evolutionToken: 'token-123',
  estado: WaEstadoInstancia.CONECTADO,
  numeroTelefone: '244900000000',
  qrCodeBase64: null,
  criadoEm: new Date(),
  atualizadoEm: new Date()
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getConversaBase = (): any => ({
  id: 'conv-1',
  instanciaId: 'ins-1',
  numeroWhatsapp: '244900000000',
  pacienteId: null,
  estado: WaEstadoConversa.AGUARDA_INPUT,
  etapaFluxo: null,
  contexto: null,
  ultimaMensagemEm: new Date(),
  criadoEm: new Date(),
  instancia: getInstanciaBase(),
});

describe('waConversaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('etapaInicio', () => {
    it('deve enviar lista de especialidades da clínica', async () => {
      mockPrisma.especialidade.findMany.mockResolvedValue([
        { id: 'esp-1', nome: 'Cardiologia' } as Especialidade,
        { id: 'esp-2', nome: 'Dentista' } as Especialidade
      ]);

      await waConversaService.processarMensagem(getConversaBase(), '1');

      expect(mockEvolutionApi.enviarTexto).toHaveBeenCalledWith(
        'cp-test',
        '244900000000',
        expect.stringContaining('1. Cardiologia\n2. Dentista')
      );
    });

    it('deve criar conversa com etapa ESPECIALIDADE', async () => {
      mockPrisma.especialidade.findMany.mockResolvedValue([{ id: 'esp-1', nome: 'Cardiologia' } as Especialidade]);

      await waConversaService.processarMensagem(getConversaBase(), '1');

      expect(mockPrisma.waConversa.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: WaEstadoConversa.EM_FLUXO_MARCACAO,
            etapaFluxo: 'ESPECIALIDADE'
          })
        })
      );
    });

    it('deve resetar contexto ao reiniciar conversa expirada ou por comando "oi"', async () => {
      const conv = getConversaBase();
      conv.estado = WaEstadoConversa.EM_FLUXO_MARCACAO;
      conv.etapaFluxo = 'CONFIRMAR';
      conv.contexto = { especialidadeId: 'esp-1' };
      
      mockPrisma.especialidade.findMany.mockResolvedValue([{ id: 'esp-1', nome: 'Cardiologia' } as Especialidade]);

      await waConversaService.processarMensagem(conv, 'oi');
      
      expect(mockPrisma.waConversa.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            etapaFluxo: 'ESPECIALIDADE',
            contexto: {}
          })
        })
      );
    });

    it('deve incluir nome da clínica na saudação inicial', async () => {
      mockPrisma.clinica.findUnique.mockResolvedValue(getClinicaBase());
      
      await waConversaService.processarMensagem(getConversaBase(), 'ola');
      expect(mockEvolutionApi.enviarTexto).toHaveBeenCalledWith(
        'cp-test',
        '244900000000',
        expect.stringContaining('Clínica Plus')
      );
    });
  });

  describe('etapaEspecialidade', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getConversaEsp = (): any => ({
      ...getConversaBase(),
      estado: WaEstadoConversa.EM_FLUXO_MARCACAO,
      etapaFluxo: 'ESPECIALIDADE',
    });

    it('deve avançar para etapa MEDICO com input válido', async () => {
      mockPrisma.especialidade.findMany.mockResolvedValue([
        { id: 'esp-1', nome: 'Cardiologia' } as Especialidade
      ]);
      mockPrisma.medico.findMany.mockResolvedValue([
        { id: 'med-1', nome: 'Dr. House' } as Medico,
        { id: 'med-2', nome: 'Dr. Who' } as Medico
      ]);
      
      await waConversaService.processarMensagem(getConversaEsp(), '1');

      expect(mockPrisma.waConversa.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ etapaFluxo: 'MEDICO' })
        })
      );
    });

    it('deve guardar especialidadeId e especialidadeNome no contexto', async () => {
      mockPrisma.especialidade.findMany.mockResolvedValue([{ id: 'esp-1', nome: 'Cardio' } as Especialidade]);
      mockPrisma.medico.findMany.mockResolvedValue([{ id: 'med-1' } as Medico, { id: 'med-2' } as Medico]);
      
      await waConversaService.processarMensagem(getConversaEsp(), '1');

      expect(mockPrisma.waConversa.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ 
            contexto: expect.objectContaining({ 
              especialidadeId: 'esp-1',
              especialidadeNome: 'Cardio' 
            })
          })
        })
      );
    });

    it('deve repetir etapa com mensagem de erro em input inválido (não numérico)', async () => {
      mockPrisma.especialidade.findMany.mockResolvedValue([{ id: 'esp-1', nome: 'Cardio' } as Especialidade]);
      await waConversaService.processarMensagem(getConversaEsp(), 'abc');
      
      expect(mockEvolutionApi.enviarTexto).toHaveBeenCalledWith(
        expect.any(String), 
        expect.any(String), 
        expect.stringContaining('Opção inválida')
      );
    });

    it('deve repetir etapa com mensagem de erro em número fora do range', async () => {
      mockPrisma.especialidade.findMany.mockResolvedValue([{ id: 'esp-1', nome: 'Cardio' } as Especialidade]);
      await waConversaService.processarMensagem(getConversaEsp(), '5');
      
      expect(mockEvolutionApi.enviarTexto).toHaveBeenCalledWith(
        expect.any(String), 
        expect.any(String), 
        expect.stringContaining('número de 1 a 1')
      );
    });

    it('deve terminar fluxo após 3 erros consecutivos', async () => {
      const conv = getConversaEsp();
      conv.contexto = { errosEspecialidade: 2 };
      mockPrisma.especialidade.findMany.mockResolvedValue([{ id: 'esp-1', nome: 'Cardio' } as Especialidade]);
      
      await waConversaService.processarMensagem(conv, '9');
      
      expect(mockPrisma.waConversa.update).toHaveBeenCalledWith(
        expect.objectContaining({ 
          data: expect.objectContaining({ estado: WaEstadoConversa.CONCLUIDA }) 
        })
      );
      expect(mockEvolutionApi.enviarTexto).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.stringContaining('Não consegui perceber')
      );
    });
  });

  describe('etapaMedico', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getConversaMed = (): any => ({
      ...getConversaBase(),
      estado: WaEstadoConversa.EM_FLUXO_MARCACAO,
      etapaFluxo: 'MEDICO',
      contexto: {
        especialidadeId: 'esp-1',
        especialidadeNome: 'Cardio'
      }
    });

    it('deve listar médicos da especialidade escolhida', async () => {
      mockPrisma.medico.findMany.mockResolvedValue([
        { id: 'med-1', nome: 'Dr. House' } as Medico,
        { id: 'med-2', nome: 'Dr. Watson' } as Medico
      ]);
      
      await waConversaService.processarMensagem(getConversaMed(), '99');
      
      expect(mockEvolutionApi.enviarTexto).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.stringContaining('1. Dr. House\n2. Dr. Watson')
      );
    });

    it('deve avançar para etapa HORARIO com input válido', async () => {
      mockPrisma.medico.findMany.mockResolvedValue([{id:'med-1', nome:'Dr.A'} as Medico]);
      await waConversaService.processarMensagem(getConversaMed(), '1');
      
      expect(mockPrisma.waConversa.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ etapaFluxo: 'HORARIO' })})
      );
    });

    it('deve guardar medicoId e medicoNome no contexto', async () => {
      mockPrisma.medico.findMany.mockResolvedValue([{id:'med-1', nome:'Dr. Gregory House'} as Medico]);
      await waConversaService.processarMensagem(getConversaMed(), '1');
      
      expect(mockPrisma.waConversa.update).toHaveBeenCalledWith(
        expect.objectContaining({ 
          data: expect.objectContaining({ 
            contexto: expect.objectContaining({ 
              medicoId: 'med-1',
              medicoNome: 'Dr. Gregory House'
            }) 
          })
        })
      );
    });

    it('deve saltar etapa de escolha se houver apenas 1 médico disponível', async () => {
      const conv = getConversaBase();
      conv.estado = WaEstadoConversa.EM_FLUXO_MARCACAO;
      conv.etapaFluxo = 'ESPECIALIDADE';
      
      mockPrisma.especialidade.findMany.mockResolvedValue([{ id: 'esp-1', nome: 'Cardio' } as Especialidade]);
      mockPrisma.medico.findMany.mockResolvedValue([{ id: 'med-1', nome: 'Único Médico' } as Medico]);
      
      await waConversaService.processarMensagem(conv, '1');

      expect(mockPrisma.waConversa.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ etapaFluxo: 'HORARIO' })})
      );
      expect(mockEvolutionApi.enviarTexto).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.stringContaining('Horários disponíveis com *Único Médico*')
      );
    });
  });

  describe('etapaHorario', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getConversaHor = (): any => ({
      ...getConversaBase(),
      estado: WaEstadoConversa.EM_FLUXO_MARCACAO,
      etapaFluxo: 'HORARIO',
      contexto: {
        medicoId: 'med-1',
        medicoNome: 'Dr. House',
        slotsTemporarios: ['2026-04-14T14:00:00.000Z', '2026-04-14T15:00:00.000Z']
      }
    });

    it('deve listar próximos 5 slots disponíveis (e formatar label)', async () => {
      await waConversaService.processarMensagem(getConversaHor(), '99');
      
      expect(mockEvolutionApi.enviarTexto).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.stringContaining('14/04') 
      );
    });

    it('deve avançar para etapa CONFIRMAR com input válido', async () => {
      await waConversaService.processarMensagem(getConversaHor(), '1');
      expect(mockPrisma.waConversa.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ etapaFluxo: 'CONFIRMAR' })})
      );
    });
  });

  describe('etapaConfirmar', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getConversaConf = (): any => ({
      ...getConversaBase(),
      estado: WaEstadoConversa.EM_FLUXO_MARCACAO,
      etapaFluxo: 'CONFIRMAR',
      contexto: {
        especialidadeId: 'esp-1',
        medicoId: 'med-1',
        medicoNome: 'Dr. House',
        slotEscolhido: '2026-04-14T14:00:00.000Z'
      }
    });

    it('deve criar agendamento quando resposta é "1", "sim" ou "S"', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma.paciente.findFirst.mockResolvedValue({ id: 'pac-1' } as any);
      
      const inputs = ['1', 'sim', 'S', 'SIM', 'confirmar'];
      for (const input of inputs) {
        await waConversaService.processarMensagem(getConversaConf(), input);
        expect(mockPrisma.agendamento.create).toHaveBeenCalled();
        vi.clearAllMocks();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockPrisma.paciente.findFirst.mockResolvedValue({ id: 'pac-1' } as any);
      }
    });

    it('deve cancelar fluxo quando resposta é "2" ou "não"', async () => {
      await waConversaService.processarMensagem(getConversaConf(), '2');
      expect(mockPrisma.waConversa.update).toHaveBeenCalledWith(
        expect.objectContaining({ 
          data: expect.objectContaining({ 
            estado: WaEstadoConversa.AGUARDA_INPUT,
            etapaFluxo: null 
          })
        })
      );
      expect(mockEvolutionApi.enviarTexto).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.stringContaining('cancelado')
      );
    });

    it('deve criar paciente automaticamente se número não associado', async () => {
      mockPrisma.paciente.findFirst.mockResolvedValue(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma.paciente.create.mockResolvedValue({ id: 'pac-new' } as any);
      
      await waConversaService.processarMensagem(getConversaConf(), '1');
      
      expect(mockPrisma.paciente.create).toHaveBeenCalledWith(
        expect.objectContaining({ 
          data: expect.objectContaining({ 
            telefone: '+244900000000', 
            origem: 'WHATSAPP' 
          }) 
        })
      );
    });

    it('deve enviar mensagem de confirmação final e publicar evento WebSocket', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma.paciente.findFirst.mockResolvedValue({ id: 'pac-1' } as any);
      
      await waConversaService.processarMensagem(getConversaConf(), '1');
      
      expect(mockEvolutionApi.enviarTexto).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.stringContaining('Confirmado')
      );
      expect(publishEvent).toHaveBeenCalledWith(
        'clinica:clinica-1',
        'whatsapp:marcacao',
        expect.anything()
      );
    });
  });
});
