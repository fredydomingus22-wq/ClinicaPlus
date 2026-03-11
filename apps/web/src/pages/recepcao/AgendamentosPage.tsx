import React, { useState, useMemo } from 'react';
import { useListaAgendamentos, useUpdateEstadoAgendamento } from '../../hooks/useAgendamentos';
import { useMedicos } from '../../hooks/useMedicos';
import { 
  Button, 
  Card, 
  Table, 
  StatusBadge, 
  Select, 
  Modal,
  ErrorMessage
} from '@clinicaplus/ui';
import { 
  Plus, 
  Search,
  Eye,
  Check
} from 'lucide-react';
import { formatTime, formatDate } from '@clinicaplus/utils';
import { BookingWizard } from '../../components/appointments/BookingWizard';
import { PatientDetailPanel } from './PatientDetailPanel';
import { EstadoAgendamento, AgendamentoDTO } from '@clinicaplus/types';
import { AgendamentoDetailModal } from '../../components/appointments/AgendamentoDetailModal';

export default function AgendamentosPage() {
  const [page, setPage] = useState(1);
  const [medicoId, setMedicoId] = useState('');
  const [estado, setEstado] = useState<string>('');
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [selectedPacienteId, setSelectedPacienteId] = useState<string | null>(null);
  const [selectedAgendamento, setSelectedAgendamento] = useState<AgendamentoDTO | null>(null);

  // Note: We need a way to select a patient first in the receptionist flow
  // Before opening BookingWizard. For simplicity, let's assume we might need 
  // a "Select Patient" step or similar.

  const { data, isLoading, error } = useListaAgendamentos({
    page,
    limit: 10,
    medicoId: medicoId || undefined,
    estado: (estado as EstadoAgendamento) || undefined,
  });

  const updateEstado = useUpdateEstadoAgendamento();

  const { data: medicosData } = useMedicos({ page: 1, limit: 100, ativo: true });

  const medicosOptions = useMemo(() => [
    { value: '', label: 'Todos os Médicos' },
    ...(medicosData?.items?.map(m => ({ value: m.id, label: m.nome })) || [])
  ], [medicosData]);

  const estadoOptions = [
    { value: '', label: 'Todos os Estados' },
    { value: 'PENDENTE', label: 'Pendente' },
    { value: 'CONFIRMADO', label: 'Confirmado' },
    { value: 'EM_PROGRESSO', label: 'Em Progresso' },
    { value: 'CONCLUIDO', label: 'Concluído' },
    { value: 'CANCELADO', label: 'Cancelado' },
    { value: 'NAO_COMPARECEU', label: 'Não Compareceu' },
  ];

  const columns = [
    { 
      header: 'Data/Hora', 
      accessor: (ag: AgendamentoDTO) => (
        <div>
          <p className="font-semibold text-neutral-900">{formatDate(ag.dataHora)}</p>
          <p className="text-xs text-neutral-600">{formatTime(ag.dataHora)}</p>
        </div>
      )
    },
    { 
      header: 'Paciente', 
      accessor: (ag: AgendamentoDTO) => (
        <div>
          <p className="font-medium text-neutral-900">{ag.paciente?.nome}</p>
          <p className="text-xs text-neutral-600">{ag.paciente?.numeroPaciente}</p>
        </div>
      )
    },
    { 
      header: 'Médico', 
      accessor: (ag: AgendamentoDTO) => `Dr(a). ${ag.medico?.nome.split(' ').pop()}`
    },
    { 
      header: 'Estado', 
      accessor: (ag: AgendamentoDTO) => <StatusBadge estado={ag.estado} />
    },
    {
      header: 'Acções',
      align: 'right' as const,
      accessor: (ag: AgendamentoDTO) => (
        <div className="flex items-center justify-end gap-2">
          {ag.estado === EstadoAgendamento.PENDENTE && (
            <Button 
              variant="secondary" 
              size="sm" 
              className="text-success-600 border-success-200 hover:bg-success-50"
              onClick={() => updateEstado.mutate({ id: ag.id, estado: EstadoAgendamento.CONFIRMADO })}
              loading={updateEstado.isPending && updateEstado.variables?.id === ag.id}
              disabled={updateEstado.isPending}
            >
              <Check className="h-4 w-4 mr-1" /> Confirmar
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setSelectedPacienteId(ag.pacienteId)}>
            Paciente
          </Button>
          <Button variant="secondary" size="sm" className="h-8 w-8 p-0" title="Ver Detalhes" onClick={() => setSelectedAgendamento(ag)}>
            <Eye className="h-4 w-4 text-neutral-500" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Agendamentos</h1>
          <p className="text-neutral-500">Gestão de marcações e histórico de consultas</p>
        </div>
        <Button onClick={() => setIsNewBookingOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo Agendamento
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Select 
            label="Médico"
            options={medicosOptions}
            value={medicoId}
            onChange={(e) => setMedicoId(e.target.value)}
          />
          <Select 
            label="Estado"
            options={estadoOptions}
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700">Pesquisar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <input 
                type="text"
                placeholder="Nome ou Nº Paciente..."
                className="w-full h-10 pl-10 pr-4 text-sm border border-neutral-200 rounded-md outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {error ? (
          <ErrorMessage error={error} />
        ) : (
          <Table 
            columns={columns}
            data={data?.items || []}
            isLoading={isLoading}
            keyExtractor={(ag) => ag.id}
          />
        )}

        {/* Pagination placeholder */}
        {data && data.total > 10 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-neutral-100">
            <p className="text-sm text-neutral-500">
              Mostrando {data.items.length} de {data.total} resultados
            </p>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Anterior
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                disabled={page * 10 >= data.total}
                onClick={() => setPage(p => p + 1)}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Modal 
        isOpen={isNewBookingOpen} 
        onClose={() => setIsNewBookingOpen(false)}
        title="Novo Agendamento"
        size="lg"
      >
        <BookingWizard 
          isStaff={true}
          onSuccess={() => {
            setIsNewBookingOpen(false);
          }} 
          onCancel={() => setIsNewBookingOpen(false)} 
        />
      </Modal>

      {selectedPacienteId && (
        <PatientDetailPanel 
          id={selectedPacienteId} 
          onClose={() => setSelectedPacienteId(null)}
          onNewBooking={() => {
            setSelectedPacienteId(null);
            setIsNewBookingOpen(true);
          }}
        />
      )}

      <AgendamentoDetailModal
        agendamento={selectedAgendamento}
        onClose={() => setSelectedAgendamento(null)}
      />
    </div>
  );
}
