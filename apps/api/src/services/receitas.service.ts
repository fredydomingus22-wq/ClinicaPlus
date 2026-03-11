import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import type {
  ReceitaCreateInput,
  ReceitaDTO,
  ReceitaListQuery,
  PaginatedResponse,
} from '@clinicaplus/types';
import type { Prisma } from '@prisma/client';

/**
 * Type representing a Receita with its relations (paciente, medico).
 */
type ReceitaWithRelations = Prisma.ReceitaGetPayload<{
  include: { paciente: true; medico: true };
}>;

/**
 * Maps a Prisma Receita record to a ReceitaDTO.
 */
function toReceitaDTO(r: ReceitaWithRelations): ReceitaDTO {
  const dto: ReceitaDTO = {
    id: r.id,
    clinicaId: r.clinicaId,
    agendamentoId: r.agendamentoId,
    pacienteId: r.pacienteId,
    medicoId: r.medicoId,
    diagnostico: r.diagnostico || '',
    medicamentos: r.medicamentos as unknown as ReceitaDTO['medicamentos'],
    observacoes: r.observacoes || null,
    dataEmissao: r.dataEmissao.toISOString(),
    dataValidade: r.dataValidade.toISOString(),
    criadoEm: r.criadoEm.toISOString(),
    atualizadoEm: r.atualizadoEm.toISOString(),
  };

  if (r.paciente) {
    dto.paciente = {
      ...r.paciente,
      utilizadorId: r.paciente.utilizadorId || null,
      tipoSangue: r.paciente.tipoSangue || null,
      telefone: r.paciente.telefone || null,
      email: r.paciente.email || null,
      endereco: r.paciente.endereco || null,
      provincia: r.paciente.provincia || null,
      seguradora: r.paciente.seguradora || null,
      dataNascimento: r.paciente.dataNascimento.toISOString(),
      criadoEm: r.paciente.criadoEm.toISOString(),
      atualizadoEm: r.paciente.atualizadoEm.toISOString(),
    } as any;
  }

  if (r.medico) {
    dto.medico = {
      ...r.medico,
      ordem: r.medico.ordem || null,
      telefoneDireto: r.medico.telefoneDireto || null,
      horario: r.medico.horario as unknown as any,
      criadoEm: r.medico.criadoEm.toISOString(),
      atualizadoEm: r.medico.atualizadoEm.toISOString(),
    } as any;
  }

  return dto;
}

export const receitasService = {
  /**
   * Lists prescriptions for a clinic with filters and pagination.
   */
  async list(
    clinicaId: string,
    query: ReceitaListQuery
  ): Promise<PaginatedResponse<ReceitaDTO>> {
    const { pacienteId, medicoId, valida, page = 1, limit = 20 } = query;

    const where: Prisma.ReceitaWhereInput = {
      clinicaId,
      ...(pacienteId && { pacienteId }),
      ...(medicoId && { medicoId }),
      ...(valida !== undefined && {
        dataValidade: valida ? { gte: new Date() } : { lt: new Date() },
      }),
    };

    const [items, total] = await prisma.$transaction([
      prisma.receita.findMany({
        where,
        include: { paciente: true, medico: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { dataEmissao: 'desc' },
      }),
      prisma.receita.count({ where }),
    ]);

    return { items: items.map(toReceitaDTO), total, page, limit };
  },

  /**
   * Returns prescriptions for a specific patient.
   */
  async getMinhas(utilizadorId: string, clinicaId: string): Promise<ReceitaDTO[]> {
    const paciente = await prisma.paciente.findFirst({
      where: { utilizadorId, clinicaId },
    });

    if (!paciente) return [];

    const items = await prisma.receita.findMany({
      where: { clinicaId, pacienteId: paciente.id },
      include: { paciente: true, medico: true },
      orderBy: { dataEmissao: 'desc' },
    });

    return items.map(toReceitaDTO);
  },

  /**
   * Returns a single prescription by ID, enforcing clinic ownership.
   */
  async getOne(id: string, clinicaId: string): Promise<ReceitaDTO> {
    const r = await prisma.receita.findUnique({ 
      where: { id },
      include: { paciente: true, medico: true },
    });
    if (!r || r.clinicaId !== clinicaId) {
      throw new AppError('Receita não encontrada', 404, 'NOT_FOUND');
    }
    return toReceitaDTO(r);
  },

  /**
   * Creates a new prescription, validating appointment ownership and duplicate prevention.
   */
  async create(data: ReceitaCreateInput, clinicaId: string, medicoId: string): Promise<ReceitaDTO> {
    // 1. Verify appointment exists and belongs to this clinic
    const agendamento = await prisma.agendamento.findUnique({
      where: { id: data.agendamentoId },
    });

    if (!agendamento || agendamento.clinicaId !== clinicaId) {
      throw new AppError('Agendamento não encontrado', 404, 'NOT_FOUND');
    }

    // Resolve Medico ID from Utilizador ID
    const medico = await prisma.medico.findUnique({
      where: { utilizadorId: medicoId },
    });
    
    if (!medico || medico.clinicaId !== clinicaId) {
      throw new AppError('Perfil de médico não encontrado', 404, 'NOT_FOUND');
    }

    if (agendamento.medicoId !== medico.id) {
        throw new AppError('Apenas o médico do agendamento pode emitir a receita', 403, 'FORBIDDEN');
    }

    // 2. Check if appointment already has a prescription
    const existing = await prisma.receita.findUnique({
      where: { agendamentoId: data.agendamentoId },
    });

    if (existing) {
      throw new AppError('Este agendamento já possui uma receita associada', 409, 'CONFLICT');
    }

    // 3. Create Receita
    const res = await prisma.receita.create({
      data: {
        clinicaId,
        agendamentoId: data.agendamentoId,
        pacienteId: agendamento.pacienteId,
        medicoId: agendamento.medicoId,
        diagnostico: data.diagnostico,
        medicamentos: data.medicamentos as any,
        observacoes: data.observacoes ?? null,
        dataValidade: new Date(data.dataValidade),
      },
      include: { paciente: true, medico: true },
    });

    return toReceitaDTO(res as any);
  },
};
