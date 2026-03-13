import { prisma } from '../lib/prisma';
import { TipoExame } from '@prisma/client';
import type { 
  ExameDTO, 
  ExameCreateInput,
} from '@clinicaplus/types';

export const examesService = {
  /**
   * Lists exams for a patient.
   */
  async listByPaciente(clinicaId: string, pacienteId: string): Promise<ExameDTO[]> {
    const records = await prisma.exame.findMany({
      where: { clinicaId, pacienteId },
      orderBy: { criadoEm: 'desc' },
    });

    return records.map(r => ({
      ...r,
      tipo: r.tipo as string,
      dataPedido: r.dataPedido.toISOString(),
      dataResultado: r.dataResultado?.toISOString() || null,
      criadoEm: r.criadoEm.toISOString(),
      atualizadoEm: r.atualizadoEm.toISOString(),
    } as ExameDTO));
  },

  /**
   * Creates a new exam request.
   */
  async create(clinicaId: string, data: ExameCreateInput): Promise<ExameDTO> {
    const record = await prisma.exame.create({
      data: {
        clinicaId,
        pacienteId: data.pacienteId,
        medicoId: data.medicoId,
        agendamentoId: data.agendamentoId ?? null,
        nome: data.nome,
        tipo: data.tipo as TipoExame,
      }
    });

    return {
      ...record,
      tipo: record.tipo as string,
      dataPedido: record.dataPedido.toISOString(),
      dataResultado: record.dataResultado?.toISOString() || null,
      criadoEm: record.criadoEm.toISOString(),
      atualizadoEm: record.atualizadoEm.toISOString(),
    } as ExameDTO;
  }
};
