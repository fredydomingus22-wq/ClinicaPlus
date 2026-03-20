import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useFatura, useEmitirFatura, useAnularFatura, useRegistarPagamento, useSubmeterSeguro, useRegistarRespostaSeguro } from '../../hooks/useFaturas';
import { usePaciente } from '../../hooks/usePacientes';
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
  AlertTriangle
} from 'lucide-react';
import { formatKwanza } from '@clinicaplus/utils';
import { EstadoFatura, MetodoPagamento, PagamentoCreateSchema, type PagamentoCreateInput, type ItemFaturaDTO, EstadoSeguro, TipoFatura } from '@clinicaplus/types';
import { FaturaStatusBadge } from '../../components/financeiro/FaturaStatusBadge';
import { useForm, type SubmitHandler, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';

export default function FaturaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { data: fatura, isLoading, error } = useFatura(id!);
  const { data: paciente } = usePaciente(fatura?.pacienteId || '');
  
  const emitirMutation = useEmitirFatura();
  const anularMutation = useAnularFatura();
  
  const submeterSeguro = useSubmeterSeguro();
  const registarResposta = useRegistarRespostaSeguro();

  const insurancePayment = useMemo(() => {
    return fatura?.pagamentos?.find(p => p.metodo === MetodoPagamento.SEGURO);
  }, [fatura?.pagamentos]);

  const [isRespostaModalOpen, setIsRespostaModalOpen] = useState(false);
  const [respostaData, setRespostaData] = useState<{ estado: 'APROVADO' | 'REJEITADO', valorAprovado: number, notas: string }>({
    estado: 'APROVADO',
    valorAprovado: insurancePayment?.valor || 0,
    notas: ''
  });

  const [isPagamentoModalOpen, setIsPagamentoModalOpen] = useState(false);
  const [isAnularModalOpen, setIsAnularModalOpen] = useState(false);
  const [motivoAnulacao, setMotivoAnulacao] = useState('');

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
      toast.success('Fatura anulada.');
    } catch {
      toast.error('Erro ao anular fatura.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
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
           <Button variant="secondary" title="Imprimir" disabled={fatura.estado === EstadoFatura.RASCUNHO}>
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
          {fatura.estado === EstadoFatura.EMITIDA && (
             <Button variant="secondary" className="hover:text-red-600 hover:border-red-200" onClick={() => setIsAnularModalOpen(true)}>
                <Ban className="h-4 w-4 mr-2" /> Anular
             </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Data & Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                <User className="h-3 w-3" /> Paciente
              </h3>
              <div>
                <p className="font-bold text-neutral-900">{paciente?.nome || 'Processando...'}</p>
                <p className="text-xs text-neutral-500">{paciente?.numeroPaciente || fatura.pacienteId}</p>
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

          <Card className="overflow-hidden">
            <Table 
              columns={[
                { header: 'Descrição', accessor: 'descricao' },
                { header: 'Qtd', accessor: 'quantidade', className: 'text-center' },
                { header: 'Preço', accessor: (i: ItemFaturaDTO) => formatKwanza(i.precoUnit), className: 'text-right' },
                { header: 'Desconto', accessor: (i: ItemFaturaDTO) => i.desconto > 0 ? `-${formatKwanza(i.desconto)}` : '---', className: 'text-right' },
                { header: 'Total', accessor: (i: ItemFaturaDTO) => <span className="font-bold">{formatKwanza(i.total)}</span>, className: 'text-right' },
              ]}
              data={fatura.itens || []}
              keyExtractor={(i) => i.id}
            />
            <div className="p-6 bg-neutral-50 border-t border-neutral-100">
               <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-xs text-neutral-500">
                      <span>Subtotal</span>
                      <span className="font-mono">{formatKwanza(fatura.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-red-600">
                      <span>Desconto Global</span>
                      <span className="font-mono">-{formatKwanza(fatura.desconto)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-primary-700 pt-2 border-t border-neutral-200">
                      <span>Total</span>
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

        {/* Right Column: Payments */}
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
            <div className="p-4 bg-neutral-50 border-b border-neutral-100">
               <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500">Histórico de Pagamentos</h3>
            </div>
            {fatura.pagamentos && fatura.pagamentos.length > 0 ? (
              <div className="divide-y divide-neutral-100">
                {fatura.pagamentos.map(p => (
                  <div key={p.id} className="p-4 space-y-1">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-bold text-neutral-900">{formatKwanza(p.valor)}</p>
                      <Badge variant="outline" className="text-[9px]">{p.metodo}</Badge>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-neutral-500">
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

          {/* Insurance State Panel */}
          {fatura.tipo === TipoFatura.SEGURO && insurancePayment && (
            <Card className="p-0 overflow-hidden border-primary-100 bg-primary-50/20">
              <div className="p-4 bg-primary-50 border-b border-primary-100 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-primary-700 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> Estado do Seguro
                </h3>
                <Badge variant={
                  insurancePayment.seguro?.estado === EstadoSeguro.APROVADO ? 'success' :
                  insurancePayment.seguro?.estado === EstadoSeguro.REJEITADO ? 'error' :
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
                    {(insurancePayment.seguro?.valorAprovado ?? 0) < (insurancePayment.seguro?.valorSolicitado ?? 0) && (
                       <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                        <p className="text-xs text-amber-800">O valor aprovado é inferior ao solicitado. Cobrar a diferença ao paciente.</p>
                      </div>
                    )}
                  </div>
                )}

                {insurancePayment.seguro?.estado === EstadoSeguro.REJEITADO && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-800 font-bold">Seguro Rejeitado</p>
                      <p className="text-xs text-red-700">Motivo: {insurancePayment.seguro?.notasSeguradora || 'Não especificado'}</p>
                      <p className="text-xs text-red-900 font-bold mt-2">Contactar paciente para pagamento particular.</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Modal Resposta Seguro */}
      <Modal isOpen={isRespostaModalOpen} onClose={() => setIsRespostaModalOpen(false)} title="Registar Resposta da Seguradora">
        <div className="space-y-4 pt-2">
          <Select 
            label="Resultado"
            options={[
              { value: 'APROVADO', label: 'Aprovado' },
              { value: 'REJEITADO', label: 'Rejeitado' },
            ]}
            value={respostaData.estado}
            onChange={(e) => setRespostaData({ ...respostaData, estado: e.target.value as 'APROVADO' | 'REJEITADO' })}
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

      {/* Pagamento Modal */}
      <PagamentoModal 
        isOpen={isPagamentoModalOpen}
        onClose={() => setIsPagamentoModalOpen(false)}
        faturaId={fatura.id}
        valorPendente={fatura.total - totalPago}
      />

      {/* Anular Modal */}
      <Modal 
        isOpen={isAnularModalOpen} 
        onClose={() => setIsAnularModalOpen(false)}
        title="Anular Fatura"
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-neutral-600">Tem a certeza que deseja anular esta fatura? Esta acção é irreversível.</p>
          <Input 
            label="Motivo da Anulação" 
            placeholder="Ex: Erro nos itens, duplicidade..."
            value={motivoAnulacao}
            onChange={(e) => setMotivoAnulacao(e.target.value)}
          />
          <div className="flex gap-3 pt-4">
            <Button variant="ghost" fullWidth onClick={() => setIsAnularModalOpen(false)}>Cancelar</Button>
            <Button variant="secondary" fullWidth className="text-red-600 hover:bg-red-50 hover:border-red-200" onClick={handleAnular} loading={anularMutation.isPending}>
               Confirmar Anulação
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PagamentoModal({ isOpen, onClose, faturaId, valorPendente }: { 
  isOpen: boolean; 
  onClose: () => void; 
  faturaId: string;
  valorPendente: number;
}) {
  const mutation = useRegistarPagamento();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<PagamentoCreateInput>({
    resolver: zodResolver(PagamentoCreateSchema) as unknown as Resolver<PagamentoCreateInput>,
    defaultValues: {
      faturaId,
      metodo: MetodoPagamento.TPA,
      valor: valorPendente
    }
  });

  const onSubmit: SubmitHandler<PagamentoCreateInput> = async (data) => {
    try {
      await mutation.mutateAsync({ ...data, faturaId });
      toast.success('Pagamento registado!');
      reset();
      onClose();
    } catch {
      toast.error('Erro ao registar pagamento.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registar Pagamento">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
        <Select 
          label="Método de Pagamento"
          options={[
            { value: MetodoPagamento.TPA, label: 'TPA / Multicaixa' },
            { value: MetodoPagamento.DINHEIRO, label: 'Dinheiro (Cash)' },
            { value: MetodoPagamento.TRANSFERENCIA_BANCARIA, label: 'Transferência Bancária' },
            { value: MetodoPagamento.SEGURO, label: 'Seguro de Saúde' },
          ]}
          {...register('metodo')}
          error={errors.metodo?.message as string}
        />
        
        <Input 
          label="Valor a Pagar (Kz)"
          type="number"
          {...register('valor', { valueAsNumber: true })}
          error={errors.valor?.message as string}
        />
        
        <Input 
          label="Referência / Nº Comprovativo (Opcional)"
          placeholder="Ex: MCX-123456"
          {...register('referencia')}
        />

        <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
           <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-500">Valor Pendente na Fatura:</span>
              <span className="font-bold text-neutral-900 font-mono">{formatKwanza(valorPendente)}</span>
           </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="ghost" fullWidth type="button" onClick={onClose}>Cancelar</Button>
          <Button fullWidth type="submit" loading={mutation.isPending}>Confirmar Pagamento</Button>
        </div>
      </form>
    </Modal>
  );
}
