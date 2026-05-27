import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Plus,
  Package,
  FileText,
  Hash,
} from 'lucide-react';
import {
  Input,
  Button,
  Select,
  Switch,
  Textarea,
} from '@clinicaplus/ui';
import { useInventory } from '../../hooks/useInventory';
import { CategoryQuickCreate } from './CategoryQuickCreate';
import { CreateProdutoSchema, type CreateProdutoInput, type UpdateProdutoInput } from '../../schemas/inventory.schema';
import type { ProdutoResponse } from '../../types/inventory.types';

interface ProdutoFormProps {
  initialData?: ProdutoResponse | undefined;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const ProdutoForm: React.FC<ProdutoFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const { useCategorias, useCreateProduto, useUpdateProduto } = useInventory();
  const { data: categorias, isLoading: loadingCats } = useCategorias();
  const { mutate: create, isPending: criando } = useCreateProduto();
  const { mutate: update, isPending: atualizando } = useUpdateProduto(initialData?.id || '');

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateProdutoInput>({
    resolver: zodResolver(CreateProdutoSchema) as any,
    defaultValues: initialData ? {
      categoriaId: initialData.categoriaId,
      codigo: initialData.codigo || '',
      nome: initialData.nome,
      descricao: initialData.descricao || '',
      precoCusto: initialData.precoCusto,
      precoVenda: initialData.precoVenda,
      taxaIva: initialData.taxaIva,
      codigoIva: initialData.codigoIva,
      motivoIsencao: initialData.motivoIsencao || '',
      tipo: initialData.tipo,
      gerenciaEstoque: initialData.gerenciaEstoque,
      estoqueMinimo: initialData.estoqueMinimo,
    } : {
      tipo: 'PRODUTO',
      taxaIva: 14,
      codigoIva: 'IVA',
      gerenciaEstoque: true,
      estoqueMinimo: 0,
      precoCusto: 0,
      precoVenda: 0,
      codigo: '',
      descricao: '',
      motivoIsencao: '',
      categoriaId: '',
    }
  });

  const tipo = watch('tipo');
  const gerenciaEstoque = watch('gerenciaEstoque');

  const onSubmit = (data: CreateProdutoInput) => {
    if (initialData?.id) {
      update(data as UpdateProdutoInput, { onSuccess: () => onSuccess?.() });
    } else {
      create(data, { onSuccess: () => onSuccess?.() });
    }
  };

  const categoriaOptions = (categorias || []).map(cat => ({
    value: cat.id,
    label: cat.nome
  }));

  return (
    <div className="animate-fade-in pb-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Tipo de Registro */}
        <div className="flex gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
          <button
            type="button"
            onClick={() => setValue('tipo', 'PRODUTO')}
            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
              tipo === 'PRODUTO'
                ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-sm'
                : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-300'
            }`}
          >
            <Package className="w-4 h-4" />
            <span className="text-sm font-bold">Produto</span>
          </button>
          <button
            type="button"
            onClick={() => setValue('tipo', 'SERVICO')}
            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
              tipo === 'SERVICO'
                ? 'bg-secondary-50 border-secondary-200 text-secondary-700 shadow-sm'
                : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-sm font-bold">Serviço</span>
          </button>
        </div>

        {/* Informações Básicas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input 
              label="Nome do Item" 
              placeholder="Ex: Paracetamol 500mg ou Consulta Geral" 
              {...register('nome')}
              error={errors.nome?.message as string}
            />
          </div>
          
          <div className="flex items-end gap-2 text-primary-600">
            <Select 
              label="Categoria" 
              options={categoriaOptions}
              placeholder="Seleccionar..."
              {...register('categoriaId')}
              error={errors.categoriaId?.message as string}
              disabled={loadingCats}
            />
            <Button 
              type="button" 
              variant="ghost" 
              className="h-9 w-9 p-0 mb-1 border-dashed border-2 border-neutral-200 hover:border-primary-300"
              onClick={() => setIsCategoryModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <Input 
            label="Código / SKU / Referência" 
            placeholder="Ex: MED-001" 
            {...register('codigo')}
            error={errors.codigo?.message as string}
          />
        </div>

        <Textarea 
          label="Descrição (Opcional)" 
          placeholder="Detalhes técnicos, dosagem ou escopo do serviço..." 
          {...register('descricao')}
        />

        {/* Preços e Impostos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-primary-50/30 rounded-xl border border-primary-50">
          <Input 
            label="Preço de Custo (AKZ)" 
            type="number"
            {...register('precoCusto', { valueAsNumber: true })}
            error={errors.precoCusto?.message as string}
          />
          <Input 
            label="Preço de Venda (AKZ)" 
            type="number"
            {...register('precoVenda', { valueAsNumber: true })}
            error={errors.precoVenda?.message as string}
          />
          <Input 
            label="Taxa IVA (%)" 
            type="number"
            {...register('taxaIva', { valueAsNumber: true })}
            error={errors.taxaIva?.message as string}
          />
          <Select 
            label="Código IVA" 
            options={[
              { value: 'IVA', label: 'Sujeito a IVA' },
              { value: 'ISE', label: 'Isento' },
              { value: 'OUT', label: 'Outro' }
            ]}
            {...register('codigoIva')}
            error={errors.codigoIva?.message as string}
          />
          {watch('codigoIva') === 'ISE' && (
            <div className="md:col-span-2 lg:col-span-3">
              <Input 
                label="Motivo de Isenção" 
                placeholder="Ex: M01 - Artigo 14 do CIVA"
                {...register('motivoIsencao')}
                error={errors.motivoIsencao?.message as string}
              />
            </div>
          )}
        </div>

        {/* Gestão de Estoque (Apenas para Produtos) */}
        {tipo === 'PRODUTO' && (
          <div className="space-y-4 p-4 border border-neutral-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-neutral-400" />
                <span className="text-sm font-bold text-neutral-700">Controlo de Inventário</span>
              </div>
              <Switch
                checked={gerenciaEstoque}
                onCheckedChange={(val) => setValue('gerenciaEstoque', val)}
              />
            </div>

            {gerenciaEstoque && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                <Input
                  label="Estoque Mínimo (Alerta)"
                  type="number"
                  placeholder="Ex: 10"
                  {...register('estoqueMinimo', { valueAsNumber: true })}
                />
                <div className="flex flex-col justify-end">
                  <div className="text-[11px] text-neutral-500 bg-neutral-50 p-2 rounded border border-dashed border-neutral-200">
                    <p>O sistema enviará alertas quando o estoque atingir este valor.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-3 pt-4 sticky bottom-0 bg-white border-t border-neutral-100 py-2">
          <Button type="button" variant="ghost" fullWidth onClick={onCancel}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            fullWidth 
            loading={criando || atualizando}
            className="shadow-lg shadow-primary-100"
          >
            {initialData?.id ? 'Atualizar Registro' : 'Finalizar Cadastro'}
          </Button>
        </div>
      </form>

      <CategoryQuickCreate 
        isOpen={isCategoryModalOpen} 
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={(id) => setValue('categoriaId', id)}
      />
    </div>
  );
};
