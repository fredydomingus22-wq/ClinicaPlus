import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fiscalApi, type ConfiguracaoFiscalInput } from '../api/fiscal';

const fiscalKeys = {
  all: ['fiscal'] as const,
  config: () => [...fiscalKeys.all, 'config'] as const,
};

/**
 * Hook para obter a configuração fiscal actual da clínica.
 * Os dados fiscais (NIF, razão social, regime, etc.) residem no modelo Clinica.
 */
export function useConfiguracaoFiscal() {
  return useQuery({
    queryKey: fiscalKeys.config(),
    queryFn: () => fiscalApi.getConfiguracao(),
    staleTime: 5 * 60 * 1000, // 5 minutos — dados raramente mudam
  });
}

/**
 * Mutation para guardar a configuração fiscal.
 * Invalida o cache de clínica e de configuração fiscal.
 */
export function useGuardarConfiguracaoFiscal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ConfiguracaoFiscalInput) => fiscalApi.saveConfiguracao(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalKeys.config() });
      // Invalida também o cache de clinica/me para actualizar o header
      queryClient.invalidateQueries({ queryKey: ['clinicaMe'] });
    },
  });
}

/**
 * Mutation para testar a conexão com a API AGT.
 * Não invalida cache — é uma acção de diagnóstico.
 */
export function useTestarConexaoAgt() {
  return useMutation({
    mutationFn: () => fiscalApi.testarConexao(),
  });
}

/**
 * Hook para listar as séries de faturação da AGT.
 */
export function useSeriesAgt() {
  return useQuery({
    queryKey: [...fiscalKeys.all, 'series'],
    queryFn: () => fiscalApi.listarSeries(),
  });
}

/**
 * Mutation para solicitar uma nova série à AGT.
 */
export function useSolicitarSerieAgt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { documentType: string; establishmentNumber?: string }) => 
      fiscalApi.solicitarSerie(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...fiscalKeys.all, 'series'] });
    }
  });
}

/**
 * Hook para listar o histórico de faturas registadas na AGT.
 */
export function useHistoricoAgt(filters: { startDate: string; endDate: string }) {
  return useQuery({
    queryKey: [...fiscalKeys.all, 'historico', filters],
    queryFn: () => fiscalApi.listarHistoricoAgt(filters.startDate, filters.endDate),
    enabled: !!filters.startDate && !!filters.endDate,
  });
}

/**
 * Mutation para validar um documento local no portal AGT.
 */
export function useValidarDocumentoAgt() {
  return useMutation({
    mutationFn: (faturaId: string) => fiscalApi.validarDocumentoAgt(faturaId),
  });
}

/**
 * Mutation para fazer download do ficheiro SAF-T AO.
 */
export function useExportarSaft() {
  return useMutation({
    mutationFn: (filters: { dataInicio: string; dataFim: string }) => 
      fiscalApi.exportSaft(filters.dataInicio, filters.dataFim),
  });
}

/**
 * Mutation para auditar a integridade da sequência de hashes
 */
export function useAuditHashChain() {
  return useMutation({
    mutationFn: () => fiscalApi.auditHashChain(),
  });
}

/**
 * Mutation para consultar uma fatura diretamente na AGT
 */
export function useConsultarFaturaAgt() {
  return useMutation({
    mutationFn: (numero: string) => fiscalApi.consultarFaturaAgt(numero),
  });
}
