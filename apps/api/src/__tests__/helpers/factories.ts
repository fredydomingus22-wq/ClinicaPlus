import { PrismaClient, Clinica, Utilizador, Medico, Paciente, Especialidade } from '@prisma/client';
import bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();
const HASH = bcrypt.hashSync('TestPassword123!', 10);  // pre-hashed for speed

export const factories = {

  async createClinica(overrides = {}): Promise<Clinica> {
    return prisma.clinica.create({
      data: {
        nome:      faker.company.name(),
        slug:      faker.internet.domainWord() + '-' + Date.now(),
        email:     faker.internet.email(),
        provincia: 'Luanda',
        plano:     'PRO',
        ...overrides,
      },
    });
  },

  async createAdmin(clinicaId: string, overrides = {}): Promise<Utilizador> {
    return prisma.utilizador.create({
      data: {
        clinicaId,
        nome:         faker.person.fullName(),
        email:        faker.internet.email(),
        passwordHash: HASH,
        papel:        'ADMIN',
        ...overrides,
      },
    });
  },

  async createMedico(clinicaId: string, overrides = {}): Promise<{ user: Utilizador; medico: Medico & { especialidade: Especialidade } }> {
    const user = await factories.createAdmin(clinicaId, { papel: 'MEDICO', ...overrides });
    
    // Create a default specialty for the doctor
    const especialidade = await prisma.especialidade.create({
      data: {
        clinicaId,
        nome: 'Clínica Geral',
        ativo: true
      }
    });

    const medico = await prisma.medico.create({
      data: {
        clinicaId,
        utilizadorId:   user.id,
        nome:           user.nome,
        especialidadeId: especialidade.id,
        duracaoConsulta: 30,
        preco:          3000,
        horario: {
          segunda: { ativo: true, inicio: '08:00', fim: '17:00' },
          terca:   { ativo: true, inicio: '08:00', fim: '17:00' },
          quarta:  { ativo: true, inicio: '08:00', fim: '17:00' },
          quinta:  { ativo: true, inicio: '08:00', fim: '17:00' },
          sexta:   { ativo: true, inicio: '08:00', fim: '13:00' },
          sabado:  { ativo: false },
          domingo: { ativo: false },
        },
      },
      include: { especialidade: true }
    });
    return { user, medico };
  },

  async createPaciente(clinicaId: string, overrides = {}): Promise<Paciente> {
    const numero = `P-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    return prisma.paciente.create({
      data: {
        clinicaId,
        numeroPaciente: numero,
        nome:           faker.person.fullName(),
        dataNascimento: faker.date.birthdate({ min: 18, max: 80, mode: 'age' }),
        genero:         'M',
        alergias:       [],
        ...overrides,
      },
    });
  },

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async setupClinicaCompleta() {
    // Seed basic permissions needed for tests
    await factories.seedPermissions();

    const clinica = await factories.createClinica();
    const admin = await factories.createAdmin(clinica.id);
    const { user: medicoUser, medico } = await factories.createMedico(clinica.id);
    const paciente = await factories.createPaciente(clinica.id);

    // Generate auth tokens
    const { authService } = await import('../../services/auth.service');
    const { accessToken } = await authService._issueTokens(admin as unknown as Utilizador & { medico: (Medico & { especialidade: Especialidade }) | null; paciente: Paciente | null });
    const { accessToken: medicoToken } = await authService._issueTokens(medicoUser as unknown as Utilizador & { medico: (Medico & { especialidade: Especialidade }) | null; paciente: Paciente | null });
    
    // Also create a Paciente user token for role-guard testing
    const pacienteUser = await prisma.utilizador.create({
      data: {
        clinicaId: clinica.id,
        nome: paciente.nome,
        email: faker.internet.email(),
        passwordHash: HASH,
        papel: 'PACIENTE',
      }
    });
    
    // Link patient to user manually since factory didn't do it
    await prisma.paciente.update({
      where: { id: paciente.id },
      data: { utilizadorId: pacienteUser.id }
    });
    
    const { accessToken: pacienteToken } = await authService._issueTokens(pacienteUser as unknown as Utilizador & { medico: (Medico & { especialidade: Especialidade }) | null; paciente: Paciente | null });

    // Also create a REPCIONISTA user token for role-guard testing
    const recepcaoUser = await prisma.utilizador.create({
      data: {
        clinicaId: clinica.id,
        nome: 'Rececao Clinica',
        email: faker.internet.email(),
        passwordHash: HASH,
        papel: 'RECEPCIONISTA',
      }
    });
    const { accessToken: recepcaoToken } = await authService._issueTokens(recepcaoUser as unknown as Utilizador & { medico: (Medico & { especialidade: Especialidade }) | null; paciente: Paciente | null });

    return { 
      clinica, 
      admin, 
      adminToken: accessToken, 
      medicoUser, 
      medicoToken,
      medico, 
      pacienteUser,
      pacienteToken,
      paciente,
      recepcaoUser,
      recepcaoToken
    };
  },

  async seedPermissions(): Promise<void> {
    const perms = [
      { codigo: 'fatura:void', descricao: 'Anular faturas', modulo: 'financeiro' },
      { codigo: 'relatorio:export', descricao: 'Exportar relatórios', modulo: 'financeiro' },
      { codigo: 'paciente:delete', descricao: 'Eliminar pacientes', modulo: 'pacientes' },
      { codigo: 'apikey:manage', descricao: 'Gerir API Keys', modulo: 'plataforma' },
      { codigo: 'webhook:manage', descricao: 'Gerir Webhooks', modulo: 'plataforma' },
    ];

    for (const p of perms) {
      const dbPerm = await prisma.permissao.upsert({
        where: { codigo: p.codigo },
        create: p,
        update: {},
      });

      // Atribuir ao ADMIN por padrão nos testes
      await prisma.rolePermissao.upsert({
        where: { papel_permissaoId: { papel: 'ADMIN', permissaoId: dbPerm.id } },
        create: { papel: 'ADMIN', permissaoId: dbPerm.id },
        update: {},
      });
    }
  },
  
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  createExameData(pacienteId: string, agendamentoId?: string, medicoId?: string) {
    return {
      pacienteId,
      agendamentoId,
      medicoId,
      tipo: 'FISICO',
      nome: 'Exame Físico',
      dataRealizacao: new Date(),
      status: 'REALIZADO',
      notas: faker.lorem.paragraph(),
    };
  },

  async cleanupClinica(clinicaId: string): Promise<void> {
    try {
      // Delete in dependency order
      await prisma.receita.deleteMany({ where: { clinicaId } }).catch(() => {});
      await prisma.prontuario.deleteMany({ where: { clinicaId } }).catch(() => {});
      await prisma.exame.deleteMany({ where: { clinicaId } }).catch(() => {});
      await prisma.documento.deleteMany({ where: { clinicaId } }).catch(() => {});
      await prisma.lembreteAgendamento.deleteMany({ where: { clinicaId } }).catch(() => {});
      await prisma.agendamento.deleteMany({ where: { clinicaId } }).catch(() => {});
      await prisma.paciente.deleteMany({ where: { clinicaId } }).catch(() => {});
      await prisma.medico.deleteMany({ where: { clinicaId } }).catch(() => {});
      await prisma.especialidade.deleteMany({ where: { clinicaId } }).catch(() => {});
      await prisma.fatura.deleteMany({ where: { clinicaId } }).catch(() => {});
      await prisma.subscricao.deleteMany({ where: { clinicaId } }).catch(() => {});
      await prisma.configuracaoClinica.deleteMany({ where: { clinicaId } }).catch(() => {});
      
      // Clean up users and tokens
      await prisma.refreshToken.deleteMany({ where: { utilizador: { clinicaId } } }).catch(() => {});
      await prisma.utilizador.deleteMany({ where: { clinicaId } }).catch(() => {});
      await prisma.clinica.delete({ where: { id: clinicaId } }).catch(() => {});
    } catch {
      // Ignore cleanup errors
    }
  },
};
