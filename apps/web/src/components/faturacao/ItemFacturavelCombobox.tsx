import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ItemFacturavelSelect } from '@clinicaplus/types';
import { apiClient } from '../../api/client';
import { Search, X } from 'lucide-react';

interface Props {
  clinicaId: string;
  value: string;           // texto livre / nome do item seleccionado
  onSelect: (item: ItemFacturavelSelect) => void;
  onChange: (descricao: string) => void;  // para texto livre
  onClear: () => void;
  placeholder?: string;
}

const TIPO_LABEL: Record<string, string> = {
  PRODUTO: 'Produtos',
  CONSULTA: 'Consultas',
  EXAME: 'Exames',
  TRATAMENTO: 'Tratamentos',
};

const TIPO_COLOR: Record<string, string> = {
  PRODUTO: 'text-blue-600 bg-blue-50',
  CONSULTA: 'text-orange-600 bg-orange-50',
  EXAME: 'text-green-600 bg-green-50',
  TRATAMENTO: 'text-purple-600 bg-purple-50',
};

function formatKz(v: number) {
  return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', minimumFractionDigits: 0 }).format(v);
}

export function ItemFacturavelCombobox({ clinicaId, value, onSelect, onChange, onClear, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['itens-facturaveis-all', clinicaId],
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: ItemFacturavelSelect[] }>(
        '/faturas/itens-facturaveis'
      );
      return res.data.data ?? [];
    },
    staleTime: 30_000,
    enabled: !!clinicaId,
  });

  const allItems = data ?? [];

  const filtered = search.trim().length >= 1
    ? allItems.filter(i =>
        i.nome.toLowerCase().includes(search.toLowerCase()) ||
        (i.codigo ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : allItems;

  // Group by tipo
  const groups = filtered.reduce<Record<string, ItemFacturavelSelect[]>>((acc, item) => {
    const g = item.tipo;
    if (!acc[g]) acc[g] = [];
    acc[g]!.push(item);
    return acc;
  }, {});

  const groupOrder = ['PRODUTO', 'CONSULTA', 'EXAME', 'TRATAMENTO'];

  // Close on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = useCallback((item: ItemFacturavelSelect) => {
    setSelected(true);
    setSearch(item.nome);
    setOpen(false);
    onSelect(item);
  }, [onSelect]);

  const handleClear = useCallback(() => {
    setSelected(false);
    setSearch('');
    onClear();
    inputRef.current?.focus();
  }, [onClear]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSearch(v);
    setSelected(false);
    onChange(v);
    if (!open) setOpen(true);
  };

  const handleFocus = () => {
    if (!selected) setOpen(true);
  };

  const showDropdown = open && (filtered.length > 0 || isLoading);

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="absolute left-2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={selected ? value : search}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder ?? 'Pesquisar produto, exame, consulta…'}
          className={`
            w-full pl-7 pr-6 py-1.5 text-sm outline-none rounded border transition-colors
            ${selected
              ? 'border-primary-400 bg-primary-50 text-primary-900 font-medium'
              : 'border-neutral-200 bg-transparent focus:border-primary-400 focus:bg-white'
            }
          `}
        />
        {(selected || search) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-1.5 text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-xl max-h-72 overflow-y-auto text-sm">
          {isLoading ? (
            <div className="p-3 text-neutral-400 text-xs text-center">A carregar…</div>
          ) : (
            groupOrder.map(tipo => {
              const items = groups[tipo];
              if (!items?.length) return null;
              return (
                <div key={tipo}>
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-400 bg-neutral-50 border-b border-neutral-100 sticky top-0">
                    {TIPO_LABEL[tipo] ?? tipo}
                  </div>
                  {items.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-neutral-50 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${TIPO_COLOR[tipo] ?? 'text-neutral-600 bg-neutral-100'}`}>
                          {tipo === 'PRODUTO' ? 'PRD' : tipo === 'CONSULTA' ? 'CON' : tipo === 'EXAME' ? 'EXM' : 'TRT'}
                        </span>
                        <span className="text-neutral-800 truncate">{item.nome}</span>
                        {item.tipo === 'PRODUTO' && item.estoqueAtual !== undefined && (
                          <span className={`text-[10px] shrink-0 ${item.estoqueAtual > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {item.estoqueAtual} un.
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-xs text-neutral-500 shrink-0 ml-3">
                        {formatKz(item.preco)}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="p-3 text-neutral-400 text-xs text-center">
              Nenhum item encontrado — será registado como serviço livre
            </div>
          )}
        </div>
      )}
    </div>
  );
}
