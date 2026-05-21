import { PrismaClient } from '@prisma/client';
import { 
  AnamneseCreateInput, 
  AnamneseUpdateInput,
  AnamneseDTO 
} from '@clinicaplus/types';
import { AppError } from '../lib/AppError';

const prisma = new PrismaClient();

export class AnamneseService {
  /**
   * Cria uma nova anamnese para um paciente e agendamento.
   */
  static async create(clinicaId: string, data: AnamneseCreateInput): Promise<AnamneseDTO> {
    // Verificar se já existe anamnese para este agendamento
    if (data.agendamentoId) {
      const existing = await prisma.anamnese.findFirst({
        where: { 
          clinicaId,
          agendamentoId: data.agendamentoId 
        }
      });

      if (existing) {
        throw new AppError('Já existe uma anamnese para este agendamento', 400);
      }
    }

    return prisma.anamnese.create({
      data: {
        ...data,
        agendamentoId: data.agendamentoId ?? null,
        clinicaId,
      }
    }) as unknown as AnamneseDTO;
  }

  /**
   * Atualiza as respostas de uma anamnese existente.
   */
  static async update(clinicaId: string, id: string, data: AnamneseUpdateInput): Promise<AnamneseDTO> {
    const anamnese = await prisma.anamnese.findFirst({
      where: { id, clinicaId }
    });

    if (!anamnese) {
      throw new AppError('Anamnese não encontrada', 404);
    }

    return prisma.anamnese.update({
      where: { id },
      data: {
        respostas: data.respostas,
        atualizadoEm: new Date(),
      }
    }) as unknown as AnamneseDTO;
  }

  /**
   * Busca anamnese por agendamento.
   */
  static async getByAgendamento(clinicaId: string, agendamentoId: string): Promise<AnamneseDTO | null> {
    return prisma.anamnese.findFirst({
      where: { 
        clinicaId,
        agendamentoId 
      }
    }) as unknown as Promise<AnamneseDTO | null>;
  }

  /**
   * Busca histórico de anamneses do paciente.
   */
  static async getByPaciente(clinicaId: string, pacienteId: string): Promise<AnamneseDTO[]> {
    return prisma.anamnese.findMany({
      where: { 
        clinicaId,
        pacienteId 
      },
      orderBy: { criadoEm: 'desc' },
      include: {
        medico: {
          select: {
            nome: true,
          }
        }
      }
    }) as unknown as AnamneseDTO[];
  }

  /**
   * Busca uma anamnese específica por ID.
   */
  static async getById(clinicaId: string, id: string): Promise<AnamneseDTO> {
    const anamnese = await prisma.anamnese.findFirst({
      where: { id, clinicaId },
      include: {
        paciente: true,
        medico: true,
        agendamento: true,
      }
    });

    if (!anamnese) {
      throw new AppError('Anamnese não encontrada', 404);
    }

    return anamnese as unknown as AnamneseDTO;
  }
}
