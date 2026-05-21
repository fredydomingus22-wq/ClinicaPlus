import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { EstadoExame } from '@prisma/client';
import { supabase } from '../lib/supabase';
import { config } from '../lib/config';

const TRANSICOES_EXAME: Record<EstadoExame, EstadoExame[]> = {
  PENDENTE: ['AGENDADO', 'CANCELADO'],
  AGENDADO: ['REALIZADO', 'CANCELADO'],
  REALIZADO: ['LAUDADO'],
  LAUDADO: [],
  CANCELADO: [],
};

function assertExameTransicaoValida(actual: EstadoExame, destino: EstadoExame): void {
  const validas = TRANSICOES_EXAME[actual];
  if (!validas.includes(destino)) {
    throw new AppError(`Não é possível passar de "${actual}" para "${destino}"`, 400);
  }
}

export const examesService = {
  /**
   * Lists exams for a patient, handling legacy data mappings.
   */
  async listByPaciente(clinicaId: string, pacienteId: string): Promise<unknown[]> {
    const records = await prisma.exame.findMany({
      where: { clinicaId, pacienteId },
      include: { 
        tipoCatalogo: true,
        medico: { select: { id: true, nome: true } }
      },
      orderBy: { criadoEm: 'desc' },
    });

    return records.map(r => ({
      ...r,
      nome: r.tipoCatalogo?.nome || r.nome,
      tipo: r.tipoCatalogo ? 'CATALOGO' : r.tipo,
      estado: r.estado, 
      dataPedido: r.dataPedido.toISOString(),
      dataRealizacao: r.dataRealizacao?.toISOString() || null,
      dataResultado: r.dataResultado?.toISOString() || null,
      criadoEm: r.criadoEm.toISOString(),
      atualizadoEm: r.atualizadoEm.toISOString(),
    }));
  },

  /**
   * Lists all exams for a clinic with optional filters.
   */
  async listAll(clinicaId: string, filters: { estado?: string; q?: string }): Promise<unknown[]> {
    const records = await prisma.exame.findMany({
      where: { 
        clinicaId,
        ...(filters.estado ? { estado: filters.estado as EstadoExame } : {}),
        ...(filters.q ? {
          OR: [
            { paciente: { nome: { contains: filters.q, mode: 'insensitive' } } },
            { tipoCatalogo: { nome: { contains: filters.q, mode: 'insensitive' } } },
            { nome: { contains: filters.q, mode: 'insensitive' } }
          ]
        } : {})
      },
      include: { 
        tipoCatalogo: true,
        paciente: { select: { id: true, nome: true, numeroPaciente: true } }
      },
      orderBy: { criadoEm: 'desc' },
    });

    return records.map(r => ({
      ...r,
      nome: r.tipoCatalogo?.nome || r.nome,
      dataPedido: r.dataPedido.toISOString(),
      criadoEm: r.criadoEm.toISOString(),
      atualizadoEm: r.atualizadoEm.toISOString(),
    }));
  },

  /**
   * Creates a new exam request using the new catalog or free text (legacy support).
   */
  async create(clinicaId: string, data: Record<string, unknown>): Promise<unknown> {
    const record = await prisma.exame.create({
      data: {
        clinicaId,
        pacienteId: data.pacienteId as string,
        medicoId: data.medicoId as string,
        agendamentoId: (data.agendamentoId as string) ?? null,
        tipoExameId: (data.tipoExameId as string) ?? null,
        nome: (data.nome as string) || 'Exame s/ nome', // Fallback para legados
        descricao: data.descricao as string,
        estado: 'PENDENTE',
      },
      include: { tipoCatalogo: true }
    });

    return {
      ...record,
      dataPedido: record.dataPedido.toISOString(),
      criadoEm: record.criadoEm.toISOString(),
      atualizadoEm: record.atualizadoEm.toISOString(),
    };
  },

  /**
   * Updates an exam (patch), enforcing state machine rules.
   */
  async update(clinicaId: string, id: string, data: Record<string, unknown>): Promise<unknown> {
    const current = await prisma.exame.findUnique({
      where: { id, clinicaId }
    });

    if (!current) throw new AppError('Exame não encontrado', 404);

    // Validação de transição de estado
    if (data.estado) {
      assertExameTransicaoValida(current.estado, data.estado as EstadoExame);
    }

    const updated = await prisma.exame.update({
      where: { id, clinicaId },
      data: {
        ...(data as Record<string, unknown>),
        // Se mudar para REALIZADO, seta a data se não enviada
        dataRealizacao: data.estado === 'REALIZADO' && !data.dataRealizacao ? new Date() : (data.dataRealizacao as Date),
      },
      include: { tipoCatalogo: true }
    });

    return {
      ...updated,
      dataPedido: updated.dataPedido.toISOString(),
      dataRealizacao: updated.dataRealizacao?.toISOString() || null,
      dataResultado: updated.dataResultado?.toISOString() || null,
      criadoEm: updated.criadoEm.toISOString(),
      atualizadoEm: updated.atualizadoEm.toISOString(),
    };
  },

  /**
   * Gera uma Signed URL para upload seguro diretamente para o Supabase.
   */
  async getLaudoUploadUrl(clinicaId: string, id: string, fileName: string): Promise<{ uploadUrl: string; path: string }> {
    const exame = await prisma.exame.findUnique({ where: { id, clinicaId } });
    if (!exame) throw new AppError('Exame não encontrado', 404);

    const ext = fileName.split('.').pop() || 'pdf';
    const path = `${clinicaId}/exames/${id}/laudo_${Date.now()}.${ext}`;

    const { data: uploadData, error } = await supabase.storage
      .from(config.SUPABASE_LAUDOS_BUCKET)
      .createSignedUploadUrl(path);

    if (error || !uploadData) {
      throw new AppError('Erro ao gerar URL de upload', 500);
    }

    return { uploadUrl: uploadData.signedUrl, path };
  },

  /**
   * Confirma o upload do laudo e avança o estado para LAUDADO.
   */
  async confirmLaudo(clinicaId: string, id: string, path: string): Promise<unknown> {
    // Verificar se o arquivo realmente existe no Supabase
    const { data, error } = await supabase.storage
      .from(config.SUPABASE_LAUDOS_BUCKET)
      .list(path.substring(0, path.lastIndexOf('/')), {
        search: path.split('/').pop() || ''
      });

    if (error || !data || data.length === 0) {
      throw new AppError('Arquivo não encontrado no storage', 400);
    }

    const { data: publicUrlData } = supabase.storage
      .from(config.SUPABASE_LAUDOS_BUCKET)
      .getPublicUrl(path);

    return this.update(clinicaId, id, {
      laudoUrl: publicUrlData.publicUrl,
      estado: 'LAUDADO' as EstadoExame,
      dataResultado: new Date()
    });
  }
};
