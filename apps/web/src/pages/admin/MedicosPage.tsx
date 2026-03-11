import React, { useState, useEffect } from 'react';
import { useMedicos, useCreateMedico, useUpdateMedico } from '../../hooks/useMedicos';
import { useEspecialidades } from '../../hooks/useEspecialidades';
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
  UserPlus, 
  Search, 
  Edit,
  UserCheck,
  UserX,
  Stethoscope,
  Clock
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  MedicoCreateSchema, 
  MedicoUpdateSchema,
  type MedicoDTO,
  type MedicoCreateInput,
  type EspecialidadeDTO 
} from '@clinicaplus/types';
import { formatKwanza } from '@clinicaplus/utils';

const DIAS_SEMANA = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'] as const;

export default function MedicosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [medicoToEdit, setMedicoToEdit] = useState<MedicoDTO | null>(null);
  
  const { data, isLoading, error } = useMedicos({ 
    page, 
    limit: 15, 
    especialidadeId: searchTerm || undefined 
  });

  const { data: especialidadesData } = useEspecialidades({ ativo: true, limit: 100 });
  const especialidadesOptions = (especialidadesData?.items || []).map((e: EspecialidadeDTO) => ({ 
    value: e.id, 
    label: e.nome 
  }));

  const { mutate: createMedico, isPending: isCreating } = useCreateMedico();
  const { mutate: updateMedico, isPending: isUpdating } = useUpdateMedico();

  const isEditing = !!medicoToEdit;

  // Utilize the schema but omit 'utilizadorId' if we are creating and providing email
  const schema = isEditing ? MedicoUpdateSchema : MedicoCreateSchema;
  
  const form = useForm<MedicoCreateInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    mode: 'onBlur',
    defaultValues: {
      nome: '',
      email: '',
      especialidadeId: '',
      ordem: '',
      telefoneDireto: '',
      duracaoConsulta: 30,
      preco: 0,
      ativo: true,
      horario: DIAS_SEMANA.reduce((acc, dia) => {
        acc[dia] = { ativo: dia !== 'domingo' && dia !== 'sabado', inicio: '08:00', fim: '17:00' };
        return acc;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }, {} as Record<string, any>)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  });

  useEffect(() => {
    if (medicoToEdit) {
      form.reset({
        nome: medicoToEdit.nome,
        especialidadeId: medicoToEdit.especialidadeId,
        ordem: medicoToEdit.ordem || '',
        telefoneDireto: medicoToEdit.telefoneDireto || '',
        duracaoConsulta: medicoToEdit.duracaoConsulta,
        preco: medicoToEdit.preco,
        ativo: medicoToEdit.ativo,
        horario: medicoToEdit.horario
      });
    } else {
      form.reset({
        nome: '',
        email: '',
        especialidadeId: '',
        ordem: '',
        telefoneDireto: '',
        duracaoConsulta: 30,
        preco: 0,
        ativo: true,
        horario: DIAS_SEMANA.reduce((acc, dia) => {
          acc[dia] = { ativo: dia !== 'domingo' && dia !== 'sabado', inicio: '08:00', fim: '17:00' };
          return acc;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }, {} as any)
      });
    }
  }, [medicoToEdit, form]);

  const onSubmit = (values: MedicoCreateInput) => {
    if (isEditing && medicoToEdit) {
      updateMedico({ id: medicoToEdit.id, data: values }, {
        onSuccess: () => {
          setIsModalOpen(false);
          setMedicoToEdit(null);
        }
      });
    } else {
      createMedico(values, {
        onSuccess: () => {
          setIsModalOpen(false);
          form.reset();
        }
      });
    }
  };

  const toggleStatus = (m: MedicoDTO) => {
    updateMedico({ id: m.id, data: { ativo: !m.ativo } });
  };

  const openEdit = (m: MedicoDTO) => {
    setMedicoToEdit(m);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setMedicoToEdit(null);
  };

  const columns = [
    {
      header: 'Médico',
      accessor: (m: MedicoDTO) => (
        <div className="flex items-center gap-3">
          <Avatar initials={m.nome.split(' ').map((n: string) => n[0]).join('')} size="sm" />
          <div>
            <p className="font-semibold text-neutral-900">Dr(a). {m.nome}</p>
            <p className="text-xs text-neutral-600">{m.especialidade?.nome || 'Sem especialidade'}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Ordem Médica',
      accessor: (m: MedicoDTO) => (
        <p className="text-sm text-neutral-600">{m.ordem || 'N/A'}</p>
      )
    },
    {
      header: 'Consulta',
      accessor: (m: MedicoDTO) => (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-neutral-800">{formatKwanza(m.preco)}</p>
          <p className="text-[10px] text-neutral-600 flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden="true" /> {m.duracaoConsulta} min
          </p>
        </div>
      )
    },
    {
      header: 'Estado',
      accessor: (m: MedicoDTO) => (
        <div role="status" aria-label={`Estado: ${m.ativo ? 'Ativo' : 'Inativo'}`}>
          {m.ativo ? <Badge variant="success">Ativo</Badge> : <Badge variant="neutral">Inativo</Badge>}
        </div>
      )
    },
    {
      header: 'Acções',
      align: 'right' as const,
      accessor: (m: MedicoDTO) => (
        <div className="flex items-center justify-end gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            title={m.ativo ? "Desativar Médico" : "Ativar Médico"}
            onClick={() => toggleStatus(m)}
            className={`p-2 h-8 w-8 ${m.ativo ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50' : 'text-success-600 hover:bg-success-50'}`}
            aria-label={`${m.ativo ? 'Desativar' : 'Ativar'} médico ${m.nome}`}
          >
            {m.ativo ? <UserX className="h-4 w-4" aria-hidden="true" /> : <UserCheck className="h-4 w-4" aria-hidden="true" />}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => openEdit(m)} 
            title="Editar Cadastro e Horário" 
            className="p-2 h-8 w-8 text-neutral-500 hover:text-primary-600"
            aria-label={`Editar cadastro de ${m.nome}`}
          >
             <Edit className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Gestão de Médicos</h1>
          <p className="text-neutral-600 text-sm font-medium">Controlo do corpo clínico, especialidades e agendas.</p>
        </div>
        <Button onClick={() => { setMedicoToEdit(null); setIsModalOpen(true); }}>
          <UserPlus className="h-4 w-4 mr-2" aria-hidden="true" /> Registar Médico
        </Button>
      </div>

      <Card className="p-0 overflow-hidden border-neutral-100 shadow-sm">
        <div className="border-b border-neutral-100 bg-neutral-50/50 p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" aria-hidden="true" />
            <Select 
              placeholder="Filtrar por especialidade..."
              className="pl-10 h-10 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              options={especialidadesOptions}
              aria-label="Filtrar médicos por especialidade"
            />
          </div>
        </div>

        {error ? (
          <div className="p-8">
           <ErrorMessage error={error} />
          </div>
        ) : (
          <div aria-busy={isLoading}>
            <Table 
              columns={columns}
              data={data?.items || []}
              isLoading={isLoading}
              keyExtractor={(m) => m.id}
            />
          </div>
        )}
        
        <div className="p-4 bg-neutral-50/50 border-t border-neutral-100 text-right">
            <span className="text-xs font-medium text-neutral-600 bg-white px-3 py-1 rounded-full border border-neutral-200">
               Página {page} de {Math.ceil((data?.total || 0) / 15) || 1}
            </span>
        </div>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal}
        title={isEditing ? `Editar Médico: Dr(a). ${medicoToEdit?.nome}` : "Registar Novo Médico"}
        size="xl"
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-2 h-[70vh] overflow-y-auto pr-2" noValidate>
          
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-widest flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-primary-500" aria-hidden="true" /> 
              Dados Profissionais
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input 
                label="Nome Completo" 
                placeholder="Nome do Médico" 
                required
                {...form.register('nome')}
                error={form.formState.errors.nome?.message as string}
                aria-required="true"
                aria-invalid={!!form.formState.errors.nome}
              />
              {!isEditing && (
                <Input 
                  label="Email de Acesso (Cria Utilizador)" 
                  type="email"
                  placeholder="medico@clinica.com"
                  required
                  {...form.register('email')}
                error={form.formState.errors.email?.message as string}
                aria-required="true"
                aria-invalid={!!form.formState.errors.email}
              />
            )}
            <Select 
              label="Especialidade" 
              placeholder="Selecione uma especialidade"
              required
              options={especialidadesOptions}
              {...form.register('especialidadeId')}
              error={form.formState.errors.especialidadeId?.message as string}
              aria-required="true"
              aria-invalid={!!form.formState.errors.especialidadeId}
            />
            <Input 
              label="Nº Ordem Médica" 
              placeholder="Opcional"
                {...form.register('ordem')}
                error={form.formState.errors.ordem?.message as string}
                aria-invalid={!!form.formState.errors.ordem}
              />
              <Input 
                label="Telefone Direto" 
                placeholder="Opcional"
                {...form.register('telefoneDireto')}
                error={form.formState.errors.telefoneDireto?.message as string}
                aria-invalid={!!form.formState.errors.telefoneDireto}
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <Input 
                label="Preço da Consulta (Kz)" 
                type="number"
                required
                {...form.register('preco', { valueAsNumber: true })}
                error={form.formState.errors.preco?.message as string}
                aria-required="true"
                aria-invalid={!!form.formState.errors.preco}
              />
              <Select 
                label="Duração Padrão da Consulta"
                options={[
                  { value: '15', label: '15 minutos' },
                  { value: '20', label: '20 minutos' },
                  { value: '30', label: '30 minutos' },
                  { value: '45', label: '45 minutos' },
                  { value: '60', label: '1 hora' },
                ]}
                {...form.register('duracaoConsulta', { valueAsNumber: true })}
                error={form.formState.errors.duracaoConsulta?.message as string}
                aria-invalid={!!form.formState.errors.duracaoConsulta}
              />
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-neutral-100">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-500" aria-hidden="true" /> 
              Horário Semanal
            </h4>
            <p className="text-xs text-neutral-600 mb-2">Defina a disponibilidade para geração automática de slots de marcação.</p>
            
            <div className="space-y-3">
              {DIAS_SEMANA.map((dia) => {
                const isActive = form.watch(`horario.${dia}.ativo`);
                const diaCapitalized = dia.charAt(0).toUpperCase() + dia.slice(1);
                
                return (
                  <div key={dia} className="flex flex-col sm:flex-row sm:items-center gap-4 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                    <div className="flex items-center gap-2 w-32 shrink-0">
                      <input 
                        type="checkbox" 
                        id={`horario-${dia}`} 
                        className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                        {...form.register(`horario.${dia}.ativo`)}
                      />
                      <label htmlFor={`horario-${dia}`} className="text-sm font-semibold text-neutral-700">{diaCapitalized}</label>
                    </div>
                    
                    {isActive ? (
                      <div className="flex flex-wrap items-center gap-2 flex-grow">
                        <Input 
                          type="time" 
                          className="w-28 h-9 text-xs"
                          {...form.register(`horario.${dia}.inicio`)}
                          aria-label={`Início ${diaCapitalized}`}
                        />
                        <span className="text-neutral-400 text-sm">às</span>
                        <Input 
                          type="time" 
                          className="w-28 h-9 text-xs"
                          {...form.register(`horario.${dia}.fim`)}
                          aria-label={`Fim ${diaCapitalized}`}
                        />
                        <span className="text-neutral-300 mx-2">|</span>
                        <span className="text-xs text-neutral-500 mr-1">Pausa:</span>
                        <Input 
                          type="time" 
                          className="w-24 h-9 text-xs"
                          {...form.register(`horario.${dia}.pausaInicio`)}
                          aria-label={`Início pausa ${diaCapitalized}`}
                        />
                        <span className="text-neutral-400 text-sm">-</span>
                        <Input 
                          type="time" 
                          className="w-24 h-9 text-xs"
                          {...form.register(`horario.${dia}.pausaFim`)}
                          aria-label={`Fim pausa ${diaCapitalized}`}
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-400 italic">Sem atendimento</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-neutral-100">
            <Button variant="ghost" type="button" onClick={handleCloseModal}>Cancelar</Button>
            <Button type="submit" loading={isCreating || isUpdating}>
              {isEditing ? "Guardar Alterações" : "Concluir Registo"}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
