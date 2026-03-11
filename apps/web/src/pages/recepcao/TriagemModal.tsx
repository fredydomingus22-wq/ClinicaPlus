import React, { useMemo } from 'react';
import { useForm, useWatch, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  AgendamentoTriagemSchema, 
  type TriagemInput, 
  type AgendamentoDTO 
} from '@clinicaplus/types';
import { 
  Modal, 
  Input, 
  Button, 
  Select, 
} from '@clinicaplus/ui';
import { useTriagem } from '../../hooks/useAgendamentos';

interface TriagemModalProps {
  agendamento: AgendamentoDTO;
  isOpen: boolean;
  onClose: () => void;
}

const URGENCIA_OPTIONS = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'URGENTE', label: 'Urgente' },
  { value: 'MUITO_URGENTE', label: 'Muito Urgente' },
];

const PRESET_SINTOMAS = [
  'Febre', 'Tosse', 'Dor de Cabeça', 'Cansaço', 'Dor no Corpo', 'Náuseas', 'Falta de Ar'
];

export function TriagemModal({ agendamento, isOpen, onClose }: TriagemModalProps) {
  const { mutate: performTriagem, isPending, error: apiError } = useTriagem();
  
  const form = useForm<TriagemInput>({
    resolver: zodResolver(AgendamentoTriagemSchema),
    defaultValues: {
      urgencia: 'NORMAL',
      sintomas: agendamento.triagem?.sintomas || [],
      pa: agendamento.triagem?.pa || '',
      temperatura: agendamento.triagem?.temperatura ?? undefined,
      peso: agendamento.triagem?.peso ?? undefined,
      altura: agendamento.triagem?.altura ?? undefined,
      frequenciaCardiaca: agendamento.triagem?.frequenciaCardiaca ?? undefined,
    }
  });

  const peso = useWatch({ control: form.control, name: 'peso' });
  const altura = useWatch({ control: form.control, name: 'altura' });
  const selectedSintomas = useWatch({ control: form.control, name: 'sintomas' }) || [];

  const imc = useMemo(() => {
    const p = Number(peso);
    const a = Number(altura);
    if (!p || !a || a === 0) return null;
    const heightInMeters = a / 100;
    return (p / (heightInMeters * heightInMeters)).toFixed(1);
  }, [peso, altura]);

  const toggleSintoma = (sintoma: string) => {
    const current = [...selectedSintomas];
    const index = current.indexOf(sintoma);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(sintoma);
    }
    form.setValue('sintomas', current);
  };

  const onSubmit: SubmitHandler<TriagemInput> = (data) => {
    performTriagem({ id: agendamento.id, data }, {
      onSuccess: () => {
        onClose();
        form.reset();
      }
    });
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Triagem: ${agendamento.paciente?.nome}`}
      size="lg"
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input 
            label="Tensão Arterial (PA)"
            placeholder="Ex: 120/80"
            {...form.register('pa')}
            error={form.formState.errors.pa?.message}
          />
          <Input 
            label="Temperatura (°C)"
            type="number"
            step="0.1"
            placeholder="Ex: 36.5"
            {...form.register('temperatura', { valueAsNumber: true })}
            error={form.formState.errors.temperatura?.message}
          />
          <Input 
            label="Peso (kg)"
            type="number"
            placeholder="Ex: 75"
            {...form.register('peso', { valueAsNumber: true })}
            error={form.formState.errors.peso?.message}
          />
          <Input 
            label="Altura (cm)"
            type="number"
            placeholder="Ex: 175"
            {...form.register('altura', { valueAsNumber: true })}
            error={form.formState.errors.altura?.message}
          />
          
          <div className="flex flex-col gap-1 w-full">
            <label className="text-sm font-medium text-neutral-700">IMC (Calculado)</label>
            <div className={`h-10 px-3 flex items-center text-sm rounded-md border border-neutral-200 bg-neutral-50 font-semibold
              ${imc && parseFloat(imc) > 25 ? 'text-warning-600' : 'text-neutral-900'}`}>
              {imc || '---'}
            </div>
          </div>

          <Input 
            label="Freq. Cardíaca (bpm)"
            type="number"
            placeholder="Ex: 80"
            {...form.register('frequenciaCardiaca', { valueAsNumber: true })}
            error={form.formState.errors.frequenciaCardiaca?.message}
          />

          <Select 
            label="Nível de Urgência"
            options={URGENCIA_OPTIONS}
            {...form.register('urgencia')}
            error={form.formState.errors.urgencia?.message}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700">Sintomas</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_SINTOMAS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSintoma(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border
                  ${selectedSintomas.includes(s) 
                    ? 'bg-primary-600 text-white border-primary-600' 
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {!!apiError && (
          <div className="p-3 rounded-lg bg-danger-50 text-danger-600 text-sm font-medium border border-danger-100">
            Ocorreu um erro ao processar a triagem. Por favor, tente novamente.
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isPending}>Guardar Triagem</Button>
        </div>
      </form>
    </Modal>
  );
}
