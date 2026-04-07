import React, { useState } from 'react';
import { usePlanosClinica } from '../../hooks/useTratamentos';
import { 
  Card, 
  Table, 
  Badge, 
  Button, 
  ErrorMessage,
  Avatar
} from '@clinicaplus/ui';
import { 
  Search, 
  Activity, 
  TrendingUp,
  ExternalLink,
  Calendar
} from 'lucide-react';
import { formatDate } from '@clinicaplus/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CriarPlanoSchema, type CriarPlanoDto } from '@clinicaplus/types';
import { useTiposTratamentoClinica, useCriarPlano } from '../../hooks/useTratamentos';
import { useListaPacientes } from '../../hooks/usePacientes';
import { useMedicos } from '../../hooks/useMedicos';
import { useDebounce } from '../../hooks/useDebounce';
import { Modal, Input, Select, Textarea } from '@clinicaplus/ui';
import { Plus } from 'lucide-react';
import type { PlanoTratamentoDTO, TipoTratamentoDTO } from '@clinicaplus/types';

export default function GestaoTratamentosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const debouncedPatientSearch = useDebounce(patientSearch, 350);

  const { data, isLoading, error } = usePlanosClinica({
    estado: statusFilter || undefined,
    q: searchTerm || undefined
  });

  const { mutate: criarPlano, isPending: isCreating } = useCriarPlano();
  const { data: tiposTratamento } = useTiposTratamentoClinica();
  const { data: medicos } = useMedicos({ ativo: true, page: 1, limit: 100 });
  const { data: pacientes } = useListaPacientes({ q: debouncedPatientSearch || undefined, limit: 10, page: 1 });

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<CriarPlanoDto>({
    resolver: zodResolver(CriarPlanoSchema),
    defaultValues: {
      totalSessoes: 10,
      frequenciaSemana: 2,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dataInicio: new Date().toISOString().split('T')[0] as any,
      duracaoSessaoMin: 45
    }
  });

  const handleCreate = (data: CriarPlanoDto) => {
    criarPlano(data, {
      onSuccess: () => {
        setIsModalOpen(false);
        reset();
      }
    });
  };

  const planos = (data as PlanoTratamentoDTO[]) || [];

  const columns = [
    {
      header: 'Tratamento',
      accessor: (p: PlanoTratamentoDTO) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-secondary-50 rounded-lg">
            <Activity className="h-4 w-4 text-secondary-600" />
          </div>
          <div>
            <p className="font-semibold text-neutral-900">{p.tipoTratamento?.nome || 'Tratamento'}</p>
            <p className="text-xs text-neutral-500 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Início: {formatDate(p.dataInicio)}
            </p>
          </div>
        </div>
      )
    },
    {
      header: 'Paciente',
      accessor: (p: PlanoTratamentoDTO) => (
        <div className="flex items-center gap-2">
          <Avatar initials={p.paciente?.nome?.[0] || 'P'} size="sm" />
          <div>
            <p className="text-sm font-medium text-neutral-900">{p.paciente?.nome || '---'}</p>
            <p className="text-[10px] text-neutral-500">Total: {p.totalSessoes} Sessões</p>
          </div>
        </div>
      )
    },
    {
      header: 'Progresso',
      accessor: (p: PlanoTratamentoDTO) => {
        const realizadas = p.sessoesRealizadas || 0;
        const total = p.totalSessoes || 1;
        const progress = Math.round((realizadas / total) * 100);
        
        return (
          <div className="w-40">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="font-bold text-neutral-700">{progress}%</span>
              <span className="text-neutral-500">{realizadas}/{total}</span>
            </div>
            <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-success-500' : 'bg-primary-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        );
      }
    },
    {
      header: 'Estado',
      accessor: (p: PlanoTratamentoDTO) => {
        const variants: Record<string, "info" | "success" | "neutral" | "error"> = {
          ACTIVO: 'info',
          CONCLUIDO: 'success',
          PENDENTE: 'neutral',
          CANCELADO: 'error'
        };
        return <Badge variant={variants[p.estado as string] || 'neutral'}>{p.estado}</Badge>;
      }
    },
    {
      header: 'Ações',
      align: 'right' as const,
      accessor: (p: PlanoTratamentoDTO) => (
        <Button size="sm" variant="ghost" onClick={() => window.location.href = `/admin/pacientes/${p.pacienteId}/historico`}>
          <ExternalLink className="h-4 w-4 mr-1" /> Prontuário
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Gestão de Tratamentos</h1>
          <p className="text-neutral-600">Acompanhamento global de planos de reabilitação e terapias</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary-50 rounded-lg text-secondary-700 border border-secondary-100">
            <TrendingUp className="h-5 w-5" />
            <span className="text-sm font-bold">{planos.length} Planos Ativos</span>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo Plano
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input 
              type="text"
              placeholder="Pesquisar por paciente ou tratamento..."
              className="w-full h-10 pl-10 pr-4 text-sm border border-neutral-200 rounded-md outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <select 
              className="w-full h-10 px-3 text-sm border border-neutral-200 rounded-md outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos os Estados</option>
              <option value="ACTIVO">Ativos</option>
              <option value="CONCLUIDO">Concluídos</option>
              <option value="PENDENTE">Pendentes</option>
              <option value="CANCELADO">Cancelados</option>
            </select>
          </div>
        </div>

        {error ? (
          <ErrorMessage error={error} />
        ) : (
          <Table 
            columns={columns}
            data={planos}
            isLoading={isLoading}
            keyExtractor={(p: PlanoTratamentoDTO) => p.id}
          />
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Plano de Tratamento"
        size="lg"
      >
        <form onSubmit={handleSubmit(handleCreate)} className="space-y-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] font-mono text-neutral-500">
                Seleção de Paciente
              </label>
              <Input 
                placeholder="Pesquisar paciente..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
              <Select 
                label="Confirmar Paciente"
                required
                options={(pacientes?.items || []).map(p => ({ value: p.id, label: `${p.nome} (${p.numeroPaciente})` }))}
                {...register('pacienteId')}
                error={errors.pacienteId?.message}
                placeholder="Selecione o paciente"
              />
            </div>

            <div className="space-y-4">
              <Select 
                label="Tipo de Tratamento"
                required
                options={(tiposTratamento || []).map((t: TipoTratamentoDTO) => ({ value: t.id, label: t.nome }))}
                {...register('tipoId')}
                error={errors.tipoId?.message}
                placeholder="Selecione o tipo"
                onChange={(e) => {
                  const tipo = (tiposTratamento as TipoTratamentoDTO[])?.find(t => t.id === e.target.value);
                  if (tipo?.duracaoMin) setValue('duracaoSessaoMin', tipo.duracaoMin);
                  register('tipoId').onChange(e);
                }}
              />
              <Select 
                label="Médico Responsável"
                required
                options={(medicos?.items || []).map(m => ({ value: m.id, label: m.nome }))}
                {...register('medicoId')}
                error={errors.medicoId?.message}
                placeholder="Selecione o médico"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Input 
              label="Qtd. Sessões"
              type="number"
              required
              {...register('totalSessoes', { valueAsNumber: true })}
              error={errors.totalSessoes?.message}
            />
            <Input 
              label="Vezes / Semana"
              type="number"
              required
              {...register('frequenciaSemana', { valueAsNumber: true })}
              error={errors.frequenciaSemana?.message}
            />
            <Input 
              label="Duração (min)"
              type="number"
              required
              {...register('duracaoSessaoMin', { valueAsNumber: true })}
              error={errors.duracaoSessaoMin?.message}
            />
            <Input 
              label="Data de Início"
              type="date"
              required
              {...register('dataInicio')}
              error={errors.dataInicio?.message}
            />
          </div>

          <Textarea 
            label="Descrição Clínica / Objetivos"
            placeholder="Descreva o propósito deste plano de tratamento..."
            {...register('descricao')}
            error={errors.descricao?.message}
          />

          <Textarea 
            label="Observações Adicionais"
            {...register('observacoes')}
            error={errors.observacoes?.message}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={isCreating}>Criar Plano e Gerar Sessões</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
