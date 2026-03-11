import React, { useState } from 'react';
import { 
  Button, 
  Card, 
  Badge, 
  Spinner,
  Modal,
  ErrorMessage
} from '@clinicaplus/ui';
import { 
  Calendar, 
  Clock, 
  Stethoscope, 
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { useMeusAgendamentos, useUpdateEstadoAgendamento } from '../../hooks/useAgendamentos';
import { formatDate, formatTime } from '@clinicaplus/utils';
import { EstadoAgendamento, type AgendamentoDTO } from '@clinicaplus/types';

export default function MeusAgendamentosPage() {
  const [activeTab, setActiveTab] = useState<'proximos' | 'historico'>('proximos');
  const [agendamentoToCancel, setAgendamentoToCancel] = useState<AgendamentoDTO | null>(null);
  
  const { data, isLoading, error } = useMeusAgendamentos();
  const cancelMutation = useUpdateEstadoAgendamento();

  const proximos = data?.items?.filter(a => 
    [EstadoAgendamento.PENDENTE, EstadoAgendamento.CONFIRMADO, EstadoAgendamento.EM_PROGRESSO].includes(a.estado)
  ) || [];

  const historico = data?.items?.filter(a => 
    [EstadoAgendamento.CONCLUIDO, EstadoAgendamento.CANCELADO, EstadoAgendamento.NAO_COMPARECEU].includes(a.estado)
  ) || [];

  const handleCancel = async (motivo: string) => {
    if (!agendamentoToCancel) return;
    try {
      await cancelMutation.mutateAsync({ 
        id: agendamentoToCancel.id, 
        estado: EstadoAgendamento.CANCELADO,
        motivo,
      });
      setAgendamentoToCancel(null);
    } catch {
      // Error handled by mutation
    }
  };

  const activeAgendamentos = activeTab === 'proximos' ? proximos : historico;

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Meus Agendamentos</h1>
          <p className="text-neutral-500">Acompanhe as suas consultas e histórico clínico.</p>
        </div>
      </div>

      {/* Custom Tabs */}
      <div className="flex p-1 bg-neutral-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('proximos')}
          className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'proximos' 
            ? 'bg-white text-primary-700 shadow-sm' 
            : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Próximos ({proximos.length})
        </button>
        <button
          onClick={() => setActiveTab('historico')}
          className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'historico' 
            ? 'bg-white text-primary-700 shadow-sm' 
            : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Histórico ({historico.length})
        </button>
      </div>

      {error ? (
        <ErrorMessage error={error} />
      ) : activeAgendamentos.length === 0 ? (
        <Card className="p-20 text-center border-dashed bg-neutral-50/50">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-neutral-300" />
          </div>
          <p className="text-neutral-500 font-medium">Nenhum agendamento encontrado nesta categoria.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {activeAgendamentos.map((ag) => (
            <Card key={ag.id} className="p-0 overflow-hidden hover:border-neutral-300 transition-colors">
              <div className="p-5 flex flex-col md:flex-row md:items-center gap-6">
                {/* Date/Time Column */}
                <div className="flex md:flex-col items-center md:items-start gap-4 md:gap-1 shrink-0 min-w-[140px]">
                  <p className="text-sm font-bold text-primary-600 uppercase tracking-tight">{formatDate(new Date(ag.dataHora))}</p>
                  <div className="flex items-center gap-2 text-neutral-900">
                    <Clock className="w-4 h-4 text-neutral-400" />
                    <p className="text-xl font-black">{formatTime(new Date(ag.dataHora))}</p>
                  </div>
                </div>

                {/* Doctor/Clinic Column */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-neutral-900 text-lg truncate flex items-center gap-2">
                       Dr(a). {ag.medico?.nome}
                    </h4>
                    <Badge variant={
                      ag.estado === 'CONFIRMADO' ? 'success' :
                      ag.estado === 'PENDENTE' ? 'warning' :
                      ag.estado === 'EM_PROGRESSO' ? 'info' : 'neutral'
                    }>
                      {ag.estado}
                    </Badge>
                  </div>
                  <p className="text-sm text-neutral-500 font-medium flex items-center gap-2">
                    <Stethoscope className="w-4 h-4" /> {ag.medico?.especialidade?.nome}
                  </p>
                  {ag.motivoConsulta && (
                    <p className="mt-2 text-xs text-neutral-400 line-clamp-1 italic">
                      "{ag.motivoConsulta}"
                    </p>
                  )}
                </div>

                {/* Actions Column */}
                <div className="flex items-center justify-end gap-2 shrink-0">
                  {(ag.estado === EstadoAgendamento.PENDENTE || ag.estado === EstadoAgendamento.CONFIRMADO) && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-danger-600 hover:bg-danger-50"
                      onClick={() => setAgendamentoToCancel(ag)}
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Cancelar
                    </Button>
                  )}
                  <Button variant="secondary" size="sm">
                    Ver Detalhes
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <CancelModal
        agendamento={agendamentoToCancel}
        onClose={() => setAgendamentoToCancel(null)}
        onConfirm={handleCancel}
        isPending={cancelMutation.isPending}
      />
    </div>
  );
}

// ── Cancel Modal Component ─────────────────────────────────────────────────────

const CANCEL_REASONS = [
  'Conflito de horário',
  'Já fui atendido noutro local',
  'Motivos pessoais',
  'O médico não está disponível',
  'Outro motivo',
];

interface CancelModalProps {
  agendamento: AgendamentoDTO | null;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
  isPending: boolean;
}

function CancelModal({ agendamento, onClose, onConfirm, isPending }: CancelModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customText, setCustomText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isOutro = selectedReason === 'Outro motivo';
  const isValid = selectedReason !== '' && (!isOutro || customText.trim().length > 0);

  const handleClose = () => {
    setSelectedReason('');
    setCustomText('');
    setSubmitted(false);
    onClose();
  };

  const handleConfirm = () => {
    setSubmitted(true);
    if (!isValid) return;
    const motivo = isOutro
      ? customText.trim()
      : selectedReason + (customText.trim() ? ` — ${customText.trim()}` : '');
    onConfirm(motivo);
    setSelectedReason('');
    setCustomText('');
    setSubmitted(false);
  };

  return (
    <Modal
      isOpen={!!agendamento}
      onClose={handleClose}
      title="Cancelar Agendamento"
      size="md"
    >
      <div className="space-y-6">
        {/* Warning banner */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-800">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-bold">Tem a certeza que deseja cancelar?</p>
            <p className="opacity-80">Esta ação irá libertar o horário para outros pacientes. Dr(a). {agendamento?.medico?.nome} ({agendamento?.medico?.especialidade?.nome}) será notificado.</p>
          </div>
        </div>

        {/* Reason selector */}
        <div>
          <p className="text-sm font-semibold text-neutral-700 mb-3">
            Motivo do cancelamento <span className="text-danger-500">*</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {CANCEL_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => setSelectedReason(reason)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  selectedReason === reason
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-primary-300 hover:text-primary-700'
                }`}
              >
                {reason}
              </button>
            ))}
          </div>
          {submitted && !selectedReason && (
            <p className="mt-2 text-xs text-danger-600">Por favor selecione um motivo.</p>
          )}
        </div>

        {/* Free-text area */}
        <div>
          <label className="text-sm font-semibold text-neutral-700 block mb-1.5">
            {isOutro ? (
              <>Descreva o motivo <span className="text-danger-500">*</span></>
            ) : (
              <span className="font-normal text-neutral-500">Informação adicional (opcional)</span>
            )}
          </label>
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Escreva por palavras suas..."
            className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none transition"
          />
          {submitted && isOutro && !customText.trim() && (
            <p className="mt-1 text-xs text-danger-600">Por favor descreva o motivo.</p>
          )}
          <p className="mt-1 text-xs text-neutral-400 text-right">{customText.length}/500</p>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-neutral-100">
          <Button variant="ghost" onClick={handleClose}>Manter Consulta</Button>
          <Button 
            variant="danger" 
            onClick={handleConfirm}
            loading={isPending}
          >
            Confirmar Cancelamento
          </Button>
        </div>
      </div>
    </Modal>
  );
}
