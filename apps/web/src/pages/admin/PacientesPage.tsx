import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useListaPacientes, useCreatePaciente, useUpdatePaciente, pacientesKeys } from '../../hooks/usePacientes';
import { useDebounce } from '../../hooks/useDebounce';
import { pacientesApi } from '../../api/pacientes';
import { 
  Button, 
  Card, 
  Table, 
  Avatar, 
  Badge, 
  Modal, 
  Input, 
  Select, 
  ErrorMessage,
} from '@clinicaplus/ui';
import { 
  UserPlus, 
  Search, 
  ChevronRight, 
  Phone, 
  Mail,
  Edit
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PacienteCreateSchema, PacienteUpdateSchema, type PacienteCreateInput, type PacienteUpdateInput, type PacienteDTO } from '@clinicaplus/types';
import type { z } from 'zod';
import { PROVINCES } from '@clinicaplus/utils';
import { PatientDetailPanel } from '../recepcao/PatientDetailPanel';
import { BookingWizard } from '../../components/appointments/BookingWizard';

export default function PacientesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 350);
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  
  const [selectedPacienteId, setSelectedPacienteId] = useState<string | null>(null);
  const [bookingPacienteId, setBookingPacienteId] = useState<string | null>(null);
  const [pacienteToEdit, setPacienteToEdit] = useState<PacienteDTO | null>(null);

  const { data, isLoading, error } = useListaPacientes({ 
    page, 
    limit: 15, 
    q: debouncedSearch || undefined 
  });

  const queryClient = useQueryClient();

  const { mutate: createPaciente, isPending: isCreating } = useCreatePaciente();
  const { mutate: updatePaciente, isPending: isUpdating } = useUpdatePaciente();

  // Create Form
  const createForm = useForm<z.infer<typeof PacienteCreateSchema>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(PacienteCreateSchema) as any,
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

  // Edit Form
  const editForm = useForm<z.infer<typeof PacienteUpdateSchema>>({
    resolver: zodResolver(PacienteUpdateSchema),
  });

  // Populate edit form when opening modal
  useEffect(() => {
    if (pacienteToEdit) {
      editForm.reset({
        nome: pacienteToEdit.nome,
        email: pacienteToEdit.email || '',
        telefone: pacienteToEdit.telefone || '',
        dataNascimento: pacienteToEdit.dataNascimento.split('T')[0],
        genero: pacienteToEdit.genero as 'M' | 'F' | 'OUTRO',
        tipoSangue: pacienteToEdit.tipoSangue || '',
        alergias: pacienteToEdit.alergias || [],
        endereco: pacienteToEdit.endereco || '',
        provincia: pacienteToEdit.provincia || '',
        seguroSaude: pacienteToEdit.seguroSaude,
        seguradora: pacienteToEdit.seguradora || '',
        ativo: pacienteToEdit.ativo
      });
    }
  }, [pacienteToEdit, editForm]);

  const handleCreate = (values: PacienteCreateInput) => {
    const data = values;
    const dateObj = new Date(data.dataNascimento);
    const isoDate = dateObj.toISOString();
    
    createPaciente({ ...data, dataNascimento: isoDate }, {
      onSuccess: () => {
        setIsCreateModalOpen(false);
        createForm.reset();
      }
    });
  };

  const handleEdit = (values: PacienteUpdateInput) => {
    if (!pacienteToEdit) return;
    const data = values;
    
    // Convert allergies string (if edited as comma-separated list) to array
    let allergiesArray = data.alergias;
    if (typeof data.alergias === 'string') {
        allergiesArray = (data.alergias as string).split(',').map(s => s.trim()).filter(Boolean);
    }
    
    const payload = { ...data, alergias: allergiesArray as string[] };
    
    if (payload.dataNascimento) {
      payload.dataNascimento = new Date(payload.dataNascimento).toISOString();
    }
    
    updatePaciente({ id: pacienteToEdit.id, data: payload }, {
      onSuccess: () => {
        setIsEditModalOpen(false);
        setPacienteToEdit(null);
      }
    });
  };

  const startEdit = (paciente: PacienteDTO) => {
    setPacienteToEdit(paciente);
    setIsEditModalOpen(true);
  };

  const columns = [
    {
      header: 'Paciente',
      accessor: (p: PacienteDTO) => (
        <div className="flex items-center gap-3">
          <Avatar initials={p.nome.split(' ').map((n: string) => n[0]).join('')} size="sm" />
          <div>
            <p className="font-semibold text-neutral-900">{p.nome}</p>
            <p className="text-xs text-neutral-500">{p.numeroPaciente}</p>
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
          <p className="text-xs flex items-center gap-1.5 text-neutral-500">
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
      header: 'Acções',
      align: 'right' as const,
      accessor: (p: PacienteDTO) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => startEdit(p)} title="Editar Paciente" className="p-2 h-auto text-neutral-500 hover:text-primary-600">
             <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => setSelectedPacienteId(p.id)}
            onMouseEnter={() => {
              queryClient.prefetchQuery({
                queryKey: pacientesKeys.one(p.id),
                queryFn: () => pacientesApi.getOne(p.id),
                staleTime: 60_000
              });
            }}
          >
            Ver <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Gestão Global de Pacientes</h1>
          <p className="text-neutral-500 text-sm font-medium">Controlo total e edição avançada do registo de saúde.</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" /> Novo Paciente
        </Button>
      </div>

      <Card className="p-0 overflow-hidden border-neutral-100 shadow-sm">
        <div className="border-b border-neutral-100 bg-neutral-50/50 p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input 
              placeholder="Pesquisar por nome, número ou contacto..."
              className="pl-10 h-10 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {error ? (
          <div className="p-8">
             <ErrorMessage error={error} />
          </div>
        ) : (
          <Table 
            columns={columns}
            data={data?.items || []}
            isLoading={isLoading}
            keyExtractor={(p) => p.id}
          />
        )}
        
        <div className="p-4 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-600 bg-white px-3 py-1 rounded-full border border-neutral-200">
               Página {page} de {Math.ceil((data?.total || 0) / 15) || 1}
            </span>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={page <= 1} 
                onClick={() => setPage(p => p - 1)}
              >
                Anterior
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={page >= (Math.ceil((data?.total || 0) / 15) || 1)} 
                onClick={() => setPage(p => p + 1)}
              >
                Próxima
              </Button>
            </div>
        </div>
      </Card>

      {/* CREATE MODAL */}
      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        title="Registar Novo Paciente"
        size="lg"
      >
        <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-6 pt-2">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input 
              label="Nome Completo" 
              placeholder="Ex: João Silva" 
              required
              {...createForm.register('nome')}
              error={createForm.formState.errors.nome?.message}
            />
            <Input 
              label="Data de Nascimento" 
              type="date"
              required
              {...createForm.register('dataNascimento')}
              error={createForm.formState.errors.dataNascimento?.message}
            />
            <Select 
              label="Género"
              options={[
                { value: 'M', label: 'Masculino' },
                { value: 'F', label: 'Feminino' },
                { value: 'OUTRO', label: 'Outro' },
              ]}
              {...createForm.register('genero')}
              error={createForm.formState.errors.genero?.message}
            />
            <Input 
              label="Telefone" 
              placeholder="Ex: 923 000 000"
              {...createForm.register('telefone')}
              error={createForm.formState.errors.telefone?.message}
            />
            <Input 
              label="E-mail" 
              type="email"
              placeholder="paciente@exemplo.com"
              {...createForm.register('email')}
              error={createForm.formState.errors.email?.message}
            />
            <Select 
              label="Província"
              options={PROVINCES.map(p => ({ value: p, label: p }))}
              {...createForm.register('provincia')}
              error={createForm.formState.errors.provincia?.message}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <Button variant="ghost" type="button" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={isCreating}>Registar Paciente</Button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL (Admin Full Permissions) */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setPacienteToEdit(null);
        }}
        title="Editar Dados do Paciente"
        size="lg"
      >
        <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-6 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input 
              label="Nome Completo" 
              required
              {...editForm.register('nome')}
              error={editForm.formState.errors.nome?.message}
            />
            <Input 
              label="Data de Nascimento" 
              type="date"
              required
              {...editForm.register('dataNascimento')}
              error={editForm.formState.errors.dataNascimento?.message}
            />
             <Input 
              label="Telefone" 
              {...editForm.register('telefone')}
              error={editForm.formState.errors.telefone?.message}
            />
            <Input 
              label="E-mail" 
              type="email"
              {...editForm.register('email')}
              error={editForm.formState.errors.email?.message}
            />
            <Select 
              label="Género"
              options={[
                { value: 'M', label: 'Masculino' },
                { value: 'F', label: 'Feminino' },
                { value: 'OUTRO', label: 'Outro' },
              ]}
              {...editForm.register('genero')}
              error={editForm.formState.errors.genero?.message}
            />
            <Select 
              label="Província"
              options={PROVINCES.map(p => ({ value: p, label: p }))}
              {...editForm.register('provincia')}
              error={editForm.formState.errors.provincia?.message}
            />
          </div>

          <div className="space-y-4 pt-4 border-t border-neutral-100">
             <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-widest">Opções Avançadas e Clínicas</h4>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input 
                  label="Tipo Sanguíneo" 
                  placeholder="Ex: O+"
                  {...editForm.register('tipoSangue')}
                  error={editForm.formState.errors.tipoSangue?.message}
                />
                <Input 
                  label="Alergias (separadas por vírgula)" 
                  placeholder="Ex: Penicilina, Amendoim"
                  {...editForm.register('alergias')}
                  error={editForm.formState.errors.alergias?.message}                />
             </div>
             
             <div className="flex items-center gap-2 py-2">
                <input 
                  type="checkbox" 
                  id="ativoAdmin" 
                  className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  {...editForm.register('ativo')}
                />
                <label htmlFor="ativoAdmin" className="text-sm font-medium text-neutral-700">Conta Ativa (Desmarcar inativa paciente)</label>
              </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <Button variant="ghost" type="button" onClick={() => { setIsEditModalOpen(false); setPacienteToEdit(null); }}>Cancelar</Button>
            <Button type="submit" loading={isUpdating}>Guardar Alterações</Button>
          </div>
        </form>
      </Modal>

      {/* DETAIL PANEL (Drawer) */}
      {selectedPacienteId && (
        <PatientDetailPanel 
          id={selectedPacienteId} 
          onClose={() => setSelectedPacienteId(null)} 
          onNewBooking={(id) => {
            setBookingPacienteId(id);
            setSelectedPacienteId(null);
            setIsBookingModalOpen(true);
          }}
          onEdit={(id) => {
            // Re-trigger actual edit from drawer
            const p = data?.items.find(x => x.id === id);
            if(p) {
              setSelectedPacienteId(null);
              startEdit(p);
            }
          }}
        />
      )}

      {/* BOOKING MODAL */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => { setIsBookingModalOpen(false); setBookingPacienteId(null); }}
        title="Novo Agendamento"
        size="lg"
      >
         <BookingWizard 
          isStaff={true}
          pacienteId={bookingPacienteId || undefined}
          onSuccess={() => { setIsBookingModalOpen(false); setBookingPacienteId(null); }}
          onCancel={() => { setIsBookingModalOpen(false); setBookingPacienteId(null); }}
        />
      </Modal>
    </div>
  );
}
