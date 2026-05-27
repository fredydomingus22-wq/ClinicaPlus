import { useQuery } from '@tanstack/react-query';
import { Badge } from '@clinicaplus/ui';
import type { ItemFacturavelSelect, TipoItemFatura } from '@clinicaplus/types';
import { apiClient } from '../../api/client';

interface ItemFacturavelSelectProps {
  clinicaId: string;
  value?: string;
  tipo?: TipoItemFatura;
  onChange: (item: ItemFacturavelSelect | null) => void;
  disabled?: boolean;
}

const TIPO_LABELS: Record<TipoItemFatura, string> = {
  PRODUTO: 'Produto',
  TRATAMENTO: 'Tratamento',
  EXAME: 'Exame',
  CONSULTA: 'Consulta',
  SERVICO: 'Serviço',
};

const TIPO_COLORS: Record<TipoItemFatura, string> = {
  PRODUTO: 'bg-blue-100 text-blue-800',
  TRATAMENTO: 'bg-purple-100 text-purple-800',
  EXAME: 'bg-green-100 text-green-800',
  CONSULTA: 'bg-orange-100 text-orange-800',
  SERVICO: 'bg-gray-100 text-gray-800',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    minimumFractionDigits: 0,
  }).format(value);
}

export function ItemFacturavelSelect({ 
  clinicaId, 
  value, 
  tipo, 
  onChange, 
  disabled 
}: ItemFacturavelSelectProps) {
  const { data: itens, isLoading } = useQuery({
    queryKey: ['itens-facturaveis', clinicaId, tipo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tipo) params.append('tipo', tipo);
      const res = await apiClient.get<{ success: boolean; data: ItemFacturavelSelect[] }>(
        `/faturas/itens-facturaveis?${params.toString()}`
      );
      return res.data;
    },
  });

  const options = itens?.data || [];

  return (
    <div className="relative">
      <select
        value={value || ''}
        onChange={(e) => {
          const selected = options.find(opt => opt.id === e.target.value);
          onChange(selected || null);
        }}
        disabled={disabled || isLoading}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">Seleccionar item...</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.nome} - {formatCurrency(item.preco)}
            {item.tipo === 'PRODUTO' && ` (${item.estoqueAtual} un.)`}
          </option>
        ))}
      </select>
      {isLoading && (
        <div className="absolute right-8 top-1/2 -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
        </div>
      )}
    </div>
  );
}
