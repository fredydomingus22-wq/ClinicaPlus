import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Package,
  Calendar,
} from 'lucide-react';
import {
  Input,
  Button,
} from '@clinicaplus/ui';
import { useInventory } from '../../hooks/useInventory';
import { CreateLoteSchema, type CreateLoteInput } from '../../schemas/inventory.schema';

interface LoteFormProps {
  produtoId: string;
  initialData?: CreateLoteInput;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const LoteForm: React.FC<LoteFormProps> = ({
  produtoId,
  initialData,
  onSuccess,
  onCancel
}) => {
  const { useCreateLote } = useInventory();
  const { mutate: create, isPending } = useCreateLote();

  const { register, handleSubmit, formState: { errors } } = useForm<CreateLoteInput>({
    resolver: zodResolver(CreateLoteSchema) as any,
    defaultValues: initialData || {
      produtoId,
      numeroLote: '',
      quantidade: 1,
    }
  });

  const onSubmit = (data: CreateLoteInput) => {
    create(data, {
      onSuccess: () => onSuccess?.()
    });
  };

  return (
    <div className="animate-fade-in pb-4">
      <div className="mb-6 p-4 bg-primary-50/30 rounded-xl border border-primary-50 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shadow-sm text-primary-600">
          <Package className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">Cadastro de Lote</p>
          <h3 className="font-bold text-neutral-800">Novo Lote de Estoque</h3>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input 
              label="Número do Lote" 
              placeholder="Ex: L-2024-001" 
              {...register('numeroLote')}
              error={errors.numeroLote?.message as string}
            />
          </div>

          <Input 
            label="Data de Validade" 
            type="date"
            {...register('dataValidade')}
            error={errors.dataValidade?.message as string}
          />

          <Input 
            label="Quantidade" 
            type="number"
            placeholder="0"
            {...register('quantidade', { valueAsNumber: true })}
            error={errors.quantidade?.message as string}
          />
        </div>

        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-2 items-start text-amber-700">
          <Calendar className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="text-[11px]">
            <p className="font-bold">Aviso de Validade</p>
            <p>O sistema alertará automaticamente quando o lote estiver próximo da data de validade (30 e 60 dias).</p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-3 pt-4 border-t border-neutral-100">
          <Button type="button" variant="ghost" fullWidth onClick={onCancel}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            fullWidth 
            loading={isPending}
            className="shadow-lg"
          >
            Cadastrar Lote
          </Button>
        </div>
      </form>
    </div>
  );
};
