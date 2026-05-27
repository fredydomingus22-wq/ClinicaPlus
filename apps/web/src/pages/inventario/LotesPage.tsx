import React, { useState } from 'react';
import { 
  Plus, 
  Package, 
  Calendar,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { 
  Table, 
  Button, 
  Badge, 
  Modal,
  KpiCard
} from '@clinicaplus/ui';
import { useInventory } from '../../hooks/useInventory';
import { LoteForm } from '../../components/inventory/LoteForm';
import { format } from 'date-fns';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient as api } from '../../api/client';

export default function LotesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { useProduto } = useInventory();
  const { data: produto, isLoading: loadingProduto } = useProduto(id!);

  const { data: lotesData, isLoading: loadingLotes } = useQuery({
    queryKey: ['inventory', 'lotes', id],
    queryFn: async () => {
      const { data } = await api.get(`/inventory/produtos/${id}/lotes`);
      return data.data;
    },
    enabled: !!id,
  });

  const handleBack = () => {
    navigate('/inventario/catalogo');
  };

  const getValidadeStatus = (dataValidade: string | null) => {
    if (!dataValidade) return { status: 'neutral', label: 'Sem validade', color: 'bg-neutral-100 text-neutral-600' };
    
    const validade = new Date(dataValidade);
    const hoje = new Date();
    const diasDiferenca = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diasDiferenca < 0) {
      return { status: 'error', label: 'Vencido', color: 'bg-danger-100 text-danger-700' };
    } else if (diasDiferenca <= 30) {
      return { status: 'error', label: `${diasDiferenca} dias`, color: 'bg-danger-100 text-danger-700' };
    } else if (diasDiferenca <= 60) {
      return { status: 'warning', label: `${diasDiferenca} dias`, color: 'bg-amber-100 text-amber-700' };
    } else {
      return { status: 'success', label: format(validade, 'dd/MM/yyyy'), color: 'bg-success-100 text-success-700' };
    }
  };

  const totalEstoque = lotesData?.reduce((sum: number, lote: any) => sum + lote.quantidade, 0) || 0;
  const lotesVencidos = lotesData?.filter((lote: any) => lote.dataValidade && new Date(lote.dataValidade) < new Date()).length || 0;
  const lotesCriticos = lotesData?.filter((lote: any) => {
    if (!lote.dataValidade) return false;
    const dias = Math.ceil((new Date(lote.dataValidade).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return dias > 0 && dias <= 30;
  }).length || 0;

  const columns = [
    {
      header: 'Número do Lote',
      accessor: (row: any) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
            <Package className="w-4 h-4" />
          </div>
          <span className="font-mono text-sm font-bold text-neutral-800">{row.numeroLote}</span>
        </div>
      )
    },
    {
      header: 'Validade',
      accessor: (row: any) => {
        const status = getValidadeStatus(row.dataValidade);
        return (
          <Badge variant="neutral" className={status.color}>
            {status.label}
          </Badge>
        );
      }
    },
    {
      header: 'Quantidade',
      accessor: (row: any) => (
        <span className="font-bold text-neutral-900">{row.quantidade} unid.</span>
      )
    },
    {
      header: 'Criado em',
      accessor: (row: any) => (
        <span className="text-xs text-neutral-500">{format(new Date(row.criadoEm), 'dd/MM/yyyy')}</span>
      )
    },
  ];

  if (loadingProduto) {
    return <div className="p-8 text-center text-neutral-500">Carregando...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Gestão de Lotes</h1>
          <p className="text-sm text-neutral-500">
            Produto: <span className="font-bold text-neutral-700">{produto?.nome}</span>
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="shadow-lg shadow-primary-100">
          <Plus className="w-4 h-4 mr-2" /> Novo Lote
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard title="Estoque Total" value={`${totalEstoque} unid.`} icon={Package} color="primary" />
        <KpiCard title="Lotes Vencidos" value={lotesVencidos} icon={AlertTriangle} color="danger" />
        <KpiCard title="Críticos (30d)" value={lotesCriticos} icon={Calendar} color="warning" />
      </div>

      {/* Tabela de Lotes */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto -mx-4 px-4">
          <Table
            columns={columns}
            data={lotesData || []}
            isLoading={loadingLotes}
            keyExtractor={(l) => l.id}
          />
        </div>
      </div>

      {/* Modal de Cadastro */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Novo Lote"
        size="lg"
      >
        {produto && (
          <LoteForm 
            produtoId={produto.id}
            onSuccess={() => setIsModalOpen(false)}
            onCancel={() => setIsModalOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
}
