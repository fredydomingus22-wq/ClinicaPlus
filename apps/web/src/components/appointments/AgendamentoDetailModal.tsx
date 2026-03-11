import React from 'react';
import { Modal, Badge, StatusBadge } from '@clinicaplus/ui';
import {
  Calendar,
  User,
  Stethoscope,
  AlertTriangle,
  XCircle,
  FileText,
  Activity,
  Heart,
  Thermometer,
  Scale,
  Clipboard,
} from 'lucide-react';
import { formatDate, formatTime } from '@clinicaplus/utils';
import type { AgendamentoDTO } from '@clinicaplus/types';

interface AgendamentoDetailModalProps {
  agendamento: AgendamentoDTO | null;
  onClose: () => void;
}

const TIPO_LABEL: Record<string, string> = {
  CONSULTA: 'Consulta',
  EXAME: 'Exame',
  RETORNO: 'Retorno',
};

const URGENCIA_CONFIG: Record<string, { label: string; className: string }> = {
  NORMAL: { label: 'Normal', className: 'bg-success-50 text-success-700 border-success-200' },
  URGENTE: { label: 'Urgente', className: 'bg-warning-50 text-warning-700 border-warning-200' },
  MUITO_URGENTE: { label: 'Muito Urgente', className: 'bg-danger-50 text-danger-700 border-danger-200' },
};

/** Section header for the detail modal */
function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-neutral-500" />
      <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">{title}</p>
    </div>
  );
}

/** Single info row: label + value */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-neutral-600">{label}</p>
      <p className="text-sm font-medium text-neutral-900">{value || '—'}</p>
    </div>
  );
}

/**
 * AgendamentoDetailModal
 * Rich detail view for an appointment, shown to admin, medico and recepcao roles.
 * Highlights cancellation reason when estado = CANCELADO.
 */
export function AgendamentoDetailModal({ agendamento, onClose }: AgendamentoDetailModalProps) {
  if (!agendamento) return null;

  const isCancelado = agendamento.estado === 'CANCELADO';
  const triagem = agendamento.triagem;
  const temDadosClinicosConsulta = agendamento.notasConsulta || agendamento.diagnostico;
  const temReceita = !!agendamento.receita;

  return (
    <Modal
      isOpen={!!agendamento}
      onClose={onClose}
      title="Detalhes do Agendamento"
      size="lg"
    >
      <div className="space-y-6 mt-1">

        {/* ── CANCELLATION ALERT ── */}
        {isCancelado && (
          <div className="flex items-start gap-3 p-4 bg-danger-50 border border-danger-200 rounded-xl">
            <XCircle className="w-5 h-5 text-danger-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-danger-800">Agendamento Cancelado</p>
              {agendamento.observacoes ? (
                <p className="text-sm text-danger-700 mt-1">
                  <span className="font-medium">Motivo: </span>{agendamento.observacoes}
                </p>
              ) : (
                <p className="text-xs text-danger-500 italic mt-1">Motivo não especificado.</p>
              )}
              {agendamento.canceladoEm && (
                <p className="text-xs text-danger-400 mt-1">
                  Cancelado em {formatDate(new Date(agendamento.canceladoEm))} às {formatTime(new Date(agendamento.canceladoEm))}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── HEADER INFO ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: appointment info */}
          <div className="space-y-4">
            <SectionHeader icon={Calendar} title="Agendamento" />
            <div className="grid grid-cols-2 gap-3">
              <InfoRow
                label="Data"
                value={formatDate(new Date(agendamento.dataHora))}
              />
              <InfoRow
                label="Hora"
                value={formatTime(new Date(agendamento.dataHora))}
              />
              <InfoRow
                label="Tipo"
                value={TIPO_LABEL[agendamento.tipo] ?? agendamento.tipo}
              />
              <InfoRow
                label="Duração"
                value={`${agendamento.duracao} min`}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">Estado:</span>
              <StatusBadge estado={agendamento.estado} />
              {temReceita && (
                <Badge variant="success" className="text-xs">Receita Emitida</Badge>
              )}
            </div>
            {agendamento.motivoConsulta && (
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                <p className="text-xs text-neutral-500 mb-1">Motivo da Consulta</p>
                <p className="text-sm text-neutral-700 italic">"{agendamento.motivoConsulta}"</p>
              </div>
            )}
          </div>

          {/* Right: patient + doctor */}
          <div className="space-y-4">
            <SectionHeader icon={User} title="Paciente" />
            <div className="grid grid-cols-1 gap-2">
              <InfoRow label="Nome" value={agendamento.paciente?.nome} />
              <InfoRow label="Nº Paciente" value={agendamento.paciente?.numeroPaciente} />
              <InfoRow label="Telefone" value={agendamento.paciente?.telefone} />
            </div>
            {agendamento.paciente?.alergias && agendamento.paciente.alergias.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-danger-50 rounded-lg border border-danger-100">
                <AlertTriangle className="w-4 h-4 text-danger-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-danger-700">Alergias</p>
                  <p className="text-xs text-danger-600">{agendamento.paciente.alergias.join(', ')}</p>
                </div>
              </div>
            )}
            <div className="pt-2 border-t border-neutral-100">
              <SectionHeader icon={Stethoscope} title="Médico" />
              <div className="grid grid-cols-1 gap-1">
                <InfoRow label="Nome" value={`Dr(a). ${agendamento.medico?.nome}`} />
                <InfoRow label="Especialidade" value={agendamento.medico?.especialidade?.nome} />
              </div>
            </div>
          </div>
        </div>

        {/* ── TRIAGEM ── */}
        {triagem && (
          <div className="border-t border-neutral-100 pt-5">
            <SectionHeader icon={Activity} title="Dados de Triagem" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {triagem.pa && (
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-center">
                  <Heart className="w-4 h-4 text-danger-500 mx-auto mb-1" />
                  <p className="text-base font-bold text-neutral-900">{triagem.pa}</p>
                  <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Pressão</p>
                </div>
              )}
              {triagem.temperatura && (
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-center">
                  <Thermometer className="w-4 h-4 text-warning-500 mx-auto mb-1" />
                  <p className="text-base font-bold text-neutral-900">{triagem.temperatura}°C</p>
                  <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Temperatura</p>
                </div>
              )}
              {triagem.peso && (
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-center">
                  <Scale className="w-4 h-4 text-primary-500 mx-auto mb-1" />
                  <p className="text-base font-bold text-neutral-900">{triagem.peso} kg</p>
                  <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Peso</p>
                </div>
              )}
              {triagem.frequenciaCardiaca && (
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-center">
                  <Activity className="w-4 h-4 text-success-500 mx-auto mb-1" />
                  <p className="text-base font-bold text-neutral-900">{triagem.frequenciaCardiaca} bpm</p>
                  <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Frequência</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {triagem.imc && (
                <div className="text-sm text-neutral-600">
                  <span className="font-medium">IMC:</span> {triagem.imc}
                </div>
              )}
              {triagem.altura && (
                <div className="text-sm text-neutral-600">
                  <span className="font-medium">Altura:</span> {triagem.altura} cm
                </div>
              )}
              {triagem.urgencia && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${URGENCIA_CONFIG[triagem.urgencia]?.className ?? ''}`}>
                  {URGENCIA_CONFIG[triagem.urgencia]?.label ?? triagem.urgencia}
                </span>
              )}
            </div>
            {triagem.sintomas && triagem.sintomas.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-neutral-600 mb-1.5">Sintomas Referidos</p>
                <div className="flex flex-wrap gap-1.5">
                  {triagem.sintomas.map((s, i) => (
                    <Badge key={i} variant="neutral" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CLINICAL NOTES ── */}
        {temDadosClinicosConsulta && (
          <div className="border-t border-neutral-100 pt-5 space-y-3">
            <SectionHeader icon={FileText} title="Notas da Consulta" />
            {agendamento.diagnostico && (
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <p className="text-xs font-bold text-neutral-600 mb-1">Diagnóstico</p>
                <p className="text-sm text-neutral-800">{agendamento.diagnostico}</p>
              </div>
            )}
            {agendamento.notasConsulta && (
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <p className="text-xs font-bold text-neutral-600 mb-1">Notas do Médico</p>
                <p className="text-sm text-neutral-700 whitespace-pre-wrap">{agendamento.notasConsulta}</p>
              </div>
            )}
          </div>
        )}

        {/* ── GENERAL OBSERVATIONS ── */}
        {agendamento.observacoes && !isCancelado && (
          <div className="border-t border-neutral-100 pt-5">
            <SectionHeader icon={Clipboard} title="Observações" />
            <p className="text-sm text-neutral-700 italic">{agendamento.observacoes}</p>
          </div>
        )}

        {/* ── TIMESTAMPS ── */}
        <div className="border-t border-neutral-100 pt-3 flex gap-6 text-xs text-neutral-400">
          <span>Criado em {formatDate(new Date(agendamento.criadoEm))}</span>
          <span>Actualizado em {formatDate(new Date(agendamento.atualizadoEm))}</span>
        </div>

      </div>
    </Modal>
  );
}
