import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import type { Prisma } from '@prisma/client';
import type {
  OdontogramaCreateInput,
  OdontogramaDTO,
  OdontogramaMarcacao,
  OdontogramaUpdateInput,
} from '@clinicaplus/types';
import { OdontogramaMarcacaoSchema } from '@clinicaplus/types';

function toDto(record: {
  id: string;
  clinicaId: string;
  pacienteId: string;
  medicoId: string;
  agendamentoId: string;
  marcacoes: unknown;
  criadoEm: Date;
  atualizadoEm: Date;
}): OdontogramaDTO {
  const raw = Array.isArray(record.marcacoes) ? record.marcacoes : [];
  const marcacoes = raw.map((m) => OdontogramaMarcacaoSchema.parse(m));

  return {
    id: record.id,
    clinicaId: record.clinicaId,
    pacienteId: record.pacienteId,
    medicoId: record.medicoId,
    agendamentoId: record.agendamentoId,
    marcacoes,
    criadoEm: record.criadoEm.toISOString(),
    atualizadoEm: record.atualizadoEm.toISOString(),
  };
}

type OdontogramaListRecord = Prisma.OdontogramaGetPayload<{
  include: {
    paciente: {
      select: {
        id: true;
        nome: true;
      };
    };
    agendamento: {
      select: {
        id: true;
        dataHora: true;
      };
    };
  };
}>;

async function assertAgendamentoContext(
  clinicaId: string,
  agendamentoId: string,
  pacienteId: string,
  medicoId: string,
): Promise<void> {
  const agendamento = await prisma.agendamento.findFirst({
    where: { id: agendamentoId, clinicaId },
  });

  if (!agendamento) {
    throw new AppError('Agendamento não encontrado', 404, 'AGENDAMENTO_NOT_FOUND');
  }

  if (agendamento.pacienteId !== pacienteId) {
    throw new AppError('Paciente não corresponde ao agendamento', 400, 'PACIENTE_MISMATCH');
  }

  if (agendamento.medicoId !== medicoId) {
    throw new AppError('Médico não corresponde ao agendamento', 403, 'MEDICO_MISMATCH');
  }
}

export class OdontogramaService {
  static async create(clinicaId: string, data: OdontogramaCreateInput): Promise<OdontogramaDTO> {
    await assertAgendamentoContext(clinicaId, data.agendamentoId, data.pacienteId, data.medicoId);

    const existing = await prisma.odontograma.findFirst({
      where: { clinicaId, agendamentoId: data.agendamentoId },
    });

    if (existing) {
      const updated = await prisma.odontograma.update({
        where: { id: existing.id },
        data: {
          marcacoes: data.marcacoes as object,
          atualizadoEm: new Date(),
        },
      });
      return toDto(updated);
    }

    const created = await prisma.odontograma.create({
      data: {
        clinicaId,
        pacienteId: data.pacienteId,
        medicoId: data.medicoId,
        agendamentoId: data.agendamentoId,
        marcacoes: data.marcacoes as object,
      },
    });

    return toDto(created);
  }

  static async update(clinicaId: string, id: string, data: OdontogramaUpdateInput): Promise<OdontogramaDTO> {
    const existing = await prisma.odontograma.findFirst({
      where: { id, clinicaId },
    });

    if (!existing) {
      throw new AppError('Odontograma não encontrado', 404, 'ODONTOGRAMA_NOT_FOUND');
    }

    const updated = await prisma.odontograma.update({
      where: { id },
      data: {
        marcacoes: data.marcacoes as object,
        atualizadoEm: new Date(),
      },
    });

    return toDto(updated);
  }

  static async getByAgendamento(clinicaId: string, agendamentoId: string): Promise<OdontogramaDTO | null> {
    const record = await prisma.odontograma.findFirst({
      where: { clinicaId, agendamentoId },
    });

    return record ? toDto(record) : null;
  }

  static async getByPaciente(clinicaId: string, pacienteId: string): Promise<OdontogramaDTO[]> {
    const records = await prisma.odontograma.findMany({
      where: { clinicaId, pacienteId },
      orderBy: { criadoEm: 'desc' },
    });

    return records.map(toDto);
  }

  static async list(clinicaId: string, pacienteId?: string, limit?: number): Promise<OdontogramaDTO[]> {
    const where: { clinicaId: string; pacienteId?: string } = { clinicaId };
    if (pacienteId) {
      where.pacienteId = pacienteId;
    }

    const findManyArgs = {
      where,
      orderBy: { criadoEm: 'desc' },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
          },
        },
        agendamento: {
          select: {
            id: true,
            dataHora: true,
          },
        },
      },
      ...(limit !== undefined ? { take: limit } : {}),
    } satisfies Prisma.OdontogramaFindManyArgs;

    const records = await prisma.odontograma.findMany(findManyArgs) as OdontogramaListRecord[];

    return records.map((record) => ({
      ...toDto(record),
      paciente: record.paciente,
      agendamento: record.agendamento,
    }));
  }

  static async getById(clinicaId: string, id: string): Promise<OdontogramaDTO> {
    const record = await prisma.odontograma.findFirst({
      where: { id, clinicaId },
    });

    if (!record) {
      throw new AppError('Odontograma não encontrado', 404, 'ODONTOGRAMA_NOT_FOUND');
    }

    return toDto(record);
  }

  /** Substitui ou insere uma marcação por par dente+face */
  static mergeMarcacao(
    marcacoes: OdontogramaMarcacao[],
    nova: OdontogramaMarcacao,
  ): OdontogramaMarcacao[] {
    const parsed = OdontogramaMarcacaoSchema.parse(nova);
    const filtered = marcacoes.filter(
      (m) => !(m.numeroDente === parsed.numeroDente && m.face === parsed.face),
    );
    if (parsed.status === 'SAUDAVEL') {
      return filtered;
    }
    return [...filtered, parsed];
  }
}
