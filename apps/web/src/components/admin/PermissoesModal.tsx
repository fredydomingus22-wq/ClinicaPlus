import React, { useState } from 'react';
import { 
  Modal, 
  Button, 
  Table, 
  Badge, 
  ErrorMessage 
} from '@clinicaplus/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { ShieldAlert, RotateCcw, Check, X, AlertCircle } from 'lucide-react';

interface PermissaoEfectiva {
  codigo: string;
  descricao: string;
  modulo: string;
  base: boolean;
  override: 'GRANT' | 'DENY' | null;
  efectivo: boolean;
}

interface PermissoesModalProps {
  isOpen: boolean;
  onClose: () => void;
  utilizadorId: string;
  utilizadorNome: string;
}

const PermissoesModal: React.FC<PermissoesModalProps> = ({ 
  isOpen, 
  onClose, 
  utilizadorId, 
  utilizadorNome 
}) => {
  const queryClient = useQueryClient();
  const [activeModulo, setActiveModulo] = useState<string | 'all'>('all');

  const { data: permissoes, isLoading, error } = useQuery({
    queryKey: ['utilizador-permissoes', utilizadorId],
    queryFn: async () => {
      const response = await apiClient.get(`/utilizadores/${utilizadorId}/permissoes`);
      return response.data as PermissaoEfectiva[];
    },
    enabled: isOpen
  });

  const mutation = useMutation({
    mutationFn: async ({ codigo, tipo }: { codigo: string, tipo: 'GRANT' | 'DENY' | 'RESET' }) => {
      await apiClient.put(`/utilizadores/${utilizadorId}/permissoes/${codigo}`, { tipo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utilizador-permissoes', utilizadorId] });
    }
  });

  const modulos = permissoes ? Array.from(new Set(permissoes.map((p) => p.modulo))) : [];

  const filteredPermissoes = permissoes?.filter((p) => 
    activeModulo === 'all' || p.modulo === activeModulo
  );

  const columns = [
    {
      header: 'Permissão',
      accessor: (p: PermissaoEfectiva) => (
        <div className="flex flex-col">
          <span className="font-bold text-xs">{p.codigo}</span>
          <span className="text-[10px] text-muted-foreground">{p.descricao}</span>
        </div>
      )
    },
    {
      header: 'Estado Base',
      accessor: (p: PermissaoEfectiva) => (
        p.base ? (
          <Badge variant="success" className="text-[9px]">Permitido</Badge>
        ) : (
          <Badge variant="neutral" className="text-[9px]">Negado</Badge>
        )
      )
    },
    {
      header: 'Override',
      accessor: (p: PermissaoEfectiva) => (
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant={p.override === 'GRANT' ? 'primary' : 'outline'}
            className="h-6 w-6 p-0"
            onClick={() => mutation.mutate({ codigo: p.codigo, tipo: 'GRANT' })}
            title="Conceder override"
          >
            <Check size={12} />
          </Button>
          <Button 
            size="sm" 
            variant={p.override === 'DENY' ? 'danger' : 'outline'}
            className="h-6 w-6 p-0"
            onClick={() => mutation.mutate({ codigo: p.codigo, tipo: 'DENY' })}
            title="Negar override"
          >
            <X size={12} />
          </Button>
          {p.override && (
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-6 w-6 p-0 text-amber-500"
              onClick={() => mutation.mutate({ codigo: p.codigo, tipo: 'RESET' })}
              title="Remover override"
            >
              <RotateCcw size={12} />
            </Button>
          )}
        </div>
      )
    },
    {
      header: 'Efectivo',
      align: 'right' as const,
      accessor: (p: PermissaoEfectiva) => (
        <div className="flex justify-end">
          {p.efectivo ? (
            <div className="flex items-center gap-1 text-green-600 font-bold text-[10px]">
               SIM {p.override && <ShieldAlert size={12} className="text-amber-500" />}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-600 font-bold text-[10px]">
               NÃO {p.override && <ShieldAlert size={12} className="text-amber-500" />}
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Permissões: ${utilizadorNome}`}
      size="xl"
    >
      <div className="space-y-4 pt-2">
        <div className="flex gap-2 border-b pb-4 overflow-x-auto">
          <Button 
            variant={activeModulo === 'all' ? 'primary' : 'ghost'} 
            size="sm"
            onClick={() => setActiveModulo('all')}
            className="text-[10px] uppercase tracking-widest font-bold"
          >
            Todos
          </Button>
          {(modulos as string[]).map(m => (
            <Button 
              key={m} 
              variant={activeModulo === m ? 'primary' : 'ghost'} 
              size="sm"
              onClick={() => setActiveModulo(m)}
              className="text-[10px] uppercase tracking-widest font-bold"
            >
              {m}
            </Button>
          ))}
        </div>

        {error && <ErrorMessage error={error} />}

        <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-neutral-100">
          <Table 
            columns={columns}
            data={filteredPermissoes || []}
            isLoading={isLoading}
            keyExtractor={(p) => p.codigo}
          />
        </div>

        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
          <AlertCircle size={16} className="text-amber-500 shrink-0" />
          <p className="text-[10px] text-amber-800">
            Ícones <ShieldAlert size={10} className="inline mx-0.5" /> indicam que a permissão efectiva foi alterada manualmente (override) e ignora a regra padrão do cargo.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onClose} variant="ghost">Fechar</Button>
        </div>
      </div>
    </Modal>
  );
};

export default PermissoesModal;
