import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { generatePatientNumber } from './patientNumber.service';
import type {
  PacienteCreateInput,
  PacienteUpdateInput,
  PacienteDTO,
  PacienteListQuery,
  PaginatedResponse,
} from '@clinicaplus/types';
import type { Paciente } from '@prisma/client';

/**
 * Maps a Prisma Paciente to a PacienteDTO.
 * Always includes the alergias field, even if empty.
 * Never exposes passwordHash or other internal fields.
 */
function toPacienteDTO(p: Paciente): PacienteDTO {
  return {
    id: p.id,
    clinicaId: p.clinicaId,
    numeroPaciente: p.numeroPaciente,
    utilizadorId: p.utilizadorId,
    nome: p.nome,
    dataNascimento: p.dataNascimento.toISOString(),
    genero: p.genero,
    tipoSangue: p.tipoSangue,
    alergias: p.alergias, // Always included, even if empty []
    telefone: p.telefone,
    email: p.email,
    endereco: p.endereco,
    provincia: p.provincia,
    seguroSaude: p.seguroSaude,
    seguradora: p.seguradora,
    ativo: p.ativo,
    criadoEm: p.criadoEm.toISOString(),
    atualizadoEm: p.atualizadoEm.toISOString(),
  };
}

export const pacientesService = {
  /**
   * Lists patients for a clinic with optional search and pagination.
   */
  async list(
    clinicaId: string,
    query: PacienteListQuery
  ): Promise<PaginatedResponse<PacienteDTO>> {
    const { q, provincia, ativo, page = 1, limit = 20 } = query;

    const where = {
      clinicaId,
      ...(ativo !== undefined && { ativo }),
      ...(provincia && { provincia }),
      ...(q && {
        OR: [
          { nome: { contains: q, mode: 'insensitive' as const } },
          { numeroPaciente: { contains: q, mode: 'insensitive' as const } },
          { email: { contains: q, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [items, total] = await prisma.$transaction([
      prisma.paciente.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nome: 'asc' },
      }),
      prisma.paciente.count({ where }),
    ]);

    return { items: items.map(toPacienteDTO), total, page, limit };
  },

  /**
   * Returns a single patient by id. Enforces clinicaId ownership (cross-tenant safe).
   */
  async getOne(id: string, clinicaId: string): Promise<PacienteDTO> {
    const p = await prisma.paciente.findUnique({ where: { id } });
    if (!p || p.clinicaId !== clinicaId) {
      throw new AppError('Paciente não encontrado', 404, 'NOT_FOUND');
    }
    return toPacienteDTO(p);
  },

  /**
   * Returns the patient record linked to a specific user (for PACIENTE self-access).
   */
  async getOwn(utilizadorId: string, clinicaId: string): Promise<PacienteDTO> {
    const p = await prisma.paciente.findFirst({
      where: { utilizadorId, clinicaId },
    });
    if (!p) {
      throw new AppError('Perfil de paciente não encontrado', 404, 'NOT_FOUND');
    }
    return toPacienteDTO(p);
  },

  /**
   * Creates a new patient, automatically generating a sequential patient number.
   */
  async create(data: PacienteCreateInput, clinicaId: string): Promise<PacienteDTO> {
    const numeroPaciente = await generatePatientNumber(clinicaId);

    const p = await prisma.paciente.create({
      data: {
        clinicaId,
        numeroPaciente,
        nome: data.nome,
        dataNascimento: new Date(data.dataNascimento),
        genero: data.genero,
        tipoSangue: data.tipoSangue ?? null,
        alergias: data.alergias ?? [],
        telefone: data.telefone ?? null,
        email: data.email || null,
        endereco: data.endereco ?? null,
        provincia: data.provincia ?? null,
        seguroSaude: data.seguroSaude ?? false,
        seguradora: data.seguradora ?? null,
        ativo: data.ativo ?? true,
      },
    });

    return toPacienteDTO(p);
  },

  /**
   * Updates a patient record. Validates ownership before updating.
   */
  async update(
    id: string,
    data: PacienteUpdateInput,
    clinicaId: string
  ): Promise<PacienteDTO> {
    // 1. Get existing to find utilizadorId
    const existing = await prisma.paciente.findUnique({ where: { id } });
    if (!existing || existing.clinicaId !== clinicaId) {
      throw new AppError('Paciente não encontrado', 404, 'NOT_FOUND');
    }

    // 2. Build explicit update payload to satisfy exactOptionalPropertyTypes
    const updateData: any = {};
    if (data.nome !== undefined)           updateData.nome = data.nome;
    if (data.dataNascimento !== undefined)  updateData.dataNascimento = new Date(data.dataNascimento);
    if (data.genero !== undefined)          updateData.genero = data.genero;
    if (data.tipoSangue !== undefined)      updateData.tipoSangue = data.tipoSangue ?? null;
    if (data.alergias !== undefined)        updateData.alergias = data.alergias;
    if (data.telefone !== undefined)        updateData.telefone = data.telefone ?? null;
    if (data.email !== undefined)           updateData.email = data.email || null;
    if (data.endereco !== undefined)        updateData.endereco = data.endereco ?? null;
    if (data.provincia !== undefined)       updateData.provincia = data.provincia ?? null;
    if (data.seguroSaude !== undefined)     updateData.seguroSaude = data.seguroSaude;
    if (data.seguradora !== undefined)      updateData.seguradora = data.seguradora ?? null;
    if (data.ativo !== undefined)           updateData.ativo = data.ativo;

    // 3. Execute in transaction to sync Utilizador if needed
    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.paciente.update({ where: { id }, data: updateData });

      // Sync Utilizador if linked
      if (p.utilizadorId && (data.nome !== undefined || data.email !== undefined)) {
        const userUpdate: any = {};
        if (data.nome !== undefined) userUpdate.nome = data.nome;
        if (data.email !== undefined) userUpdate.email = data.email || null;

        await tx.utilizador.update({
          where: { id: p.utilizadorId },
          data: userUpdate,
        });
      }

      return p;
    });

    return toPacienteDTO(updated);
  },
};
