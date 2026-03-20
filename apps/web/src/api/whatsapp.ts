import { apiFetch } from '../lib/fetch-wrapper';

export interface WaInstancia {
  id: string;
  evolutionName: string;
  estado: 'DESCONECTADO' | 'AGUARDA_QR' | 'CONECTADO' | 'ERRO';
  numeroTelefone?: string;
  qrCodeBase64?: string;
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
    return apiFetch<WaInstancia[]>('/api/whatsapp/instancias');
  },

  async getEstado(id: string): Promise<WaInstancia> {
    return apiFetch<WaInstancia>(`/api/whatsapp/instancias/${id}/estado`);
  },

  async getQrCode(id: string): Promise<{ qrcode: string }> {
    return apiFetch<{ qrcode: string }>(`/api/whatsapp/instancias/${id}/qrcode`);
  },

  async conectar(): Promise<WaInstancia> {
    return apiFetch<WaInstancia>('/api/whatsapp/instancias', { method: 'POST' });
  },

  async desligar(id: string): Promise<void> {
    await apiFetch(`/api/whatsapp/instancias/${id}`, { method: 'DELETE' });
  },

  // --- AUTOMAÇÕES ---

  async listarAutomacoes(instanciaId?: string): Promise<WaAutomacao[]> {
    const url = instanciaId ? `/api/whatsapp/automacoes?instanciaId=${instanciaId}` : '/api/whatsapp/automacoes';
    return apiFetch<WaAutomacao[]>(url);
  },

  async listarTemplates(): Promise<{ id: string; tipo: string }[]> {
    return apiFetch<{ id: string; tipo: string }[]>('/api/whatsapp/templates');
  },

  async adicionarAutomacao(data: { tipo: string; waInstanciaId: string }): Promise<WaAutomacao> {
    return apiFetch<WaAutomacao>('/api/whatsapp/automacoes', { 
      method: 'POST',
      json: data 
    });
  },

  async activarAutomacao(id: string): Promise<void> {
    await apiFetch(`/api/whatsapp/automacoes/${id}/activar`, { method: 'POST' });
  },

  async desactivarAutomacao(id: string): Promise<void> {
    await apiFetch(`/api/whatsapp/automacoes/${id}/desactivar`, { method: 'POST' });
  },

  async configurarAutomacao(id: string, config: Record<string, unknown>): Promise<WaAutomacao> {
    return apiFetch<WaAutomacao>(`/api/whatsapp/automacoes/${id}`, {
      method: 'PATCH',
      json: config
    });
  },

  // --- ACTIVIDADE ---

  async getActividade(): Promise<WaActividade[]> {
    return apiFetch<WaActividade[]>('/api/whatsapp/actividade');
  },

  async getMetricas(): Promise<WaMetricas> {
    return apiFetch<WaMetricas>('/api/whatsapp/metricas');
  }
};
