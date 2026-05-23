import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle, 
  XCircle,
  FileText,
  Building,
  Plus,
  Trash2,
  Clock
} from 'lucide-react';
import { 
  Button, 
  Card, 
  Input, 
  Select, 
  Badge, 
  Spinner, 
  Modal,
  cn
} from '@clinicaplus/ui';
import { apiClient } from '../../api/client';
import { useClinicaMe, useUpdateClinicaMe } from '../../hooks/useClinicas';
import { formatKwanza, formatDate } from '@clinicaplus/utils';
import { EstadoSeguro } from '@clinicaplus/types';
import { useForm } from 'react-hook-form';

// --- Types ---
interface SeguroPagamentoDTO {
  pagamentoId: string;
  seguradora: string;
  numeroBeneficiario: string;
  numeroAutorizacao?: string;
  valorSolicitado: number;
  valorAprovado?: number | null;
  estado: EstadoSeguro;
  dataSubmissao?: string;
  dataResposta?: string;
  notasSeguradora?: string;
  pagamento: {
    id: string;
    valor: number;
    criadoEm: string;
    fatura: {
      id: string;
      numeroFatura: string;
      estado: string;
      paciente: {
        id: string;
        nome: string;
        numeroPaciente?: string;
      }
    }
  }
}

// --- Hooks ---
const useSeguros = (params: { page: number; limit: number; estado?: string; seguradora?: string }) => {
  return useQuery({
    queryKey: ['seguros', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/seguros', { params });
      return data as { items: SeguroPagamentoDTO[], total: number };
    }
  });
};

const useUpdateSeguro = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ pagamentoId, data }: { pagamentoId: string, data: any }) => {
      const res = await apiClient.patch(`/seguros/${pagamentoId}/status`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seguros'] });
    }
  });
};

// --- Modals ---
function SeguroStatusModal({ isOpen, onClose, seguro }: { isOpen: boolean; onClose: () => void; seguro: SeguroPagamentoDTO | null }) {
  const updateSeguro = useUpdateSeguro();
  
  const form = useForm({
    defaultValues: {
      estado: seguro?.estado || EstadoSeguro.PENDENTE,
      valorAprovado: seguro?.valorAprovado || '',
      numeroAutorizacao: seguro?.numeroAutorizacao || '',
      notasSeguradora: seguro?.notasSeguradora || ''
    }
  });

  React.useEffect(() => {
    if (seguro) {
      form.reset({
        estado: seguro.estado,
        valorAprovado: seguro.valorAprovado || seguro.valorSolicitado, // Default to requested
        numeroAutorizacao: seguro.numeroAutorizacao || '',
        notasSeguradora: seguro.notasSeguradora || ''
      });
    }
  }, [seguro, form]);

  const estadoSelecionado = form.watch('estado');

  if (!seguro) return null;

  const onSubmit = (data: any) => {
    updateSeguro.mutate({
      pagamentoId: seguro.pagamentoId,
      data: {
        ...data,
        valorAprovado: data.valorAprovado ? Number(data.valorAprovado) : null
      }
    }, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  const isFinalState = ['APROVADO', 'PARCIAL', 'GLOSADO'].includes(estadoSelecionado as string);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Atualizar Estado do Seguro">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        
        <div className="p-4 bg-neutral-50 rounded-xl mb-4 text-sm font-medium">
           <p className="text-neutral-500">Paciente: <span className="text-neutral-900 font-bold">{seguro.pagamento.fatura.paciente.nome}</span></p>
           <p className="text-neutral-500">Seguradora: <span className="text-neutral-900 font-bold">{seguro.seguradora}</span> ({seguro.numeroBeneficiario})</p>
           <p className="text-neutral-500">Valor Solicitado: <span className="text-primary-600 font-bold">{formatKwanza(seguro.valorSolicitado)}</span></p>
        </div>

        <Select 
          label="Novo Estado" 
          options={[
            { value: 'PENDENTE', label: 'Pendente (Aguardando Envio)' },
            { value: 'SUBMETIDO', label: 'Submetido (Enviado / Em Lote)' },
            { value: 'EM_ANALISE', label: 'Em Análise' },
            { value: 'APROVADO', label: 'Aprovado (Total)' },
            { value: 'PARCIAL', label: 'Aprovado Parcialmente (Glosa Parcial)' },
            { value: 'GLOSADO', label: 'Glosado (Rejeitado)' },
            { value: 'PAGO', label: 'Pago / Liquidado' },
            { value: 'CANCELADO', label: 'Cancelado' }
          ]} 
          {...form.register('estado')} 
        />

        {isFinalState && (
          <div className="space-y-4 pt-2 border-t border-neutral-100">
            <Input 
              label="Valor Aprovado pela Seguradora" 
              type="number" 
              min="0"
              {...form.register('valorAprovado')} 
            />
            <Input 
              label="Nº de Autorização / Comprovativo" 
              placeholder="Opcional"
              {...form.register('numeroAutorizacao')} 
            />
            <Input 
              label="Notas da Seguradora (Motivo de Glosa)" 
              placeholder="Opcional"
              {...form.register('notasSeguradora')} 
            />
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={onClose} type="button">Cancelar</Button>
          <Button type="submit" loading={updateSeguro.isPending}>Atualizar</Button>
        </div>
      </form>
    </Modal>
  );
}


// --- Main Page ---
export default function SegurosPage() {
  const [activeTab, setActiveTab] = useState<'claims' | 'config'>('claims');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: clinica } = useClinicaMe();
  const { mutate: updateClinica } = useUpdateClinicaMe();
  const queryParams: any = { page, limit };
  if (estadoFilter) queryParams.estado = estadoFilter;
  const { data: segurosData, isLoading } = useSeguros(queryParams);

  const [selectedSeguro, setSelectedSeguro] = useState<SeguroPagamentoDTO | null>(null);

  const getStatusBadge = (estado: string) => {
    switch(estado) {
      case 'PENDENTE': return <Badge variant="warning"><Clock className="w-3 h-3 mr-1"/> Pendente</Badge>;
      case 'SUBMETIDO': return <Badge variant="info">Submetido</Badge>;
      case 'EM_ANALISE': return <Badge variant="info">Em Análise</Badge>;
      case 'APROVADO': return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1"/> Aprovado</Badge>;
      case 'PARCIAL': return <Badge variant="warning">Parcial</Badge>;
      case 'GLOSADO': return <Badge variant="error"><XCircle className="w-3 h-3 mr-1"/> Glosado</Badge>;
      case 'PAGO': return <Badge variant="success">Pago</Badge>;
      default: return <Badge variant="neutral">{estado}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Seguros de Saúde</h1>
          <p className="text-neutral-500 text-sm font-medium">Faça a gestão dos seguros, glosas, submissões e configurações das seguradoras.</p>
        </div>
      </div>

      <div className="flex border-b border-neutral-200">
        <button 
          onClick={() => setActiveTab('claims')}
          className={cn("px-4 py-3 text-sm font-bold border-b-2 transition-colors", activeTab === 'claims' ? 'border-primary-600 text-primary-600' : 'border-transparent text-neutral-500 hover:text-neutral-900')}
        >
          Gestão de Reclamações
        </button>
        <button 
          onClick={() => setActiveTab('config')}
          className={cn("px-4 py-3 text-sm font-bold border-b-2 transition-colors", activeTab === 'config' ? 'border-primary-600 text-primary-600' : 'border-transparent text-neutral-500 hover:text-neutral-900')}
        >
          Configurações (Seguradoras)
        </button>
      </div>

      {activeTab === 'config' && (
        <Card className="p-8">
           <div className="flex items-center justify-between mb-6">
              <div>
                 <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-900">Seguradoras Aceites</h3>
                 <p className="text-xs text-neutral-500 mt-1 font-medium">Lista de seguradoras disponíveis na clínica para a emissão de faturas.</p>
              </div>
              <Button 
                size="sm" 
                variant="primary" 
                className="font-bold gap-2"
                onClick={() => {
                   const nova = window.prompt('Nome da Seguradora (ex: ENSA, Fidelidade):');
                   if (nova && clinica?.configuracao) {
                      const lista = [...(clinica.configuracao.seguradoras || []), nova];
                      updateClinica({ configuracao: { seguradoras: lista } });
                   }
                }}
              >
                 <Plus className="w-4 h-4" /> Adicionar Seguradora
              </Button>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(clinica?.configuracao?.seguradoras || []).length === 0 ? (
                 <div className="col-span-full p-12 border-2 border-dashed border-neutral-100 rounded-2xl text-center">
                    <Building className="w-8 h-8 mx-auto mb-3 text-neutral-200" />
                    <p className="text-sm font-medium text-neutral-400 italic">Nenhuma seguradora configurada no momento.</p>
                 </div>
              ) : (
                (clinica?.configuracao?.seguradoras || []).map((seg: string, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-2xl hover:border-primary-200 shadow-sm transition-all">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 font-bold">
                           {seg.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-sm font-bold text-neutral-900">{seg}</p>
                     </div>
                     <Button 
                       variant="ghost" 
                       size="sm"
                       className="text-danger-500 hover:bg-danger-50"
                       onClick={() => {
                          if (window.confirm(`Tem a certeza que deseja remover ${seg}?`)) {
                             const lista = (clinica?.configuracao?.seguradoras || []).filter((s: string) => s !== seg);
                             updateClinica({ configuracao: { seguradoras: lista } });
                          }
                       }}
                     >
                        <Trash2 className="w-4 h-4" />
                     </Button>
                  </div>
                ))
              )}
           </div>
        </Card>
      )}

      {activeTab === 'claims' && (
        <Card className="p-0 border-neutral-200/60 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
             <div className="flex items-center gap-2 w-full md:w-auto">
               <Select 
                 options={[
                   { value: '', label: 'Todos os Estados' },
                   { value: 'PENDENTE', label: 'Pendente' },
                   { value: 'SUBMETIDO', label: 'Submetido' },
                   { value: 'APROVADO', label: 'Aprovado' },
                   { value: 'GLOSADO', label: 'Glosado' },
                 ]}
                 value={estadoFilter}
                 onChange={(e) => setEstadoFilter(e.target.value)}
                 className="min-w-[200px]"
               />
             </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 text-[10px] uppercase tracking-widest text-neutral-500 font-bold border-b border-neutral-100">
                  <th className="p-4">Fatura / Data</th>
                  <th className="p-4">Paciente</th>
                  <th className="p-4">Seguradora</th>
                  <th className="p-4">Valor Solicitado</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-neutral-100">
                {isLoading ? (
                  <tr><td colSpan={6} className="p-10 text-center"><Spinner className="mx-auto" /></td></tr>
                ) : !segurosData?.items.length ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-neutral-400 font-medium">
                       Nenhum registo de seguro encontrado.
                    </td>
                  </tr>
                ) : (
                  segurosData.items.map((seguro) => (
                    <tr key={seguro.pagamentoId} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-neutral-900">{seguro.pagamento.fatura.numeroFatura}</div>
                        <div className="text-xs text-neutral-500">{formatDate(seguro.pagamento.criadoEm)}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-neutral-900">{seguro.pagamento.fatura.paciente.nome}</div>
                        <div className="text-xs text-neutral-500">{seguro.numeroBeneficiario}</div>
                      </td>
                      <td className="p-4">
                         <div className="font-bold text-neutral-900">{seguro.seguradora}</div>
                         {seguro.numeroAutorizacao && <div className="text-[10px] text-neutral-500 mt-0.5">Aut: {seguro.numeroAutorizacao}</div>}
                      </td>
                      <td className="p-4">
                         <div className="font-bold text-primary-600">{formatKwanza(seguro.valorSolicitado)}</div>
                         {seguro.valorAprovado != null && (
                            <div className="text-[10px] font-bold text-success-600 mt-0.5">Apr: {formatKwanza(seguro.valorAprovado)}</div>
                         )}
                      </td>
                      <td className="p-4">
                         {getStatusBadge(seguro.estado)}
                         {seguro.dataSubmissao && <div className="text-[10px] text-neutral-400 mt-1">Submetido: {formatDate(seguro.dataSubmissao)}</div>}
                      </td>
                      <td className="p-4 text-right">
                         <Button variant="ghost" size="sm" onClick={() => setSelectedSeguro(seguro)}>
                            Atualizar
                         </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <SeguroStatusModal 
        isOpen={!!selectedSeguro} 
        onClose={() => setSelectedSeguro(null)} 
        seguro={selectedSeguro} 
      />
    </div>
  );
}
