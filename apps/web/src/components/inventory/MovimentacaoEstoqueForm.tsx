import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Hash,
  AlertCircle,
  RefreshCw,
  ShoppingCart,
  ArrowRightLeft
} from 'lucide-react';
import {
  Input,
  Button,
  Textarea,
  Select
} from '@clinicaplus/ui';
import { useInventory } from '../../hooks/useInventory';
import { MovimentarEstoqueSchema, type MovimentarEstoqueInput } from '../../schemas/inventory.schema';
import type { ProdutoResponse, LoteComProdutoResponse } from '../../types/inventory.types';

interface MovimentacaoEstoqueFormProps {
  produto: ProdutoResponse;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const TIPO_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  ENTRADA: { label: 'Entrada', icon: ArrowUpCircle, color: 'success' },
  SAIDA: { label: 'Saída', icon: ArrowDownCircle, color: 'danger' },
  AJUSTE: { label: 'Ajuste', icon: RefreshCw, color: 'neutral' },
  VENDA: { label: 'Venda', icon: ShoppingCart, color: 'primary' },
  TRANSFERENCIA: { label: 'Transferência', icon: ArrowRightLeft, color: 'secondary' },
};

export const MovimentacaoEstoqueForm: React.FC<MovimentacaoEstoqueFormProps> = ({
  produto,
  onSuccess,
  onCancel
}) => {
  const { useMovimentar, useLotes } = useInventory();
  const { mutate: movimentar, isPending } = useMovimentar();
  const { data: lotes, isLoading: loadingLotes } = useLotes(produto.id);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<MovimentarEstoqueInput>({
    resolver: zodResolver(MovimentarEstoqueSchema) as any,
    defaultValues: {
      produtoId: produto.id,
      tipo: 'ENTRADA',
      quantidade: 1,
    }
  });

  const tipo = watch('tipo');

  const onSubmit = (values: MovimentarEstoqueInput) => {
    movimentar(values, {
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
          {Object.entries(TIPO_LABELS).map(([key, { label, icon: Icon, color }]) => (
            <button
              key={key}
              type="button"
              onClick={() => setValue('tipo', key as any)}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                tipo === key
                  ? `bg-${color}-50 border-${color}-200 text-${color}-700 shadow-sm`
                  : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs font-bold">{label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="Quantidade" 
            type="number"
            placeholder="0"
            {...register('quantidade', { valueAsNumber: true })}
            error={errors.quantidade?.message as string}
          />
          
          {(tipo === 'SAIDA' || tipo === 'VENDA') && (
            <Select
              label="Lote (Opcional)"
              placeholder="Deixar vazio para FIFO automático"
              options={[
                { value: '', label: 'Automático (FIFO)' },
                ...(lotes || []).map((l: LoteComProdutoResponse) => ({ value: l.id, label: `${l.numeroLote} (${l.quantidade} unid.)` }))
              ]}
              {...register('loteId')}
              error={errors.loteId?.message as string}
              disabled={loadingLotes}
            />
          )}

          <Input
            label="Doc. Referência (Opcional)"
            placeholder="Ex: FT 2024/001"
            {...register('documentoRef')}
            error={errors.documentoRef?.message as string}
          />
        </div>

        <Textarea 
          label="Motivo / Observações" 
          placeholder="Ex: Reposição de stock mensal, Ajuste de inventário, etc..." 
          {...register('motivo')}
          error={errors.motivo?.message as string}
        />

        {tipo === 'SAIDA' && (produto.estoqueAtual || 0) < watch('quantidade') && (
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
            variant={tipo === 'ENTRADA' ? 'primary' : 'danger'}
            className="shadow-lg"
          >
            Confirmar {TIPO_LABELS[tipo]?.label}
          </Button>
        </div>
      </form>
    </div>
  );
};
