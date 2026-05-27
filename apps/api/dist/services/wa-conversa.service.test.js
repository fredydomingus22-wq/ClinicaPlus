"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_mock_1 = require("../test/mocks/prisma.mock");
const evolutionApi_mock_1 = require("../test/mocks/evolutionApi.mock");
const client_1 = require("@prisma/client");
const types_1 = require("@clinicaplus/types");
const wa_conversa_service_1 = require("./wa-conversa.service");
const eventBus_1 = require("../lib/eventBus");
// Mock dependências
vitest_1.vi.mock('../lib/evolutionApi', () => ({ evolutionApi: evolutionApi_mock_1.mockEvolutionApi }));
vitest_1.vi.mock('../lib/eventBus', () => ({ publishEvent: vitest_1.vi.fn() }));
vitest_1.vi.mock('../lib/prisma', () => ({ prisma: prisma_mock_1.mockPrisma }));
const getClinicaBase = () => ({
    id: 'clinica-1',
    nome: 'Clínica Plus',
    slug: 'clinica-plus',
    email: 'test@clinica.plus',
    plano: client_1.Plano.PRO,
    ativo: true,
    subscricaoEstado: types_1.EstadoSubscricao.ACTIVA,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    logo: null,
    telefone: null,
    endereco: null,
    cidade: null,
    provincia: null,
    subscricaoValidaAte: null,
    suspensaEm: null,
    motivoSuspensao: null,
    notasInternas: null,
    nif: null,
    razaoSocial: null,
    regimeFiscal: 'GERAL',
    agtSoftwareCert: null,
    enderecoPostal: null,
    serieDocFiscal: 'CPLS'
});
const getInstanciaBase = () => ({
    id: 'ins-1',
    clinicaId: 'clinica-1',
    evolutionName: 'cp-test',
    evolutionToken: 'token-123',
    tipoIntegracao: 'BAILEYS',
    metaPhoneNumberId: null,
    metaWabaId: null,
    metaAccessToken: null,
    estado: client_1.WaEstadoInstancia.CONECTADO,
    numeroTelefone: '244900000000',
    qrCodeBase64: null,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    qrExpiresAt: null
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getConversaBase = () => ({
    id: 'conv-1',
    instanciaId: 'ins-1',
    numeroWhatsapp: '244900000000',
    pacienteId: null,
    estado: client_1.WaEstadoConversa.AGUARDA_INPUT,
    etapaFluxo: null,
    contexto: null,
    ultimaMensagemEm: new Date(),
    criadoEm: new Date(),
    instancia: getInstanciaBase(),
});
(0, vitest_1.describe)('waConversaService', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        prisma_mock_1.mockPrisma.waInstancia.findFirstOrThrow.mockResolvedValue(getInstanciaBase());
        prisma_mock_1.mockPrisma.waInstancia.findFirst.mockResolvedValue(getInstanciaBase());
        prisma_mock_1.mockPrisma.clinica.findUniqueOrThrow.mockResolvedValue(getClinicaBase());
        prisma_mock_1.mockPrisma.clinica.findUnique.mockResolvedValue(getClinicaBase());
        prisma_mock_1.mockPrisma.waAutomacao.findFirst.mockResolvedValue({ id: 'aut-1', ativo: true, configuracao: {} });
        prisma_mock_1.mockPrisma.waConversa.findUnique.mockResolvedValue(getConversaBase());
    });
    (0, vitest_1.describe)('etapaInicio', () => {
        (0, vitest_1.it)('deve enviar lista de especialidades da clínica', async () => {
            prisma_mock_1.mockPrisma.especialidade.findMany.mockResolvedValue([
                { id: 'esp-1', nome: 'Cardiologia' },
                { id: 'esp-2', nome: 'Dentista' }
            ]);
            await wa_conversa_service_1.waConversaService.processarMensagem(getConversaBase(), '1');
            (0, vitest_1.expect)(evolutionApi_mock_1.mockEvolutionApi.enviarTexto).toHaveBeenCalledWith('cp-test', '244900000000', vitest_1.expect.stringContaining('como se chama'));
        });
        (0, vitest_1.it)('deve criar conversa com etapa ESPECIALIDADE', async () => {
            prisma_mock_1.mockPrisma.especialidade.findMany.mockResolvedValue([{ id: 'esp-1', nome: 'Cardiologia' }]);
            await wa_conversa_service_1.waConversaService.processarMensagem(getConversaBase(), '1');
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.waConversa.upsert).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                create: vitest_1.expect.objectContaining({
                    estado: client_1.WaEstadoConversa.EM_FLUXO_MARCACAO,
                    etapaFluxo: 'NOME'
                })
            }));
        });
        (0, vitest_1.it)('deve resetar contexto ao reiniciar conversa expirada ou por comando "oi"', async () => {
            const conv = getConversaBase();
            conv.estado = client_1.WaEstadoConversa.EM_FLUXO_MARCACAO;
            conv.etapaFluxo = 'CONFIRMAR';
            conv.contexto = { especialidadeId: 'esp-1' };
            prisma_mock_1.mockPrisma.especialidade.findMany.mockResolvedValue([{ id: 'esp-1', nome: 'Cardiologia' }]);
            await wa_conversa_service_1.waConversaService.processarMensagem(conv, 'oi');
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.waConversa.upsert).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                update: vitest_1.expect.objectContaining({
                    etapaFluxo: 'NOME',
                    contexto: {}
                })
            }));
        });
        (0, vitest_1.it)('deve incluir nome da clínica na saudação inicial', async () => {
            prisma_mock_1.mockPrisma.clinica.findUnique.mockResolvedValue(getClinicaBase());
            await wa_conversa_service_1.waConversaService.processarMensagem(getConversaBase(), 'ola');
            (0, vitest_1.expect)(evolutionApi_mock_1.mockEvolutionApi.enviarTexto).toHaveBeenCalledWith('cp-test', '244900000000', vitest_1.expect.stringContaining('Clínica Plus'));
        });
    });
    (0, vitest_1.describe)('etapaEspecialidade', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const getConversaEsp = () => ({
            ...getConversaBase(),
            estado: client_1.WaEstadoConversa.EM_FLUXO_MARCACAO,
            etapaFluxo: 'ESPECIALIDADE',
        });
        (0, vitest_1.it)('deve avançar para etapa MEDICO com input válido', async () => {
            prisma_mock_1.mockPrisma.especialidade.findMany.mockResolvedValue([
                { id: 'esp-1', nome: 'Cardiologia' }
            ]);
            prisma_mock_1.mockPrisma.medico.findMany.mockResolvedValue([
                { id: 'med-1', nome: 'Dr. House' },
                { id: 'med-2', nome: 'Dr. Who' }
            ]);
            prisma_mock_1.mockPrisma.waConversa.findUnique.mockResolvedValue(getConversaEsp());
            await wa_conversa_service_1.waConversaService.processarMensagem(getConversaEsp(), '1');
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.waConversa.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                data: vitest_1.expect.objectContaining({ etapaFluxo: 'MEDICO' })
            }));
        });
        (0, vitest_1.it)('deve guardar especialidadeId e especialidadeNome no contexto', async () => {
            prisma_mock_1.mockPrisma.especialidade.findMany.mockResolvedValue([{ id: 'esp-1', nome: 'Cardio' }]);
            prisma_mock_1.mockPrisma.medico.findMany.mockResolvedValue([{ id: 'med-1' }, { id: 'med-2' }]);
            prisma_mock_1.mockPrisma.waConversa.findUnique.mockResolvedValue(getConversaEsp());
            await wa_conversa_service_1.waConversaService.processarMensagem(getConversaEsp(), '1');
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.waConversa.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                data: vitest_1.expect.objectContaining({
                    contexto: vitest_1.expect.objectContaining({
                        especialidadeId: 'esp-1',
                        especialidadeNome: 'Cardio'
                    })
                })
            }));
        });
        (0, vitest_1.it)('deve repetir etapa com mensagem de erro em input inválido (não numérico)', async () => {
            prisma_mock_1.mockPrisma.especialidade.findMany.mockResolvedValue([{ id: 'esp-1', nome: 'Cardio' }]);
            prisma_mock_1.mockPrisma.waConversa.findUnique.mockResolvedValue(getConversaEsp());
            await wa_conversa_service_1.waConversaService.processarMensagem(getConversaEsp(), 'abc');
            (0, vitest_1.expect)(evolutionApi_mock_1.mockEvolutionApi.enviarTexto).toHaveBeenCalledWith(vitest_1.expect.any(String), vitest_1.expect.any(String), vitest_1.expect.stringContaining('Opção inválida'));
        });
        (0, vitest_1.it)('deve repetir etapa com mensagem de erro em número fora do range', async () => {
            prisma_mock_1.mockPrisma.especialidade.findMany.mockResolvedValue([{ id: 'esp-1', nome: 'Cardio' }]);
            prisma_mock_1.mockPrisma.waConversa.findUnique.mockResolvedValue(getConversaEsp());
            await wa_conversa_service_1.waConversaService.processarMensagem(getConversaEsp(), '5');
            (0, vitest_1.expect)(evolutionApi_mock_1.mockEvolutionApi.enviarTexto).toHaveBeenCalledWith(vitest_1.expect.any(String), vitest_1.expect.any(String), vitest_1.expect.stringContaining('número de 1 a 1'));
        });
        (0, vitest_1.it)('deve terminar fluxo após 3 erros consecutivos', async () => {
            const conv = getConversaEsp();
            conv.contexto = { errosEspecialidade: 2 };
            prisma_mock_1.mockPrisma.especialidade.findMany.mockResolvedValue([{ id: 'esp-1', nome: 'Cardio' }]);
            prisma_mock_1.mockPrisma.waConversa.findUnique.mockResolvedValue(conv);
            await wa_conversa_service_1.waConversaService.processarMensagem(conv, '9');
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.waConversa.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                data: vitest_1.expect.objectContaining({ estado: client_1.WaEstadoConversa.CONCLUIDA })
            }));
            (0, vitest_1.expect)(evolutionApi_mock_1.mockEvolutionApi.enviarTexto).toHaveBeenCalledWith(vitest_1.expect.any(String), vitest_1.expect.any(String), vitest_1.expect.stringContaining('Não consegui perceber'));
        });
    });
    (0, vitest_1.describe)('etapaMedico', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const getConversaMed = () => ({
            ...getConversaBase(),
            estado: client_1.WaEstadoConversa.EM_FLUXO_MARCACAO,
            etapaFluxo: 'MEDICO',
            contexto: {
                especialidadeId: 'esp-1',
                especialidadeNome: 'Cardio'
            }
        });
        (0, vitest_1.it)('deve listar médicos da especialidade escolhida', async () => {
            prisma_mock_1.mockPrisma.medico.findMany.mockResolvedValue([
                { id: 'med-1', nome: 'Dr. House' },
                { id: 'med-2', nome: 'Dr. Watson' }
            ]);
            prisma_mock_1.mockPrisma.waConversa.findUnique.mockResolvedValue(getConversaMed());
            await wa_conversa_service_1.waConversaService.processarMensagem(getConversaMed(), '99');
            (0, vitest_1.expect)(evolutionApi_mock_1.mockEvolutionApi.enviarTexto).toHaveBeenCalledWith(vitest_1.expect.any(String), vitest_1.expect.any(String), vitest_1.expect.stringContaining('1. Dr. House\n2. Dr. Watson'));
        });
        (0, vitest_1.it)('deve avançar para etapa HORARIO com input válido', async () => {
            prisma_mock_1.mockPrisma.medico.findMany.mockResolvedValue([{ id: 'med-1', nome: 'Dr.A' }]);
            prisma_mock_1.mockPrisma.waConversa.findUnique.mockResolvedValue(getConversaMed());
            await wa_conversa_service_1.waConversaService.processarMensagem(getConversaMed(), '1');
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.waConversa.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ data: vitest_1.expect.objectContaining({ etapaFluxo: 'HORARIO' }) }));
        });
        (0, vitest_1.it)('deve guardar medicoId e medicoNome no contexto', async () => {
            prisma_mock_1.mockPrisma.medico.findMany.mockResolvedValue([{ id: 'med-1', nome: 'Dr. Gregory House' }]);
            prisma_mock_1.mockPrisma.waConversa.findUnique.mockResolvedValue(getConversaMed());
            await wa_conversa_service_1.waConversaService.processarMensagem(getConversaMed(), '1');
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.waConversa.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                data: vitest_1.expect.objectContaining({
                    contexto: vitest_1.expect.objectContaining({
                        medicoId: 'med-1',
                        medicoNome: 'Dr. Gregory House'
                    })
                })
            }));
        });
        (0, vitest_1.it)('deve saltar etapa de escolha se houver apenas 1 médico disponível', async () => {
            const conv = getConversaBase();
            conv.estado = client_1.WaEstadoConversa.EM_FLUXO_MARCACAO;
            conv.etapaFluxo = 'ESPECIALIDADE';
            prisma_mock_1.mockPrisma.especialidade.findMany.mockResolvedValue([{ id: 'esp-1', nome: 'Cardio' }]);
            prisma_mock_1.mockPrisma.medico.findMany.mockResolvedValue([{ id: 'med-1', nome: 'Único Médico' }]);
            prisma_mock_1.mockPrisma.waConversa.findUnique.mockResolvedValue(conv);
            await wa_conversa_service_1.waConversaService.processarMensagem(conv, '1');
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.waConversa.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ data: vitest_1.expect.objectContaining({ etapaFluxo: 'HORARIO' }) }));
            (0, vitest_1.expect)(evolutionApi_mock_1.mockEvolutionApi.enviarTexto).toHaveBeenCalledWith(vitest_1.expect.any(String), vitest_1.expect.any(String), vitest_1.expect.stringContaining('Horários disponíveis com *Único Médico*'));
        });
    });
    (0, vitest_1.describe)('etapaHorario', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const getConversaHor = () => ({
            ...getConversaBase(),
            estado: client_1.WaEstadoConversa.EM_FLUXO_MARCACAO,
            etapaFluxo: 'HORARIO',
            contexto: {
                medicoId: 'med-1',
                medicoNome: 'Dr. House',
                slotsTemporarios: ['2026-04-14T14:00:00.000Z', '2026-04-14T15:00:00.000Z']
            }
        });
        (0, vitest_1.it)('deve listar próximos 5 slots disponíveis (e formatar label)', async () => {
            prisma_mock_1.mockPrisma.waConversa.findUnique.mockResolvedValue(getConversaHor());
            await wa_conversa_service_1.waConversaService.processarMensagem(getConversaHor(), '99');
            (0, vitest_1.expect)(evolutionApi_mock_1.mockEvolutionApi.enviarTexto).toHaveBeenCalledWith(vitest_1.expect.any(String), vitest_1.expect.any(String), vitest_1.expect.stringContaining('14/04'));
        });
        (0, vitest_1.it)('deve avançar para etapa CONFIRMAR com input válido', async () => {
            prisma_mock_1.mockPrisma.waConversa.findUnique.mockResolvedValue(getConversaHor());
            await wa_conversa_service_1.waConversaService.processarMensagem(getConversaHor(), '1');
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.waConversa.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ data: vitest_1.expect.objectContaining({ etapaFluxo: 'CONFIRMAR' }) }));
        });
    });
    (0, vitest_1.describe)('etapaConfirmar', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const getConversaConf = () => ({
            ...getConversaBase(),
            estado: client_1.WaEstadoConversa.EM_FLUXO_MARCACAO,
            etapaFluxo: 'CONFIRMAR',
            contexto: {
                especialidadeId: 'esp-1',
                medicoId: 'med-1',
                medicoNome: 'Dr. House',
                slotEscolhido: '2026-04-14T14:00:00.000Z'
            }
        });
        (0, vitest_1.it)('deve criar agendamento quando resposta é "1", "sim" ou "S"', async () => {
            prisma_mock_1.mockPrisma.agendamento.create.mockResolvedValue({ id: 'age-12345678' });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            prisma_mock_1.mockPrisma.paciente.findFirst.mockResolvedValue({ id: 'pac-1' });
            const inputs = ['1', 'sim', 'S', 'SIM', 'confirmar'];
            for (const input of inputs) {
                prisma_mock_1.mockPrisma.waConversa.findUnique.mockResolvedValue(getConversaConf());
                await wa_conversa_service_1.waConversaService.processarMensagem(getConversaConf(), input);
                (0, vitest_1.expect)(prisma_mock_1.mockPrisma.agendamento.create).toHaveBeenCalled();
                vitest_1.vi.clearAllMocks();
                prisma_mock_1.mockPrisma.agendamento.create.mockResolvedValue({ id: 'age-12345678' });
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                prisma_mock_1.mockPrisma.paciente.findFirst.mockResolvedValue({ id: 'pac-1' });
            }
        });
        (0, vitest_1.it)('deve cancelar fluxo quando resposta é "2" ou "não"', async () => {
            prisma_mock_1.mockPrisma.waConversa.findUnique.mockResolvedValue(getConversaConf());
            await wa_conversa_service_1.waConversaService.processarMensagem(getConversaConf(), '2');
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.waConversa.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                data: vitest_1.expect.objectContaining({
                    estado: client_1.WaEstadoConversa.AGUARDA_INPUT,
                    etapaFluxo: null
                })
            }));
            (0, vitest_1.expect)(evolutionApi_mock_1.mockEvolutionApi.enviarTexto).toHaveBeenCalledWith(vitest_1.expect.any(String), vitest_1.expect.any(String), vitest_1.expect.stringContaining('cancelado'));
        });
        (0, vitest_1.it)('deve criar paciente automaticamente se número não associado', async () => {
            prisma_mock_1.mockPrisma.paciente.findFirst.mockResolvedValue(null);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            prisma_mock_1.mockPrisma.paciente.create.mockResolvedValue({ id: 'pac-new' });
            prisma_mock_1.mockPrisma.agendamento.create.mockResolvedValue({ id: 'age-12345678' });
            prisma_mock_1.mockPrisma.waConversa.findUnique.mockResolvedValue(getConversaConf());
            await wa_conversa_service_1.waConversaService.processarMensagem(getConversaConf(), '1');
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.paciente.create).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                data: vitest_1.expect.objectContaining({
                    telefone: '+244900000000',
                    origem: 'WHATSAPP'
                })
            }));
        });
        (0, vitest_1.it)('deve enviar mensagem de confirmação final e publicar evento WebSocket', async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            prisma_mock_1.mockPrisma.paciente.findFirst.mockResolvedValue({ id: 'pac-1' });
            prisma_mock_1.mockPrisma.agendamento.create.mockResolvedValue({ id: 'age-12345678' });
            prisma_mock_1.mockPrisma.waConversa.findUnique.mockResolvedValue(getConversaConf());
            await wa_conversa_service_1.waConversaService.processarMensagem(getConversaConf(), '1');
            (0, vitest_1.expect)(evolutionApi_mock_1.mockEvolutionApi.enviarTexto).toHaveBeenCalledWith(vitest_1.expect.any(String), vitest_1.expect.any(String), vitest_1.expect.stringContaining('Confirmado'));
            (0, vitest_1.expect)(eventBus_1.publishEvent).toHaveBeenCalledWith('clinica:clinica-1', 'whatsapp:marcacao', vitest_1.expect.anything());
        });
    });
});
