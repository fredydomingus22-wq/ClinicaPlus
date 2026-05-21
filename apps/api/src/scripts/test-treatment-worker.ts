import { PrismaClient } from '@prisma/client';
import { planosService } from '../services/planos.service';
import { logger } from '../lib/logger';

const prisma = new PrismaClient();

async function testWorker(): Promise<void> {
  logger.info('🚀 Iniciando teste do worker de tratamentos...');

  try {
    // 1. Buscar dados necessários
    const clinica = await prisma.clinica.findFirst();
    if (!clinica) throw new Error('Crie uma clínica no banco primeiro.');

    const paciente = await prisma.paciente.findFirst({ where: { clinicaId: clinica.id } });
    const medico = await prisma.medico.findFirst({ where: { clinicaId: clinica.id } });
    const tipoTratamento = await prisma.tipoTratamento.findFirst({ where: { clinicaId: clinica.id } });

    if (!paciente || !medico || !tipoTratamento) {
      throw new Error('Dados insuficientes na DB para o teste. Verifique se rodou o seed.');
    }

    logger.info({ 
      clinica: clinica.nome, 
      paciente: paciente.nome, 
      tratamento: tipoTratamento.nome 
    }, '📝 Criando plano de teste...');

    // 2. Criar o plano usando o serviço (que dispara o job)
    const plano = await planosService.create(clinica.id, {
      pacienteId: paciente.id,
      medicoId: medico.id,
      tipoId: tipoTratamento.id,
      totalSessoes: 5,
      frequenciaSemana: 2,
      dataInicio: new Date(),
      duracaoSessaoMin: 45,
      descricao: 'Plano de teste automatizado',
    }) as any;

    logger.info({ planoId: plano.id }, '⏳ Plano criado. Aguardando processamento do worker (5s)...');

    // 3. Aguardar o worker processar
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 4. Verificar resultados
    const sessoes = await prisma.sessaoTratamento.findMany({
      where: { planoId: plano.id }
    });

    if (sessoes.length === 5) {
      logger.info('✅ SUCESSO: 5 sessões foram geradas corretamente!');
      sessoes.forEach(s => {
        logger.info({ 
          num: s.numeroSessao, 
          data: s.dataHora.toISOString(),
          estado: s.estado 
        }, '  Sessão verificada');
      });
    } else {
      logger.error({ count: sessoes.length }, '❌ FALHA: Número incorreto de sessões geradas');
    }

  } catch (err) {
    logger.error({ err }, '❌ Erro durante o teste');
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

testWorker();
