import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();
const HASH = bcrypt.hashSync('TestPassword123!', 10);  // pre-hashed for speed

export const factories = {

  async createClinica(overrides = {}) {
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

  async createAdmin(clinicaId: string, overrides = {}) {
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

  async createMedico(clinicaId: string, overrides = {}) {
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

  async createPaciente(clinicaId: string, overrides = {}) {
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

  async setupClinicaCompleta() {
    const clinica = await factories.createClinica();
    const admin = await factories.createAdmin(clinica.id);
    const { user: medicoUser, medico } = await factories.createMedico(clinica.id);
    const paciente = await factories.createPaciente(clinica.id);

    // Generate auth tokens
    const { authService } = await import('../../services/auth.service');
    const { accessToken } = await authService._issueTokens(admin as any);
    const { accessToken: medicoToken } = await authService._issueTokens(medicoUser as any);
    
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
    
    const { accessToken: pacienteToken } = await authService._issueTokens(pacienteUser as any);

    return { 
      clinica, 
      admin, 
      adminToken: accessToken, 
      medicoUser, 
      medicoToken,
      medico, 
      pacienteUser,
      pacienteToken,
      paciente 
    };
  },

  async cleanupClinica(clinicaId: string) {
    // Delete in dependency order
    await prisma.receita.deleteMany({ where: { clinicaId } });
    await prisma.lembreteAgendamento.deleteMany({ where: { clinicaId } });
    await prisma.agendamento.deleteMany({ where: { clinicaId } });
    await prisma.paciente.deleteMany({ where: { clinicaId } });
    await prisma.medico.deleteMany({ where: { clinicaId } });
    await prisma.refreshToken.deleteMany({ where: { utilizador: { clinicaId } } });
    await prisma.utilizador.deleteMany({ where: { clinicaId } });
    await prisma.clinica.delete({ where: { id: clinicaId } });
  },
};
