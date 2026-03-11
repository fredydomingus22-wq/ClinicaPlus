import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ReceitaCreateSchema, ReceitaCreateInput } from '@clinicaplus/types';
import { useCreateReceita } from '../../hooks/useReceitas';
import { useAuthStore } from '../../stores/auth.store';
import { 
  Modal, 
  Button, 
  Input, 
  Textarea, 
  Card,
  ErrorMessage
} from '@clinicaplus/ui';
import { Plus, Trash2, Pill, FileText, Calendar, Info, CheckCircle } from 'lucide-react';

interface ReceitaModalProps {
  isOpen: boolean;
  agendamentoId: string;
  pacienteNome: string;
  diagnosticoPadrao?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Modal for creating a new prescription (Receita).
 * Supports dynamic medication entries.
 */
export function ReceitaModal({ 
  isOpen,
  agendamentoId, 
  pacienteNome, 
  diagnosticoPadrao = '', 
  onClose,
  onSuccess 
}: ReceitaModalProps) {
  const { utilizador } = useAuthStore();
  const createReceita = useCreateReceita();

  // Default validity: 30 days from now
  const defaultValidade = new Date();
  defaultValidade.setDate(defaultValidade.getDate() + 30);
  
  // Format for <input type="date" />: YYYY-MM-DD
  const defaultValidadeStr = defaultValidade.toISOString().split('T')[0] || '';

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ReceitaCreateInput>({
    resolver: zodResolver(ReceitaCreateSchema),
    defaultValues: {
      agendamentoId,
      diagnostico: diagnosticoPadrao,
      dataValidade: defaultValidade.toISOString(),
      medicamentos: [{ nome: '', dosagem: '', frequencia: '', duracao: '', instrucoes: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'medicamentos',
  });

  const onSubmit = async (data: ReceitaCreateInput) => {
    try {
      // Ensure the date is sent as a full ISO datetime for the API
      const payload = {
        ...data,
        dataValidade: new Date(data.dataValidade).toISOString(),
      };

      await createReceita.mutateAsync(payload);
      alert('Receita emitida com sucesso!');
      onSuccess?.();
      onClose();
    } catch {
      alert('Ocorreu um erro ao emitir a receita.');
    }
  };

  return (
    <Modal 
      isOpen={isOpen}
      title={`Nova Prescrição — ${pacienteNome}`} 
      onClose={onClose}
      size="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Prescription Data (Medications) */}
          <div className="md:col-span-2 space-y-8">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary-500" /> Motivo / Diagnóstico
              </h3>
              <Textarea
                {...register('diagnostico')}
                placeholder="Indique o diagnóstico que justifica esta prescrição..."
                error={errors.diagnostico?.message}
                className="min-h-[100px] bg-neutral-50 border-neutral-100"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                  <Pill className="h-4 w-4 text-primary-500" /> Lista de Fármacos
                </h3>
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => append({ nome: '', dosagem: '', frequencia: '', duracao: '', instrucoes: '' })}
                  className="rounded-xl h-9 font-bold text-[11px]"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar Medicamento
                </Button>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {fields.map((field, index) => (
                  <Card key={field.id} className="p-5 border-neutral-100 bg-neutral-50/50 relative shadow-none border-l-4 border-l-primary-500">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="lg:col-span-2">
                         <Input 
                           label="Medicamento" 
                           placeholder="Ex: Paracetamol 1g" 
                           {...register(`medicamentos.${index}.nome` as const)}
                           error={errors.medicamentos?.[index]?.nome?.message}
                         />
                      </div>
                      <Input 
                        label="Posologia" 
                        placeholder="Ex: 5ml" 
                        {...register(`medicamentos.${index}.dosagem` as const)}
                        error={errors.medicamentos?.[index]?.dosagem?.message}
                      />
                      <Input 
                        label="Frequência" 
                        placeholder="Ex: 12/12h" 
                        {...register(`medicamentos.${index}.frequencia` as const)}
                        error={errors.medicamentos?.[index]?.frequencia?.message}
                      />
                      <Input 
                        label="Duração" 
                        placeholder="Ex: 5 dias" 
                        {...register(`medicamentos.${index}.duracao` as const)}
                        error={errors.medicamentos?.[index]?.duracao?.message}
                      />
                      <div className="lg:col-span-3">
                        <Input 
                          label="Instruções Adicionais" 
                          placeholder="Ex: Administrar após as refeições principais" 
                          {...register(`medicamentos.${index}.instrucoes` as const)}
                          error={errors.medicamentos?.[index]?.instrucoes?.message}
                        />
                      </div>
                      <div className="flex items-end justify-end">
                        {fields.length > 1 && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => remove(index)}
                            className="text-danger-500 hover:bg-danger-50 h-10 w-10 p-0 rounded-full transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Configuration Sidebar */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm space-y-6">
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary-500" /> Validade
                </h4>
                <Input 
                  type="date" 
                  defaultValue={defaultValidadeStr}
                  {...register('dataValidade')}
                  error={errors.dataValidade?.message}
                  className="bg-neutral-50"
                />
                <div className="flex items-start gap-2 bg-primary-50 p-3 rounded-xl border border-primary-100">
                  <Info className="h-4 w-4 text-primary-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-primary-800 leading-tight font-medium">
                    As receitas são válidas por 30 dias por defeito para garantir o seguimento clínico.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-neutral-100">
                <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary-500" /> Observações
                </h4>
                <Textarea 
                  {...register('observacoes')}
                  placeholder="Instruções gerais para o farmacêutico ou paciente..."
                  className="min-h-[140px] text-xs bg-neutral-50"
                />
              </div>
            </div>
          </div>
        </div>

        {createReceita.isError && (
          <div className="bg-danger-50 border border-danger-200 p-4 rounded-xl text-danger-700 text-sm flex items-center gap-3">
             <ErrorMessage error={createReceita.error} />
          </div>
        )}

        {/* Role Check Warning */}
        {utilizador?.papel !== 'MEDICO' && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-xs flex items-center gap-3">
            <Info className="h-4 w-4 text-amber-600" />
            Apenas médicos podem emitir receitas oficiais. A sua conta ({utilizador?.papel}) tem permissões restritas.
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-8 border-t border-neutral-100">
          <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl px-6">Cancelar</Button>
          <Button 
            type="submit" 
            loading={createReceita.isPending}
            disabled={utilizador?.papel !== 'MEDICO'}
            className={`px-10 rounded-xl font-bold ${utilizador?.papel === 'MEDICO' ? 'bg-neutral-900 text-white shadow-xl shadow-neutral-900/10' : 'bg-neutral-200 text-neutral-400 grayscale'}`}
          >
            Finalizar e Emitir <CheckCircle className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
