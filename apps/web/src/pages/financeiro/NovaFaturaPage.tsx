import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, FormProvider, useFormContext, type SubmitHandler, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  FaturaCreateSchema, 
  EstadoAgendamento,
  TipoFatura, 
  type FaturaCreateInput
} from '@clinicaplus/types';
import { 
  Button, 
  Card, 
  Input, 
  Select, 
  Badge,
  Spinner
} from '@clinicaplus/ui';
import { 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Search, 
  User, 
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { useListaPacientes } from '../../hooks/usePacientes';
import { useListaAgendamentos } from '../../hooks/useAgendamentos';
import { useCreateFatura } from '../../hooks/useFaturas';
import { formatKwanza } from '@clinicaplus/utils';
import { useDebounce } from '../../hooks/useDebounce';

export default function NovaFaturaPage() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const createFatura = useCreateFatura();

  const methods = useForm<FaturaCreateInput>({
    resolver: zodResolver(FaturaCreateSchema) as unknown as Resolver<FaturaCreateInput>,
    defaultValues: {
      tipo: TipoFatura.PARTICULAR,
      itens: [{ descricao: '', quantidade: 1, precoUnit: 0, desconto: 0 }],
      desconto: 0,
    }
  });

  const { handleSubmit, watch } = methods;
  const selectedPacienteId = watch('pacienteId');

  const onSubmit: SubmitHandler<FaturaCreateInput> = async (data) => {
    try {
      const fatura = await createFatura.mutateAsync(data);
      // If user wants to emit right away, we could do it here
      // For now, let's just go to detail page
      navigate(`/admin/financeiro/${fatura.id}`);
    } catch {
       // Error handled by mutation
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Nova Fatura</h1>
          <p className="text-neutral-500">Passo {step} de 3 — {
            step === 1 ? 'Seleção de Paciente' : 
            step === 2 ? 'Itens da Fatura' : 'Revisão e Confirmação'
          }</p>
        </div>
        <div className="flex gap-2">
          {step > 1 && (
            <Button variant="secondary" onClick={() => setStep(s => s - 1)}>
              <ChevronLeft className="h-4 w-4 mr-2" /> Anterior
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={step === 1 && !selectedPacienteId}>
              Próximo <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit(onSubmit)} loading={createFatura.isPending}>
              Finalizar e Guardar <CheckCircle2 className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map(i => (
          <div 
            key={i} 
            className={`h-2 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary-500' : 'bg-neutral-200'}`} 
          />
        ))}
      </div>

      <FormProvider {...methods}>
        <form className="space-y-6">
          {step === 1 && <Step1PacienteSelection />}
          {step === 2 && <Step2ItemsDrafting />}
          {step === 3 && <Step3Review />}
        </form>
      </FormProvider>
    </div>
  );
}

function Step1PacienteSelection() {
  const { setValue, watch, register } = useFormContext<FaturaCreateInput>();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 350);
  const selectedPacienteId = watch('pacienteId');
  const selectedAgendamentoId = watch('agendamentoId');

  const { data: pacientes, isLoading } = useListaPacientes({ q: debouncedSearch, page: 1, limit: 5 });
  const { data: agendamentos } = useListaAgendamentos({ 
    pacienteId: selectedPacienteId, 
    estado: 'CONCLUIDO' as EstadoAgendamento,
    page: 1,
    limit: 5 
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <User className="h-5 w-5 text-primary-500" /> Selecionar Paciente
        </h2>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input 
            placeholder="Pesquisar por nome ou número..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center p-4"><Spinner /></div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {pacientes?.items.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setValue('pacienteId', p.id)}
                className={`
                  flex items-center justify-between p-3 border rounded-lg transition-all text-left
                  ${selectedPacienteId === p.id 
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/20' 
                    : 'border-neutral-100 hover:border-neutral-300'
                  }
                `}
              >
                <div>
                  <p className="font-bold text-neutral-900">{p.nome}</p>
                  <p className="text-xs text-neutral-500">{p.numeroPaciente}</p>
                </div>
                {selectedPacienteId === p.id && <CheckCircle2 className="h-5 w-5 text-primary-600" />}
              </button>
            ))}
            {searchTerm && pacientes?.items.length === 0 && (
              <p className="text-center text-sm text-neutral-500 py-4">Nenhum paciente encontrado.</p>
            )}
          </div>
        )}
      </Card>

      {selectedPacienteId && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary-500" /> Agendamentos Concluídos
          </h2>
          <p className="text-sm text-neutral-500">Selecione um agendamento para pré-preencher a fatura.</p>
          
          <div className="space-y-2">
            {agendamentos?.items.map(a => {
              const isSelected = selectedAgendamentoId === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      // Deselect
                      setValue('agendamentoId', undefined);
                      setValue('medicoId', undefined);
                    } else {
                      // Select agendamento and propagate medicoId
                      setValue('agendamentoId', a.id);
                      if (a.medicoId) {
                        setValue('medicoId', a.medicoId);
                      }
                      // Pre-fill first item with consultation details
                      const medicoNome = a.medico?.nome || 'Médico';
                      const preco = a.medico?.preco ?? 0;
                      setValue('itens.0.descricao', `Consulta — ${medicoNome}`);
                      setValue('itens.0.precoUnit', preco);
                      setValue('itens.0.quantidade', 1);
                      setValue('itens.0.desconto', 0);
                    }
                  }}
                  className={`
                    w-full flex items-center justify-between p-3 border rounded-lg transition-all text-left group
                    ${isSelected 
                      ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/20' 
                      : 'border-neutral-100 hover:border-primary-300'
                    }
                  `}
                >
                  <div>
                    <p className="text-sm font-bold text-neutral-900">
                      {new Date(a.dataHora).toLocaleDateString()} — {a.medico?.nome}
                    </p>
                    <p className="text-xs text-neutral-500">{a.motivoConsulta || 'Consulta Geral'}</p>
                  </div>
                  {isSelected ? (
                    <CheckCircle2 className="h-5 w-5 text-primary-600" />
                  ) : (
                    <Badge variant="outline" className="group-hover:text-primary-600 group-hover:border-primary-600">
                      Selecionar
                    </Badge>
                  )}
                </button>
              );
            })}
            {!agendamentos?.items.length && (
              <p className="text-sm text-neutral-400 italic">Nenhum agendamento concluído recente.</p>
            )}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <Select 
          label="Tipo de Fatura"
          options={[
            { value: TipoFatura.PARTICULAR, label: 'Particular' },
            { value: TipoFatura.SEGURO, label: 'Seguro de Saúde' },
          ]}
          {...register('tipo')}
        />
      </Card>
    </div>
  );
}

function Step2ItemsDrafting() {
  const { control, register, watch } = useFormContext<FaturaCreateInput>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "itens"
  });

  const itens = watch('itens');
  const globalDesconto = watch('desconto') || 0;

  const subtotal = useMemo(() => {
    return (itens || []).reduce((acc: number, item: { quantidade: number; precoUnit: number; desconto: number }) => {
      const q = item.quantidade || 0;
      const p = item.precoUnit || 0;
      const d = item.desconto || 0;
      return acc + (q * p) - d;
    }, 0);
  }, [itens]);

  const total = Math.max(0, subtotal - globalDesconto);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Descrição</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500 w-24">Qtd</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500 w-32 text-right">Preço Unit</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500 w-32 text-right">Desconto</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500 w-32 text-right">Total</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {fields.map((field, index) => (
              <ItemRow key={field.id} index={index} onRemove={() => remove(index)} />
            ))}
          </tbody>
        </table>
        
        <div className="p-4 bg-white">
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => append({ descricao: '', quantidade: 1, precoUnit: 0, desconto: 0 })}
          >
            <Plus className="h-4 w-4 mr-1" /> Adicionar Item
          </Button>
        </div>
      </Card>

      <div className="flex justify-end">
        <Card className="p-6 w-full md:w-80 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Subtotal</span>
            <span className="font-mono">{formatKwanza(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-neutral-500">Desconto Global</span>
            <div className="w-24">
              <Input 
                type="number" 
                className="h-8 text-right font-mono text-xs" 
                {...register('desconto', { valueAsNumber: true })} 
              />
            </div>
          </div>
          <div className="pt-4 border-t border-neutral-200 flex justify-between">
            <span className="font-bold text-neutral-900">Total</span>
            <span className="text-xl font-bold text-primary-600 font-mono">
              {formatKwanza(total)}
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ItemRow({ index, onRemove }: { index: number; onRemove: () => void }) {
  const { register, watch } = useFormContext<FaturaCreateInput>();
  
  const q = watch(`itens.${index}.quantidade`) || 0;
  const p = watch(`itens.${index}.precoUnit`) || 0;
  const d = watch(`itens.${index}.desconto`) || 0;
  const rowTotal = (q * p) - d;

  return (
    <tr className="group">
      <td className="px-4 py-3">
        <input 
          {...register(`itens.${index}.descricao`)} 
          placeholder="Ex: Consulta de Pediatria"
          className="w-full text-sm outline-none bg-transparent focus:ring-1 focus:ring-primary-500 rounded px-1"
        />
      </td>
      <td className="px-4 py-3">
        <input 
          type="number" 
          min="1"
          {...register(`itens.${index}.quantidade`, { valueAsNumber: true })}
          className="w-full text-sm text-center outline-none bg-transparent focus:ring-1 focus:ring-primary-500 rounded"
        />
      </td>
      <td className="px-4 py-3">
        <input 
          type="number"
          {...register(`itens.${index}.precoUnit`, { valueAsNumber: true })}
          className="w-full text-sm text-right font-mono outline-none bg-transparent focus:ring-1 focus:ring-primary-500 rounded px-1"
        />
      </td>
      <td className="px-4 py-3">
        <input 
          type="number"
          {...register(`itens.${index}.desconto`, { valueAsNumber: true })}
          className="w-full text-sm text-right font-mono text-red-600 outline-none bg-transparent focus:ring-1 focus:ring-primary-500 rounded px-1"
        />
      </td>
      <td className="px-4 py-3 text-right font-mono font-bold text-sm text-neutral-900 font-mono">
        {formatKwanza(rowTotal)}
      </td>
      <td className="px-4 py-3 text-center">
        <button 
          type="button" 
          onClick={onRemove}
          className="text-neutral-300 hover:text-red-500 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

function Step3Review() {
  const { watch } = useFormContext<FaturaCreateInput>();
  const data = watch();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <Card className="p-6 space-y-6">
        <h2 className="text-lg font-bold border-b border-neutral-100 pb-2">Resumo da Fatura</h2>
        
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Paciente ID</p>
              <p className="text-sm font-semibold">{data.pacienteId}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Tipo</p>
              <Badge variant={data.tipo === TipoFatura.SEGURO ? 'info' : 'neutral'}>
                {data.tipo}
              </Badge>
            </div>
          </div>
          
          <div className="space-y-4">
             <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Nº de Itens</p>
              <p className="text-sm font-semibold">{data.itens.length}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Agendamento Associado</p>
              <p className="text-sm">{data.agendamentoId || 'Nenhum'}</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-100">
           <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-4">Itens Selecionados</p>
           <table className="w-full text-xs">
             <tbody className="divide-y divide-neutral-50">
               {(data.itens || []).map((item: { descricao: string; quantidade: number; precoUnit: number }, idx: number) => (
                 <tr key={idx}>
                   <td className="py-2">{item.descricao}</td>
                   <td className="py-2 text-right">{item.quantidade}x</td>
                   <td className="py-2 text-right font-mono">{formatKwanza(item.precoUnit)}</td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>

        <div className="pt-6 mt-6 border-t-2 border-neutral-100 flex justify-between items-center">
          <p className="text-sm font-bold text-neutral-600">Total Final</p>
          <p className="text-2xl font-black text-primary-600 font-mono">
            {formatKwanza((data.itens || []).reduce((acc: number, i: { quantidade: number; precoUnit: number; desconto: number }) => acc + (i.quantidade * i.precoUnit) - i.desconto, 0) - (data.desconto || 0))}
          </p>
        </div>
      </Card>
      
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
         <Plus className="h-5 w-5 text-amber-500 shrink-0" />
         <div className="text-xs text-amber-800 space-y-1">
            <p className="font-bold">Aviso de Emissão</p>
            <p>A fatura será guardada inicialmente como <strong>RASCUNHO</strong>. Poderá emití-la e imprimir na página de detalhes após a criação.</p>
         </div>
      </div>
    </div>
  );
}
