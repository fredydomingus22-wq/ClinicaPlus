import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Package, 
  FileText,
  MoreVertical,
  Edit,
  History,
  TrendingDown,
  ChevronRight,
  BarChart3,
  Activity,
  Layers
} from 'lucide-react';
import { 
  Table, 
  Button, 
  Input, 
  Badge, 
  Modal,
  KpiCard,
  Card
} from '@clinicaplus/ui';
import { useInventory } from '../../hooks/useInventory';
import { ProdutoForm } from '../../components/inventory/ProdutoForm';
import { formatKwanza } from '@clinicaplus/utils';
import { TipoProduto } from '@clinicaplus/types';
import { ProdutoListResponse, ProdutoResponse } from '../../types/inventory.types';
import { MovimentacaoEstoqueForm } from '../../components/inventory/MovimentacaoEstoqueForm';

export default function CatalogoPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [activeType, setActiveType] = useState<TipoProduto | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<ProdutoResponse | null>(null);

  const { useProdutos, useCategorias } = useInventory();
  const { data: categorias } = useCategorias();
  const filters: Record<string, unknown> = {};
  if (activeType !== 'ALL') filters.tipo = activeType;
  if (search) filters.busca = search;
  if (selectedCategory) filters.categoriaId = selectedCategory;

  const { data: produtos, isLoading } = useProdutos(filters);

  const handleEdit = (produto: ProdutoListResponse) => {
    setSelectedProduto(produto as ProdutoResponse);
    setIsModalOpen(true);
  };

  const handleMovement = (produto: ProdutoListResponse) => {
    setSelectedProduto(produto as ProdutoResponse);
    setIsMovementModalOpen(true);
  };

  const closeModals = () => {
    setIsModalOpen(false);
    setIsMovementModalOpen(false);
    setSelectedProduto(null);
  };

  const columns = [
    {
      header: 'Item / Referência',
      accessor: (row: ProdutoListResponse) => (
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${row.tipo === TipoProduto.PRODUTO ? 'bg-primary-50 text-primary-600' : 'bg-secondary-50 text-secondary-600'}`}>
            {row.tipo === TipoProduto.PRODUTO ? <Package className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </div>
          <div>
            <p className="font-bold text-neutral-900">{row.nome}</p>
            <p className="text-xs text-neutral-500 font-mono">{row.codigo || 'S/ REF'}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Categoria',
      accessor: (row: ProdutoListResponse) => (
        <Badge variant="neutral" className="bg-neutral-100 text-neutral-600 border-none">
          {row.categoria?.nome || 'Sem Categoria'}
        </Badge>
      )
    },
    {
      header: 'Preço Venda / IVA',
      accessor: (row: ProdutoListResponse) => (
        <div className="flex flex-col">
          <span className="font-bold text-neutral-900">{formatKwanza(row.precoVenda)}</span>
          <span className="text-[10px] text-neutral-500 uppercase">
            {row.codigoIva === 'ISE' ? 'Isento' : `IVA ${row.taxaIva}%`}
          </span>
        </div>
      )
    },
    {
      header: 'Estoque Atual',
      accessor: (row: ProdutoListResponse) => {
        if (row.tipo === TipoProduto.SERVICO || !row.gerenciaEstoque) return <span className="text-neutral-400">---</span>;
        
        const estoque = row.estoqueAtual || 0;
        const isBaixo = row.estoqueMinimo ? estoque <= row.estoqueMinimo : false;

        return (
          <div className="flex items-center gap-2">
            <span className={`font-bold ${isBaixo ? 'text-danger-600' : 'text-neutral-900'}`}>
              {estoque} unid.
            </span>
            {isBaixo && (
              <Badge variant="error" className="text-[10px] py-0 px-1.5 animate-pulse">Baixo</Badge>
            )}
          </div>
        );
      }
    },
    {
      header: 'Ações',
      align: 'right' as const,
      accessor: (row: ProdutoListResponse) => (
        <div className="flex justify-end gap-2">
          {row.tipo === TipoProduto.PRODUTO && row.gerenciaEstoque && (
            <>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 p-0 text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                onClick={() => navigate(`/admin/inventario/lotes/${row.id}`)}
                title="Gestão de Lotes"
              >
                <Layers className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 p-0 text-success-600 hover:text-success-700 hover:bg-success-50"
                onClick={() => handleMovement(row)}
                title="Movimentar Estoque"
              >
                <History className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 w-8 p-0 text-neutral-400 hover:text-primary-600 hover:bg-primary-50"
            onClick={() => handleEdit(row)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4 text-neutral-400" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Catálogo de Itens</h1>
          <p className="text-sm text-neutral-500">Gestão unificada de produtos farmacêuticos e serviços médicos.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="shadow-lg shadow-primary-100">
          <Plus className="w-4 h-4 mr-2" /> Novo Registro
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard title="Total de Itens" value={produtos?.length || 0} icon={Package} color="primary" />
        <KpiCard title="Produtos" value={produtos?.filter(p => p.tipo === TipoProduto.PRODUTO).length || 0} icon={ChevronRight} color="primary" />
        <KpiCard title="Serviços" value={produtos?.filter(p => p.tipo === TipoProduto.SERVICO).length || 0} icon={FileText} color="secondary" />
        <KpiCard title="Estoque Crítico" value={produtos?.filter(p => p.gerenciaEstoque && (p.estoqueAtual || 0) <= (p.estoqueMinimo || 0)).length || 0} icon={TrendingDown} color="danger" />
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex gap-2">
            <Button 
              variant={activeType === 'ALL' ? 'primary' : 'ghost'} 
              size="sm" 
              onClick={() => setActiveType('ALL')}
            >
              Todos
            </Button>
            <Button 
              variant={activeType === TipoProduto.PRODUTO ? 'primary' : 'ghost'} 
              size="sm"
              onClick={() => setActiveType(TipoProduto.PRODUTO)}
            >
              Produtos
            </Button>
            <Button 
              variant={activeType === TipoProduto.SERVICO ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setActiveType(TipoProduto.SERVICO)}
            >
              Serviços
            </Button>
          </div>

          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input 
              placeholder="Pesquisar por nome ou SKU..." 
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto -mx-4 px-4">
          <Table
            columns={columns}
            data={produtos || []}
            isLoading={isLoading}
            keyExtractor={(p) => p.id}
          />
        </div>
      </div>

      {/* Modal de Cadastro/Edição */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModals}
        title={selectedProduto ? 'Editar Item' : 'Novo Registro de Item'}
        size="lg"
      >
        <ProdutoForm 
          initialData={selectedProduto ? selectedProduto : undefined} 
          onSuccess={closeModals}
          onCancel={closeModals}
        />
      </Modal>

      {/* Modal de Movimentação */}
      <Modal
        isOpen={isMovementModalOpen}
        onClose={closeModals}
        title="Movimentação de Estoque"
        size="lg"
      >
        {selectedProduto && (
          <MovimentacaoEstoqueForm
            produto={selectedProduto}
            onSuccess={closeModals}
            onCancel={closeModals}
          />
        )}
      </Modal>

      {/* Footer - Quick Actions */}
      <Card className="p-4 mt-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Gestão de Inventário</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Acesso rápido a módulos relacionados</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/inventario/dashboard')}>
              <BarChart3 className="w-4 h-4 mr-2" /> Dashboard
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/configuracao/servicos')}>
              <Activity className="w-4 h-4 mr-2" /> Exames e Procedimentos
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
