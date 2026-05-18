import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CriarPlanoSchema, type CriarPlanoDto, type TipoTratamentoDTO } from '@clinicaplus/types';
import { 
  useTiposTratamentoClinica, 
  useCriarPlano 
} from '../../hooks/useTratamentos';
import { useListaPacientes } from '../../hooks/usePacientes';
import { useMedicos } from '../../hooks/useMedicos';
import { useDebounce } from '../../hooks/useDebounce';
import { 
  Button, 
  Input, 
  Select, 
  Textarea 
} from '@clinicaplus/ui';

interface CriarPlanoFormProps {
  pacienteId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CriarPlanoForm({ pacienteId, onSuccess, onCancel }: CriarPlanoFormProps) {
  const [patientSearch, setPatientSearch] = useState('');
  const debouncedPatientSearch = useDebounce(patientSearch, 350);

  const { mutate: criarPlano, isPending: isCreating } = useCriarPlano();
  const { data: tiposTratamento } = useTiposTratamentoClinica();
  const { data: medicos } = useMedicos({ ativo: true, page: 1, limit: 100 });
  const { data: pacientes } = useListaPacientes({ 
    q: debouncedPatientSearch || undefined, 
    limit: 10, 
    page: 1 
  });

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<CriarPlanoDto>({
    resolver: zodResolver(CriarPlanoSchema),
    defaultValues: {
      pacienteId: pacienteId || '',
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
        if (onSuccess) onSuccess();
      }
    });
  };

  // Helper to extract data from axios response structure if needed
  const extractArray = (obj: unknown): unknown[] => {
    if (!obj) return [];
    if (Array.isArray(obj)) return obj;
    const dataObj = obj as { data?: unknown };
    if (dataObj.data) return Array.isArray(dataObj.data) ? dataObj.data : extractArray(dataObj.data);
    return [];
  };

  const listaTiposTratamento = extractArray(tiposTratamento) as TipoTratamentoDTO[];

  return (
    <form onSubmit={handleSubmit(handleCreate)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!pacienteId && (
          <div className="space-y-4">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] font-mono text-neutral-500">
              Passo 1: Seleção de Paciente
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
        )}

        <div className={`space-y-4 ${pacienteId ? 'md:col-span-2' : ''}`}>
           <div className={`grid grid-cols-1 ${pacienteId ? 'md:grid-cols-2' : 'grid-cols-1'} gap-4`}>
            <Select 
                label="Tipo de Tratamento"
                required
                options={listaTiposTratamento.map((t: TipoTratamentoDTO) => ({ value: t.id, label: t.nome }))}
                {...register('tipoId')}
                error={errors.tipoId?.message}
                placeholder="Selecione o tipo"
                onChange={(e) => {
                  const tipo = listaTiposTratamento.find(t => t.id === e.target.value);
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
        rows={3}
      />

      <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
        {onCancel && <Button variant="ghost" type="button" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" loading={isCreating}>Criar Plano e Gerar Sessões</Button>
      </div>
    </form>
  );
}
