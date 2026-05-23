import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Input, KpiCard, Modal, Select, Table, Textarea, toast } from '@clinicaplus/ui';
import { TipoProduto } from '@clinicaplus/types';
import { AlertTriangle, Circle, CircleCheck, Clock3, FileSignature, Plus, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { contractsApi, type ContractItemType, type ContractPaymentType } from '../../api/contracts';
import { pacientesApi } from '../../api/pacientes';
import { useInventory } from '../../hooks/useInventory';
import { useTiposTratamentoClinica } from '../../hooks/useTratamentos';
import { useContractWizardStore } from '../../stores/contractWizard.store';
import { useContractsRealtime } from '../../hooks/useContractsRealtime';

const steps = ['Dados', 'Itens', 'Pagamento', 'Clausulas', 'Revisao'] as const;

const makeItem = (): {
  id: string;
  itemType: ContractItemType;
  produtoId: string;
  tipoTratamentoId: string;
  quantidade: number;
  desconto: number;
} => ({
  id: crypto.randomUUID(),
  itemType: 'SERVICO',
  produtoId: '',
  tipoTratamentoId: '',
  quantidade: 1,
  desconto: 0,
});

export default function ContratosPage() {
  const navigate = useNavigate();
  useContractsRealtime();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [openCreate, setOpenCreate] = useState(false);
  const [activateTargetId, setActivateTargetId] = useState<string>('');
  const { step, form, items, setStep, setForm, setItems, reset } = useContractWizardStore();

  const invalidateContractsData = () => {
    queryClient.invalidateQueries({ queryKey: ['contracts'] });
  };

  const { useProdutos } = useInventory();
  const servicosQuery = useProdutos({ tipo: TipoProduto.SERVICO });
  const produtosQuery = useProdutos({ tipo: TipoProduto.PRODUTO });
  const tratamentosQuery = useTiposTratamentoClinica();

  const contractsQuery = useQuery({
    queryKey: ['contracts', statusFilter],
    queryFn: () => contractsApi.list(statusFilter ? (statusFilter as any) : undefined),
  });

  const pacientesQuery = useQuery({
    queryKey: ['pacientes-contracts'],
    queryFn: async () => (await pacientesApi.getList({ page: 1, limit: 100, ativo: true })).items,
  });

  const createMutation = useMutation({
    mutationFn: contractsApi.create,
    onSuccess: () => {
      invalidateContractsData();
      setOpenCreate(false);
      reset();
    },
  });

  const activateFlowMutation = useMutation({
    mutationFn: (id: string) => contractsApi.activate(id),
    onSuccess: () => {
      invalidateContractsData();
      toast.success('Contrato ativado com sucesso.');
      setActivateTargetId('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Erro ao ativar contrato.'),
  });

  const normalizedItems = items.map((item) => {
    if (item.itemType === 'TRATAMENTO') {
      const t = (tratamentosQuery.data || []).find((x: any) => x.id === item.tipoTratamentoId);
      return { price: t?.preco || 0 };
    }
    const source = item.itemType === 'SERVICO' ? servicosQuery.data : produtosQuery.data;
    const p = (source || []).find((x: any) => x.id === item.produtoId);
    return { price: p?.precoVenda || 0 };
  });

  const contractTotal = normalizedItems.reduce((acc, norm, idx) => acc + Math.max(norm.price * items[idx]!.quantidade - items[idx]!.desconto, 0), 0);

  const hasValidDateRange = useMemo(() => {
    const isoDate = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoDate.test(form.dataInicio) || !isoDate.test(form.dataFim)) return false;
    return new Date(form.dataFim).getTime() > new Date(form.dataInicio).getTime();
  }, [form.dataInicio, form.dataFim]);

  const canNext = [
    Boolean(form.pacienteId && form.titulo.trim() && hasValidDateRange),
    items.length > 0 &&
      items.every((i) =>
        i.itemType === 'TRATAMENTO'
          ? Boolean(i.tipoTratamentoId) && i.quantidade > 0
          : Boolean(i.produtoId) && i.quantidade > 0,
      ),
    Boolean(form.tipoPagamento && form.parcelas > 0),
    true,
    true,
  ][step];

  const selectedPaciente = (pacientesQuery.data || []).find((p: any) => p.id === form.pacienteId);
  const contracts = contractsQuery.data || [];
  const dashboard = useMemo(() => {
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const active = contracts.filter((c: any) => c.status === 'ACTIVE');
    const toDays = (iso: string) => Math.ceil((new Date(iso).getTime() - now.getTime()) / dayMs);
    const due30 = active.filter((c: any) => {
      const d = toDays(c.dataFim);
      return d >= 0 && d <= 30;
    });
    const overdue = active.filter((c: any) => toDays(c.dataFim) < 0);
    const mrr = active.reduce((acc: number, c: any) => acc + (Number(c.valorTotal || 0) / Math.max(Number(c.planoPagamento?.parcelas || 1), 1)), 0);
    return {
      active: active.length,
      due30: due30.length,
      overdue: overdue.length,
      mrr: Math.round(mrr),
      alerts: active
        .map((c: any) => ({ ...c, daysToEnd: toDays(c.dataFim) }))
        .filter((c: any) => [30, 15, 7].includes(c.daysToEnd))
        .sort((a: any, b: any) => a.daysToEnd - b.daysToEnd),
    };
  }, [contracts]);

  useEffect(() => {
    if (!openCreate) return;
    const patients = pacientesQuery.data || [];
    const hasCurrent = patients.some((p: any) => p.id === form.pacienteId);
    if (hasCurrent) return;
    const firstPatientId = patients[0]?.id;
    if (firstPatientId) setForm({ pacienteId: firstPatientId });
  }, [openCreate, form.pacienteId, pacientesQuery.data, setForm]);

  useEffect(() => {
    const tratamentos = tratamentosQuery.data || [];
    const servicos = servicosQuery.data || [];
    const produtos = produtosQuery.data || [];
    let changed = false;

    const nextItems = items.map((item) => {
      if (item.itemType === 'TRATAMENTO') {
        const hasCurrent = tratamentos.some((t: any) => t.id === item.tipoTratamentoId);
        if (hasCurrent) return item;
        const first = tratamentos[0]?.id;
        if (!first) return item;
        changed = true;
        return { ...item, tipoTratamentoId: first };
      }

      const source = item.itemType === 'SERVICO' ? servicos : produtos;
      const hasCurrent = source.some((p: any) => p.id === item.produtoId);
      if (hasCurrent) return item;
      const first = source[0]?.id;
      if (!first) return item;
      changed = true;
      return { ...item, produtoId: first };
    });

    if (changed) setItems(nextItems);
  }, [items, produtosQuery.data, servicosQuery.data, tratamentosQuery.data, setItems]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Contratos</h1>
          <p className="text-sm text-neutral-500">Gestao de contratos com fluxo financeiro e recibos.</p>
        </div>
        <Button onClick={() => setOpenCreate(true)}><Plus className="mr-2 h-4 w-4" />Novo Contrato</Button>
      </div>

      <Card className="p-4">
        <Select
          label="Filtrar por estado"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[{ value: '', label: 'Todos' }, ...(['DRAFT', 'REVIEW', 'PENDING_SIGNATURE', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'EXPIRED'] as const).map((s) => ({ value: s, label: s }))]}
        />
      </Card>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <KpiCard label="Ativos" value={dashboard.active} icon={CircleCheck} color="success" />
        <KpiCard label="A vencer (30d)" value={dashboard.due30} icon={Clock3} color="warning" />
        <KpiCard label="Vencidos" value={dashboard.overdue} icon={AlertTriangle} color="danger" />
        <KpiCard label="MRR estimado" value={`${dashboard.mrr} AOA`} icon={Wallet} color="primary" />
      </div>
      {dashboard.alerts.length > 0 && (
        <Card className="p-3">
          <p className="mb-2 text-sm font-semibold">Alertas de vigência (D-30 / D-15 / D-7)</p>
          <div className="space-y-2">
            {dashboard.alerts.map((a: any) => (
              <Card key={a.id} className="flex items-center justify-between p-2 text-sm">
                <p>{a.numero} · {a.paciente?.nome}</p>
                <Badge variant="neutral">D-{a.daysToEnd}</Badge>
              </Card>
            ))}
          </div>
        </Card>
      )}

      <Table
        columns={[
          { header: 'Contrato', accessor: (r: any) => <div><p className="font-semibold">{r.numero}</p><p className="text-xs text-neutral-500">{r.titulo}</p></div> },
          { header: 'Paciente', accessor: (r: any) => r.paciente?.nome || '-' },
          { header: 'Vigencia', accessor: (r: any) => `${new Date(r.dataInicio).toLocaleDateString()} - ${new Date(r.dataFim).toLocaleDateString()}` },
          { header: 'Valor', accessor: (r: any) => `${r.valorTotal} ${r.moeda}` },
          { header: 'Estado', accessor: (r: any) => <Badge variant={r.status === 'ACTIVE' ? 'success' : 'neutral'}>{r.status}</Badge> },
          {
            header: 'Acoes',
            accessor: (r: any) =>
              r.status === 'ACTIVE' ? '—' : (
                <Button variant="ghost" size="sm" onClick={() => setActivateTargetId(r.id)}>
                  Ativar
                </Button>
              ),
          },
        ]}
        data={contractsQuery.data || []}
        isLoading={contractsQuery.isLoading}
        keyExtractor={(r: any) => r.id}
        onRowClick={(r: any) => navigate(`/admin/contratos/${r.id}`)}
      />

      <Modal isOpen={openCreate} onClose={() => setOpenCreate(false)} title="Novo Contrato (Wizard)" size="xl">
        <div className="space-y-4">
          <Card className="p-3">
            <div className="grid grid-cols-5 gap-2">
              {steps.map((label, idx) => (
                <button key={label} className="flex items-center gap-2 text-left" onClick={() => idx <= step && setStep(idx)}>
                  {idx < step ? <CircleCheck className="h-4 w-4 text-success-600" /> : <Circle className="h-4 w-4 text-neutral-400" />}
                  <span className={`text-xs font-medium ${idx === step ? 'text-neutral-900' : 'text-neutral-500'}`}>{label}</span>
                </button>
              ))}
            </div>
          </Card>
          {step === 0 && (
            <Card className="space-y-3 p-4">
              <Select label="Paciente" value={form.pacienteId} onChange={(e) => setForm({ pacienteId: e.target.value })} options={(pacientesQuery.data || []).map((p: any) => ({ value: p.id, label: `${p.nome} (${p.numeroPaciente})` }))} />
              <Input label="Titulo" name="titulo" autoComplete="off" value={form.titulo} onChange={(e) => setForm({ titulo: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Data inicio" name="data_inicio" autoComplete="off" type="date" value={form.dataInicio} onChange={(e) => setForm({ dataInicio: normalizeDateInput(e.target.value) })} />
                <Input label="Data fim" name="data_fim" autoComplete="off" type="date" value={form.dataFim} onChange={(e) => setForm({ dataFim: normalizeDateInput(e.target.value) })} />
              </div>
            </Card>
          )}
          {step === 1 && (
            <Card className="space-y-3 p-4">
              {items.map((item) => <Card key={item.id} className="border-neutral-200 p-3"><div className="grid grid-cols-1 items-end gap-2 md:grid-cols-6"><Select label="Tipo" value={item.itemType} onChange={(e) => setItems(items.map((x) => x.id === item.id ? { ...x, itemType: e.target.value as ContractItemType, produtoId: '', tipoTratamentoId: '' } : x))} options={[{ value: 'SERVICO', label: 'Servico' }, { value: 'PRODUTO', label: 'Produto' }, { value: 'TRATAMENTO', label: 'Tratamento' }]} />{item.itemType === 'TRATAMENTO' ? <div className="md:col-span-2"><Select label="Tratamento" value={item.tipoTratamentoId} onChange={(e) => setItems(items.map((x) => x.id === item.id ? { ...x, tipoTratamentoId: e.target.value } : x))} options={(tratamentosQuery.data || []).map((t: any) => ({ value: t.id, label: `${t.nome} (${t.preco} AOA)` }))} /></div> : <div className="md:col-span-2"><Select label={item.itemType === 'SERVICO' ? 'Servico' : 'Produto'} value={item.produtoId} onChange={(e) => setItems(items.map((x) => x.id === item.id ? { ...x, produtoId: e.target.value } : x))} options={((item.itemType === 'SERVICO' ? servicosQuery.data : produtosQuery.data) || []).map((p: any) => ({ value: p.id, label: `${p.nome} (${p.precoVenda} AOA)` }))} /></div>}<Input label="Qtd" name={`qtd_${item.id}`} autoComplete="off" type="number" value={String(item.quantidade)} onChange={(e) => setItems(items.map((x) => x.id === item.id ? { ...x, quantidade: Number(e.target.value) || 1 } : x))} /><Input label="Desconto" name={`desconto_${item.id}`} autoComplete="off" type="number" value={String(item.desconto)} onChange={(e) => setItems(items.map((x) => x.id === item.id ? { ...x, desconto: Number(e.target.value) || 0 } : x))} /><Button variant="ghost" size="sm" onClick={() => setItems(items.filter((x) => x.id !== item.id))} disabled={items.length === 1}>Remover</Button></div></Card>)}
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setItems([...items, makeItem()])}>Adicionar item</Button>
                <p className="text-sm font-semibold">Total previsto: {contractTotal} AOA</p>
              </div>
            </Card>
          )}
          {step === 2 && (
            <Card className="space-y-3 p-4">
              <Select label="Plano de pagamento" value={form.tipoPagamento} onChange={(e) => setForm({ tipoPagamento: e.target.value as ContractPaymentType })} options={[{ value: 'ONE_TIME', label: 'A vista' }, { value: 'INSTALLMENTS', label: 'Parcelado' }, { value: 'RECURRING', label: 'Recorrente' }]} />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input label="Numero de parcelas" name="parcelas" autoComplete="off" type="number" value={String(form.parcelas)} onChange={(e) => setForm({ parcelas: Number(e.target.value) || 1 })} />
                <Input label="Valor de entrada (AOA)" name="valor_entrada" autoComplete="off" type="number" value={String(form.valorEntrada)} onChange={(e) => setForm({ valorEntrada: Math.max(0, Number(e.target.value) || 0) })} />
              </div>
            </Card>
          )}
          {step === 3 && (
            <Card className="space-y-3 p-4">
              <Textarea label="Clausula de rescisao" value={form.clausulaRescisao} onChange={(e) => setForm({ clausulaRescisao: e.target.value })} />
              <Textarea label="Observacoes" value={form.observacoes} onChange={(e) => setForm({ observacoes: e.target.value })} />
            </Card>
          )}
          {step === 4 && (
            <div className="space-y-3">
              <Card className="p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="border border-neutral-200 p-3">
                    <p className="text-xs text-neutral-500">Paciente</p>
                    <p className="mt-1 text-sm font-semibold">{selectedPaciente?.nome || '-'}</p>
                  </div>
                  <div className="border border-neutral-200 p-3">
                    <p className="text-xs text-neutral-500">Vigencia</p>
                    <p className="mt-1 text-sm font-semibold">{form.dataInicio || '-'} {'->'} {form.dataFim || '-'}</p>
                  </div>
                  <div className="border border-neutral-200 p-3">
                    <p className="text-xs text-neutral-500">Pagamento</p>
                    <p className="mt-1 text-sm font-semibold">{form.tipoPagamento}</p>
                    <p className="text-xs text-neutral-500">{form.parcelas} parcela(s)</p>
                  </div>
                  <div className="border border-neutral-200 bg-neutral-50 p-3">
                    <p className="text-xs text-neutral-500">Total previsto</p>
                    <p className="mt-1 text-base font-bold">{contractTotal} AOA</p>
                  </div>
                </div>
              </Card>
              <Card className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Itens</p>
                  <Badge variant="neutral">{items.length} item(ns)</Badge>
                </div>
                {items.map((item) => {
                  const itemName =
                    item.itemType === 'TRATAMENTO'
                      ? (tratamentosQuery.data || []).find((t: any) => t.id === item.tipoTratamentoId)?.nome
                      : ((item.itemType === 'SERVICO' ? servicosQuery.data : produtosQuery.data) || []).find((p: any) => p.id === item.produtoId)?.nome;
                  const unitPrice =
                    item.itemType === 'TRATAMENTO'
                      ? (tratamentosQuery.data || []).find((t: any) => t.id === item.tipoTratamentoId)?.preco || 0
                      : ((item.itemType === 'SERVICO' ? servicosQuery.data : produtosQuery.data) || []).find((p: any) => p.id === item.produtoId)?.precoVenda || 0;
                  const subtotal = Math.max(unitPrice * item.quantidade - item.desconto, 0);
                  return (
                    <div key={item.id} className="grid grid-cols-1 gap-2 border border-neutral-200 p-3 text-sm md:grid-cols-6">
                      <div className="md:col-span-2"><p className="font-medium">{itemName || '-'}</p><p className="text-xs text-neutral-500">{item.itemType}</p></div>
                      <div><p className="text-xs text-neutral-500">Qtd</p><p>{item.quantidade}</p></div>
                      <div><p className="text-xs text-neutral-500">Unitario</p><p>{unitPrice} AOA</p></div>
                      <div><p className="text-xs text-neutral-500">Desconto</p><p>{item.desconto} AOA</p></div>
                      <div><p className="text-xs text-neutral-500">Subtotal</p><p className="font-semibold">{subtotal} AOA</p></div>
                    </div>
                  );
                })}
              </Card>
            </div>
          )}
          <div className="flex justify-between"><Button variant="ghost" onClick={() => (step === 0 ? setOpenCreate(false) : setStep(step - 1))}>Voltar</Button>{step < steps.length - 1 ? <Button onClick={() => setStep(step + 1)} disabled={!canNext}>Continuar</Button> : <Button loading={createMutation.isPending} onClick={() => createMutation.mutate({ pacienteId: form.pacienteId, titulo: form.titulo, dataInicio: new Date(form.dataInicio).toISOString(), dataFim: new Date(form.dataFim).toISOString(), valorEntrada: form.valorEntrada, clausulaRescisao: form.clausulaRescisao, observacoes: form.observacoes, servicos: items.map((i) => ({ itemType: i.itemType, ...(i.itemType === 'TRATAMENTO' ? { tipoTratamentoId: i.tipoTratamentoId } : { produtoId: i.produtoId }), quantidade: i.quantidade, desconto: i.desconto })), planoPagamento: { tipo: form.tipoPagamento, parcelas: form.parcelas } })}><FileSignature className="mr-2 h-4 w-4" />Criar contrato</Button>}</div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(activateTargetId)}
        onClose={() => setActivateTargetId('')}
        title="Confirmar ativação"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setActivateTargetId('')}>Cancelar</Button>
            <Button
              onClick={() => activateTargetId && activateFlowMutation.mutate(activateTargetId)}
              loading={activateFlowMutation.isPending}
            >
              Confirmar
            </Button>
          </>
        }
      >
        <p className="text-sm text-neutral-700">Deseja ativar este contrato agora?</p>
      </Modal>
    </div>
  );
}

function normalizeDateInput(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = value.split('/');
  if (parts.length !== 3) return value;
  const [dd, mm, yyyy] = parts;
  if (!dd || !mm || !yyyy) return value;
  if (yyyy.length !== 4 || mm.length > 2 || dd.length > 2) return value;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}
