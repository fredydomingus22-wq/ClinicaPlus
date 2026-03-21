import { apiClient } from './client';

export interface WaInstancia {
  id: string;
  evolutionName: string;
  estado: 'DESCONECTADO' | 'AGUARDA_QR' | 'CONECTADO' | 'ERRO';
  numeroTelefone?: string;
  qrCodeBase64?: string;
  qrExpiresAt?: string;
  atualizadoEm?: string;
  erroMensagem?: string;
  marcacoesHoje?: number;
  lembretesEnviados?: number;
}

export interface WaAutomacao {
  id: string;
  tipo: string;
  ativo: boolean;
  configuracao?: Record<string, unknown>;
  waInstanciaId: string;
}

export interface WaMetricas {
  totalMensagens: number;
  totalAgendamentos: number;
  conversasActivas: number;
}

export interface WaActividade {
  id: string;
  tipo: 'CONSULTA' | 'MENSAGEM' | 'SISTEMA';
  msg: string;
  data: string;
}

export const whatsappApi = {
  // --- INSTÂNCIAS ---
  
  async listarInstancias(): Promise<WaInstancia[]> {
    const res = await apiClient.get<WaInstancia[]>('/whatsapp/instancias');
    return res.data;
  },

  async getEstado(id: string): Promise<WaInstancia> {
    const res = await apiClient.get<WaInstancia>(`/whatsapp/instancias/${id}/estado`);
    return res.data;
  },

  async getQrCode(id: string): Promise<{ qrcode: string }> {
    const res = await apiClient.get<{ qrcode: string }>(`/whatsapp/instancias/${id}/qrcode`);
    return res.data;
  },

  async conectar(): Promise<WaInstancia> {
    const res = await apiClient.post<WaInstancia>('/whatsapp/instancias');
    return res.data;
  },

  async desligar(id: string): Promise<void> {
    await apiClient.delete(`/whatsapp/instancias/${id}`);
  },

  // --- AUTOMAÇÕES ---

  async listarAutomacoes(instanciaId?: string): Promise<WaAutomacao[]> {
    const url = instanciaId ? `/whatsapp/automacoes?instanciaId=${instanciaId}` : '/whatsapp/automacoes';
    const res = await apiClient.get<WaAutomacao[]>(url);
    return res.data;
  },

  async listarTemplates(): Promise<{ id: string; tipo: string }[]> {
    const res = await apiClient.get<{ id: string; tipo: string }[]>('/whatsapp/templates');
    return res.data;
  },

  async adicionarAutomacao(data: { tipo: string; waInstanciaId: string }): Promise<WaAutomacao> {
    const res = await apiClient.post<WaAutomacao>('/whatsapp/automacoes', data);
    return res.data;
  },

  async activarAutomacao(id: string): Promise<void> {
    await apiClient.post(`/whatsapp/automacoes/${id}/activar`);
  },

  async desactivarAutomacao(id: string): Promise<void> {
    await apiClient.post(`/whatsapp/automacoes/${id}/desactivar`);
  },

  async configurarAutomacao(id: string, config: Record<string, unknown>): Promise<WaAutomacao> {
    const res = await apiClient.patch<WaAutomacao>(`/whatsapp/automacoes/${id}`, config);
    return res.data;
  },

  // --- ACTIVIDADE ---

  async getActividade(): Promise<WaActividade[]> {
    const res = await apiClient.get<WaActividade[]>('/whatsapp/actividade');
    return res.data;
  },

  async getMetricas(): Promise<WaMetricas> {
    const res = await apiClient.get<WaMetricas>('/whatsapp/metricas');
    return res.data;
  }
};
