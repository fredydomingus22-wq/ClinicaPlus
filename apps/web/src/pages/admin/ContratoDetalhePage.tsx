import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Input, Modal, Select, Tabs, Textarea, toast } from '@clinicaplus/ui';
import { FileText, Download, Eye, Upload, X, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { contractsApi } from '../../api/contracts';
import { faturasApi } from '../../api/faturas';
import { getApiErrorMessage } from '../../lib/errorUtils';

const STATUS_FLOW = ['DRAFT', 'REVIEW', 'PENDING_SIGNATURE', 'ACTIVE', 'TERMINATED'];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

export default function ContratoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('resumo');
  const [paymentForm, setPaymentForm] = useState({
    faturaId: '',
    valor: '',
    metodo: 'TRANSFERENCIA_BANCARIA',
    referencia: '',
    notas: '',
  });
  const [terminateReason, setTerminateReason] = useState('');
  const [renewForm, setRenewForm] = useState({ dataInicio: '', dataFim: '', observacoes: '' });
  const [amendForm, setAmendForm] = useState({
    motivo: '',
    effectiveDate: '',
    tipoAlteracao: 'TERMO',
    resumo: '',
    impactoFinanceiro: '0',
    observacoes: '',
  });
  const [confirmAction, setConfirmAction] = useState<'' | 'submit' | 'sign' | 'activate' | 'terminate' | 'renew'>('');
  const [lastReceiptInfo, setLastReceiptInfo] = useState<string>('');
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ['contract-detail', id],
    queryFn: () => contractsApi.getById(id as string),
    enabled: Boolean(id),
  });

  const eventsQuery = useQuery({
    queryKey: ['contract-events', id],
    queryFn: () => contractsApi.getEvents(id as string),
    enabled: Boolean(id),
  });

  const contractFaturasQuery = useQuery({
    queryKey: ['contract-faturas', detailQuery.data?.paciente?.id],
    queryFn: () =>
      faturasApi.getList({
        ...(detailQuery.data?.paciente?.id ? { pacienteId: detailQuery.data.paciente.id } : {}),
        page: 1,
        limit: 50,
      }),
    enabled: Boolean(detailQuery.data?.paciente?.id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['contracts'] });
    queryClient.invalidateQueries({ queryKey: ['contract-detail', id] });
    queryClient.invalidateQueries({ queryKey: ['contract-events', id] });
    queryClient.invalidateQueries({ queryKey: ['contract-faturas'] });
  };

  const submitMutation = useMutation({
    mutationFn: () => contractsApi.submit(id as string),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(getApiErrorMessage(e)),
  });
  const activateMutation = useMutation({
    mutationFn: () => contractsApi.activate(id as string),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(getApiErrorMessage(e)),
  });
  const signMutation = useMutation({
    mutationFn: () =>
      contractsApi.sign(id as string, {
        signerType: 'CLINIC',
        signerName: 'Assinatura Clinica',
        provider: 'INTERNAL_UI',
      }),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(getApiErrorMessage(e)),
  });
  const terminateMutation = useMutation({
    mutationFn: () =>
      contractsApi.terminate(id as string, {
        motivo: terminateReason,
        dataEfetiva: new Date().toISOString(),
      }),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(getApiErrorMessage(e)),
  });
  const renewMutation = useMutation({
    mutationFn: () =>
      contractsApi.renew(id as string, {
        dataInicio: new Date(renewForm.dataInicio).toISOString(),
        dataFim: new Date(renewForm.dataFim).toISOString(),
        ...(renewForm.observacoes ? { observacoes: renewForm.observacoes } : {}),
      }),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(getApiErrorMessage(e)),
  });
  const payInstallmentMutation = useMutation({
    mutationFn: (numero: number) =>
      contractsApi.payInstallment(id as string, numero, {
        metodo: paymentForm.metodo as any,
        ...(paymentForm.referencia ? { referencia: paymentForm.referencia } : {}),
        ...(paymentForm.notas ? { notas: paymentForm.notas } : {}),
        ...(paymentForm.faturaId ? { faturaId: paymentForm.faturaId } : {}),
      }),
    onSuccess: () => {
      invalidate();
      setLastReceiptInfo('Parcela liquidada com sucesso. Recibo (RC) emitido no módulo de faturação.');
    },
    onError: (e: any) => toast.error(getApiErrorMessage(e)),
  });
  const amendMutation = useMutation({
    mutationFn: () =>
      contractsApi.amend(id as string, {
        motivo: amendForm.motivo,
        effectiveDate: new Date(amendForm.effectiveDate).toISOString(),
        delta: {
          tipoAlteracao: amendForm.tipoAlteracao,
          resumo: amendForm.resumo,
          impactoFinanceiro: Number(amendForm.impactoFinanceiro || 0),
          observacoes: amendForm.observacoes,
        },
      }),
    onSuccess: () => {
      invalidate();
      setAmendForm({
        motivo: '',
        effectiveDate: '',
        tipoAlteracao: 'TERMO',
        resumo: '',
        impactoFinanceiro: '0',
        observacoes: '',
      });
    },
    onError: (e: any) => toast.error(getApiErrorMessage(e)),
  });

  const emitirFaturaContratoMutation = useMutation({
    mutationFn: async () => {
      const contract = detailQuery.data;
      if (!contract?.paciente?.id) throw new Error('Paciente do contrato nao identificado.');
      const marker = `[CONTRACT:${contract.id}]`;
      const existentes = await faturasApi.getList({
        pacienteId: contract.paciente.id,
        page: 1,
        limit: 100,
      });
      const faturaContrato = (existentes.items || []).find(
        (f: any) => (f.notas || '').includes(marker) && f.estado !== 'ANULADA',
      );
      if (faturaContrato?.id) {
        if (faturaContrato.estado === 'RASCUNHO') return faturasApi.emitir(faturaContrato.id);
        return faturaContrato;
      }
      const itens = (contract.servicos || []).map((item: any) => ({
        descricao: item.descricao || 'Item de contrato',
        quantidade: Number(item.quantidade) || 1,
        precoUnit: Number(item.precoUnitario) || 0,
        desconto: Number(item.desconto) || 0,
        taxaIva: 0,
        codigoIva: 'ISE',
      }));
      const fatura = await faturasApi.create({
        pacienteId: contract.paciente.id,
        tipo: 'PARTICULAR',
        tipoDocFiscal: 'FT',
        itens,
        desconto: 0,
        notas: `Fatura gerada a partir do contrato ${contract.numero} ${marker}`,
      } as any);
      return faturasApi.emitir(fatura.id);
    },
    onSuccess: (f: any) => {
      queryClient.invalidateQueries({ queryKey: ['contract-faturas'] });
      if (f?.id) navigate(`/admin/financeiro/${f.id}`);
    },
    onError: (e: any) => toast.error(getApiErrorMessage(e)),
  });

  const registerPaymentMutation = useMutation({
    mutationFn: () =>
      contractsApi.registerPayment(id as string, {
        ...(paymentForm.faturaId ? { faturaId: paymentForm.faturaId } : {}),
        valor: Number(paymentForm.valor),
        metodo: paymentForm.metodo as any,
        ...(paymentForm.referencia ? { referencia: paymentForm.referencia } : {}),
        ...(paymentForm.notas ? { notas: paymentForm.notas } : {}),
      }),
    onSuccess: () => {
      invalidate();
      setLastReceiptInfo('Pagamento registado com sucesso. Recibo (RC) emitido no módulo de faturação.');
      setPaymentForm({
        faturaId: paymentForm.faturaId,
        valor: '',
        metodo: 'TRANSFERENCIA_BANCARIA',
        referencia: '',
        notas: '',
      });
    },
    onError: (e: any) => toast.error(getApiErrorMessage(e)),
  });

  const contractMarker = id ? `[CONTRACT:${id}]` : '';
  const relatedContractFaturas = useMemo(() => {
    const all = (contractFaturasQuery.data?.items || []) as any[];
    if (!contractMarker) return [];
    return all
      .filter((f) => String(f?.notas || '').includes(contractMarker))
      .filter((f) => f.estado !== 'ANULADA');
  }, [contractFaturasQuery.data?.items, contractMarker]);
  const payableContractFaturas = useMemo(
    () => relatedContractFaturas.filter((f: any) => f.estado === 'EMITIDA'),
    [relatedContractFaturas],
  );
  const hasIssuedContractInvoice = useMemo(
    () =>
      relatedContractFaturas.some(
        (f: any) => f.estado && f.estado !== 'RASCUNHO' && f.estado !== 'ANULADA',
      ),
    [relatedContractFaturas],
  );
  const totalPaid = useMemo(
    () =>
      relatedContractFaturas.reduce(
        (acc: number, f: any) => acc + (Number(f.valorPago) || 0),
        0,
      ),
    [relatedContractFaturas],
  );
  const selectedFatura = useMemo(
    () => payableContractFaturas.find((f: any) => f.id === paymentForm.faturaId),
    [payableContractFaturas, paymentForm.faturaId],
  );
  const paymentValue = Number(paymentForm.valor || 0);

  useEffect(() => {
    if (paymentForm.faturaId) return;
    const firstPayableId = payableContractFaturas[0]?.id;
    if (firstPayableId) {
      setPaymentForm((prev) => ({ ...prev, faturaId: firstPayableId }));
    }
  }, [payableContractFaturas, paymentForm.faturaId]);

  if (detailQuery.isLoading) return <div className="p-6 text-sm text-neutral-500">Carregando contrato...</div>;
  if (!detailQuery.data) return <div className="p-6 text-sm text-danger-600">Contrato nao encontrado.</div>;

  const c = detailQuery.data;
  const financialProgress = c.valorTotal
    ? Math.min(100, Math.round((totalPaid / c.valorTotal) * 100))
    : 0;
  const isContractFullyPaid = Boolean(c.valorTotal) && totalPaid >= c.valorTotal;
  const canSubmitContract = ['DRAFT', 'REVIEW'].includes(c.status);
  const canSignContract = ['REVIEW', 'PENDING_SIGNATURE'].includes(c.status);
  const canActivateContract = c.status === 'PENDING_SIGNATURE';
  const canTerminateContract = !['TERMINATED', 'EXPIRED'].includes(c.status);
  const canRenewContract = ['TERMINATED', 'EXPIRED'].includes(c.status);
  const documents = (eventsQuery.data || []).filter((e) => ((e.payload as any)?.kind === 'DOCUMENT'));
  const currentStep = Math.max(0, STATUS_FLOW.indexOf(c.status));
  const paymentDisabledReason = (() => {
    if (isContractFullyPaid) return 'Contrato já totalmente pago.';
    if (!paymentForm.faturaId) return 'Selecione uma fatura emitida do contrato.';
    if (!paymentForm.valor) return 'Informe o valor do pagamento.';
    if (!Number.isFinite(paymentValue) || paymentValue <= 0) return 'Valor deve ser maior que zero.';
    if (selectedFatura) {
      const saldo = Math.max(Number(selectedFatura.total || 0) - Number(selectedFatura.valorPago || 0), 0);
      if (paymentValue > saldo) return `Valor excede o saldo da fatura (${saldo} AOA).`;
    }
    return '';
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Contrato {c.numero}</h1>
        <Button variant="ghost" onClick={() => navigate('/admin/contratos')}>
          Voltar
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="border border-neutral-200 p-3">
            <p className="text-xs text-neutral-500">Estado</p>
            <div className="mt-1">
              <Badge variant={c.status === 'ACTIVE' ? 'success' : 'neutral'}>{c.status}</Badge>
            </div>
          </div>
          <div className="border border-neutral-200 p-3">
            <p className="text-xs text-neutral-500">Paciente</p>
            <p className="mt-1 text-sm font-semibold">
              {c.paciente?.nome || '-'} {c.paciente?.numeroPaciente ? `(${c.paciente.numeroPaciente})` : ''}
            </p>
          </div>
          <div className="border border-neutral-200 p-3">
            <p className="text-xs text-neutral-500">Vigencia</p>
            <p className="mt-1 text-sm font-semibold">
              {new Date(c.dataInicio).toLocaleDateString()} - {new Date(c.dataFim).toLocaleDateString()}
            </p>
          </div>
          <div className="border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-xs text-neutral-500">Total</p>
            <p className="mt-1 text-base font-bold">
              {c.valorTotal} {c.moeda}
            </p>
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-neutral-500">
            <span>Progresso financeiro</span>
            <span>{financialProgress}%</span>
          </div>
          <div className="h-2 bg-neutral-100">
            <div className="h-2 bg-primary-600" style={{ width: `${financialProgress}%` }} />
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1 text-xs text-neutral-500">Fluxo de estado</div>
          <div className="grid grid-cols-5 gap-2">
            {STATUS_FLOW.map((step, idx) => (
              <div
                key={step}
                className={`border p-2 text-center text-[11px] font-semibold ${
                  idx <= currentStep
                    ? 'border-success-300 bg-success-50 text-success-700'
                    : 'border-neutral-200 text-neutral-500'
                }`}
              >
                {step}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirmAction('submit')}
            disabled={submitMutation.isPending || !canSubmitContract}
          >
            Enviar para assinatura
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirmAction('sign')}
            disabled={signMutation.isPending || !canSignContract}
          >
            Assinar (Clinica)
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirmAction('activate')}
            disabled={activateMutation.isPending || !canActivateContract}
          >
            Ativar
          </Button>
        </div>
      </Card>

      <Card className="p-3">
        <Tabs
          items={[
            { id: 'resumo', label: 'Resumo' },
            { id: 'servicos', label: 'Servicos' },
            { id: 'financeiro', label: 'Financeiro' },
            { id: 'clausulas', label: 'Clausulas' },
            { id: 'ciclo', label: 'Ciclo' },
            { id: 'assinaturas', label: 'Assinaturas' },
            { id: 'documentos', label: 'Documentos' },
            { id: 'historico', label: 'Historico' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </Card>

      {activeTab === 'resumo' && (
        <Card className="space-y-3 p-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <InfoBox label="Titulo" value={c.titulo} />
            <InfoBox label="Paciente" value={c.paciente?.nome || '-'} />
            <InfoBox label="Valor de entrada" value={`${c.valorEntrada || 0} ${c.moeda}`} />
            <InfoBox label="Observacoes" value={c.observacoes || '-'} />
            <InfoBox label="Clausula de rescisao" value={c.clausulaRescisao || '-'} full />
          </div>
        </Card>
      )}

      {activeTab === 'servicos' && (
        <Card className="space-y-2 p-3">
          <p className="text-sm font-semibold">Itens do contrato</p>
          {(c.servicos || []).map((item: any) => (
            <div key={item.id} className="grid grid-cols-1 gap-2 border-b border-neutral-100 pb-2 text-sm md:grid-cols-6">
              <div className="md:col-span-2">
                <p className="font-medium">{item.descricao}</p>
                <p className="text-xs text-neutral-500">{item.itemType}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Qtd</p>
                <p>{item.quantidade}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Unitario</p>
                <p>{item.precoUnitario} {c.moeda}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Desconto</p>
                <p>{item.desconto} {c.moeda}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Subtotal</p>
                <p className="font-semibold">{item.subtotal} {c.moeda}</p>
              </div>
            </div>
          ))}
        </Card>
      )}

      {activeTab === 'financeiro' && (
        <Card className="space-y-3 p-3">
          <div className="flex justify-between">
            <p className="text-sm font-semibold">Pagamentos e fatura do contrato</p>
            <Button
              variant="secondary"
              loading={emitirFaturaContratoMutation.isPending}
              disabled={!(c.servicos || []).length || !c.paciente?.id || hasIssuedContractInvoice}
              onClick={() => emitirFaturaContratoMutation.mutate()}
            >
              {hasIssuedContractInvoice ? 'Fatura ja emitida' : 'Emitir fatura do contrato'}
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
            <Select
              label="Fatura"
              value={paymentForm.faturaId}
              onChange={(e) => setPaymentForm((p) => ({ ...p, faturaId: e.target.value }))}
              placeholder="Selecione uma fatura emitida"
              options={payableContractFaturas.map((f: any) => ({
                value: f.id,
                label: `${f.numeroFatura} · ${f.total} AOA · ${f.estado}`,
              }))}
            />
            <Input
              label="Valor"
              name="valor_pagamento"
              autoComplete="off"
              type="number"
              value={paymentForm.valor}
              onChange={(e) => setPaymentForm((p) => ({ ...p, valor: e.target.value }))}
            />
            <Select
              label="Metodo"
              value={paymentForm.metodo}
              onChange={(e) => setPaymentForm((p) => ({ ...p, metodo: e.target.value }))}
              options={[
                { value: 'DINHEIRO', label: 'Dinheiro' },
                { value: 'TRANSFERENCIA_BANCARIA', label: 'Transferencia' },
                { value: 'TPA', label: 'TPA' },
                { value: 'SEGURO', label: 'Seguro' },
              ]}
            />
            <Input
              label="Referencia"
              name="referencia_pagamento"
              autoComplete="off"
              value={paymentForm.referencia}
              onChange={(e) => setPaymentForm((p) => ({ ...p, referencia: e.target.value }))}
            />
            <div className="flex items-end">
              <Button
                loading={registerPaymentMutation.isPending}
                onClick={() => registerPaymentMutation.mutate()}
                disabled={Boolean(paymentDisabledReason)}
              >
                Registar
              </Button>
            </div>
          </div>
          {paymentDisabledReason && <p className="text-xs text-warning-700">{paymentDisabledReason}</p>}
          {selectedFatura && (
            <p className="text-xs text-neutral-600">
              Saldo da fatura: {Math.max(Number(selectedFatura.total || 0) - Number(selectedFatura.valorPago || 0), 0)} AOA
            </p>
          )}
          {lastReceiptInfo && <p className="text-xs text-success-700">{lastReceiptInfo}</p>}
          <Textarea
            label="Notas"
            value={paymentForm.notas}
            onChange={(e) => setPaymentForm((p) => ({ ...p, notas: e.target.value }))}
          />
          {isContractFullyPaid && (
            <p className="text-sm text-success-700">Este contrato ja foi totalmente pago.</p>
          )}
          <div className="space-y-2">
            <p className="text-sm font-semibold">Parcelas</p>
            {(c.parcelas || []).map((parcela: any) => (
              <div key={parcela.id} className="flex items-center justify-between border-b border-neutral-100 pb-2 text-sm">
                <div>
                  <p className="font-medium">
                    Parcela #{parcela.numero} · {new Date(parcela.vencimento).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {parcela.valor} {c.moeda} · {parcela.status}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={parcela.status === 'PAID' || payInstallmentMutation.isPending || !paymentForm.faturaId}
                  onClick={() => payInstallmentMutation.mutate(parcela.numero)}
                >
                  Liquidar
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'assinaturas' && (
        <Card className="space-y-3 p-3">
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setConfirmAction('sign')} disabled={signMutation.isPending || !canSignContract}>
              Assinar (Clinica)
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmAction('activate')} disabled={activateMutation.isPending || !canActivateContract}>
              Ativar
            </Button>
          </div>
          {(c.assinaturas || []).map((s: any) => (
            <div key={s.id} className="border border-neutral-200 p-2 text-sm">
              <p className="font-semibold">{s.signerType} · {s.signerName}</p>
              <p className="text-xs text-neutral-500">
                {s.status}
                {s.signedAt ? ` · ${new Date(s.signedAt).toLocaleString()}` : ''}
              </p>
            </div>
          ))}
        </Card>
      )}

      {activeTab === 'clausulas' && (
        <Card className="space-y-2 p-3">
          {(c.clausulas || []).length === 0 ? (
            <p className="text-sm text-neutral-500">Sem cláusulas registadas.</p>
          ) : (
            (c.clausulas || []).map((cl: any) => (
              <div key={cl.id} className="border border-neutral-200 p-3">
                <p className="text-xs text-neutral-500">{cl.tipo}</p>
                <p className="text-sm font-semibold">{cl.titulo}</p>
                <p className="mt-1 text-sm text-neutral-700">{cl.conteudo}</p>
              </div>
            ))
          )}
        </Card>
      )}

      {activeTab === 'ciclo' && (
        <Card className="space-y-3 p-3">
          <p className="text-sm font-semibold">Rescisao e renovacao</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <Input
              label="Motivo rescisao"
              name="motivo_rescisao"
              autoComplete="off"
              value={terminateReason}
              onChange={(e) => setTerminateReason(e.target.value)}
            />
            <div className="flex items-end">
              <Button
                variant="ghost"
                disabled={!terminateReason || terminateMutation.isPending || !canTerminateContract}
                onClick={() => setConfirmAction('terminate')}
              >
                Rescindir
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <Input
              label="Nova data inicio"
              name="nova_data_inicio"
              autoComplete="off"
              type="date"
              value={renewForm.dataInicio}
              onChange={(e) => setRenewForm((p) => ({ ...p, dataInicio: e.target.value }))}
            />
            <Input
              label="Nova data fim"
              name="nova_data_fim"
              autoComplete="off"
              type="date"
              value={renewForm.dataFim}
              onChange={(e) => setRenewForm((p) => ({ ...p, dataFim: e.target.value }))}
            />
            <Input
              label="Observacoes"
              name="observacoes_renovacao"
              autoComplete="off"
              value={renewForm.observacoes}
              onChange={(e) => setRenewForm((p) => ({ ...p, observacoes: e.target.value }))}
            />
            <div className="flex items-end">
              <Button
                variant="ghost"
                disabled={!renewForm.dataInicio || !renewForm.dataFim || renewMutation.isPending || !canRenewContract}
                onClick={() => setConfirmAction('renew')}
              >
                Renovar
              </Button>
            </div>
          </div>
          <div className="border-t border-neutral-200 pt-3">
            <p className="mb-2 text-sm font-semibold">Aditivo</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <Input
                label="Motivo"
                name="motivo_aditivo"
                autoComplete="off"
                value={amendForm.motivo}
                onChange={(e) => setAmendForm((p) => ({ ...p, motivo: e.target.value }))}
              />
              <Input
                label="Data efetiva"
                name="data_efetiva_aditivo"
                autoComplete="off"
                type="date"
                value={amendForm.effectiveDate}
                onChange={(e) => setAmendForm((p) => ({ ...p, effectiveDate: e.target.value }))}
              />
              <Select
                label="Tipo de alteracao"
                value={amendForm.tipoAlteracao}
                onChange={(e) => setAmendForm((p) => ({ ...p, tipoAlteracao: e.target.value }))}
                options={[
                  { value: 'TERMO', label: 'Termos' },
                  { value: 'FINANCEIRO', label: 'Financeiro' },
                  { value: 'VIGENCIA', label: 'Vigencia' },
                  { value: 'ESCOPO', label: 'Escopo de servicos' },
                ]}
              />
              <Input
                label="Impacto financeiro (AOA)"
                name="impacto_financeiro_aditivo"
                autoComplete="off"
                type="number"
                value={amendForm.impactoFinanceiro}
                onChange={(e) => setAmendForm((p) => ({ ...p, impactoFinanceiro: e.target.value }))}
              />
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2">
              <Input
                label="Resumo da alteracao"
                name="resumo_aditivo"
                autoComplete="off"
                value={amendForm.resumo}
                onChange={(e) => setAmendForm((p) => ({ ...p, resumo: e.target.value }))}
              />
              <Textarea
                label="Observacoes adicionais"
                value={amendForm.observacoes}
                onChange={(e) => setAmendForm((p) => ({ ...p, observacoes: e.target.value }))}
              />
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  disabled={!amendForm.motivo || !amendForm.effectiveDate || !amendForm.resumo || amendMutation.isPending}
                  onClick={() => amendMutation.mutate()}
                >
                  Criar aditivo
                </Button>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <p className="text-sm font-semibold">Aditivos registados</p>
              {(c.aditivos || []).length === 0 && <p className="text-sm text-neutral-500">Sem aditivos registados.</p>}
              {(c.aditivos || []).map((a: any) => (
                <Card key={a.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Aditivo #{a.numero}</p>
                    <Badge variant={a.status === 'APPLIED' ? 'success' : 'neutral'}>{a.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-neutral-700">{a.motivo}</p>
                  <p className="text-xs text-neutral-500">Efetivo em {new Date(a.effectiveDate).toLocaleDateString()}</p>
                </Card>
              ))}
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'documentos' && (
        <Card className="space-y-3 p-3">
          <p className="text-sm font-semibold">Documentos</p>
          
          {/* Upload Area */}
          <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
            <input
              type="file"
              id="contract-file-upload"
              className="hidden"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !id) return;
                setUploadingFile(file.name);
                try {
                  const up = await contractsApi.getDocumentUploadUrl(id, file.name);
                  if (up.provider === 'supabase') {
                    const res = await fetch(up.uploadUrl, {
                      method: 'PUT',
                      body: file,
                      headers: { 'Content-Type': file.type || 'application/octet-stream' },
                    });
                    if (!res.ok) throw new Error('Falha no upload');
                    await contractsApi.confirmDocumentUpload(id, {
                      nome: file.name,
                      path: up.path,
                      provider: up.provider,
                      mimeType: file.type,
                      tamanhoBytes: file.size,
                    });
                  } else {
                    const base64Data = await fileToBase64(file);
                    await contractsApi.confirmDocumentUpload(id, {
                      nome: file.name,
                      path: up.path,
                      provider: up.provider,
                      mimeType: file.type,
                      tamanhoBytes: file.size,
                      base64Data,
                    });
                  }
                  toast.success('Documento carregado com sucesso');
                  invalidate();
                } catch (err: any) {
                  toast.error(getApiErrorMessage(err) || 'Falha ao carregar documento');
                } finally {
                  setUploadingFile(null);
                }
              }}
            />
            <label
              htmlFor="contract-file-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              {uploadingFile ? (
                <>
                  <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
                  <p className="text-sm text-neutral-600">A carregar {uploadingFile}...</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-neutral-400" />
                  <p className="text-sm text-neutral-600">Clique ou arraste para carregar</p>
                  <p className="text-xs text-neutral-400">PDF, DOC, DOCX, PNG, JPG (max 10MB)</p>
                </>
              )}
            </label>
          </div>

          {/* Documents List */}
          <div className="space-y-2">
            {documents.length === 0 && (
              <p className="text-sm text-neutral-500 text-center py-4">Sem documentos carregados</p>
            )}
            {documents.map((d) => {
              const payload = d.payload as any;
              const isPdf = payload?.mimeType === 'application/pdf' || payload?.nome?.toLowerCase().endsWith('.pdf');
              const fileSize = payload?.tamanhoBytes ? formatFileSize(payload.tamanhoBytes) : '-';
              
              return (
                <div key={d.id} className="flex items-center justify-between border border-neutral-200 rounded-lg p-3 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-neutral-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{payload?.nome || 'Documento'}</p>
                      <p className="text-xs text-neutral-500">{fileSize} · {new Date(d.criadoEm).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isPdf && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPdfViewerUrl(payload?.url)}
                        title="Visualizar in-app"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(payload?.url, '_blank')}
                      title="Abrir em nova aba"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {activeTab === 'historico' && (
        <Card className="space-y-3 p-3">
          <p className="text-sm font-semibold">Eventos auditáveis</p>
          <div className="space-y-2">
            {(eventsQuery.data || []).map((ev: any) => (
              <div key={ev.id} className="border border-neutral-200 p-2 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{ev.type}</p>
                  <p className="text-xs text-neutral-500">{new Date(ev.criadoEm).toLocaleString()}</p>
                </div>
                <pre className="mt-1 overflow-auto text-xs text-neutral-600">{JSON.stringify(ev.payload || {}, null, 2)}</pre>
              </div>
            ))}
            {(eventsQuery.data || []).length === 0 && <p className="text-sm text-neutral-500">Sem eventos.</p>}
          </div>
        </Card>
      )}

      {/* PDF Viewer Modal */}
      <Modal
        isOpen={Boolean(pdfViewerUrl)}
        onClose={() => setPdfViewerUrl(null)}
        title="Visualizar Documento"
        size="xl"
      >
        {pdfViewerUrl && (
          <div className="h-[600px] w-full">
            <iframe
              src={pdfViewerUrl}
              className="w-full h-full border-0 rounded"
              title="PDF Viewer"
            />
          </div>
        )}
      </Modal>
      <Modal
        isOpen={Boolean(confirmAction)}
        onClose={() => setConfirmAction('')}
        title="Confirmar ação"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmAction('')}>Cancelar</Button>
            <Button
              onClick={() => {
                const action = confirmAction;
                setConfirmAction('');
                if (action === 'submit') submitMutation.mutate();
                if (action === 'sign') signMutation.mutate();
                if (action === 'activate') activateMutation.mutate();
                if (action === 'terminate') terminateMutation.mutate();
                if (action === 'renew') renewMutation.mutate();
              }}
            >
              Confirmar
            </Button>
          </>
        }
      >
        <p className="text-sm text-neutral-700">Deseja continuar com esta ação?</p>
      </Modal>
    </div>
  );
}

function InfoBox({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <Card className={`p-2 text-sm ${full ? 'md:col-span-2' : ''}`}>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="font-semibold">{value}</p>
    </Card>
  );
}
