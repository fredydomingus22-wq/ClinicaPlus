import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import type { 
  ProntuarioDTO, 
  ProntuarioCreateInput,
} from '@clinicaplus/types';

export const prontuariosService = {
  /**
   * Lists medical records for a patient.
   */
  async listByPaciente(clinicaId: string, pacienteId: string): Promise<ProntuarioDTO[]> {
    const records = await prisma.prontuario.findMany({
      where: { clinicaId, pacienteId },
      orderBy: { criadoEm: 'desc' },
    });

    return records.map(r => ({
      ...r,
      criadoEm: r.criadoEm.toISOString(),
      atualizadoEm: r.atualizadoEm.toISOString(),
    } as ProntuarioDTO));
  },

  /**
   * Creates a new medical record entry.
   */
  async create(clinicaId: string, data: ProntuarioCreateInput): Promise<ProntuarioDTO> {
    const record = await prisma.prontuario.create({
      data: {
        clinicaId,
        pacienteId: data.pacienteId,
        medicoId: data.medicoId,
        agendamentoId: data.agendamentoId ?? null,
        notas: data.notas,
        diagnostico: data.diagnostico ?? null,
      }
    });

    return {
      ...record,
      criadoEm: record.criadoEm.toISOString(),
      atualizadoEm: record.atualizadoEm.toISOString(),
    } as ProntuarioDTO;
  },

  /**
   * Gets a specific medical record.
   */
  async getOne(id: string, clinicaId: string): Promise<ProntuarioDTO> {
    const record = await prisma.prontuario.findUnique({
      where: { id }
    });

    if (!record || record.clinicaId !== clinicaId) {
      throw new AppError('Prontuário não encontrado', 404, 'NOT_FOUND');
    }

    return {
      ...record,
      criadoEm: record.criadoEm.toISOString(),
      atualizadoEm: record.atualizadoEm.toISOString(),
    } as ProntuarioDTO;
  }
};
