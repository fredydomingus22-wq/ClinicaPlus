import { apiClient } from './client';

export type ContractStatus = 'DRAFT' | 'REVIEW' | 'PENDING_SIGNATURE' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'EXPIRED';
export type ContractPaymentType = 'ONE_TIME' | 'INSTALLMENTS' | 'RECURRING';
export type ContractItemType = 'SERVICO' | 'PRODUTO' | 'TRATAMENTO';

export type ContractListItem = {
  id: string;
  numero: string;
  titulo: string;
  status: ContractStatus;
  dataInicio: string;
  dataFim: string;
  valorTotal: number;
  moeda: string;
  valorEntrada: number;
  planoPagamento?: { tipo: ContractPaymentType; parcelas: number | null };
  paciente: { id: string; nome: string; numeroPaciente: string };
};

export type ContractDetail = ContractListItem & {
  clausulaRescisao?: string | null;
  observacoes?: string | null;
  servicos: Array<{
    id: string;
    itemType: ContractItemType;
    descricao: string;
    quantidade: number;
    precoUnitario: number;
    desconto: number;
    subtotal: number;
  }>;
  documentos?: Array<{ id: string; nome: string; url: string; mimeType?: string | null; tamanhoBytes?: number | null; criadoEm: string }>;
  parcelas?: Array<{ id: string; numero: number; vencimento: string; valor: number; status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' }>;
  assinaturas?: Array<{ id: string; signerType: 'CLINIC' | 'PATIENT' | 'GUARDIAN'; signerName: string; status: 'PENDING' | 'SIGNED' | 'REJECTED'; signedAt?: string | null }>;
  clausulas?: Array<{ id: string; tipo: string; titulo: string; conteudo: string; ordem: number }>;
  aditivos?: Array<{
    id: string;
    numero: number;
    motivo: string;
    status: 'DRAFT' | 'APPROVED' | 'REJECTED' | 'APPLIED';
    effectiveDate: string;
    deltaJson: Record<string, unknown>;
    criadoEm: string;
  }>;
};

export type ContractEventItem = {
  id: string;
  type:
    | 'CREATED'
    | 'UPDATED'
    | 'STATUS_CHANGED'
    | 'PAYMENT_RECORDED'
    | 'SIGNATURE_RECORDED'
    | 'AMENDMENT_CREATED';
  payload?: unknown;
  criadoEm: string;
  actorId?: string | null;
};
export type ContractPaymentCreateInput = { valor: number; metodo: string; referencia?: string; notas?: string; faturaId?: string };
export type ContractUploadUrlResponse = { uploadUrl: string; path: string; provider: 'supabase' | 'local' };

export type ContractCreatePayload = {
  pacienteId: string;
  titulo: string;
  dataInicio: string;
  dataFim: string;
  moeda?: string;
  valorEntrada?: number;
  clausulaRescisao?: string;
  observacoes?: string;
  servicos: Array<{
    itemType: ContractItemType;
    produtoId?: string;
    tipoTratamentoId?: string;
    quantidade: number;
    precoUnitario?: number;
    desconto?: number;
  }>;
  planoPagamento: {
    tipo: ContractPaymentType;
    parcelas?: number;
    periodicidade?: string;
    diaVencimento?: number;
    jurosMora?: number;
    multa?: number;
  };
  allowActiveOverride?: boolean;
};

export const contractsApi = {
  list: async (status?: ContractStatus) => {
    const { data } = await apiClient.get<{ success: boolean; data: ContractListItem[] }>('/contracts', { params: { status } });
    return data.data;
  },
  create: async (payload: ContractCreatePayload) => {
    const { data } = await apiClient.post<{ success: boolean; data: unknown }>('/contracts', payload);
    return data.data;
  },
  getById: async (id: string) => {
    const { data } = await apiClient.get<{ success: boolean; data: ContractDetail }>(`/contracts/${id}`);
    return data.data;
  },
  getEvents: async (id: string) => {
    const { data } = await apiClient.get<{ success: boolean; data: ContractEventItem[] }>(`/contracts/${id}/events`);
    return data.data;
  },
  registerPayment: async (id: string, payload: ContractPaymentCreateInput) => {
    const { data } = await apiClient.post<{ success: boolean; data: ContractEventItem }>(`/contracts/${id}/payments`, payload);
    return data.data;
  },
  getDocumentUploadUrl: async (id: string, fileName: string) => {
    const { data } = await apiClient.post<{ success: boolean; data: ContractUploadUrlResponse }>(`/contracts/${id}/documents/upload-url`, { fileName });
    return data.data;
  },
  confirmDocumentUpload: async (
    id: string,
    payload: { nome: string; path: string; provider: 'supabase' | 'local'; mimeType?: string; tamanhoBytes?: number; base64Data?: string },
  ) => {
    const { data } = await apiClient.post<{ success: boolean; data: unknown }>(`/contracts/${id}/documents/confirm`, payload);
    return data.data;
  },
  updateStatus: async (id: string, status: ContractStatus) => {
    const { data } = await apiClient.patch<{ success: boolean; data: ContractDetail }>(`/contracts/${id}/status`, { status });
    return data.data;
  },
  submit: async (id: string) => {
    const { data } = await apiClient.post<{ success: boolean; data: ContractDetail }>(`/contracts/${id}/submit`);
    return data.data;
  },
  activate: async (id: string) => {
    const { data } = await apiClient.post<{ success: boolean; data: ContractDetail }>(`/contracts/${id}/activate`);
    return data.data;
  },
  terminate: async (id: string, payload: { motivo: string; dataEfetiva: string; saldoAjuste?: number; penalidade?: number }) => {
    const { data } = await apiClient.post<{ success: boolean; data: ContractDetail }>(`/contracts/${id}/terminate`, payload);
    return data.data;
  },
  renew: async (id: string, payload: { dataInicio: string; dataFim: string; observacoes?: string }) => {
    const { data } = await apiClient.post<{ success: boolean; data: ContractDetail }>(`/contracts/${id}/renew`, payload);
    return data.data;
  },
  amend: async (id: string, payload: { motivo: string; effectiveDate: string; delta: Record<string, unknown> }) => {
    const { data } = await apiClient.post<{ success: boolean; data: ContractDetail }>(`/contracts/${id}/amendments`, payload);
    return data.data;
  },
  sign: async (
    id: string,
    payload: { signerType: 'CLINIC' | 'PATIENT' | 'GUARDIAN'; signerName: string; signerDoc?: string; provider?: string; evidenceJson?: Record<string, unknown> },
  ) => {
    const { data } = await apiClient.post<{ success: boolean; data: unknown }>(`/contracts/${id}/signatures`, payload);
    return data.data;
  },
  payInstallment: async (id: string, numero: number, payload: { metodo: string; referencia?: string; notas?: string; faturaId?: string }) => {
    const { data } = await apiClient.post<{ success: boolean; data: unknown }>(`/contracts/${id}/installments/${numero}/pay`, payload);
    return data.data;
  },
};
