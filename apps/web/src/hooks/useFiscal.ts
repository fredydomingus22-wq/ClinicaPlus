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
