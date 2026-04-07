import { apiClient } from './client';
import { 
  CriarExameDto, 
  CriarPlanoDto, 
  AtualizarPlanoDto, 
  AtualizarSessaoDto,
  CriarTipoExameClinicaDto,
  CriarTipoTratamentoDto
} from '@clinicaplus/types';

export const tratamentosApi = {
  // --- CATÁLOGOS ---
  async getTiposExame() {
    const { data } = await apiClient.get('/config-tratamentos/tipos-exames');
    return data;
  },

  async createTipoExame(payload: CriarTipoExameClinicaDto) {
    const { data } = await apiClient.post('/config-tratamentos/tipos-exames', payload);
    return data;
  },

  async getTiposTratamento() {
    const { data } = await apiClient.get('/config-tratamentos/tipos-tratamento');
    return data;
  },

  async createTipoTratamento(payload: CriarTipoTratamentoDto) {
    const { data } = await apiClient.post('/config-tratamentos/tipos-tratamento', payload);
    return data;
  },

  // --- LISTAGENS GLOBAIS ---
  async getAllExames(filters: { estado?: string | undefined; q?: string | undefined } = {}) {
    const { data } = await apiClient.get('/exames', { params: filters });
    return data;
  },

  async getAllPlanos(filters: { estado?: string | undefined; q?: string | undefined } = {}) {
    const { data } = await apiClient.get('/planos', { params: filters });
    return data;
  },

  // --- EXAMES ---
  async getExamesPaciente(pacienteId: string) {
    const { data } = await apiClient.get(`/exames/paciente/${pacienteId}`);
    return data;
  },

  async createExame(payload: CriarExameDto) {
    const { data } = await apiClient.post('/exames', payload);
    return data;
  },

  async updateExame(id: string, payload: Record<string, unknown>) {
    const { data } = await apiClient.patch(`/exames/${id}`, payload);
    return data;
  },

  async getLaudoUploadUrl(id: string, fileName: string) {
    const { data } = await apiClient.post(`/exames/${id}/laudo-upload-url`, { fileName });
    return data;
  },

  async confirmLaudo(id: string, path: string) {
    const { data } = await apiClient.post(`/exames/${id}/laudo-confirmar`, { path });
    return data;
  },

  // --- PLANOS ---
  async getPlanosPaciente(pacienteId: string) {
    const { data } = await apiClient.get(`/planos/paciente/${pacienteId}`); // Note: Rotas de plano ainda não foram registradas no server.ts no Sprint I/II, mas seguem o padrão
    return data;
  },

  async createPlano(payload: CriarPlanoDto) {
    const { data } = await apiClient.post('/planos', payload);
    return data;
  },

  async updatePlano(id: string, payload: AtualizarPlanoDto) {
    const { data } = await apiClient.patch(`/planos/${id}`, payload);
    return data;
  },

  // --- SESSÕES ---
  async getSessoesPlano(planoId: string) {
    const { data } = await apiClient.get(`/sessoes/plano/${planoId}`);
    return data;
  },

  async updateSessao(id: string, payload: AtualizarSessaoDto) {
    const { data } = await apiClient.patch(`/sessoes/${id}`, payload);
    return data;
  }
};
