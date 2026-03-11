import { prisma } from '../lib/prisma';
import type { 
  DocumentoDTO, 
  DocumentoCreateInput 
} from '@clinicaplus/types';

export const documentosService = {
  /**
   * Lists documents for a patient.
   */
  async listByPaciente(clinicaId: string, pacienteId: string): Promise<DocumentoDTO[]> {
    const records = await prisma.documento.findMany({
      where: { clinicaId, pacienteId },
      orderBy: { criadoEm: 'desc' },
    });

    return records.map(r => ({
      ...r,
      tipo: r.tipo as string,
      criadoEm: r.criadoEm.toISOString(),
    } as DocumentoDTO));
  },

  /**
   * Adds a document reference.
   */
  async create(clinicaId: string, data: DocumentoCreateInput): Promise<DocumentoDTO> {
    const record = await prisma.documento.create({
      data: {
        clinicaId,
        pacienteId: data.pacienteId,
        medicoId: data.medicoId ?? null,
        agendamentoId: data.agendamentoId ?? null,
        tipo: data.tipo as any, // Cast to any because Prisma enum type mismatch with string
        nome: data.nome,
        url: data.url,
      }
    });

    return {
      ...record,
      tipo: record.tipo as string,
      criadoEm: record.criadoEm.toISOString(),
    } as DocumentoDTO;
  }
};
