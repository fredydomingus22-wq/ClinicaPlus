import React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Hash,
  AlertCircle
} from 'lucide-react';
import { 
  Input, 
  Button, 
  Textarea
} from '@clinicaplus/ui';
import { MovimentacaoEstoqueSchema, TipoMovimentacao, ProdutoDTO } from '@clinicaplus/types';
import { useInventory } from '../../hooks/useInventory';

interface MovimentacaoEstoqueFormProps {
  produto: ProdutoDTO;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const MovimentacaoEstoqueForm: React.FC<MovimentacaoEstoqueFormProps> = ({ 
  produto, 
  onSuccess, 
  onCancel 
}) => {
  const { useMovimentar } = useInventory();
  const { mutate: movimentar, isPending } = useMovimentar();

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(MovimentacaoEstoqueSchema),
    defaultValues: {
      produtoId: produto.id,
      tipo: TipoMovimentacao.ENTRADA,
      quantidade: 1,
      motivo: '',
      documentoReferencia: ''
    }
  });

  const tipo = watch('tipo');

  const onSubmit = (values: z.infer<typeof MovimentacaoEstoqueSchema>) => {
    movimentar(values as any, {
      onSuccess: () => onSuccess?.()
    });
  };

  return (
    <div className="animate-fade-in pb-4">
      <div className="mb-6 p-4 bg-primary-50/30 rounded-xl border border-primary-50 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shadow-sm text-primary-600">
          <Hash className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">Produto Seleccionado</p>
          <h3 className="font-bold text-neutral-800">{produto.nome}</h3>
          <p className="text-xs text-neutral-500">Stock Atual: <span className="font-bold text-neutral-700">{produto.estoqueAtual || 0} unid.</span></p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Tipo de Movimentação */}
        <div className="flex gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
          <button
            type="button"
            onClick={() => setValue('tipo', TipoMovimentacao.ENTRADA)}
            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
              tipo === TipoMovimentacao.ENTRADA 
                ? 'bg-success-50 border-success-200 text-success-700 shadow-sm' 
                : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-300'
            }`}
          >
            <ArrowUpCircle className="w-4 h-4" />
            <span className="text-sm font-bold">Entrada</span>
          </button>
          <button
            type="button"
            onClick={() => setValue('tipo', TipoMovimentacao.SAIDA)}
            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
              tipo === TipoMovimentacao.SAIDA 
                ? 'bg-danger-50 border-danger-200 text-danger-700 shadow-sm' 
                : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-300'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span className="text-sm font-bold">Saída</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="Quantidade" 
            type="number"
            placeholder="0"
            {...register('quantidade', { valueAsNumber: true })}
            error={errors.quantidade?.message as string}
          />
          
          <Input 
            label="Doc. Referência (Opcional)" 
            placeholder="Ex: FT 2024/001" 
            {...register('documentoReferencia')}
            error={errors.documentoReferencia?.message as string}
          />
        </div>

        <Textarea 
          label="Motivo / Observações" 
          placeholder="Ex: Reposição de stock mensal, Ajuste de inventário, etc..." 
          {...register('motivo')}
          error={errors.motivo?.message as string}
        />

        {tipo === TipoMovimentacao.SAIDA && (produto.estoqueAtual || 0) < watch('quantidade') && (
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-2 items-start text-amber-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="text-[11px]">
              <p className="font-bold">Aviso: Stock Insuficiente</p>
              <p>Esta saída resultará em stock negativo ({ (produto.estoqueAtual || 0) - watch('quantidade') }).</p>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-3 pt-4 border-t border-neutral-100">
          <Button type="button" variant="ghost" fullWidth onClick={onCancel}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            fullWidth 
            loading={isPending}
            variant={tipo === TipoMovimentacao.ENTRADA ? 'primary' : 'danger'}
            className="shadow-lg"
          >
            Confirmar {tipo === TipoMovimentacao.ENTRADA ? 'Entrada' : 'Saída'}
          </Button>
        </div>
      </form>
    </div>
  );
};
