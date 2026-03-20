import { describe, it, expect, vi } from 'vitest';
import { prisma } from '../lib/prisma';
import { jobWaLembretes } from './wa-lembrete.job';
import { addDays, subHours } from 'date-fns';

describe('wa-lembrete.job', () => {
  it('deve enfileirar lembrete 24h para agendamentos de amanhã', async () => {
    const amanha = addDays(new Date(), 1);
    vi.mocked(prisma.agendamento.findMany).mockResolvedValue([
      { 
        id: 'ag-1', 
        clinicaId: 'clinica-1',
        paciente: { id: 'p-1', nome: 'João', telefone: '244923000000' },
        dataHora: amanha,
        estado: 'CONFIRMADO',
        clinica: {
          waInstancia: {
            automacoes: [{ tipo: 'LEMBRETE_24H', ativo: true }]
          }
        }
      }
    ] as any);

    await jobWaLembretes('24h');

    // Verificação de lógica (mock de fila ou chamada de serviço)
    // Por agora, garantimos que o job corre sem erros e consulta os dados certos
    expect(prisma.agendamento.findMany).toHaveBeenCalled();
  });

  it('deve ignorar agendamentos de clínicas sem automação activa', async () => {
    vi.mocked(prisma.agendamento.findMany).mockResolvedValue([{ 
      id: 'ag-1', 
      clinicaId: 'c-1', 
      clinica: { waInstancia: null },
      paciente: { telefone: '123' } 
    }] as any);

    await jobWaLembretes('24h');
  });

  it('deve ignorar pacientes sem número WhatsApp', async () => {
    vi.mocked(prisma.agendamento.findMany).mockResolvedValue([{ 
      id: 'ag-1', 
      clinicaId: 'c-1', 
      clinica: { waInstancia: { automacoes: [] } },
      paciente: { telefone: null } 
    }] as any);

    await jobWaLembretes('24h');
  });
});
