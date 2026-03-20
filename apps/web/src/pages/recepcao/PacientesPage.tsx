import React, { useState } from 'react';
import { useListaPacientes, useCreatePaciente } from '../../hooks/usePacientes';
import { 
  Button, 
  Card, 
  Table, 
  Avatar, 
  Badge, 
  Modal, 
  Input, 
  Select, 
  ErrorMessage
} from '@clinicaplus/ui';
import { 
  Search, 
  UserPlus, 
  ChevronRight, 
  Phone, 
  Mail
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PacienteCreateSchema, type PacienteCreateInput, type PacienteDTO } from '@clinicaplus/types';
import { PROVINCES } from '@clinicaplus/utils';
import { PatientDetailPanel } from './PatientDetailPanel';
import { BookingWizard } from '../../components/appointments/BookingWizard';
export default function PacientesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedPacienteId, setSelectedPacienteId] = useState<string | null>(null);
  const [bookingPacienteId, setBookingPacienteId] = useState<string | null>(null);

  // Auto-open detail panel if ID is in URL
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      setSelectedPacienteId(id);
    }
  }, []);

  const { data, isLoading, error } = useListaPacientes({ 
    page, 
    limit: 10, 
    q: searchTerm || undefined 
  });

  const { mutate: createPaciente, isPending: isCreating } = useCreatePaciente();

  const form = useForm<PacienteCreateInput>({
    // @ts-expect-error zodResolver mismatch with exactOptionalPropertyTypes
    resolver: zodResolver(PacienteCreateSchema),
    defaultValues: {
      nome: '',
      dataNascimento: '',
      genero: 'M',
      provincia: PROVINCES[0],
      seguroSaude: false,
      alergias: [],
      ativo: true
    }
  });

  const handleCreate = (data: PacienteCreateInput) => {
    // Convert YYYY-MM-DD to ISO 8601 UTC
    const dateObj = new Date(data.dataNascimento);
    const isoDate = dateObj.toISOString();
    
    createPaciente({ ...data, dataNascimento: isoDate }, {
      onSuccess: () => {
        setIsModalOpen(false);
        form.reset();
      }
    });
  };

  const columns = [
    {
      header: 'Paciente',
      accessor: (p: PacienteDTO) => (
        <div className="flex items-center gap-3">
          <Avatar initials={p.nome.split(' ').map((n)=>n[0]).join('')} size="sm" />
          <div>
            <p className="font-semibold text-neutral-900">{p.nome}</p>
            <p className="text-xs text-neutral-600">{p.numeroPaciente}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Contacto',
      accessor: (p: PacienteDTO) => (
        <div className="space-y-1">
          <p className="text-xs flex items-center gap-1.5 text-neutral-600">
            <Phone className="h-3 w-3" /> {p.telefone || '---'}
          </p>
          <p className="text-xs flex items-center gap-1.5 text-neutral-600">
            <Mail className="h-3 w-3" /> {p.email || '---'}
          </p>
        </div>
      )
    },
    {
      header: 'Estado',
      accessor: (p: PacienteDTO) => (
        p.ativo ? <Badge variant="success">Ativo</Badge> : <Badge variant="neutral">Inativo</Badge>
      )
    },
    {
      header: '',
      align: 'right' as const,
      accessor: (p: PacienteDTO) => (
        <Button variant="ghost" size="sm" onClick={() => setSelectedPacienteId(p.id)}>
          Ver Detalhes <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Pacientes</h1>
          <p className="text-neutral-600">Registo e gestão de prontuários dos pacientes</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" /> Novo Paciente
        </Button>
      </div>

      <Card className="p-4">
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <input 
            type="text"
            placeholder="Pesquisar por nome, número ou contacto..."
            className="w-full h-10 pl-10 pr-4 text-sm border border-neutral-200 rounded-md outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {error ? (
          <ErrorMessage error={error} />
        ) : (
          <Table<PacienteDTO> 
            columns={columns}
            data={data?.items || []}
            isLoading={isLoading}
            keyExtractor={(p) => p.id}
          />
        )}
      </Card>

      {/* Create Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Registar Novo Paciente"
        size="lg"
      >
        {/* @ts-expect-error handleSubmit input type mismatch */}
        <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-6 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input 
              label="Nome Completo" 
              placeholder="Ex: João Silva" 
              required
              {...form.register('nome')}
              error={form.formState.errors.nome?.message}
            />
            <Input 
              label="Data de Nascimento" 
              type="date"
              required
              {...form.register('dataNascimento')}
              error={form.formState.errors.dataNascimento?.message}
            />
            <Select 
              label="Género"
              options={[
                { value: 'M', label: 'Masculino' },
                { value: 'F', label: 'Feminino' },
                { value: 'OUTRO', label: 'Outro' },
              ]}
              {...form.register('genero')}
              error={form.formState.errors.genero?.message}
            />
            <Input 
              label="Telefone" 
              placeholder="Ex: 923 000 000"
              {...form.register('telefone')}
              error={form.formState.errors.telefone?.message}
            />
            <Input 
              label="E-mail" 
              type="email"
              placeholder="paciente@exemplo.com"
              {...form.register('email')}
              error={form.formState.errors.email?.message}
            />
            <Select 
              label="Província"
              options={PROVINCES.map(p => ({ value: p, label: p }))}
              {...form.register('provincia')}
              error={form.formState.errors.provincia?.message}
            />
          </div>

          <div className="flex items-center gap-2 py-2">
            <input 
              type="checkbox" 
              id="seguroSaude" 
              className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              {...form.register('seguroSaude')}
            />
            <label htmlFor="seguroSaude" className="text-sm font-medium text-neutral-700">Explícito: Tem seguro de saúde?</label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={isCreating}>Registar Paciente</Button>
          </div>
        </form>
      </Modal>

      {/* Detail Panel */}
      {selectedPacienteId && (
        <PatientDetailPanel 
          id={selectedPacienteId} 
          onClose={() => setSelectedPacienteId(null)} 
          onNewBooking={(id) => {
            setBookingPacienteId(id);
            setSelectedPacienteId(null);
            setIsBookingModalOpen(true);
          }}
          onEdit={() => {
            // TODO: Implement actual edit logic if needed, for now just show a toast or alert
            alert('Funcionalidade de edição será implementada em breve.');
          }}
        />
      )}

      {/* Booking Modal */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setBookingPacienteId(null);
        }}
        title="Novo Agendamento"
        size="lg"
      >
        <BookingWizard 
          isStaff={true}
          pacienteId={bookingPacienteId || undefined}
          onSuccess={() => {
            setIsBookingModalOpen(false);
            setBookingPacienteId(null);
          }}
          onCancel={() => {
            setIsBookingModalOpen(false);
            setBookingPacienteId(null);
          }}
        />
      </Modal>
    </div>
  );
}
