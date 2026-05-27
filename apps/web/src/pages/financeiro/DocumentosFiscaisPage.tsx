import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  TipoDocumentoFiscal, 
  EstadoFatura, 
  FaturaDTO 
} from '@clinicaplus/types';
import { useFaturas } from '../../hooks/useFaturas';
import { 
  Button, 
  Card, 
  Table, 
  Badge,
  Input
} from '@clinicaplus/ui';
import { 
  Plus, 
  Search, 
  FileText, 
  Receipt, 
  FileMinus, 
  FilePlus, 
  Eye,
  ArrowRight
} from 'lucide-react';
import { formatKwanza } from '@clinicaplus/utils';
import { FaturaStatusBadge } from '../../components/financeiro/FaturaStatusBadge';

const DOCUMENT_TYPES = [
  { 
    id: TipoDocumentoFiscal.FT, 
    label: 'Factura (FT)', 
    description: 'Documento para vendas a crédito. Exige emissão de Recibo posterior para quitação.',
    relevance: 'Comum para convênios e empresas.',
    icon: FileText,
    color: 'text-blue-600',
    bg: 'bg-blue-50'
  },
  { 
    id: TipoDocumentoFiscal.FR, 
    label: 'Factura-Recibo (FR)', 
    description: 'Documento de pronto pagamento. Liquida a transação de imediato.',
    relevance: 'Ideal para consultas particulares pagas na hora.',
    icon: Receipt,
    color: 'text-green-600',
    bg: 'bg-green-50'
  },
  { 
    id: TipoDocumentoFiscal.RC, 
    label: 'Recibo (RC)', 
    description: 'Documento que prova a quitação de uma Factura (FT).',
    relevance: 'Obrigatório para fechar o ciclo de uma FT.',
    icon: Receipt,
    color: 'text-purple-600',
    bg: 'bg-purple-50'
  },
  { 
    id: TipoDocumentoFiscal.NC, 
    label: 'Nota de Crédito (NC)', 
    description: 'Documento para rectificar facturas (anulação parcial ou total).',
    relevance: 'Usado para estornos e descontos concedidos após emissão.',
    icon: FileMinus,
    color: 'text-red-600',
    bg: 'bg-red-50'
  },
  { 
    id: TipoDocumentoFiscal.ND, 
    label: 'Nota de Débito (ND)', 
    description: 'Documento para debitar valores adicionais ao cliente.',
    relevance: 'Usado para cobrança de juros ou custos suplementares.',
    icon: FilePlus,
    color: 'text-amber-600',
    bg: 'bg-amber-50'
  },
];

export default function DocumentosFiscaisPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showSelector, setShowSelector] = useState(false);
  
  const { data, isLoading } = useFaturas({
    page: 1,
    limit: 20,
    // Listar todos os documentos fiscais emitidos
    estado: EstadoFatura.EMITIDA
  });

  const columns = [
    {
      header: 'Documento',
      accessor: (f: FaturaDTO) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs font-bold text-primary-700">
            {f.numeroFatura || '---'}
          </span>
          <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-tighter">
            {f.tipoDocFiscal}
          </span>
        </div>
      )
    },
    {
      header: 'Paciente',
      accessor: (f: FaturaDTO) => (
        <span className="font-medium text-neutral-900">{f.paciente?.nome || '---'}</span>
      )
    },
    {
      header: 'Total',
      accessor: (f: FaturaDTO) => (
        <span className="font-bold text-neutral-900">
          {formatKwanza(f.total)}
        </span>
      )
    },
    {
      header: 'Data de Emissão',
      accessor: (f: FaturaDTO) => (
        <span className="text-sm text-neutral-600">
          {f.dataEmissao ? new Date(f.dataEmissao).toLocaleDateString() : '---'}
        </span>
      )
    },
    {
      header: 'Estado',
      accessor: (f: FaturaDTO) => <FaturaStatusBadge estado={f.estado} />
    },
    {
      header: 'Ações',
      className: 'text-right',
      accessor: (f: FaturaDTO) => (
        <Link to={`/admin/financeiro/${f.id}`}>
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4 mr-2" /> Detalhes
          </Button>
        </Link>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Documentos Fiscais</h1>
          <p className="text-neutral-500 text-sm">Gestão centralizada de conformidade AGT (FT, FR, RC, NC, ND).</p>
        </div>
        <Button onClick={() => setShowSelector(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo Documento
        </Button>
      </div>

      {showSelector && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in slide-in-from-top-4 duration-300">
          {DOCUMENT_TYPES.map((type) => (
            <Card 
              key={type.id} 
              className="p-5 hover:border-primary-300 transition-all cursor-pointer group relative overflow-hidden"
              onClick={() => {
                if (type.id === TipoDocumentoFiscal.FT || type.id === TipoDocumentoFiscal.FR) {
                  navigate(`/admin/financeiro/nova?tipo=${type.id}`);
                } else {
                  alert(`Para emitir um(a) ${type.label}, por favor selecione uma Factura existente na lista abaixo e clique em "Detalhes".`);
                }
              }}
            >
              <div className={`${type.bg} ${type.color} p-3 rounded-xl w-fit mb-4`}>
                <type.icon className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-neutral-900 flex items-center justify-between">
                {type.label}
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-neutral-600 mt-2 line-clamp-2 leading-relaxed">
                {type.description}
              </p>
              <div className="mt-4 pt-4 border-t border-neutral-100">
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Relevância:</span>
                <p className="text-[11px] text-neutral-500 mt-1">{type.relevance}</p>
              </div>
            </Card>
          ))}
          <Card 
            className="p-5 border-dashed border-2 flex flex-col items-center justify-center text-center bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer"
            onClick={() => setShowSelector(false)}
          >
            <p className="text-sm font-medium text-neutral-500 italic">Fechar seletor</p>
          </Card>
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/30">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input 
              placeholder="Pesquisar documento..." 
              className="pl-10 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">TOTAL EMITIDOS: {data?.total || 0}</Badge>
          </div>
        </div>
        
        <div className="overflow-x-auto -mx-4 px-4">
          <Table
            columns={columns}
            data={data?.items || []}
            isLoading={isLoading}
            keyExtractor={(f) => f.id}
            onRowClick={(f) => navigate(`/admin/financeiro/${f.id}`)}
          />
        </div>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-4">
        <div className="bg-blue-500 text-white p-2 rounded-lg h-fit">
          <FileText className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-blue-900">Boas Práticas de Facturação (AGT)</h4>
          <p className="text-xs text-blue-700 leading-relaxed">
            Sempre emita **Factura-Recibo (FR)** para pronto pagamento em dinheiro ou TPA. 
            Para pagamentos a prazo ou convênios, emita **Factura (FT)** e posteriormente o **Recibo (RC)** ao confirmar o crédito bancário.
            Notas de Crédito devem ser emitidas apenas para rectificação de erros ou anulações parciais.
          </p>
        </div>
      </div>
    </div>
  );
}
