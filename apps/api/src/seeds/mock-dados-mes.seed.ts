/* eslint-disable no-console */
import { PrismaClient, EstadoAgendamento, EstadoFatura, TipoFatura, TipoAgendamento } from '@prisma/client';

/**
 * Injeta dados mock de um mês para testes de desenvolvimento.
 * NUNCA executar em produção.
 */
export async function runMockMes(prisma: PrismaClient): Promise<void> {
  const clinica = await prisma.clinica.findFirst();
  if (!clinica) throw new Error('A Clínica principal não existe!');

  const medico = await prisma.medico.findFirst({ where: { clinicaId: clinica.id } });
  if (!medico) {
    console.log('Sem médico disponível. Crie pelo menos um médico antes de executar o seed.');
    return;
  }

  console.log('📝 A criar 5 pacientes mock...');
  const pacientesId: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const p = await prisma.paciente.create({
      data: {
        clinicaId: clinica.id,
        nome: `Mock Paciente ${i} Silva`,
        numeroPaciente: `P-MOCK-${Date.now()}-${i}`,
        telefone: `92200000${i}`,
        dataNascimento: new Date('1990-01-01'),
        genero: 'MASCULINO',
      }
    });
    pacientesId.push(p.id);
  }

  console.log('📅 A gerar o histórico de agendamentos e faturação (Últimos 30 dias)...');
  const hoje = new Date();
  let countCons = 0;
  let totalFat = 0;

  for (let i = 0; i < 60; i++) {
    const diasAtras = Math.floor(Math.random() * 30);
    const dataAgendamento = new Date(hoje);
    dataAgendamento.setDate(dataAgendamento.getDate() - diasAtras);

    // pacientesId is guaranteed non-empty; assert non-undefined
    const pacienteId = pacientesId[Math.floor(Math.random() * pacientesId.length)] as string;

    const agendamento = await prisma.agendamento.create({
      data: {
        clinicaId: clinica.id,
        pacienteId,
        medicoId: medico.id,
        dataHora: dataAgendamento,
        estado: EstadoAgendamento.CONCLUIDO,
        motivoConsulta: 'Simulação Consulta Routine',
        tipo: TipoAgendamento.CONSULTA,
      }
    });

    const subtotal = 15000 + Math.floor(Math.random() * 15000);
    totalFat += subtotal;
    countCons++;

    await prisma.fatura.create({
      data: {
        clinicaId: clinica.id,
        pacienteId,
        medicoId: medico.id,
        agendamentoId: agendamento.id,
        numeroFatura: `FT MOCK-${hoje.getFullYear()}/${Math.floor(Math.random() * 9000) + 1000}`,
        tipo: TipoFatura.PARTICULAR,
        estado: EstadoFatura.PAGA,
        subtotal,
        desconto: 0,
        total: subtotal,
        dataEmissao: dataAgendamento,
        dataVencimento: dataAgendamento,
        itens: {
          create: [{
            descricao: 'Consulta Clínica Geral (Mock)',
            quantidade: 1,
            precoUnit: subtotal,
            total: subtotal,
            codigoIva: 'ISE',
            taxaIva: 0,
          }]
        }
      }
    });
  }

  console.log(`✅ Seed concluído! Injetadas ${countCons} consultas e faturas. Venda total (Mock): ${totalFat} Kz.`);
}

if (require.main === module) {
  const prisma = new PrismaClient();
  runMockMes(prisma).finally(() => prisma.$disconnect());
}
