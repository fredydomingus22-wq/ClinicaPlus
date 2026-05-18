import { PrismaClient, Papel, EstadoAgendamento } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('Demo1234!', 12);

  // 1. Clínica Demo
  const clinica = await prisma.clinica.upsert({
    where: { slug: 'multipla-luanda' },
    update: {},
    create: {
      nome: 'Clínica Multipla Luanda',
      slug: 'multipla-luanda',
      email: 'contato@multipla.ao',
      telefone: '+244 923 123 456',
      endereco: 'Rua da Multipla, 123',
      cidade: 'Luanda',
      provincia: 'Luanda',
      plano: 'PRO',
    },
  });

  // 2. Utilizadores
  const users = [
    { nome: 'Maximus Super Admin', email: 'super@demo.ao', papel: Papel.SUPER_ADMIN },
    { nome: 'Ana Administradora', email: 'admin@demo.ao', papel: Papel.ADMIN },
    { nome: 'Dr. Carlos Silva', email: 'carlos@demo.ao', papel: Papel.MEDICO },
    { nome: 'Beatriz Recepcionista', email: 'beatriz@demo.ao', papel: Papel.RECEPCIONISTA },
    { nome: 'João Manuel', email: 'joao@demo.ao', papel: Papel.PACIENTE },
  ];

  for (const u of users) {
    await prisma.utilizador.upsert({
      where: { clinicaId_email: { clinicaId: clinica.id, email: u.email } },
      update: {},
      create: {
        clinicaId: clinica.id,
        nome: u.nome,
        email: u.email,
        passwordHash: passwordHash,
        papel: u.papel,
      },
    });
  }

  const medicoUser = await prisma.utilizador.findFirstOrThrow({ 
    where: { email: 'carlos@demo.ao', clinicaId: clinica.id } 
  });
  
  const pacienteUser = await prisma.utilizador.findFirstOrThrow({ 
    where: { email: 'joao@demo.ao', clinicaId: clinica.id } 
  });

  // 3. Perfil Médico
  const especialidadeObj = await prisma.especialidade.upsert({
    where: { clinicaId_nome: { clinicaId: clinica.id, nome: 'Cardiologia' } },
    update: {},
    create: {
      clinica: { connect: { id: clinica.id } },
      nome: 'Cardiologia',
      descricao: 'Especialidade de Cardiologia'
    }
  });

  const medico = await prisma.medico.upsert({
    where: { utilizadorId: medicoUser.id },
    update: {},
    create: {
      clinica: { connect: { id: clinica.id } },
      utilizador: { connect: { id: medicoUser.id } },
      nome: 'Dr. Carlos Silva',
      especialidade: { connect: { id: especialidadeObj.id } },
      ordem: 'AO-12345',
      duracaoConsulta: 30,
      preco: 5000,
      horario: {
        segunda: { ativo: true, inicio: '08:00', fim: '17:00', pausaInicio: '12:00', pausaFim: '14:00' },
        terca:   { ativo: true, inicio: '08:00', fim: '17:00', pausaInicio: '12:00', pausaFim: '14:00' },
        quarta:  { ativo: true, inicio: '08:00', fim: '17:00', pausaInicio: '12:00', pausaFim: '14:00' },
        quinta:  { ativo: true, inicio: '08:00', fim: '17:00', pausaInicio: '12:00', pausaFim: '14:00' },
        sexta:   { ativo: true, inicio: '08:00', fim: '17:00', pausaInicio: '12:00', pausaFim: '14:00' },
        sabado:  { ativo: false },
        domingo: { ativo: false },
      },
    },
  });

  // 4. Perfil Paciente
  const paciente = await prisma.paciente.upsert({
    where: { clinicaId_numeroPaciente: { clinicaId: clinica.id, numeroPaciente: 'P-2026-0001' } },
    update: {},
    create: {
      clinica: { connect: { id: clinica.id } },
      numeroPaciente: 'P-2026-0001',
      utilizador: { connect: { id: pacienteUser.id } },
      nome: 'João Manuel',
      dataNascimento: new Date('1981-05-15'),
      genero: 'Masculino',
      tipoSangue: 'O+',
      alergias: ['Penicilina'],
      provincia: 'Luanda',
    },
  });

  // 5. Agendamentos
  const dataRef = new Date();
  dataRef.setHours(9, 0, 0, 0);

  const agendamentosData = [
    { estado: EstadoAgendamento.PENDENTE, data: new Date(dataRef.getTime() + 24 * 60 * 60 * 1000) },
    { estado: EstadoAgendamento.CONFIRMADO, data: new Date(dataRef.getTime()) },
    { estado: EstadoAgendamento.CONCLUIDO, data: new Date(dataRef.getTime() - 24 * 60 * 60 * 1000) },
  ];

  for (const ag of agendamentosData) {
    await prisma.agendamento.create({
      data: {
        clinica: { connect: { id: clinica.id } },
        paciente: { connect: { id: paciente.id } },
        medico: { connect: { id: medico.id } },
        dataHora: ag.data,
        estado: ag.estado,
        tipo: 'CONSULTA',
        motivoConsulta: 'Check-up de rotina',
      },
    });
  }

  // 6. Configuração da Clínica
  await prisma.configuracaoClinica.upsert({
    where: { clinicaId: clinica.id },
    update: {},
    create: {
      clinica: { connect: { id: clinica.id } },
      lembrete24h: true,
      lembrete2h: true,
      horasAntecedencia: 24,
      moedaSimbolo: 'Kz',
      fusoHorario: 'Africa/Luanda',
      seguradoras: ["ENSA", "AAA Seguros", "Medicel", "Codil", "Nossa Seguros", "SAS", "IMPAR"]
    },
  });

  // 7. Limites de Plano
  const { seedPlanoLimites } = await import('../src/seeds/plano-limites.seed');
  await seedPlanoLimites(prisma);

  // 8. Permissões RBAC
  const { seedPermissoes } = await import('../src/seeds/permissoes.seed');
  await seedPermissoes(prisma);

  // 9. Feature Flags — migration_009_superadmin
  const { seedFeatureFlags } = await import('./seeds/feature-flags');
  await seedFeatureFlags();

  // 10. Catálogos de Exames e Tratamentos (Sprint I)
  await prisma.tipoTratamento.createMany({
    data: [
       { clinicaId: clinica.id, nome: 'Fisioterapia Geral', duracaoMin: 45 },
       { clinicaId: clinica.id, nome: 'Psicoterapia', duracaoMin: 60 }
    ],
    skipDuplicates: true
  });

  await prisma.tipoExameClinica.createMany({
    data: [
       { clinicaId: clinica.id, nome: 'Raio-X' },
       { clinicaId: clinica.id, nome: 'Hemograma Completo' },
       { clinicaId: clinica.id, nome: 'Ecografia' }
    ],
    skipDuplicates: true
  });

  // 11. Sequências Fiscais (Sprint I)
  const tipofiscais = ['FT', 'FR', 'NC', 'ND', 'VD'];
  const anoFiscal = new Date().getFullYear();
  
  for (const tipo of tipofiscais) {
    await prisma.sequenciaDocFiscal.upsert({
      where: {
        clinicaId_tipoDoc_serie_anoFiscal: {
          clinicaId: clinica.id,
          tipoDoc: tipo as any,
          serie: 'CPLS',
          anoFiscal: anoFiscal
        }
      },
      update: {},
      create: {
        clinicaId: clinica.id,
        tipoDoc: tipo as any,
        serie: 'CPLS',
        anoFiscal: anoFiscal,
        ultimoNumero: 0
      }
    });
  }
}

main()
  .catch(() => {
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
