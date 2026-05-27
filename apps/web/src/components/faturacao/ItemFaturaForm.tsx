import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ItemFaturaSchema, TipoItemFatura } from '@clinicaplus/types';
import { ItemFacturavelSelect } from './ItemFacturavelSelect';

interface ItemFaturaFormProps {
  clinicaId: string;
  onSubmit: (item: any) => void;
}

export function ItemFaturaForm({ clinicaId, onSubmit }: ItemFaturaFormProps) {
  const form = useForm({
    resolver: zodResolver(ItemFaturaSchema),
    defaultValues: {
      tipoItem: TipoItemFatura.SERVICO,
      quantidade: 1,
      desconto: 0,
    },
  });

  const tipoItem = form.watch('tipoItem');
  const itemId = form.watch('produtoId') || form.watch('tratamentoId') || 
                 form.watch('exameId') || form.watch('medicoId');

  // Auto-preencher quando item seleccionado
  const handleItemChange = (item: any) => {
    if (!item) {
      // Limpar todos os IDs
      form.setValue('produtoId', undefined);
      form.setValue('tratamentoId', undefined);
      form.setValue('exameId', undefined);
      form.setValue('medicoId', undefined);
      form.setValue('descricao', '');
      return;
    }

    // Definir tipoItem
    form.setValue('tipoItem', item.tipo);

    // Definir ID correspondente
    switch (item.tipo) {
      case TipoItemFatura.PRODUTO:
        form.setValue('produtoId', item.id);
        break;
      case TipoItemFatura.TRATAMENTO:
        form.setValue('tratamentoId', item.id);
        break;
      case TipoItemFatura.EXAME:
        form.setValue('exameId', item.id);
        break;
      case TipoItemFatura.CONSULTA:
        form.setValue('medicoId', item.id);
        break;
    }

    // Auto-preencher campos
    form.setValue('descricao', item.nome);
    form.setValue('precoUnit', item.preco);
    form.setValue('taxaIva', item.taxaIva);
    form.setValue('codigoIva', item.codigoIva);
    form.setValue('motivoIsencao', item.motivoIsencao || undefined);
  };

  // Limpar IDs quando tipo muda para SERVICO
  const handleTipoChange = (novoTipo: string) => {
    if (novoTipo === TipoItemFatura.SERVICO) {
      form.setValue('produtoId', undefined);
      form.setValue('tratamentoId', undefined);
      form.setValue('exameId', undefined);
      form.setValue('medicoId', undefined);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
          <select
            {...form.register('tipoItem')}
            onChange={(e) => handleTipoChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={TipoItemFatura.PRODUTO}>Produto</option>
            <option value={TipoItemFatura.TRATAMENTO}>Tratamento</option>
            <option value={TipoItemFatura.EXAME}>Exame</option>
            <option value={TipoItemFatura.CONSULTA}>Consulta</option>
            <option value={TipoItemFatura.SERVICO}>Serviço</option>
          </select>
        </div>

        {tipoItem && tipoItem !== TipoItemFatura.SERVICO && (
          <div className="col-span-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
            <ItemFacturavelSelect
              clinicaId={clinicaId}
              tipo={tipoItem}
              value={itemId || ''}
              onChange={handleItemChange}
            />
          </div>
        )}
        
        <div className={tipoItem === TipoItemFatura.SERVICO ? 'col-span-7' : 'col-span-4'}>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <input
            {...form.register('descricao')}
            placeholder="Descrição"
            disabled={tipoItem !== TipoItemFatura.SERVICO && !!itemId}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Qtd</label>
          <input
            type="number"
            {...form.register('quantidade', { valueAsNumber: true })}
            placeholder="1"
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Preço (Kz)</label>
          <input
            type="number"
            {...form.register('precoUnit', { valueAsNumber: true })}
            placeholder="0"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Adicionar Item
      </button>
    </form>
  );
}
