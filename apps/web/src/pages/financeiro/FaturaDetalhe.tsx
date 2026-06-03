import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import { getApiErrorMessage } from '../../lib/errorUtils';
import { useFatura, useEmitirFatura, useAnularFatura, useNotaDebito, useRegistarPagamento, useSubmeterSeguro, useRegistarRespostaSeguro } from '../../hooks/useFaturas';
import { useClinicaMe } from '../../hooks/useClinicas';
import { 
  Button, 
  Card, 
  Badge, 
  Spinner, 
  ErrorMessage,
  Modal,
  Input,
  Select,
  Table
} from '@clinicaplus/ui';
import { 
  Printer, 
  Ban, 
  CheckCircle2, 
  CreditCard, 
  ArrowLeft,
  User,
  Calendar,
  DollarSign,
  ShieldCheck,
  Send,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { formatKwanza } from '@clinicaplus/utils';
import { EstadoFatura, MetodoPagamento, PagamentoCreateSchema, type PagamentoCreateInput, type ItemFaturaDTO, EstadoSeguro, TipoFatura, TipoItemFatura } from '@clinicaplus/types';
import { FaturaStatusBadge } from '../../components/financeiro/FaturaStatusBadge';
import { FaturaPrint } from '../../components/print/FaturaPrint';
import { useForm, type SubmitHandler, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';

export default function FaturaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { data: fatura, isLoading, error } = useFatura(id!);
  const { data: clinica } = useClinicaMe();
  
  const emitirMutation = useEmitirFatura();
  const anularMutation = useAnularFatura();
  const notaDebitoMutation = useNotaDebito();
  
  const submeterSeguro = useSubmeterSeguro();
  const registarResposta = useRegistarRespostaSeguro();

  const [activeTab, setActiveTab] = useState<'detalhes' | 'preview'>('detalhes');
  const [isRespostaModalOpen, setIsRespostaModalOpen] = useState(false);
  const [respostaData, setRespostaData] = useState<{ estado: 'APROVADO' | 'GLOSADO', valorAprovado: number, notas: string }>({
    estado: 'APROVADO',
    valorAprovado: 0,
    notas: ''
  });

  const [isPagamentoModalOpen, setIsPagamentoModalOpen] = useState(false);
  const [isAnularModalOpen, setIsAnularModalOpen] = useState(false);
  const [isNDModalOpen, setIsNDModalOpen] = useState(false);
  const [motivoAnulacao, setMotivoAnulacao] = useState('');
  
  // Estados para Nota de Débito expandida
  const [ndDescricao, setNdDescricao] = useState('');
  const [ndPrecoUnit, setNdPrecoUnit] = useState(0);
  const [ndQuantidade, setNdQuantidade] = useState(1);

  const handlePrint = () => {
    window.print();
  };

  const insurancePayment = useMemo(() => {
    return fatura?.pagamentos?.find(p => p.metodo === MetodoPagamento.SEGURO);
  }, [fatura?.pagamentos]);

  const totalPago = useMemo(() => {
    return (fatura?.pagamentos || []).reduce((acc, p) => acc + p.valor, 0);
  }, [fatura?.pagamentos]);

  const percentagemPaga = useMemo(() => {
    if (!fatura || fatura.total === 0) return 0;
    return (totalPago / fatura.total) * 100;
  }, [totalPago, fatura]);

  if (isLoading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;
  if (error || !fatura) return <ErrorMessage error={error || 'Fatura não encontrada'} />;

  const handleEmitir = async () => {
    try {
      await emitirMutation.mutateAsync(fatura.id);
      toast.success('Fatura emitida com sucesso!');
    } catch {
      toast.error('Erro ao emitir fatura.');
    }
  };

  const handleAnular = async () => {
    if (!motivoAnulacao) {
      toast.error('Motivo é obrigatório');
      return;
    }
    try {
      await anularMutation.mutateAsync({ id: fatura.id, motivo: motivoAnulacao });
      setIsAnularModalOpen(false);
      toast.success('Nota de Crédito (Anulação) gerada com sucesso.');
    } catch {
      toast.error('Erro ao anular fatura.');
    }
  };

  const handleND = async () => {
    if (!ndDescricao || ndPrecoUnit <= 0) {
      toast.error('Descrição e valor são obrigatórios');
      return;
    }
    try {
      await notaDebitoMutation.mutateAsync({ 
        id: fatura.id, 
        motivo: ndDescricao,
        itens: [{
          tipoItem: TipoItemFatura.SERVICO,
          descricao: ndDescricao,
          quantidade: ndQuantidade,
          precoUnit: ndPrecoUnit,
          taxaIva: 14, // Padrão
          codigoIva: 'IVA',
          desconto: 0
        }]
      });
      setIsNDModalOpen(false);
      setNdDescricao('');
      setNdPrecoUnit(0);
      toast.success('Nota de Débito (Complementar) gerada e emitida.');
    } catch (err: unknown) {
      toast.error('Erro ao gerar nota de débito: ' + getApiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <Link to="/admin/financeiro">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              Fatura {fatura.numeroFatura || '(Rascunho)'}
            </h1>
            <div className="flex items-center gap-2">
              <FaturaStatusBadge estado={fatura.estado} />
              <span className="text-xs text-neutral-400 font-mono">ID: {fatura.id}</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <div className="flex rounded-lg bg-neutral-100 p-1 mr-4">
            <button 
              onClick={() => setActiveTab('detalhes')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'detalhes' ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              Detalhes
            </button>
            <button 
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'preview' ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
              disabled={fatura.estado === EstadoFatura.RASCUNHO}
            >
              Pré-visualização
            </button>
          </div>

           <Button variant="secondary" title="Imprimir" onClick={handlePrint} disabled={fatura.estado === EstadoFatura.RASCUNHO}>
            <Printer className="h-4 w-4 mr-2" /> Imprimir
          </Button>
          {fatura.estado === EstadoFatura.RASCUNHO && (
            <Button onClick={handleEmitir} loading={emitirMutation.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Emitir Fatura
            </Button>
          )}
          {fatura.estado === EstadoFatura.EMITIDA && (
             <Button onClick={() => setIsPagamentoModalOpen(true)}>
                <CreditCard className="h-4 w-4 mr-2" /> Registar Pagamento
             </Button>
          )}
          {(fatura.estado === EstadoFatura.EMITIDA || fatura.estado === EstadoFatura.PAGA) && (
            <>
              <Button variant="secondary" className="hover:text-amber-600" onClick={() => setIsNDModalOpen(true)}>
                <DollarSign className="h-4 w-4 mr-2" /> Nota Débito (ND)
              </Button>
              <Button variant="secondary" className="hover:text-red-600 hover:border-red-200" onClick={() => setIsAnularModalOpen(true)}>
                <Ban className="h-4 w-4 mr-2" /> Anular (NC)
              </Button>
            </>
          )}
        </div>
      </div>

      {activeTab === 'preview' && fatura.estado !== EstadoFatura.RASCUNHO ? (
        <div className="max-w-4xl mx-auto bg-neutral-800 p-8 rounded-2xl shadow-2xl overflow-hidden border-4 border-neutral-700">
           <div className="bg-white rounded shadow-lg transform origin-top scale-[0.85] -mb-[15%]">
             <FaturaPrint fatura={fatura} clinica={clinica!} isPreview />
           </div>
           <p className="text-center text-neutral-400 text-xs mt-4">Documento conforme legislação angolana. Use o botão imprimir para exportar em PDF ou papel.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                  <User className="h-3 w-3" /> Paciente
                </h3>
                <div>
                  <p className="font-bold text-neutral-900">{fatura.paciente?.nome || '---'}</p>
                  <p className="text-xs text-neutral-500">{fatura.paciente?.numeroPaciente || fatura.pacienteId}</p>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                  <Calendar className="h-3 w-3" /> Datas
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-neutral-500 uppercase">Emissão</p>
                    <p className="text-xs font-medium">{fatura.dataEmissao ? new Date(fatura.dataEmissao).toLocaleDateString() : '---'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-neutral-500 uppercase">Vencimento</p>
                    <p className="text-xs font-medium">{fatura.dataVencimento ? new Date(fatura.dataVencimento).toLocaleDateString() : '---'}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto -mx-4 px-4">
                <Table
                  columns={[
                    { header: 'Descrição', accessor: 'descricao' },
                    { header: 'Qtd', accessor: 'quantidade', className: 'text-center' },
                    { header: 'Preço', accessor: (i: ItemFaturaDTO) => formatKwanza(i.precoUnit), className: 'text-right' },
                    { header: 'Imposto', accessor: (i: ItemFaturaDTO) => <span className="text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-600 font-bold">{i.codigoIva || 'IVA'}</span>, className: 'text-center' },
                  { header: 'Taxa', accessor: (i: ItemFaturaDTO) => `${i.taxaIva}%`, className: 'text-center' },
                  { header: 'V. Imposto', accessor: (i: ItemFaturaDTO) => formatKwanza(Math.round(((i.precoUnit * i.quantidade) - (i.desconto || 0)) * (i.taxaIva / 100))), className: 'text-right' },
                  { header: 'Desconto', accessor: (i: ItemFaturaDTO) => i.desconto > 0 ? `-${formatKwanza(i.desconto)}` : '---', className: 'text-right' },
                  { header: 'Total', accessor: (i: ItemFaturaDTO) => <span className="font-extrabold text-neutral-900">{formatKwanza(i.total)}</span>, className: 'text-right' },
                ]}
                data={fatura.itens || []}
                keyExtractor={(i) => i.id}
              />
              </div>
              <div className="p-6 bg-neutral-50 border-t border-neutral-100">
                 <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-xs text-neutral-500">
                        <span>Subtotal (Incidência)</span>
                        <span className="font-mono">{formatKwanza(fatura.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-red-600">
                        <span>Desconto Global</span>
                        <span className="font-mono">-{formatKwanza(fatura.desconto)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-neutral-500">
                        <span>Total Imposto (IVA)</span>
                        <span className="font-mono">+{formatKwanza(fatura.total - (fatura.subtotal - fatura.desconto))}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-primary-700 pt-2 border-t border-neutral-200">
                        <span>Total a Pagar</span>
                        <span className="font-mono">{formatKwanza(fatura.total)}</span>
                      </div>
                    </div>
                 </div>
              </div>
            </Card>

            {fatura.notas && (
              <Card className="p-4 bg-amber-50/50 border-amber-100">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-2">Observações</h3>
                <p className="text-sm text-amber-900">{fatura.notas}</p>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="p-6 space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                <DollarSign className="h-3 w-3" /> Estado do Pagamento
              </h3>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Total Pago</span>
                  <span className="font-bold font-mono text-success-600">{formatKwanza(totalPago)}</span>
                </div>
                <div className="h-3 bg-neutral-100 rounded-full overflow-hidden border border-neutral-200">
                  <div 
                    className={`h-full transition-all duration-1000 ${percentagemPaga >= 100 ? 'bg-success-500' : 'bg-primary-500'}`}
                    style={{ width: `${Math.min(100, percentagemPaga)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-neutral-400 font-bold uppercase">
                  <span>{percentagemPaga.toFixed(0)}% Pago</span>
                  <span>Faltam {formatKwanza(Math.max(0, fatura.total - totalPago))}</span>
                </div>
              </div>
            </Card>

            <Card className="p-0 overflow-hidden">
              <div className="p-4 bg-neutral-50 border-b border-neutral-100 flex justify-between items-center">
                 <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500">Histórico de Pagamentos</h3>
                 <p className="text-[10px] text-neutral-400 font-medium">Liquidação de FT</p>
              </div>
              {fatura.pagamentos && fatura.pagamentos.length > 0 ? (
                <div className="divide-y divide-neutral-100">
                  {fatura.pagamentos.map(p => (
                    <div key={p.id} className="p-4 group hover:bg-neutral-50 transition-colors">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-neutral-900">{formatKwanza(p.valor)}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] h-4">{p.metodo}</Badge>
                            {p.numeroRecibo && (
                              <span className="text-[10px] font-mono text-primary-600 font-bold">{p.numeroRecibo}</span>
                            )}
                          </div>
                        </div>
                        {p.numeroRecibo && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity" 
                            title="Imprimir Recibo (RC)"
                            onClick={() => {
                              const printWindow = window.open('', '_blank');
                              if (printWindow) {
                                toast.success('Gerando documento para impressão...');
                              }
                            }}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-neutral-500 mt-2">
                        <span>{new Date(p.criadoEm).toLocaleString()}</span>
                        {p.referencia && <span>Ref: {p.referencia}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center space-y-2">
                  <CreditCard className="h-8 w-8 text-neutral-200 mx-auto" />
                  <p className="text-xs text-neutral-400">Nenhum pagamento registado.</p>
                </div>
              )}
            </Card>

            {fatura.tipo === TipoFatura.SEGURO && insurancePayment && (
              <Card className="p-0 overflow-hidden border-primary-100 bg-primary-50/20">
                <div className="p-4 bg-primary-50 border-b border-primary-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-primary-700 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" /> Estado do Seguro
                  </h3>
                  <Badge variant={
                    insurancePayment.seguro?.estado === EstadoSeguro.APROVADO ? 'success' :
                    insurancePayment.seguro?.estado === EstadoSeguro.GLOSADO ? 'error' :
                    insurancePayment.seguro?.estado === EstadoSeguro.SUBMETIDO ? 'warning' : 'outline'
                  }>
                    {insurancePayment.seguro?.estado || 'PENDENTE'}
                  </Badge>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-neutral-500 uppercase font-bold">Seguradora</p>
                      <p className="text-sm font-bold text-neutral-900">{insurancePayment.seguro?.seguradora}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-500 uppercase font-bold">Valor Solicitado</p>
                      <p className="text-sm font-mono font-bold text-neutral-900">{formatKwanza(insurancePayment.seguro?.valorSolicitado || 0)}</p>
                    </div>
                  </div>

                  {insurancePayment.seguro?.estado === EstadoSeguro.PENDENTE && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
                      <Send className="h-5 w-5 text-amber-500 mt-0.5" />
                      <div className="space-y-2">
                        <p className="text-sm text-amber-800">Este seguro ainda não foi submetido à seguradora para aprovação.</p>
                        <Button size="sm" onClick={() => submeterSeguro.mutate(insurancePayment.id)} loading={submeterSeguro.isPending}>
                          Submeter à Seguradora
                        </Button>
                      </div>
                    </div>
                  )}

                  {insurancePayment.seguro?.estado === EstadoSeguro.SUBMETIDO && (
                    <div className="bg-primary-50 border border-primary-200 p-4 rounded-lg flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-primary-500 mt-0.5" />
                      <div className="space-y-2">
                        <p className="text-sm text-primary-800">Seguro submetido em {insurancePayment.seguro?.dataSubmissao ? new Date(insurancePayment.seguro.dataSubmissao).toLocaleDateString() : '---'}. Aguardando resposta.</p>
                        <Button size="sm" onClick={() => {
                          setRespostaData({ ...respostaData, valorAprovado: insurancePayment.seguro?.valorSolicitado || 0 });
                          setIsRespostaModalOpen(true);
                        }}>
                          Registar Resposta
                        </Button>
                      </div>
                    </div>
                  )}

                  {insurancePayment.seguro?.estado === EstadoSeguro.APROVADO && (
                    <div className="space-y-4">
                      <div className="bg-success-50 border border-success-200 p-4 rounded-lg flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-success-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-success-800 font-bold">Seguro Aprovado</p>
                          <p className="text-xs text-success-700">Valor Aprovado: {formatKwanza(insurancePayment.seguro?.valorAprovado || 0)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {insurancePayment.seguro?.estado === EstadoSeguro.GLOSADO && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-red-800 font-bold">Seguro Glosado</p>
                        <p className="text-xs text-red-700">Motivo: {insurancePayment.seguro?.notasSeguradora || 'Não especificado'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={isRespostaModalOpen} onClose={() => setIsRespostaModalOpen(false)} title="Registar Resposta da Seguradora">
        <div className="space-y-4 pt-2">
          <Select 
            label="Resultado"
            options={[
              { value: 'APROVADO', label: 'Aprovado' },
              { value: 'GLOSADO', label: 'Glosado' },
            ]}
            value={respostaData.estado}
            onChange={(e) => setRespostaData({ ...respostaData, estado: e.target.value as 'APROVADO' | 'GLOSADO' })}
          />
          {respostaData.estado === 'APROVADO' && (
            <Input 
              label="Valor Aprovado (Kz)"
              type="number"
              value={respostaData.valorAprovado}
              onChange={(e) => setRespostaData({ ...respostaData, valorAprovado: Number(e.target.value) })}
            />
          )}
          <Input 
            label="Notas / Motivo"
            placeholder="Ex: Autorização nº 12345..."
            value={respostaData.notas}
            onChange={(e) => setRespostaData({ ...respostaData, notas: e.target.value })}
          />
          <div className="flex gap-3 pt-4">
            <Button variant="ghost" fullWidth onClick={() => setIsRespostaModalOpen(false)}>Cancelar</Button>
            <Button fullWidth onClick={() => {
              registarResposta.mutate({
                pagamentoId: insurancePayment!.id,
                ...respostaData
              }, {
                onSuccess: () => setIsRespostaModalOpen(false)
              });
            }} loading={registarResposta.isPending}>
              Submeter Resposta
            </Button>
          </div>
        </div>
      </Modal>

      <PagamentoModal 
        isOpen={isPagamentoModalOpen} 
        onClose={() => setIsPagamentoModalOpen(false)}
        faturaId={fatura.id}
        valorPendente={fatura.total - totalPago}
        seguradoras={clinica?.configuracao?.seguradoras || []}
      />

      <Modal isOpen={isAnularModalOpen} onClose={() => setIsAnularModalOpen(false)} title="Anular Fatura (Nota de Crédito)">
        <div className="space-y-4 pt-2">
          <p className="text-sm text-neutral-600">Deseja gerar uma Nota de Crédito para anular esta fatura?</p>
          <Input label="Motivo da Anulação" placeholder="Ex: Erro nos dados do cliente..." value={motivoAnulacao} onChange={(e) => setMotivoAnulacao(e.target.value)} />
          <div className="flex gap-3 pt-4">
            <Button variant="ghost" fullWidth onClick={() => setIsAnularModalOpen(false)}>Cancelar</Button>
            <Button variant="secondary" fullWidth className="text-red-600" onClick={handleAnular} loading={anularMutation.isPending}>Gerar NC</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isNDModalOpen} onClose={() => setIsNDModalOpen(false)} title="Gerar Nota de Débito (ND)">
        <div className="space-y-4 pt-2">
          <p className="text-sm text-neutral-600">A Nota de Débito é usada para retificações positivas ou encargos adicionais.</p>
          <Input label="Descrição do Ajuste" placeholder="Ex: Encargos adicionais de transporte..." value={ndDescricao} onChange={(e) => setNdDescricao(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Valor Unitário (Kz)" type="number" value={ndPrecoUnit} onChange={(e) => setNdPrecoUnit(Number(e.target.value))} />
            <Input label="Quantidade" type="number" value={ndQuantidade} onChange={(e) => setNdQuantidade(Number(e.target.value))} />
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="ghost" fullWidth onClick={() => setIsNDModalOpen(false)}>Cancelar</Button>
            <Button fullWidth onClick={handleND} loading={notaDebitoMutation.isPending}>Emitir Nota de Débito</Button>
          </div>
        </div>
      </Modal>

      {/* Hidden Print Component via Portal */}
      {clinica && fatura && createPortal(
        <div className="fatura-print-portal hidden no-print:hidden print:block">
          <FaturaPrint fatura={fatura} clinica={clinica} />
        </div>,
        document.body
      )}
    </div>
  );
}

function PagamentoModal({ isOpen, onClose, faturaId, valorPendente, seguradoras }: { 
  isOpen: boolean; 
  onClose: () => void; 
  faturaId: string;
  valorPendente: number;
  seguradoras: string[];
}) {
  const mutation = useRegistarPagamento();
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<PagamentoCreateInput>({
    resolver: zodResolver(PagamentoCreateSchema) as unknown as Resolver<PagamentoCreateInput>,
    defaultValues: {
      faturaId,
      metodo: MetodoPagamento.TPA,
      valor: valorPendente
    }
  });

  const watchMetodo = watch('metodo');

  React.useEffect(() => {
    if (watchMetodo === MetodoPagamento.SEGURO) {
      setValue('seguro.valorSolicitado', valorPendente);
    }
  }, [watchMetodo, valorPendente, setValue]);

  const onSubmit: SubmitHandler<PagamentoCreateInput> = async (data) => {
    try {
      await mutation.mutateAsync({ ...data, faturaId });
      toast.success('Pagamento registado!');
      reset();
      onClose();
    } catch (err: unknown) {
      toast.error('Erro ao registar pagamento: ' + getApiErrorMessage(err));
    }
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registar Pagamento">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
        <Select 
          label="Método"
          options={[
            { value: MetodoPagamento.TPA, label: 'TPA' },
            { value: MetodoPagamento.DINHEIRO, label: 'Dinheiro' },
            { value: MetodoPagamento.TRANSFERENCIA_BANCARIA, label: 'Transferência' },
            { value: MetodoPagamento.SEGURO, label: 'Seguro' },
          ]}
          {...register('metodo')}
        />
        <Input label="Valor" type="number" {...register('valor', { valueAsNumber: true })} error={errors.valor?.message as string} />
        <Input label="Referência" {...register('referencia')} />
        {watchMetodo === MetodoPagamento.SEGURO && (
          <div className="p-4 bg-primary-50 rounded-lg space-y-4">
            <Select label="Seguradora" options={seguradoras.map(s => ({ value: s, label: s }))} {...register('seguro.seguradora')} />
            <Input label="Nº Beneficiário" {...register('seguro.numeroBeneficiario')} />
            <Input label="Nº Autorização" {...register('seguro.numeroAutorizacao')} />
            <Input label="Valor Solicitado" type="number" {...register('seguro.valorSolicitado', { valueAsNumber: true })} />
          </div>
        )}
        <div className="flex gap-3 pt-4">
          <Button variant="ghost" fullWidth type="button" onClick={onClose}>Cancelar</Button>
          <Button fullWidth type="submit" loading={mutation.isPending}>Confirmar</Button>
        </div>
      </form>
    </Modal>
  );
}
